-- Secure, revocable credentials used to view one public order from the device that placed it.
-- Only a SHA-256 token hash is stored; the raw credential remains in the customer's browser.

CREATE TABLE IF NOT EXISTS "OrderTrackingAccessTokens" (
    "OrderTrackingAccessTokenId" uuid PRIMARY KEY,
    "TenantId" uuid NOT NULL REFERENCES "Tenants" ("TenantId") ON DELETE CASCADE,
    "BranchId" uuid NOT NULL REFERENCES "Branches" ("BranchId") ON DELETE CASCADE,
    "OrderId" uuid NOT NULL REFERENCES "Orders" ("OrderId") ON DELETE CASCADE,
    "TokenHash" varchar(64) NOT NULL,
    "ExpiresAtUtc" timestamptz NOT NULL,
    "RevokedAtUtc" timestamptz NULL,
    "CreatedAtUtc" timestamptz NOT NULL DEFAULT public.app_now(),
    CONSTRAINT "UQ_OrderTrackingAccessTokens_TokenHash" UNIQUE ("TokenHash")
);

CREATE INDEX IF NOT EXISTS "IX_OrderTrackingAccessTokens_Order_ExpiresAtUtc"
ON "OrderTrackingAccessTokens" ("OrderId", "ExpiresAtUtc" DESC);

