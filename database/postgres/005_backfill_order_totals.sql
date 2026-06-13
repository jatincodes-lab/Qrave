-- Backfill orders created before server-side tax/service/rounding totals were persisted.
-- If a bill exists, its snapshot total is authoritative. Otherwise recalculate from
-- current branch billing settings using the same rules as publicorder_createfromqrtoken.
WITH recalculated AS (
    SELECT
        o."OrderId",
        COALESCE(
            ob."TotalAmount",
            round(
                (
                    CASE
                        WHEN COALESCE(bs."TaxMode",'Exclusive') = 'Inclusive' THEN totals.taxable
                        ELSE totals.taxable + totals.tax
                    END
                    + totals.service_charge
                    + CASE
                        WHEN COALESCE(bs."RoundingMode",'None') IN ('NearestRupee','Nearest')
                            THEN round(
                                (
                                    CASE
                                        WHEN COALESCE(bs."TaxMode",'Exclusive') = 'Inclusive' THEN totals.taxable
                                        ELSE totals.taxable + totals.tax
                                    END
                                    + totals.service_charge
                                ),
                                0
                            ) - (
                                CASE
                                    WHEN COALESCE(bs."TaxMode",'Exclusive') = 'Inclusive' THEN totals.taxable
                                    ELSE totals.taxable + totals.tax
                                END
                                + totals.service_charge
                            )
                        ELSE 0
                    END
                ),
                2
            )
        ) AS "TotalAmount"
    FROM "Orders" o
    LEFT JOIN "OrderBills" ob ON ob."OrderId" = o."OrderId"
    LEFT JOIN "BranchBillingSettings" bs ON bs."TenantId" = o."TenantId" AND bs."BranchId" = o."BranchId"
    CROSS JOIN LATERAL (
        SELECT round(GREATEST(o."SubtotalAmount" - COALESCE(o."AppliedOfferDiscountAmount",0),0),2) AS taxable
    ) base
    CROSS JOIN LATERAL (
        SELECT
            base.taxable,
            CASE
                WHEN COALESCE(bs."TaxEnabled",false) AND COALESCE(bs."TaxRate",0) > 0 THEN
                    CASE
                        WHEN COALESCE(bs."TaxMode",'Exclusive') = 'Inclusive'
                            THEN round(base.taxable - base.taxable / (1 + COALESCE(bs."TaxRate",0) / 100),2)
                        ELSE round(base.taxable * COALESCE(bs."TaxRate",0) / 100,2)
                    END
                ELSE 0
            END AS tax,
            CASE
                WHEN COALESCE(bs."ServiceChargeEnabled",false) AND COALESCE(bs."ServiceChargeRate",0) > 0
                    THEN round(base.taxable * COALESCE(bs."ServiceChargeRate",0) / 100,2)
                ELSE 0
            END AS service_charge
    ) totals
)
UPDATE "Orders" o
SET "TotalAmount" = recalculated."TotalAmount",
    "UpdatedAtUtc" = public.app_now()
FROM recalculated
WHERE o."OrderId" = recalculated."OrderId"
  AND o."TotalAmount" IS DISTINCT FROM recalculated."TotalAmount";
