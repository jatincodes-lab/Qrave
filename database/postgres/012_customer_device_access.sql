-- Secure, revocable credentials used to recognize a returning customer on one device.
-- Only a SHA-256 token hash is stored; the raw credential remains in the customer's browser.

CREATE TABLE IF NOT EXISTS "CustomerDeviceAccessTokens" (
    "CustomerDeviceAccessTokenId" uuid PRIMARY KEY,
    "TenantId" uuid NOT NULL REFERENCES "Tenants" ("TenantId") ON DELETE CASCADE,
    "BranchId" uuid NOT NULL REFERENCES "Branches" ("BranchId") ON DELETE CASCADE,
    "CustomerId" uuid NOT NULL REFERENCES "Customers" ("CustomerId") ON DELETE CASCADE,
    "TokenHash" varchar(64) NOT NULL,
    "ExpiresAtUtc" timestamptz NOT NULL,
    "RevokedAtUtc" timestamptz NULL,
    "CreatedAtUtc" timestamptz NOT NULL DEFAULT public.app_now(),
    CONSTRAINT "UQ_CustomerDeviceAccessTokens_TokenHash" UNIQUE ("TokenHash")
);

CREATE INDEX IF NOT EXISTS "IX_CustomerDeviceAccessTokens_Customer_ExpiresAtUtc"
ON "CustomerDeviceAccessTokens" ("CustomerId", "ExpiresAtUtc" DESC);

-- The history endpoint is credential-protected, so it can return the customer's full branch history.
CREATE OR REPLACE FUNCTION public.publiccustomer_recentordersbycustomer(p_customerid uuid)
RETURNS TABLE("OrderId" uuid,"CreatedAtUtc" timestamptz,"TotalAmount" numeric)
LANGUAGE sql STABLE AS $$
    SELECT o."OrderId",o."CreatedAtUtc",o."TotalAmount"
    FROM "Orders" o
    WHERE o."CustomerId"=p_customerid
    ORDER BY o."CreatedAtUtc" DESC;
$$;

CREATE OR REPLACE FUNCTION public.publiccustomer_recentorderitemsbycustomer(p_customerid uuid)
RETURNS TABLE("OrderId" uuid,"MenuItemId" uuid,"MenuItemVariantId" uuid,"MenuItemName" varchar,"VariantName" varchar,"ItemNote" varchar,"DietTypeCode" varchar,"Quantity" integer)
LANGUAGE sql STABLE AS $$
    SELECT oi."OrderId",oi."MenuItemId",oi."MenuItemVariantId",oi."MenuItemName",oi."VariantName",oi."ItemNote",oi."DietTypeCode",oi."Quantity"
    FROM "OrderItems" oi
    JOIN "Orders" o ON o."OrderId"=oi."OrderId"
    WHERE o."CustomerId"=p_customerid
    ORDER BY o."CreatedAtUtc" DESC,oi."RowId";
$$;
