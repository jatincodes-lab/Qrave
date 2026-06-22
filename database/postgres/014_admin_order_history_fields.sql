DROP FUNCTION IF EXISTS public.adminorder_updatestatus(uuid,uuid,uuid,text,text,uuid);
DROP FUNCTION IF EXISTS public.adminorder_getlistbybranch(uuid,uuid,boolean);

CREATE OR REPLACE FUNCTION public.adminorder_getlistbybranch(p_tenantid uuid,p_branchid uuid,p_includecompleted boolean)
RETURNS TABLE("OrderId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"TableName" varchar,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"SubtotalAmount" numeric,"TotalAmount" numeric,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"AppliedOfferDiscountAmount" numeric,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz,"ClosedAtUtc" timestamptz,"LatestReason" varchar)
LANGUAGE sql STABLE AS $$
WITH status_rollup AS (
    SELECT
        h."OrderId",
        MAX(h."CreatedAtUtc") FILTER (WHERE h."StatusCode" IN ('Completed','Cancelled')) AS "ClosedAtUtc"
    FROM "OrderStatusHistory" h
    WHERE h."TenantId"=p_tenantid AND h."BranchId"=p_branchid
    GROUP BY h."OrderId"
),
status_reason AS (
    SELECT DISTINCT ON (h."OrderId",h."StatusCode")
        h."OrderId",
        h."StatusCode",
        NULLIF(btrim(h."Reason"), '')::varchar AS "LatestReason"
    FROM "OrderStatusHistory" h
    WHERE h."TenantId"=p_tenantid
      AND h."BranchId"=p_branchid
      AND NULLIF(btrim(h."Reason"), '') IS NOT NULL
    ORDER BY h."OrderId",h."StatusCode",h."CreatedAtUtc" DESC
)
SELECT
    o."OrderId",
    o."TenantId",
    o."BranchId",
    o."TableId",
    bt."Name",
    o."OrderStatusCode",
    o."CustomerName",
    o."CustomerWhatsApp",
    o."Notes",
    o."SubtotalAmount",
    o."TotalAmount",
    o."AppliedBranchOfferId",
    o."AppliedOfferTitle",
    o."AppliedOfferDiscountAmount",
    o."CreatedAtUtc",
    o."UpdatedAtUtc",
    sr."ClosedAtUtc",
    latest_reason."LatestReason"
FROM "Orders" o
JOIN "BranchTables" bt ON bt."TableId"=o."TableId"
LEFT JOIN status_rollup sr ON sr."OrderId"=o."OrderId"
LEFT JOIN status_reason latest_reason ON latest_reason."OrderId"=o."OrderId" AND latest_reason."StatusCode"=o."OrderStatusCode"
WHERE o."TenantId"=p_tenantid
  AND o."BranchId"=p_branchid
  AND (p_includecompleted OR o."OrderStatusCode" NOT IN ('Completed','Cancelled','Served'))
ORDER BY CASE WHEN o."OrderStatusCode" IN ('Completed','Cancelled') THEN 1 ELSE 0 END,
         COALESCE(sr."ClosedAtUtc",o."CreatedAtUtc") DESC,
         o."CreatedAtUtc" DESC
LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.adminorder_updatestatus(p_tenantid uuid,p_branchid uuid,p_orderid uuid,p_orderstatuscode text,p_reason text,p_changedbyuserid uuid)
RETURNS TABLE("OrderId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"TableName" varchar,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"SubtotalAmount" numeric,"TotalAmount" numeric,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"AppliedOfferDiscountAmount" numeric,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz,"ClosedAtUtc" timestamptz,"LatestReason" varchar)
LANGUAGE plpgsql AS $$
DECLARE old_status text;
BEGIN
    IF p_orderstatuscode NOT IN ('Placed','Accepted','Preparing','Ready','Served','Completed','Cancelled','Void') THEN
        PERFORM public.raise_app_error(51707);
    END IF;

    SELECT o."OrderStatusCode"
    INTO old_status
    FROM "Orders" o
    WHERE o."TenantId"=p_tenantid AND o."BranchId"=p_branchid AND o."OrderId"=p_orderid;

    IF old_status IS NULL THEN
        PERFORM public.raise_app_error(51708);
    END IF;

    UPDATE "Orders" o
    SET "OrderStatusCode"=p_orderstatuscode,
        "UpdatedAtUtc"=public.app_now()
    WHERE o."OrderId"=p_orderid;

    INSERT INTO "OrderStatusHistory" ("OrderStatusHistoryId","TenantId","BranchId","OrderId","StatusCode","Reason","ChangedByUserId")
    VALUES (gen_random_uuid(),p_tenantid,p_branchid,p_orderid,p_orderstatuscode,p_reason,p_changedbyuserid);

    RETURN QUERY
    SELECT a.*
    FROM public.adminorder_getlistbybranch(p_tenantid,p_branchid,true) a
    WHERE a."OrderId"=p_orderid;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_orders(p_tenantid uuid,p_branchid uuid,p_datefrom timestamptz,p_dateto timestamptz,p_statuscode text,p_search text)
RETURNS TABLE("OrderId" uuid,"BranchId" uuid,"BranchName" varchar,"TableId" uuid,"TableName" varchar,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"TotalAmount" numeric,"ItemCount" integer,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz,"AcceptedAtUtc" timestamptz,"PreparingAtUtc" timestamptz,"ReadyAtUtc" timestamptz,"ServedAtUtc" timestamptz,"CompletedAtUtc" timestamptz,"CancelledAtUtc" timestamptz,"LatestReason" varchar)
LANGUAGE sql STABLE AS $$
WITH status_rollup AS (
    SELECT
        h."OrderId",
        MIN(h."CreatedAtUtc") FILTER (WHERE h."StatusCode"='Accepted') AS "AcceptedAtUtc",
        MIN(h."CreatedAtUtc") FILTER (WHERE h."StatusCode"='Preparing') AS "PreparingAtUtc",
        MIN(h."CreatedAtUtc") FILTER (WHERE h."StatusCode"='Ready') AS "ReadyAtUtc",
        MIN(h."CreatedAtUtc") FILTER (WHERE h."StatusCode"='Served') AS "ServedAtUtc",
        MIN(h."CreatedAtUtc") FILTER (WHERE h."StatusCode"='Completed') AS "CompletedAtUtc",
        MAX(h."CreatedAtUtc") FILTER (WHERE h."StatusCode" IN ('Cancelled','Void')) AS "CancelledAtUtc"
    FROM "OrderStatusHistory" h
    WHERE h."TenantId"=p_tenantid
    GROUP BY h."OrderId"
),
status_reason AS (
    SELECT DISTINCT ON (h."OrderId",h."StatusCode")
        h."OrderId",
        h."StatusCode",
        NULLIF(btrim(h."Reason"), '')::varchar AS "LatestReason"
    FROM "OrderStatusHistory" h
    WHERE h."TenantId"=p_tenantid
      AND (p_branchid IS NULL OR h."BranchId"=p_branchid)
      AND NULLIF(btrim(h."Reason"), '') IS NOT NULL
    ORDER BY h."OrderId",h."StatusCode",h."CreatedAtUtc" DESC
),
base_orders AS (
    SELECT
        o."OrderId",
        o."BranchId",
        b."Name" AS "BranchName",
        o."TableId",
        bt."Name" AS "TableName",
        o."OrderStatusCode",
        o."CustomerName",
        o."CustomerWhatsApp",
        o."Notes",
        o."TotalAmount",
        o."CreatedAtUtc",
        o."UpdatedAtUtc",
        sr."AcceptedAtUtc",
        sr."PreparingAtUtc",
        sr."ReadyAtUtc",
        sr."ServedAtUtc",
        sr."CompletedAtUtc",
        sr."CancelledAtUtc",
        latest_reason."LatestReason",
        CASE
            WHEN lower(COALESCE(p_statuscode,'')) IN ('cancelled','void') THEN COALESCE(sr."CancelledAtUtc",o."UpdatedAtUtc",o."CreatedAtUtc")
            WHEN lower(COALESCE(p_statuscode,''))='completed' THEN COALESCE(sr."CompletedAtUtc",o."UpdatedAtUtc",o."CreatedAtUtc")
            ELSE o."CreatedAtUtc"
        END AS "ReportAtUtc"
    FROM "Orders" o
    JOIN "Branches" b ON b."BranchId"=o."BranchId"
    JOIN "BranchTables" bt ON bt."TableId"=o."TableId"
    LEFT JOIN status_rollup sr ON sr."OrderId"=o."OrderId"
    LEFT JOIN status_reason latest_reason ON latest_reason."OrderId"=o."OrderId" AND latest_reason."StatusCode"=o."OrderStatusCode"
    WHERE o."TenantId"=p_tenantid
      AND (p_branchid IS NULL OR o."BranchId"=p_branchid)
      AND (p_statuscode IS NULL OR lower(o."OrderStatusCode")=lower(p_statuscode))
)
SELECT
    bo."OrderId",
    bo."BranchId",
    bo."BranchName",
    bo."TableId",
    bo."TableName",
    bo."OrderStatusCode",
    bo."CustomerName",
    bo."CustomerWhatsApp",
    bo."Notes",
    bo."TotalAmount",
    COUNT(oi."OrderItemId")::integer,
    bo."CreatedAtUtc",
    bo."UpdatedAtUtc",
    bo."AcceptedAtUtc",
    bo."PreparingAtUtc",
    bo."ReadyAtUtc",
    bo."ServedAtUtc",
    bo."CompletedAtUtc",
    bo."CancelledAtUtc",
    bo."LatestReason"
FROM base_orders bo
LEFT JOIN "OrderItems" oi ON oi."OrderId"=bo."OrderId"
WHERE (p_datefrom IS NULL OR bo."ReportAtUtc">=p_datefrom)
  AND (p_dateto IS NULL OR bo."ReportAtUtc"<p_dateto)
  AND (
      p_search IS NULL
      OR bo."CustomerName" ILIKE '%'||p_search||'%'
      OR bo."CustomerWhatsApp" ILIKE '%'||p_search||'%'
      OR bo."TableName" ILIKE '%'||p_search||'%'
      OR bo."OrderId"::text ILIKE '%'||p_search||'%'
  )
GROUP BY bo."OrderId",bo."BranchId",bo."BranchName",bo."TableId",bo."TableName",bo."OrderStatusCode",bo."CustomerName",bo."CustomerWhatsApp",bo."Notes",bo."TotalAmount",bo."CreatedAtUtc",bo."UpdatedAtUtc",bo."AcceptedAtUtc",bo."PreparingAtUtc",bo."ReadyAtUtc",bo."ServedAtUtc",bo."CompletedAtUtc",bo."CancelledAtUtc",bo."LatestReason",bo."ReportAtUtc"
ORDER BY bo."ReportAtUtc" DESC,bo."CreatedAtUtc" DESC
LIMIT 500;
$$;
