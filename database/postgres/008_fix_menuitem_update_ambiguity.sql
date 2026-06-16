CREATE OR REPLACE FUNCTION public.menuitem_update(p_tenantid uuid,p_branchid uuid,p_menuitemid uuid,p_menucategoryid uuid,p_name text,p_description text,p_price numeric,p_diettypecode text,p_isavailable boolean,p_isactive boolean,p_displayorder integer,p_imageurl text,p_imagealttext text,p_variantsjson text)
RETURNS TABLE("MenuItemId" uuid,"TenantId" uuid,"BranchId" uuid,"MenuCategoryId" uuid,"CategoryName" varchar,"Name" varchar,"Description" varchar,"Price" numeric,"DietTypeCode" varchar,"IsAvailable" boolean,"IsActive" boolean,"DisplayOrder" integer,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz,"ImageUrl" varchar,"ImageAltText" varchar,"VariantsJson" text)
LANGUAGE plpgsql AS $$
BEGIN
    IF COALESCE(NULLIF(p_diettypecode,''),'Unspecified') NOT IN ('Unspecified','Veg','NonVeg','Vegan','Egg','Jain') THEN PERFORM public.raise_app_error(51504); END IF;
    IF NOT EXISTS (SELECT 1 FROM "MenuCategories" mc WHERE mc."TenantId"=p_tenantid AND mc."BranchId"=p_branchid AND mc."MenuCategoryId"=p_menucategoryid AND mc."IsActive") THEN PERFORM public.raise_app_error(51501); END IF;
    UPDATE "MenuItems" mi SET "MenuCategoryId"=p_menucategoryid,"Name"=p_name,"Description"=p_description,"Price"=p_price,"DietTypeCode"=COALESCE(NULLIF(p_diettypecode,''),'Unspecified'),"IsAvailable"=p_isavailable,"IsActive"=p_isactive,"DisplayOrder"=p_displayorder,"ImageUrl"=p_imageurl,"ImageAltText"=p_imagealttext,"UpdatedAtUtc"=public.app_now()
    WHERE mi."TenantId"=p_tenantid AND mi."BranchId"=p_branchid AND mi."MenuItemId"=p_menuitemid;
    IF NOT FOUND THEN PERFORM public.raise_app_error(51503); END IF;
    PERFORM public.menuitem_upsert_variants(p_tenantid,p_branchid,p_menuitemid,p_variantsjson);
    RETURN QUERY SELECT selected.* FROM public.menuitem_select(p_tenantid,p_branchid,p_menuitemid,true) selected;
EXCEPTION WHEN unique_violation THEN PERFORM public.raise_app_error(51502);
END;
$$;
