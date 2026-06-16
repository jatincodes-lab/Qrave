using Npgsql;

namespace QRApp.Api.Database;

public static class DatabaseStartupPatches
{
    public static async Task ApplyDatabaseStartupPatchesAsync(this WebApplication app)
    {
        var connectionString = app.Configuration.GetConnectionString("Postgres");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return;
        }

        var builder = new NpgsqlConnectionStringBuilder(connectionString);
        if (string.IsNullOrWhiteSpace(builder.Timezone))
        {
            builder.Timezone = "Asia/Kolkata";
        }

        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseStartupPatches");
        await using var connection = new NpgsqlConnection(builder.ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(PublicOrderSql, connection);
        await command.ExecuteNonQueryAsync();

        logger.LogInformation("Applied database startup patches.");
    }

    private const string PublicOrderSql = """
ALTER TABLE "MenuItems"
ADD COLUMN IF NOT EXISTS "DietTypeCode" varchar(32) NOT NULL DEFAULT 'Unspecified';

ALTER TABLE "OrderItems"
ADD COLUMN IF NOT EXISTS "DietTypeCode" varchar(32) NOT NULL DEFAULT 'Unspecified';

DROP FUNCTION IF EXISTS public.publicorder_getitemsbyorder(uuid);

CREATE OR REPLACE FUNCTION public.publicorder_select(p_orderid uuid)
RETURNS TABLE("OrderId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"SubtotalAmount" numeric,"TotalAmount" numeric,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"AppliedOfferDiscountAmount" numeric,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz)
LANGUAGE sql STABLE AS $$ SELECT o."OrderId",o."TenantId",o."BranchId",o."TableId",o."OrderStatusCode",o."CustomerName",o."CustomerWhatsApp",o."Notes",o."SubtotalAmount",o."TotalAmount",o."AppliedBranchOfferId",o."AppliedOfferTitle",o."AppliedOfferDiscountAmount",o."CreatedAtUtc",o."UpdatedAtUtc" FROM "Orders" o WHERE o."OrderId"=p_orderid; $$;

CREATE OR REPLACE FUNCTION public.publicorder_getitemsbyorder(p_orderid uuid)
RETURNS TABLE("OrderItemId" uuid,"OrderId" uuid,"MenuItemId" uuid,"MenuItemVariantId" uuid,"MenuItemName" varchar,"VariantName" varchar,"ItemNote" varchar,"DietTypeCode" varchar,"UnitPrice" numeric,"Quantity" integer,"LineTotal" numeric)
LANGUAGE sql STABLE AS $$ SELECT oi."OrderItemId",oi."OrderId",oi."MenuItemId",oi."MenuItemVariantId",oi."MenuItemName",oi."VariantName",oi."ItemNote",oi."DietTypeCode",oi."UnitPrice",oi."Quantity",oi."LineTotal" FROM "OrderItems" oi WHERE oi."OrderId"=p_orderid ORDER BY oi."RowId"; $$;

CREATE OR REPLACE FUNCTION public.publicorder_createfromqrtoken(p_qrtoken text,p_orderid uuid,p_customername text,p_customerwhatsapp text,p_notes text,p_itemsjson text,p_marketingconsent boolean,p_marketingconsentsource text)
RETURNS TABLE("OrderId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"SubtotalAmount" numeric,"TotalAmount" numeric,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"AppliedOfferDiscountAmount" numeric,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz)
LANGUAGE plpgsql AS $$
DECLARE
    ctx record;
    customer_id uuid;
    subtotal numeric;
    billing record;
    offer_id uuid;
    offer_title varchar;
    discount numeric := 0;
    taxable numeric := 0;
    tax numeric := 0;
    service_charge numeric := 0;
    total_before_rounding numeric := 0;
    rounding_amount numeric := 0;
    payable_total numeric := 0;
BEGIN
    SELECT bt."TenantId",bt."BranchId",bt."TableId",COALESCE(bos."EnableDirectQrOrdering",false) enabled,COALESCE(bos."RequireCustomerName",false) req_name,COALESCE(bos."RequireCustomerWhatsApp",false) req_whatsapp
    INTO ctx FROM "BranchTables" bt JOIN "Branches" b ON b."BranchId"=bt."BranchId" AND b."IsActive" LEFT JOIN "BranchOrderSettings" bos ON bos."BranchId"=bt."BranchId" WHERE bt."QrToken"=p_qrtoken AND bt."IsActive";
    IF ctx."TableId" IS NULL THEN PERFORM public.raise_app_error(51701); END IF;
    IF NOT ctx.enabled THEN PERFORM public.raise_app_error(51702); END IF;
    IF ctx.req_name AND NULLIF(btrim(p_customername),'') IS NULL THEN PERFORM public.raise_app_error(51703); END IF;
    IF ctx.req_whatsapp AND NULLIF(btrim(p_customerwhatsapp),'') IS NULL THEN PERFORM public.raise_app_error(51704); END IF;

    CREATE TEMP TABLE tmp_order_items ON COMMIT DROP AS
    SELECT gen_random_uuid() "OrderItemId", mi."MenuItemId", v."MenuItemVariantId", mi."Name" "MenuItemName", v."Name" "VariantName", NULLIF(x->>'itemNote','') "ItemNote", mi."DietTypeCode", COALESCE(v."Price",mi."Price") "UnitPrice", GREATEST(COALESCE((x->>'quantity')::integer,0),0) "Quantity"
    FROM jsonb_array_elements(COALESCE(NULLIF(p_itemsjson,'')::jsonb,'[]'::jsonb)) x
    JOIN "MenuItems" mi ON mi."MenuItemId"=(x->>'menuItemId')::uuid AND mi."TenantId"=ctx."TenantId" AND mi."BranchId"=ctx."BranchId" AND mi."IsActive" AND mi."IsAvailable"
    LEFT JOIN "MenuItemVariants" v ON v."MenuItemVariantId"=NULLIF(x->>'menuItemVariantId','')::uuid AND v."MenuItemId"=mi."MenuItemId" AND v."IsAvailable";
    DELETE FROM tmp_order_items WHERE "Quantity" <= 0;
    IF NOT EXISTS (SELECT 1 FROM tmp_order_items) THEN PERFORM public.raise_app_error(51705); END IF;
    SELECT SUM("UnitPrice"*"Quantity") INTO subtotal FROM tmp_order_items;

    IF NULLIF(btrim(p_customerwhatsapp),'') IS NOT NULL THEN
        INSERT INTO "Customers" ("CustomerId","TenantId","BranchId","Name","WhatsAppNumber","VisitCount","LastVisitAtUtc","MarketingConsent","MarketingConsentSource","MarketingConsentAtUtc")
        VALUES (gen_random_uuid(),ctx."TenantId",ctx."BranchId",COALESCE(NULLIF(p_customername,''),'Guest'),p_customerwhatsapp,1,public.app_now(),p_marketingconsent,p_marketingconsentsource,CASE WHEN p_marketingconsent THEN public.app_now() END)
        ON CONFLICT ON CONSTRAINT "UQ_Customers_TenantId_BranchId_WhatsAppNumber" DO UPDATE SET "Name"=COALESCE(NULLIF(EXCLUDED."Name",''),"Customers"."Name"),"VisitCount"="Customers"."VisitCount"+1,"LastVisitAtUtc"=public.app_now(),"MarketingConsent"=("Customers"."MarketingConsent" OR EXCLUDED."MarketingConsent"),"UpdatedAtUtc"=public.app_now()
        RETURNING "CustomerId" INTO customer_id;
    END IF;

    SELECT
        COALESCE(bs."TaxEnabled",false) "TaxEnabled",
        COALESCE(bs."TaxRate",0) "TaxRate",
        COALESCE(bs."TaxMode",'Exclusive') "TaxMode",
        COALESCE(bs."ServiceChargeEnabled",false) "ServiceChargeEnabled",
        COALESCE(bs."ServiceChargeRate",0) "ServiceChargeRate",
        COALESCE(bs."RoundingMode",'None') "RoundingMode"
    INTO billing
    FROM "Branches" b
    LEFT JOIN "BranchBillingSettings" bs ON bs."TenantId"=b."TenantId" AND bs."BranchId"=b."BranchId"
    WHERE b."TenantId"=ctx."TenantId" AND b."BranchId"=ctx."BranchId";

    SELECT selected_offer."BranchOfferId", selected_offer."Title", selected_offer.computed_discount
    INTO offer_id, offer_title, discount
    FROM (
        SELECT bo.*,
               round(LEAST(
                   subtotal,
                   GREATEST(
                       0,
                       CASE
                           WHEN bo."MaxDiscountAmount" IS NOT NULL THEN LEAST(
                               CASE bo."DiscountTypeCode"
                                   WHEN 'Percentage' THEN round(subtotal * bo."DiscountValue" / 100,2)
                                   ELSE round(bo."DiscountValue",2)
                               END,
                               bo."MaxDiscountAmount"
                           )
                           ELSE CASE bo."DiscountTypeCode"
                               WHEN 'Percentage' THEN round(subtotal * bo."DiscountValue" / 100,2)
                               ELSE round(bo."DiscountValue",2)
                           END
                       END
                   )
               ),2) AS computed_discount
        FROM "BranchOffers" bo
        WHERE bo."TenantId"=ctx."TenantId"
          AND bo."BranchId"=ctx."BranchId"
          AND bo."IsActive"
          AND bo."AutoApply"
          AND bo."DiscountTypeCode" <> 'DisplayOnly'
          AND bo."DiscountValue" > 0
          AND subtotal >= bo."MinimumOrderAmount"
          AND (bo."StartsAtUtc" IS NULL OR bo."StartsAtUtc" <= public.app_now())
          AND (bo."EndsAtUtc" IS NULL OR bo."EndsAtUtc" >= public.app_now())
        ORDER BY computed_discount DESC, bo."DisplayOrder", bo."Title"
        LIMIT 1
    ) selected_offer;
    discount := COALESCE(discount,0);

    taxable := round(GREATEST(subtotal - discount,0),2);
    IF billing."TaxEnabled" AND billing."TaxRate" > 0 THEN
        tax := CASE
            WHEN billing."TaxMode" = 'Inclusive' THEN round(taxable - taxable / (1 + billing."TaxRate" / 100),2)
            ELSE round(taxable * billing."TaxRate" / 100,2)
        END;
    END IF;
    IF billing."ServiceChargeEnabled" AND billing."ServiceChargeRate" > 0 THEN
        service_charge := round(taxable * billing."ServiceChargeRate" / 100,2);
    END IF;
    total_before_rounding := round((CASE WHEN billing."TaxMode" = 'Inclusive' THEN taxable ELSE taxable + tax END) + service_charge,2);
    rounding_amount := CASE WHEN billing."RoundingMode" IN ('NearestRupee','Nearest') THEN round(total_before_rounding) - total_before_rounding ELSE 0 END;
    payable_total := round(total_before_rounding + rounding_amount,2);

    INSERT INTO "Orders" ("OrderId","TenantId","BranchId","TableId","CustomerId","CustomerName","CustomerWhatsApp","Notes","SubtotalAmount","AppliedBranchOfferId","AppliedOfferTitle","AppliedOfferDiscountAmount","TotalAmount")
    VALUES (p_orderid,ctx."TenantId",ctx."BranchId",ctx."TableId",customer_id,p_customername,p_customerwhatsapp,p_notes,subtotal,offer_id,offer_title,discount,payable_total);
    INSERT INTO "OrderItems" ("OrderItemId","TenantId","BranchId","OrderId","MenuItemId","MenuItemVariantId","MenuItemName","VariantName","ItemNote","DietTypeCode","UnitPrice","Quantity","LineTotal")
    SELECT "OrderItemId",ctx."TenantId",ctx."BranchId",p_orderid,"MenuItemId","MenuItemVariantId","MenuItemName","VariantName","ItemNote","DietTypeCode","UnitPrice","Quantity","UnitPrice"*"Quantity" FROM tmp_order_items;
    INSERT INTO "OrderStatusHistory" ("OrderStatusHistoryId","TenantId","BranchId","OrderId","StatusCode") VALUES (gen_random_uuid(),ctx."TenantId",ctx."BranchId",p_orderid,'Placed');
    RETURN QUERY SELECT * FROM public.publicorder_select(p_orderid);
END;
$$;
""";
}
