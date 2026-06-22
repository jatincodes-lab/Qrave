CREATE OR REPLACE FUNCTION public.publicorder_requestitemcancellation(p_qrtoken text,p_orderid uuid,p_orderitemid uuid,p_cancelquantity integer,p_reason text,p_tokenhash text)
RETURNS TABLE("OrderId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"SubtotalAmount" numeric,"TotalAmount" numeric,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"AppliedOfferDiscountAmount" numeric,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz)
LANGUAGE plpgsql AS $$
DECLARE
    ctx record;
    item_row record;
    pending_quantity integer := 0;
BEGIN
    SELECT o."OrderId",o."TenantId",o."BranchId",o."TableId",o."CustomerId",o."OrderStatusCode"
    INTO ctx
    FROM "Orders" o
    JOIN "BranchTables" bt ON bt."TableId"=o."TableId" AND bt."BranchId"=o."BranchId" AND bt."TenantId"=o."TenantId" AND bt."QrToken"=p_qrtoken AND bt."IsActive"
    JOIN "Branches" b ON b."BranchId"=o."BranchId" AND b."TenantId"=o."TenantId" AND b."IsActive"
    WHERE o."OrderId"=p_orderid AND public.tenant_public_access_allowed(o."TenantId")
    FOR UPDATE;

    IF ctx."OrderId" IS NULL THEN PERFORM public.raise_app_error(51709); END IF;
    IF ctx."CustomerId" IS NULL OR NOT EXISTS (
        SELECT 1 FROM "CustomerDeviceAccessTokens" access
        WHERE access."TenantId"=ctx."TenantId" AND access."BranchId"=ctx."BranchId" AND access."CustomerId"=ctx."CustomerId"
          AND access."TokenHash"=p_tokenhash AND access."RevokedAtUtc" IS NULL AND access."ExpiresAtUtc" > public.app_now()
    ) THEN
        PERFORM public.raise_app_error(51716);
    END IF;
    IF ctx."OrderStatusCode" NOT IN ('Placed','Accepted','Preparing') THEN PERFORM public.raise_app_error(51717); END IF;
    IF EXISTS (
        SELECT 1 FROM "OrderBills" ob
        WHERE ob."TenantId"=ctx."TenantId" AND ob."BranchId"=ctx."BranchId" AND ob."OrderId"=p_orderid AND ob."PaymentStatusCode" <> 'Unpaid'
    ) THEN
        PERFORM public.raise_app_error(51714);
    END IF;
    IF COALESCE(p_cancelquantity,0) <= 0 THEN PERFORM public.raise_app_error(51711); END IF;
    IF NULLIF(btrim(p_reason),'') IS NULL OR length(btrim(p_reason)) > 300 THEN PERFORM public.raise_app_error(51712); END IF;

    SELECT oi.* INTO item_row
    FROM "OrderItems" oi
    WHERE oi."TenantId"=ctx."TenantId" AND oi."BranchId"=ctx."BranchId" AND oi."OrderId"=p_orderid AND oi."OrderItemId"=p_orderitemid
    FOR UPDATE;
    IF item_row."OrderItemId" IS NULL THEN PERFORM public.raise_app_error(51713); END IF;

    SELECT COALESCE(SUM(req."RequestedQuantity"),0)::integer
    INTO pending_quantity
    FROM "OrderItemCancellationRequests" req
    WHERE req."OrderItemId"=p_orderitemid AND req."StatusCode"='Pending';

    IF p_cancelquantity > (item_row."Quantity" - item_row."CancelledQuantity" + pending_quantity) THEN
        PERFORM public.raise_app_error(51711);
    END IF;

    UPDATE "OrderItemCancellationRequests" req
    SET "RequestedQuantity"=p_cancelquantity,
        "Reason"=btrim(p_reason),
        "RequestedAtUtc"=public.app_now()
    WHERE req."TenantId"=ctx."TenantId"
      AND req."BranchId"=ctx."BranchId"
      AND req."OrderItemId"=p_orderitemid
      AND req."StatusCode"='Pending';

    IF NOT FOUND THEN
        INSERT INTO "OrderItemCancellationRequests" ("OrderItemCancellationRequestId","TenantId","BranchId","OrderId","OrderItemId","RequestedQuantity","Reason")
        VALUES (gen_random_uuid(),ctx."TenantId",ctx."BranchId",p_orderid,p_orderitemid,p_cancelquantity,btrim(p_reason));
    END IF;

    RETURN QUERY SELECT * FROM public.publicorder_select(p_orderid);
END;
$$;

CREATE OR REPLACE FUNCTION public.adminorder_responditemcancellationrequest(p_tenantid uuid,p_branchid uuid,p_requestid uuid,p_decision text,p_reason text,p_changedbyuserid uuid)
RETURNS TABLE("OrderId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"TableName" varchar,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"SubtotalAmount" numeric,"TotalAmount" numeric,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"AppliedOfferDiscountAmount" numeric,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz,"ClosedAtUtc" timestamptz,"LatestReason" varchar)
LANGUAGE plpgsql AS $$
DECLARE
    req record;
BEGIN
    SELECT reqrow.*
    INTO req
    FROM "OrderItemCancellationRequests" reqrow
    WHERE reqrow."TenantId"=p_tenantid
      AND reqrow."BranchId"=p_branchid
      AND reqrow."OrderItemCancellationRequestId"=p_requestid
    FOR UPDATE;

    IF req."OrderItemCancellationRequestId" IS NULL THEN PERFORM public.raise_app_error(51718); END IF;
    IF req."StatusCode" <> 'Pending' THEN PERFORM public.raise_app_error(51715); END IF;
    IF p_decision NOT IN ('Approved','Rejected') THEN PERFORM public.raise_app_error(51719); END IF;
    IF p_decision='Rejected' AND NULLIF(btrim(p_reason),'') IS NULL THEN PERFORM public.raise_app_error(51712); END IF;
    IF length(COALESCE(btrim(p_reason),'')) > 300 THEN PERFORM public.raise_app_error(51712); END IF;

    IF p_decision='Approved' THEN
        PERFORM * FROM public.adminorder_cancelitem(p_tenantid,p_branchid,req."OrderId",req."OrderItemId",req."RequestedQuantity",req."Reason",p_changedbyuserid);
    END IF;

    UPDATE "OrderItemCancellationRequests" reqrow
    SET "StatusCode"=p_decision,
        "RespondedAtUtc"=public.app_now(),
        "RespondedByUserId"=p_changedbyuserid,
        "ResponseReason"=NULLIF(btrim(p_reason),'')
    WHERE reqrow."OrderItemCancellationRequestId"=p_requestid;

    RETURN QUERY SELECT * FROM public.adminorder_getlistbybranch(p_tenantid,p_branchid,true) a WHERE a."OrderId"=req."OrderId";
END;
$$;
