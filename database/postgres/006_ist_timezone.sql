SET TIME ZONE 'Asia/Kolkata';

CREATE OR REPLACE FUNCTION public.app_now()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$ SELECT CURRENT_TIMESTAMP; $$;

DO $$
DECLARE
    db_name text := current_database();
BEGIN
    EXECUTE format('ALTER DATABASE %I SET TimeZone TO %L', db_name, 'Asia/Kolkata');
END;
$$;

ALTER TABLE "Tenants" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "Users" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "TenantUsers" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "Branches" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "BranchOrderSettings" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "MenuCategories" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "MenuItems" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "MenuItemVariants" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "BranchOffers" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "BranchTables" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "Customers" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "Orders" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "OrderItems" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "OrderStatusHistory" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "WaiterCalls" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "WhatsAppCampaigns" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "WhatsAppCampaignRecipients" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "AdminNotifications" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "BranchBillingSettings" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "OrderBills" ALTER COLUMN "GeneratedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "OrderBillAuditEntries" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
ALTER TABLE "OrderFeedback" ALTER COLUMN "CreatedAtUtc" SET DEFAULT public.app_now();
