INSERT INTO "Tenants" (
    "TenantId", "Name", "Slug", "OwnerEmail", "PlanCode", "TrialStartAtUtc", "TrialEndAtUtc",
    "SubscriptionStatusCode", "AccountStatusCode", "IsActive"
)
VALUES (
    '11111111-1111-1111-1111-111111111111', 'Demo Cafe', 'demo-cafe', 'owner.demo@example.com',
    'trial', public.app_now(), public.app_now() + interval '30 days', 'Trialing', 'Active', true
)
ON CONFLICT ("TenantId") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Slug" = EXCLUDED."Slug",
    "OwnerEmail" = EXCLUDED."OwnerEmail",
    "IsActive" = true,
    "UpdatedAtUtc" = public.app_now();

INSERT INTO "Users" ("UserId", "Email", "DisplayName", "PasswordHash", "IsActive")
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'owner.demo@example.com',
    'Demo Owner',
    'PBKDF2-SHA256.210000.AQIDBAUGBwgJCgsMDQ4PEA==.aqb9/rntHgkyRoNTsa9TADb00puDnCpDhptYz2i5gx4=',
    true
)
ON CONFLICT ("UserId") DO UPDATE SET
    "Email" = EXCLUDED."Email",
    "DisplayName" = EXCLUDED."DisplayName",
    "PasswordHash" = EXCLUDED."PasswordHash",
    "IsActive" = true,
    "UpdatedAtUtc" = public.app_now();

INSERT INTO "Branches" (
    "BranchId", "TenantId", "Name", "PhoneNumber", "AddressLine1", "City", "State", "PostalCode", "CountryCode", "IsActive"
)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Main Branch',
    '+919999999999',
    'Civil Lines',
    'Bareilly',
    'Uttar Pradesh',
    '243001',
    'IN',
    true
)
ON CONFLICT ("BranchId") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "PhoneNumber" = EXCLUDED."PhoneNumber",
    "AddressLine1" = EXCLUDED."AddressLine1",
    "City" = EXCLUDED."City",
    "State" = EXCLUDED."State",
    "PostalCode" = EXCLUDED."PostalCode",
    "CountryCode" = EXCLUDED."CountryCode",
    "IsActive" = true,
    "UpdatedAtUtc" = public.app_now();

INSERT INTO "TenantUsers" ("TenantUserId", "TenantId", "UserId", "BranchId", "RoleCode", "IsActive")
VALUES (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    NULL,
    'owner',
    true
)
ON CONFLICT ("TenantUserId") DO UPDATE SET
    "BranchId" = EXCLUDED."BranchId",
    "RoleCode" = EXCLUDED."RoleCode",
    "IsActive" = true,
    "UpdatedAtUtc" = public.app_now();

INSERT INTO "BranchOrderSettings" (
    "BranchOrderSettingsId", "TenantId", "BranchId", "EnableDirectQrOrdering",
    "RequireCustomerName", "RequireCustomerWhatsApp", "WaiterCallEnabled"
)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    true,
    false,
    false,
    true
)
ON CONFLICT ("TenantId", "BranchId") DO UPDATE SET
    "EnableDirectQrOrdering" = true,
    "RequireCustomerName" = false,
    "RequireCustomerWhatsApp" = false,
    "WaiterCallEnabled" = true,
    "UpdatedAtUtc" = public.app_now();

INSERT INTO "MenuCategories" ("MenuCategoryId", "TenantId", "BranchId", "Name", "DisplayOrder", "IsActive")
VALUES
    ('66666666-6666-6666-6666-666666666661', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Beverages', 1, true),
    ('66666666-6666-6666-6666-666666666662', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Snacks', 2, true)
ON CONFLICT ("MenuCategoryId") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "DisplayOrder" = EXCLUDED."DisplayOrder",
    "IsActive" = true,
    "UpdatedAtUtc" = public.app_now();

INSERT INTO "MenuItems" (
    "MenuItemId", "TenantId", "BranchId", "MenuCategoryId", "Name", "Description",
    "Price", "IsAvailable", "IsActive", "DisplayOrder", "ImageAltText"
)
VALUES
    ('77777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666661', 'Masala Chai', 'Classic Indian tea with spices.', 40.00, true, true, 1, 'Masala chai'),
    ('77777777-7777-7777-7777-777777777772', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666661', 'Cold Coffee', 'Chilled coffee with milk and ice.', 120.00, true, true, 2, 'Cold coffee'),
    ('77777777-7777-7777-7777-777777777773', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666662', 'Veg Sandwich', 'Toasted sandwich with fresh vegetables.', 150.00, true, true, 1, 'Veg sandwich')
ON CONFLICT ("MenuItemId") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "Price" = EXCLUDED."Price",
    "IsAvailable" = true,
    "IsActive" = true,
    "DisplayOrder" = EXCLUDED."DisplayOrder",
    "ImageAltText" = EXCLUDED."ImageAltText",
    "UpdatedAtUtc" = public.app_now();

INSERT INTO "MenuItemVariants" (
    "MenuItemVariantId", "TenantId", "BranchId", "MenuItemId", "Name", "Price", "IsAvailable", "DisplayOrder"
)
VALUES
    ('88888888-8888-8888-8888-888888888881', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777771', 'Regular', 40.00, true, 1),
    ('88888888-8888-8888-8888-888888888882', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777771', 'Large', 60.00, true, 2),
    ('88888888-8888-8888-8888-888888888883', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777772', 'Regular', 120.00, true, 1)
ON CONFLICT ("MenuItemVariantId") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Price" = EXCLUDED."Price",
    "IsAvailable" = true,
    "DisplayOrder" = EXCLUDED."DisplayOrder",
    "UpdatedAtUtc" = public.app_now();

INSERT INTO "BranchTables" ("TableId", "TenantId", "BranchId", "Name", "DisplayOrder", "QrToken", "IsActive")
VALUES (
    '99999999-9999-9999-9999-999999999991',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Table 1',
    1,
    'demo-table-1',
    true
)
ON CONFLICT ("TableId") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "DisplayOrder" = EXCLUDED."DisplayOrder",
    "QrToken" = EXCLUDED."QrToken",
    "IsActive" = true,
    "UpdatedAtUtc" = public.app_now();

INSERT INTO "BranchOffers" (
    "BranchOfferId", "TenantId", "BranchId", "Title", "Subtitle", "DiscountText",
    "DisplayOrder", "DiscountTypeCode", "DiscountValue", "MinimumOrderAmount", "MaxDiscountAmount", "AutoApply", "IsActive"
)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Demo Welcome Offer',
    'Auto-applies on orders above Rs 200',
    '10% off',
    1,
    'Percentage',
    10.00,
    200.00,
    75.00,
    true,
    true
)
ON CONFLICT ("BranchOfferId") DO UPDATE SET
    "Title" = EXCLUDED."Title",
    "Subtitle" = EXCLUDED."Subtitle",
    "DiscountText" = EXCLUDED."DiscountText",
    "DisplayOrder" = EXCLUDED."DisplayOrder",
    "DiscountTypeCode" = EXCLUDED."DiscountTypeCode",
    "DiscountValue" = EXCLUDED."DiscountValue",
    "MinimumOrderAmount" = EXCLUDED."MinimumOrderAmount",
    "MaxDiscountAmount" = EXCLUDED."MaxDiscountAmount",
    "AutoApply" = true,
    "IsActive" = true,
    "UpdatedAtUtc" = public.app_now();

INSERT INTO "BranchBillingSettings" (
    "BranchBillingSettingsId", "TenantId", "BranchId", "TaxEnabled", "TaxName", "TaxRate", "TaxMode",
    "ServiceChargeEnabled", "ServiceChargeName", "ServiceChargeRate", "DiscountEnabled", "StaffCanApplyDiscount", "RoundingMode"
)
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    true,
    'GST',
    5.00,
    'Exclusive',
    false,
    '',
    0.00,
    true,
    true,
    'NearestRupee'
)
ON CONFLICT ("TenantId", "BranchId") DO UPDATE SET
    "TaxEnabled" = EXCLUDED."TaxEnabled",
    "TaxName" = EXCLUDED."TaxName",
    "TaxRate" = EXCLUDED."TaxRate",
    "TaxMode" = EXCLUDED."TaxMode",
    "ServiceChargeEnabled" = EXCLUDED."ServiceChargeEnabled",
    "ServiceChargeName" = EXCLUDED."ServiceChargeName",
    "ServiceChargeRate" = EXCLUDED."ServiceChargeRate",
    "DiscountEnabled" = EXCLUDED."DiscountEnabled",
    "StaffCanApplyDiscount" = EXCLUDED."StaffCanApplyDiscount",
    "RoundingMode" = EXCLUDED."RoundingMode",
    "UpdatedAtUtc" = public.app_now();
