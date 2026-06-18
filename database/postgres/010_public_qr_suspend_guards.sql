-- Ensures suspended/inactive restaurants cannot serve public QR menu data,
-- create QR sessions, accept public orders, receive waiter calls, or expose
-- customer lookup data.

CREATE OR REPLACE FUNCTION public.tenant_public_access_allowed(p_tenantid uuid)
RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT COALESCE((
        SELECT t."IsActive"
           AND t."AccountStatusCode" = 'Active'
           AND (
                t."SubscriptionStatusCode" IN ('Active','ManualActive')
                OR (
                    t."SubscriptionStatusCode" = 'Trialing'
                    AND (t."TrialStartAtUtc" IS NULL OR t."TrialStartAtUtc" <= public.app_now())
                    AND t."TrialEndAtUtc" IS NOT NULL
                    AND t."TrialEndAtUtc" >= public.app_now()
                )
           )
        FROM "Tenants" t
        WHERE t."TenantId" = p_tenantid
    ), false);
$$;

CREATE OR REPLACE FUNCTION public.publicqr_assert_tenant_available(p_qrtoken text)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
    tenant_id uuid;
BEGIN
    SELECT bt."TenantId"
    INTO tenant_id
    FROM "BranchTables" bt
    WHERE bt."QrToken" = p_qrtoken AND bt."IsActive"
    LIMIT 1;

    IF tenant_id IS NOT NULL AND NOT public.tenant_public_access_allowed(tenant_id) THEN
        PERFORM public.raise_app_error(52002);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.publicmenu_getbyqrtoken(p_qrtoken text)
RETURNS TABLE("BranchId" uuid,"BranchName" varchar,"BranchLogoUrl" varchar,"TableId" uuid,"TableName" varchar,"QrToken" varchar,"EnableDirectQrOrdering" boolean,"RequireCustomerName" boolean,"RequireCustomerWhatsApp" boolean,"WaiterCallEnabled" boolean,"TaxEnabled" boolean,"TaxName" varchar,"TaxRate" numeric,"TaxMode" varchar,"ServiceChargeEnabled" boolean,"ServiceChargeName" varchar,"ServiceChargeRate" numeric,"RoundingMode" varchar,"MenuCategoryId" uuid,"CategoryName" varchar,"CategoryDisplayOrder" integer,"MenuItemId" uuid,"ItemName" varchar,"Description" varchar,"Price" numeric,"DietTypeCode" varchar,"ItemDisplayOrder" integer,"ImageUrl" varchar,"ImageAltText" varchar,"VariantsJson" text)
LANGUAGE sql STABLE AS $$
    SELECT b."BranchId",b."Name",b."LogoUrl",bt."TableId",bt."Name",bt."QrToken",
           COALESCE(bos."EnableDirectQrOrdering",false),COALESCE(bos."RequireCustomerName",false),COALESCE(bos."RequireCustomerWhatsApp",false),COALESCE(bos."WaiterCallEnabled",true),
           COALESCE(bs."TaxEnabled",false),COALESCE(bs."TaxName",''),COALESCE(bs."TaxRate",0),COALESCE(bs."TaxMode",'Exclusive'),COALESCE(bs."ServiceChargeEnabled",false),COALESCE(bs."ServiceChargeName",''),COALESCE(bs."ServiceChargeRate",0),COALESCE(bs."RoundingMode",'None'),
           mc."MenuCategoryId",mc."Name",mc."DisplayOrder",mi."MenuItemId",mi."Name",mi."Description",mi."Price",mi."DietTypeCode",mi."DisplayOrder",mi."ImageUrl",mi."ImageAltText",
           COALESCE((SELECT jsonb_agg(jsonb_build_object('menuItemVariantId',v."MenuItemVariantId",'menuItemId',v."MenuItemId",'name',v."Name",'price',v."Price",'isAvailable',v."IsAvailable",'displayOrder',v."DisplayOrder") ORDER BY v."DisplayOrder",v."Name")::text FROM "MenuItemVariants" v WHERE v."MenuItemId"=mi."MenuItemId" AND v."IsAvailable"), '[]')
    FROM "BranchTables" bt JOIN "Branches" b ON b."BranchId"=bt."BranchId" AND b."IsActive"
    LEFT JOIN "BranchOrderSettings" bos ON bos."BranchId"=b."BranchId"
    LEFT JOIN "BranchBillingSettings" bs ON bs."BranchId"=b."BranchId"
    LEFT JOIN "MenuCategories" mc ON mc."BranchId"=b."BranchId" AND mc."IsActive"
    LEFT JOIN "MenuItems" mi ON mi."MenuCategoryId"=mc."MenuCategoryId" AND mi."IsActive" AND mi."IsAvailable"
    WHERE bt."QrToken"=p_qrtoken AND bt."IsActive" AND public.tenant_public_access_allowed(bt."TenantId")
    ORDER BY mc."DisplayOrder",mi."DisplayOrder",mi."Name";
$$;

CREATE OR REPLACE FUNCTION public.publicoffers_getbyqrtoken(p_qrtoken text)
RETURNS SETOF "BranchOffers"
LANGUAGE sql STABLE AS $$
    SELECT bo.*
    FROM "BranchTables" bt
    JOIN "BranchOffers" bo ON bo."BranchId"=bt."BranchId"
    WHERE bt."QrToken"=p_qrtoken
      AND bt."IsActive"
      AND public.tenant_public_access_allowed(bt."TenantId")
      AND bo."IsActive"
      AND (bo."StartsAtUtc" IS NULL OR bo."StartsAtUtc" <= public.app_now())
      AND (bo."EndsAtUtc" IS NULL OR bo."EndsAtUtc" >= public.app_now())
    ORDER BY bo."DisplayOrder";
$$;

CREATE OR REPLACE FUNCTION public.qrvisitsession_create(p_qrtoken text,p_qrsessionid uuid,p_ttlminutes integer)
RETURNS TABLE("QrSessionId" uuid,"BranchId" uuid,"TableId" uuid,"StartedAtUtc" timestamptz,"ExpiresAtUtc" timestamptz,"IsExpired" boolean)
LANGUAGE plpgsql AS $$
DECLARE
    ctx record;
    started_at timestamptz := public.app_now();
    ttl_minutes integer := LEAST(GREATEST(COALESCE(p_ttlminutes,240),15),720);
BEGIN
    PERFORM public.publicqr_assert_tenant_available(p_qrtoken);

    SELECT bt."TenantId",bt."BranchId",bt."TableId"
    INTO ctx
    FROM "BranchTables" bt
    JOIN "Branches" b ON b."BranchId"=bt."BranchId" AND b."IsActive"
    WHERE bt."QrToken"=p_qrtoken AND bt."IsActive";

    IF ctx."TableId" IS NULL THEN
        PERFORM public.raise_app_error(51701);
    END IF;

    INSERT INTO "QrVisitSessions" ("QrSessionId","TenantId","BranchId","TableId","QrToken","StartedAtUtc","ExpiresAtUtc")
    VALUES (p_qrsessionid,ctx."TenantId",ctx."BranchId",ctx."TableId",p_qrtoken,started_at,started_at + make_interval(mins => ttl_minutes));

    RETURN QUERY
    SELECT qvs."QrSessionId",qvs."BranchId",qvs."TableId",qvs."StartedAtUtc",qvs."ExpiresAtUtc",(qvs."ExpiresAtUtc" <= public.app_now() OR qvs."RevokedAtUtc" IS NOT NULL)
    FROM "QrVisitSessions" qvs
    WHERE qvs."QrSessionId"=p_qrsessionid;
END;
$$;

CREATE OR REPLACE FUNCTION public.qrvisitsession_assert_active(p_qrtoken text,p_qrsessionid uuid)
RETURNS TABLE("TenantId" uuid,"BranchId" uuid,"TableId" uuid)
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM public.publicqr_assert_tenant_available(p_qrtoken);

    RETURN QUERY
    SELECT qvs."TenantId",qvs."BranchId",qvs."TableId"
    FROM "QrVisitSessions" qvs
    JOIN "BranchTables" bt ON bt."TableId"=qvs."TableId" AND bt."QrToken"=p_qrtoken AND bt."IsActive"
    JOIN "Branches" b ON b."BranchId"=qvs."BranchId" AND b."IsActive"
    WHERE qvs."QrSessionId"=p_qrsessionid
      AND qvs."QrToken"=p_qrtoken
      AND qvs."RevokedAtUtc" IS NULL
      AND qvs."ExpiresAtUtc" > public.app_now();

    IF NOT FOUND THEN
        PERFORM public.raise_app_error(52001);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.publiccustomer_lookupbyqrtoken(p_qrtoken text,p_customerwhatsapp text)
RETURNS TABLE("CustomerId" uuid,"Name" varchar,"WhatsAppNumber" varchar,"MarketingConsent" boolean,"VisitCount" integer,"TotalOrderCount" integer,"TotalOrderValue" numeric,"LastVisitAtUtc" timestamptz)
LANGUAGE sql STABLE AS $$
    SELECT c."CustomerId",c."Name",c."WhatsAppNumber",c."MarketingConsent",c."VisitCount",COUNT(o."OrderId")::integer,COALESCE(SUM(o."TotalAmount"),0),COALESCE(c."LastVisitAtUtc",c."CreatedAtUtc")
    FROM "Customers" c
    JOIN "BranchTables" bt ON bt."BranchId"=c."BranchId"
    LEFT JOIN "Orders" o ON o."CustomerId"=c."CustomerId"
    WHERE bt."QrToken"=p_qrtoken
      AND public.tenant_public_access_allowed(bt."TenantId")
      AND c."WhatsAppNumber"=p_customerwhatsapp
    GROUP BY c."CustomerId";
$$;
