ALTER TABLE "MenuItems"
ADD COLUMN IF NOT EXISTS "DietTypeCode" varchar(32) NOT NULL DEFAULT 'Unspecified';

ALTER TABLE "OrderItems"
ADD COLUMN IF NOT EXISTS "DietTypeCode" varchar(32) NOT NULL DEFAULT 'Unspecified';

DROP FUNCTION IF EXISTS public.menuitem_getlistbybranch(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.menuitem_create(uuid, uuid, uuid, uuid, text, text, numeric, boolean, integer, text, text, text);
DROP FUNCTION IF EXISTS public.menuitem_update(uuid, uuid, uuid, uuid, text, text, numeric, boolean, boolean, integer, text, text, text);
DROP FUNCTION IF EXISTS public.menuitem_select(uuid, uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.menuitem_row();
DROP FUNCTION IF EXISTS public.publicmenu_getbybranch(uuid);
DROP FUNCTION IF EXISTS public.publicmenu_getbyqrtoken(text);
DROP FUNCTION IF EXISTS public.publicorder_getitemsbyorder(uuid);
DROP FUNCTION IF EXISTS public.adminorder_getitemsbybranch(uuid, uuid);
DROP FUNCTION IF EXISTS public.publiccustomer_recentorderitemsbycustomer(uuid);
DROP FUNCTION IF EXISTS public.report_orderitemsbyorder(uuid, uuid);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'CK_MenuItems_DietTypeCode'
    ) THEN
        ALTER TABLE "MenuItems"
        ADD CONSTRAINT "CK_MenuItems_DietTypeCode"
        CHECK ("DietTypeCode" IN ('Unspecified', 'Veg', 'NonVeg', 'Vegan', 'Egg', 'Jain'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'CK_OrderItems_DietTypeCode'
    ) THEN
        ALTER TABLE "OrderItems"
        ADD CONSTRAINT "CK_OrderItems_DietTypeCode"
        CHECK ("DietTypeCode" IN ('Unspecified', 'Veg', 'NonVeg', 'Vegan', 'Egg', 'Jain'));
    END IF;
END $$;
