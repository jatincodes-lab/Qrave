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
        MAX(h."CreatedAtUtc") FILTER (WHERE h."StatusCode" IN ('Cancelled','Void')) AS "CancelledAtUtc",
        (array_agg(NULLIF(btrim(h."Reason"), '') ORDER BY h."CreatedAtUtc" DESC) FILTER (WHERE NULLIF(btrim(h."Reason"), '') IS NOT NULL))[1]::varchar AS "LatestReason"
    FROM "OrderStatusHistory" h
    WHERE h."TenantId"=p_tenantid
    GROUP BY h."OrderId"
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
        sr."LatestReason",
        CASE
            WHEN lower(COALESCE(p_statuscode,'')) IN ('cancelled','void') THEN COALESCE(sr."CancelledAtUtc",o."UpdatedAtUtc",o."CreatedAtUtc")
            WHEN lower(COALESCE(p_statuscode,''))='completed' THEN COALESCE(sr."CompletedAtUtc",o."UpdatedAtUtc",o."CreatedAtUtc")
            ELSE o."CreatedAtUtc"
        END AS "ReportAtUtc"
    FROM "Orders" o
    JOIN "Branches" b ON b."BranchId"=o."BranchId"
    JOIN "BranchTables" bt ON bt."TableId"=o."TableId"
    LEFT JOIN status_rollup sr ON sr."OrderId"=o."OrderId"
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

CREATE OR REPLACE FUNCTION public.report_ordersummary(p_tenantid uuid,p_branchid uuid,p_datefrom timestamptz,p_dateto timestamptz,p_statuscode text,p_search text)
RETURNS TABLE("TotalOrders" integer,"CompletedOrders" integer,"CancelledOrders" integer,"TotalOrderValue" numeric,"AverageOrderValue" numeric,"AverageReadyMinutes" numeric)
LANGUAGE sql STABLE AS $$
WITH status_rollup AS (
    SELECT
        h."OrderId",
        MIN(h."CreatedAtUtc") FILTER (WHERE h."StatusCode"='Completed') AS "CompletedAtUtc",
        MAX(h."CreatedAtUtc") FILTER (WHERE h."StatusCode" IN ('Cancelled','Void')) AS "CancelledAtUtc"
    FROM "OrderStatusHistory" h
    WHERE h."TenantId"=p_tenantid
    GROUP BY h."OrderId"
),
filtered_orders AS (
    SELECT
        o."OrderId",
        o."OrderStatusCode",
        o."TotalAmount",
        CASE
            WHEN lower(COALESCE(p_statuscode,'')) IN ('cancelled','void') THEN COALESCE(sr."CancelledAtUtc",o."UpdatedAtUtc",o."CreatedAtUtc")
            WHEN lower(COALESCE(p_statuscode,''))='completed' THEN COALESCE(sr."CompletedAtUtc",o."UpdatedAtUtc",o."CreatedAtUtc")
            ELSE o."CreatedAtUtc"
        END AS "ReportAtUtc"
    FROM "Orders" o
    JOIN "BranchTables" bt ON bt."TableId"=o."TableId"
    LEFT JOIN status_rollup sr ON sr."OrderId"=o."OrderId"
    WHERE o."TenantId"=p_tenantid
      AND (p_branchid IS NULL OR o."BranchId"=p_branchid)
      AND (p_statuscode IS NULL OR lower(o."OrderStatusCode")=lower(p_statuscode))
      AND (
          p_search IS NULL
          OR o."CustomerName" ILIKE '%'||p_search||'%'
          OR o."CustomerWhatsApp" ILIKE '%'||p_search||'%'
          OR bt."Name" ILIKE '%'||p_search||'%'
          OR o."OrderId"::text ILIKE '%'||p_search||'%'
      )
)
SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE "OrderStatusCode"='Completed')::integer,
    COUNT(*) FILTER (WHERE "OrderStatusCode" IN ('Cancelled','Void'))::integer,
    COALESCE(SUM("TotalAmount"),0),
    COALESCE(AVG("TotalAmount"),0),
    0::numeric
FROM filtered_orders
WHERE (p_datefrom IS NULL OR "ReportAtUtc">=p_datefrom)
  AND (p_dateto IS NULL OR "ReportAtUtc"<p_dateto);
$$;
