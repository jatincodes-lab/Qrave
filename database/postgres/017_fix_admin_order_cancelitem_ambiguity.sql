CREATE OR REPLACE FUNCTION public.adminorder_cancelitem(p_tenantid uuid,p_branchid uuid,p_orderid uuid,p_orderitemid uuid,p_cancelquantity integer,p_reason text,p_changedbyuserid uuid)
RETURNS TABLE("OrderId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"TableName" varchar,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"SubtotalAmount" numeric,"TotalAmount" numeric,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"AppliedOfferDiscountAmount" numeric,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz,"ClosedAtUtc" timestamptz,"LatestReason" varchar)
LANGUAGE plpgsql AS $$
DECLARE
    order_row record;
    item_row record;
    bill_row record;
    billing record;
    active_subtotal numeric := 0;
    discount numeric := 0;
    taxable numeric := 0;
    tax numeric := 0;
    service_charge numeric := 0;
    total_before_rounding numeric := 0;
    rounding_amount numeric := 0;
    payable_total numeric := 0;
BEGIN
    SELECT o.*
    INTO order_row
    FROM "Orders" o
    WHERE o."TenantId"=p_tenantid AND o."BranchId"=p_branchid AND o."OrderId"=p_orderid
    FOR UPDATE;

    IF order_row."OrderId" IS NULL THEN
        PERFORM public.raise_app_error(51708);
    END IF;

    IF order_row."OrderStatusCode" IN ('Completed','Cancelled') THEN
        PERFORM public.raise_app_error(51710);
    END IF;

    IF COALESCE(p_cancelquantity,0) <= 0 THEN
        PERFORM public.raise_app_error(51711);
    END IF;

    IF NULLIF(btrim(p_reason),'') IS NULL OR length(btrim(p_reason)) > 300 THEN
        PERFORM public.raise_app_error(51712);
    END IF;

    SELECT oi.*
    INTO item_row
    FROM "OrderItems" oi
    WHERE oi."TenantId"=p_tenantid AND oi."BranchId"=p_branchid AND oi."OrderId"=p_orderid AND oi."OrderItemId"=p_orderitemid
    FOR UPDATE;

    IF item_row."OrderItemId" IS NULL THEN
        PERFORM public.raise_app_error(51713);
    END IF;

    IF p_cancelquantity > (item_row."Quantity" - item_row."CancelledQuantity") THEN
        PERFORM public.raise_app_error(51711);
    END IF;

    SELECT ob.*
    INTO bill_row
    FROM "OrderBills" ob
    WHERE ob."TenantId"=p_tenantid AND ob."BranchId"=p_branchid AND ob."OrderId"=p_orderid
    FOR UPDATE;

    IF bill_row."OrderBillId" IS NOT NULL AND bill_row."PaymentStatusCode" <> 'Unpaid' THEN
        PERFORM public.raise_app_error(51714);
    END IF;

    UPDATE "OrderItems" oi
    SET "CancelledQuantity"=oi."CancelledQuantity" + p_cancelquantity,
        "CancelledReason"=btrim(p_reason),
        "CancelledAtUtc"=public.app_now(),
        "CancelledByUserId"=p_changedbyuserid
    WHERE oi."OrderItemId"=p_orderitemid;

    SELECT COALESCE(round(SUM(oi."UnitPrice" * (oi."Quantity" - oi."CancelledQuantity")),2),0)
    INTO active_subtotal
    FROM "OrderItems" oi
    WHERE oi."TenantId"=p_tenantid AND oi."BranchId"=p_branchid AND oi."OrderId"=p_orderid;

    IF order_row."AppliedBranchOfferId" IS NOT NULL AND active_subtotal > 0 THEN
        SELECT round(LEAST(
            active_subtotal,
            GREATEST(
                0,
                CASE
                    WHEN bo."MaxDiscountAmount" IS NOT NULL THEN LEAST(
                        CASE bo."DiscountTypeCode"
                            WHEN 'Percentage' THEN round(active_subtotal * bo."DiscountValue" / 100,2)
                            ELSE round(bo."DiscountValue",2)
                        END,
                        bo."MaxDiscountAmount"
                    )
                    ELSE CASE bo."DiscountTypeCode"
                        WHEN 'Percentage' THEN round(active_subtotal * bo."DiscountValue" / 100,2)
                        ELSE round(bo."DiscountValue",2)
                    END
                END
            )
        ),2)
        INTO discount
        FROM "BranchOffers" bo
        WHERE bo."TenantId"=p_tenantid
          AND bo."BranchId"=p_branchid
          AND bo."BranchOfferId"=order_row."AppliedBranchOfferId"
          AND bo."DiscountTypeCode" <> 'DisplayOnly'
          AND bo."DiscountValue" > 0
          AND active_subtotal >= bo."MinimumOrderAmount";
    END IF;

    discount := COALESCE(discount,0);

    SELECT COALESCE(bs."TaxEnabled",false) "TaxEnabled",
           COALESCE(bs."TaxRate",0) "TaxRate",
           COALESCE(bs."TaxMode",'Exclusive') "TaxMode",
           COALESCE(bs."ServiceChargeEnabled",false) "ServiceChargeEnabled",
           COALESCE(bs."ServiceChargeRate",0) "ServiceChargeRate",
           COALESCE(bs."RoundingMode",'None') "RoundingMode"
    INTO billing
    FROM "Branches" b
    LEFT JOIN "BranchBillingSettings" bs ON bs."TenantId"=b."TenantId" AND bs."BranchId"=b."BranchId"
    WHERE b."TenantId"=p_tenantid AND b."BranchId"=p_branchid;

    taxable := round(GREATEST(active_subtotal - discount,0),2);
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

    UPDATE "Orders" o
    SET "SubtotalAmount"=active_subtotal,
        "AppliedOfferDiscountAmount"=discount,
        "TotalAmount"=payable_total,
        "OrderStatusCode"=CASE WHEN active_subtotal <= 0 THEN 'Cancelled' ELSE o."OrderStatusCode" END,
        "UpdatedAtUtc"=public.app_now()
    WHERE o."OrderId"=p_orderid;

    IF active_subtotal <= 0 THEN
        INSERT INTO "OrderStatusHistory" ("OrderStatusHistoryId","TenantId","BranchId","OrderId","StatusCode","Reason","ChangedByUserId")
        VALUES (gen_random_uuid(),p_tenantid,p_branchid,p_orderid,'Cancelled',btrim(p_reason),p_changedbyuserid);
    END IF;

    IF bill_row."OrderBillId" IS NOT NULL THEN
        UPDATE "OrderBills" ob
        SET "SubtotalAmount"=active_subtotal,
            "DiscountAmount"=discount,
            "TaxableAmount"=taxable,
            "TaxAmount"=tax,
            "ServiceChargeAmount"=service_charge,
            "RoundingAmount"=rounding_amount,
            "TotalAmount"=payable_total,
            "UpdatedAtUtc"=public.app_now()
        WHERE ob."OrderBillId"=bill_row."OrderBillId";
    END IF;

    RETURN QUERY
    SELECT *
    FROM public.adminorder_getlistbybranch(p_tenantid,p_branchid,true) a
    WHERE a."OrderId"=p_orderid;
END;
$$;
