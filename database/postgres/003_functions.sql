SET TIME ZONE 'Asia/Kolkata';

CREATE OR REPLACE FUNCTION public.app_now()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$ SELECT CURRENT_TIMESTAMP; $$;

CREATE OR REPLACE FUNCTION public.raise_app_error(code integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION '%', code USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_create(p_tenantid uuid, p_name text, p_slug text, p_owneremail text)
RETURNS SETOF "Tenants" LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO "Tenants" ("TenantId","Name","Slug","OwnerEmail","TrialStartAtUtc","TrialEndAtUtc")
    VALUES (p_tenantid, p_name, p_slug, p_owneremail, public.app_now(), public.app_now() + interval '14 days');
    RETURN QUERY SELECT * FROM "Tenants" WHERE "TenantId" = p_tenantid;
EXCEPTION WHEN unique_violation THEN
    IF EXISTS (SELECT 1 FROM "Tenants" WHERE "Slug" = p_slug) THEN PERFORM public.raise_app_error(51001); END IF;
    PERFORM public.raise_app_error(51002);
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_getbyid(p_tenantid uuid)
RETURNS SETOF "Tenants" LANGUAGE sql STABLE AS $$
    SELECT * FROM "Tenants" WHERE "TenantId" = p_tenantid;
$$;

CREATE OR REPLACE FUNCTION public.tenantaccess_getbytenantid(p_tenantid uuid)
RETURNS TABLE("TenantId" uuid,"PlanCode" varchar,"TrialStartAtUtc" timestamptz,"TrialEndAtUtc" timestamptz,"SubscriptionStatusCode" varchar,"AccountStatusCode" varchar,"IsTenantActive" boolean)
LANGUAGE sql STABLE AS $$
    SELECT "TenantId","PlanCode","TrialStartAtUtc","TrialEndAtUtc","SubscriptionStatusCode","AccountStatusCode","IsActive"
    FROM "Tenants" WHERE "TenantId" = p_tenantid;
$$;

CREATE OR REPLACE FUNCTION public.tenantaccess_getbyqrtoken(p_qrtoken text)
RETURNS TABLE("TenantId" uuid,"PlanCode" varchar,"TrialStartAtUtc" timestamptz,"TrialEndAtUtc" timestamptz,"SubscriptionStatusCode" varchar,"AccountStatusCode" varchar,"IsTenantActive" boolean)
LANGUAGE sql STABLE AS $$
    SELECT t."TenantId",t."PlanCode",t."TrialStartAtUtc",t."TrialEndAtUtc",t."SubscriptionStatusCode",t."AccountStatusCode",t."IsActive"
    FROM "BranchTables" bt JOIN "Tenants" t ON t."TenantId" = bt."TenantId"
    WHERE bt."QrToken" = p_qrtoken AND bt."IsActive" = true;
$$;

CREATE OR REPLACE FUNCTION public.tenantsubscription_getbytenantid(p_tenantid uuid)
RETURNS TABLE("TenantId" uuid,"Name" varchar,"Slug" varchar,"OwnerEmail" varchar,"PlanCode" varchar,"TrialStartAtUtc" timestamptz,"TrialEndAtUtc" timestamptz,"SubscriptionStatusCode" varchar,"AccountStatusCode" varchar,"IsTenantActive" boolean,"SubscriptionUpdatedAtUtc" timestamptz,"SubscriptionNotes" varchar)
LANGUAGE sql STABLE AS $$
    SELECT "TenantId","Name","Slug","OwnerEmail","PlanCode","TrialStartAtUtc","TrialEndAtUtc","SubscriptionStatusCode","AccountStatusCode","IsActive","SubscriptionUpdatedAtUtc","SubscriptionNotes"
    FROM "Tenants" WHERE "TenantId" = p_tenantid;
$$;

CREATE OR REPLACE FUNCTION public.tenantsubscription_updatemanual(p_tenantid uuid, p_plancode text, p_subscriptionstatuscode text, p_accountstatuscode text, p_trialendatutc timestamptz, p_subscriptionnotes text)
RETURNS TABLE("TenantId" uuid,"Name" varchar,"Slug" varchar,"OwnerEmail" varchar,"PlanCode" varchar,"TrialStartAtUtc" timestamptz,"TrialEndAtUtc" timestamptz,"SubscriptionStatusCode" varchar,"AccountStatusCode" varchar,"IsTenantActive" boolean,"SubscriptionUpdatedAtUtc" timestamptz,"SubscriptionNotes" varchar)
LANGUAGE plpgsql AS $$
BEGIN
    IF p_subscriptionstatuscode NOT IN ('Trialing','Active','ManualActive','PastDue','Suspended','Cancelled','Expired') THEN PERFORM public.raise_app_error(51902); END IF;
    IF p_accountstatuscode NOT IN ('Active','Inactive') THEN PERFORM public.raise_app_error(51903); END IF;
    UPDATE "Tenants" SET
        "PlanCode" = p_plancode,
        "SubscriptionStatusCode" = p_subscriptionstatuscode,
        "AccountStatusCode" = p_accountstatuscode,
        "TrialEndAtUtc" = p_trialendatutc,
        "SubscriptionNotes" = p_subscriptionnotes,
        "SubscriptionUpdatedAtUtc" = public.app_now(),
        "UpdatedAtUtc" = public.app_now()
    WHERE "TenantId" = p_tenantid;
    IF NOT FOUND THEN PERFORM public.raise_app_error(51905); END IF;
    RETURN QUERY SELECT * FROM public.tenantsubscription_getbytenantid(p_tenantid);
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_registertenantowner(p_tenantid uuid, p_userid uuid, p_tenantuserid uuid, p_tenantname text, p_tenantslug text, p_owneremail text, p_ownerdisplayname text, p_passwordhash text)
RETURNS TABLE("UserId" uuid,"Email" varchar,"DisplayName" varchar,"TenantId" uuid,"TenantName" varchar,"TenantSlug" varchar,"RoleCode" varchar,"BranchId" uuid,"PlanCode" varchar,"TrialStartAtUtc" timestamptz,"TrialEndAtUtc" timestamptz,"SubscriptionStatusCode" varchar,"AccountStatusCode" varchar,"IsTenantActive" boolean)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO "Tenants" ("TenantId","Name","Slug","OwnerEmail","TrialStartAtUtc","TrialEndAtUtc")
    VALUES (p_tenantid,p_tenantname,p_tenantslug,p_owneremail,public.app_now(),public.app_now() + interval '14 days');
    INSERT INTO "Users" ("UserId","Email","DisplayName","PasswordHash") VALUES (p_userid,p_owneremail,p_ownerdisplayname,p_passwordhash);
    INSERT INTO "TenantUsers" ("TenantUserId","TenantId","UserId","RoleCode") VALUES (p_tenantuserid,p_tenantid,p_userid,'owner');
    RETURN QUERY
    SELECT u."UserId",u."Email",u."DisplayName",t."TenantId",t."Name",t."Slug",tu."RoleCode",tu."BranchId",t."PlanCode",t."TrialStartAtUtc",t."TrialEndAtUtc",t."SubscriptionStatusCode",t."AccountStatusCode",t."IsActive"
    FROM "Users" u JOIN "TenantUsers" tu ON tu."UserId"=u."UserId" JOIN "Tenants" t ON t."TenantId"=tu."TenantId"
    WHERE u."UserId"=p_userid;
EXCEPTION WHEN unique_violation THEN
    IF EXISTS (SELECT 1 FROM "Tenants" WHERE "Slug" = p_tenantslug) THEN PERFORM public.raise_app_error(51001); END IF;
    IF EXISTS (SELECT 1 FROM "Users" WHERE "Email" = p_owneremail) THEN PERFORM public.raise_app_error(51301); END IF;
    PERFORM public.raise_app_error(51002);
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_getuserbyemail(p_email text)
RETURNS TABLE("UserId" uuid,"Email" varchar,"DisplayName" varchar,"PasswordHash" varchar,"TenantId" uuid,"TenantName" varchar,"TenantSlug" varchar,"RoleCode" varchar,"BranchId" uuid,"PlanCode" varchar,"TrialStartAtUtc" timestamptz,"TrialEndAtUtc" timestamptz,"SubscriptionStatusCode" varchar,"AccountStatusCode" varchar,"IsTenantActive" boolean)
LANGUAGE sql STABLE AS $$
    SELECT u."UserId",u."Email",u."DisplayName",u."PasswordHash",t."TenantId",t."Name",t."Slug",tu."RoleCode",tu."BranchId",t."PlanCode",t."TrialStartAtUtc",t."TrialEndAtUtc",t."SubscriptionStatusCode",t."AccountStatusCode",t."IsActive"
    FROM "Users" u JOIN "TenantUsers" tu ON tu."UserId"=u."UserId" AND tu."IsActive"=true JOIN "Tenants" t ON t."TenantId"=tu."TenantId"
    WHERE lower(u."Email")=lower(p_email) AND u."IsActive"=true
    ORDER BY tu."CreatedAtUtc" LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.branch_create(p_tenantid uuid,p_branchid uuid,p_name text,p_phonenumber text,p_addressline1 text,p_addressline2 text,p_city text,p_state text,p_postalcode text,p_countrycode text,p_logourl text,p_logopublicid text)
RETURNS SETOF "Branches" LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Tenants" WHERE "TenantId"=p_tenantid AND "IsActive") THEN PERFORM public.raise_app_error(51101); END IF;
    INSERT INTO "Branches" ("BranchId","TenantId","Name","PhoneNumber","AddressLine1","AddressLine2","City","State","PostalCode","CountryCode","LogoUrl","LogoPublicId")
    VALUES (p_branchid,p_tenantid,p_name,p_phonenumber,p_addressline1,p_addressline2,p_city,p_state,p_postalcode,COALESCE(NULLIF(p_countrycode,''),'IN'),p_logourl,p_logopublicid);
    RETURN QUERY SELECT * FROM "Branches" WHERE "BranchId"=p_branchid;
EXCEPTION WHEN unique_violation THEN PERFORM public.raise_app_error(51102);
END;
$$;

CREATE OR REPLACE FUNCTION public.branch_update(p_tenantid uuid,p_branchid uuid,p_name text,p_phonenumber text,p_addressline1 text,p_addressline2 text,p_city text,p_state text,p_postalcode text,p_countrycode text,p_logourl text,p_logopublicid text,p_isactive boolean)
RETURNS SETOF "Branches" LANGUAGE plpgsql AS $$
BEGIN
    UPDATE "Branches" SET "Name"=p_name,"PhoneNumber"=p_phonenumber,"AddressLine1"=p_addressline1,"AddressLine2"=p_addressline2,"City"=p_city,"State"=p_state,"PostalCode"=p_postalcode,"CountryCode"=COALESCE(NULLIF(p_countrycode,''),'IN'),"LogoUrl"=p_logourl,"LogoPublicId"=p_logopublicid,"IsActive"=p_isactive,"UpdatedAtUtc"=public.app_now()
    WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid;
    IF NOT FOUND THEN PERFORM public.raise_app_error(51103); END IF;
    RETURN QUERY SELECT * FROM "Branches" WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid;
EXCEPTION WHEN unique_violation THEN PERFORM public.raise_app_error(51102);
END;
$$;

CREATE OR REPLACE FUNCTION public.branch_getbyid(p_tenantid uuid,p_branchid uuid)
RETURNS SETOF "Branches" LANGUAGE sql STABLE AS $$ SELECT * FROM "Branches" WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid; $$;

CREATE OR REPLACE FUNCTION public.branch_getlistbytenant(p_tenantid uuid,p_includeinactive boolean)
RETURNS SETOF "Branches" LANGUAGE sql STABLE AS $$ SELECT * FROM "Branches" WHERE "TenantId"=p_tenantid AND (p_includeinactive OR "IsActive") ORDER BY "CreatedAtUtc" DESC; $$;

CREATE OR REPLACE FUNCTION public.branch_deactivate(p_tenantid uuid,p_branchid uuid)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN UPDATE "Branches" SET "IsActive"=false,"UpdatedAtUtc"=public.app_now() WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid; IF NOT FOUND THEN PERFORM public.raise_app_error(51103); END IF; END; $$;

CREATE OR REPLACE FUNCTION public.branchordersettings_create(p_tenantid uuid,p_branchid uuid,p_branchordersettingsid uuid,p_enabledirectqrordering boolean,p_requirecustomername boolean,p_requirecustomerwhatsapp boolean,p_waitercallenabled boolean)
RETURNS SETOF "BranchOrderSettings" LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Branches" WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid AND "IsActive") THEN PERFORM public.raise_app_error(51201); END IF;
    INSERT INTO "BranchOrderSettings" ("BranchOrderSettingsId","TenantId","BranchId","EnableDirectQrOrdering","RequireCustomerName","RequireCustomerWhatsApp","WaiterCallEnabled")
    VALUES (p_branchordersettingsid,p_tenantid,p_branchid,p_enabledirectqrordering,p_requirecustomername,p_requirecustomerwhatsapp,p_waitercallenabled);
    RETURN QUERY SELECT * FROM "BranchOrderSettings" WHERE "BranchOrderSettingsId"=p_branchordersettingsid;
EXCEPTION WHEN unique_violation THEN PERFORM public.raise_app_error(51202);
END;
$$;

CREATE OR REPLACE FUNCTION public.branchordersettings_update(p_tenantid uuid,p_branchid uuid,p_enabledirectqrordering boolean,p_requirecustomername boolean,p_requirecustomerwhatsapp boolean,p_waitercallenabled boolean)
RETURNS SETOF "BranchOrderSettings" LANGUAGE plpgsql AS $$
BEGIN
    UPDATE "BranchOrderSettings" SET "EnableDirectQrOrdering"=p_enabledirectqrordering,"RequireCustomerName"=p_requirecustomername,"RequireCustomerWhatsApp"=p_requirecustomerwhatsapp,"WaiterCallEnabled"=p_waitercallenabled,"UpdatedAtUtc"=public.app_now()
    WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid;
    IF NOT FOUND THEN PERFORM public.raise_app_error(51203); END IF;
    RETURN QUERY SELECT * FROM "BranchOrderSettings" WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid;
END;
$$;

CREATE OR REPLACE FUNCTION public.branchordersettings_getbybranch(p_tenantid uuid,p_branchid uuid)
RETURNS SETOF "BranchOrderSettings" LANGUAGE sql STABLE AS $$ SELECT * FROM "BranchOrderSettings" WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid; $$;

CREATE OR REPLACE FUNCTION public.menucategory_create(p_tenantid uuid,p_branchid uuid,p_menucategoryid uuid,p_name text,p_displayorder integer)
RETURNS SETOF "MenuCategories" LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Branches" WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid AND "IsActive") THEN PERFORM public.raise_app_error(51401); END IF;
    INSERT INTO "MenuCategories" ("MenuCategoryId","TenantId","BranchId","Name","DisplayOrder") VALUES (p_menucategoryid,p_tenantid,p_branchid,p_name,p_displayorder);
    RETURN QUERY SELECT * FROM "MenuCategories" WHERE "MenuCategoryId"=p_menucategoryid;
EXCEPTION WHEN unique_violation THEN PERFORM public.raise_app_error(51402);
END;
$$;

CREATE OR REPLACE FUNCTION public.menucategory_update(p_tenantid uuid,p_branchid uuid,p_menucategoryid uuid,p_name text,p_displayorder integer,p_isactive boolean)
RETURNS SETOF "MenuCategories" LANGUAGE plpgsql AS $$
BEGIN
    UPDATE "MenuCategories" SET "Name"=p_name,"DisplayOrder"=p_displayorder,"IsActive"=p_isactive,"UpdatedAtUtc"=public.app_now() WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid AND "MenuCategoryId"=p_menucategoryid;
    IF NOT FOUND THEN PERFORM public.raise_app_error(51403); END IF;
    RETURN QUERY SELECT * FROM "MenuCategories" WHERE "MenuCategoryId"=p_menucategoryid;
EXCEPTION WHEN unique_violation THEN PERFORM public.raise_app_error(51402);
END;
$$;

CREATE OR REPLACE FUNCTION public.menucategory_getlistbybranch(p_tenantid uuid,p_branchid uuid,p_includeinactive boolean)
RETURNS SETOF "MenuCategories" LANGUAGE sql STABLE AS $$ SELECT * FROM "MenuCategories" WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid AND (p_includeinactive OR "IsActive") ORDER BY "DisplayOrder","Name"; $$;

CREATE OR REPLACE FUNCTION public.menucategory_deactivate(p_tenantid uuid,p_branchid uuid,p_menucategoryid uuid)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN UPDATE "MenuCategories" SET "IsActive"=false,"UpdatedAtUtc"=public.app_now() WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid AND "MenuCategoryId"=p_menucategoryid; IF NOT FOUND THEN PERFORM public.raise_app_error(51403); END IF; END; $$;

CREATE OR REPLACE FUNCTION public.menuitem_row()
RETURNS TABLE("MenuItemId" uuid,"TenantId" uuid,"BranchId" uuid,"MenuCategoryId" uuid,"CategoryName" varchar,"Name" varchar,"Description" varchar,"Price" numeric,"IsAvailable" boolean,"IsActive" boolean,"DisplayOrder" integer,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz,"ImageUrl" varchar,"ImageAltText" varchar,"VariantsJson" text)
LANGUAGE sql AS $$ SELECT NULL::uuid,NULL::uuid,NULL::uuid,NULL::uuid,NULL::varchar,NULL::varchar,NULL::varchar,NULL::numeric,NULL::boolean,NULL::boolean,NULL::integer,NULL::timestamptz,NULL::timestamptz,NULL::varchar,NULL::varchar,NULL::text WHERE false; $$;

CREATE OR REPLACE FUNCTION public.menuitem_select(p_tenantid uuid,p_branchid uuid,p_menuitemid uuid DEFAULT NULL,p_includeinactive boolean DEFAULT true)
RETURNS TABLE("MenuItemId" uuid,"TenantId" uuid,"BranchId" uuid,"MenuCategoryId" uuid,"CategoryName" varchar,"Name" varchar,"Description" varchar,"Price" numeric,"IsAvailable" boolean,"IsActive" boolean,"DisplayOrder" integer,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz,"ImageUrl" varchar,"ImageAltText" varchar,"VariantsJson" text)
LANGUAGE sql STABLE AS $$
    SELECT mi."MenuItemId",mi."TenantId",mi."BranchId",mi."MenuCategoryId",mc."Name",mi."Name",mi."Description",mi."Price",mi."IsAvailable",mi."IsActive",mi."DisplayOrder",mi."CreatedAtUtc",mi."UpdatedAtUtc",mi."ImageUrl",mi."ImageAltText",
           COALESCE((SELECT jsonb_agg(jsonb_build_object('menuItemVariantId',v."MenuItemVariantId",'menuItemId',v."MenuItemId",'name',v."Name",'price',v."Price",'isAvailable',v."IsAvailable",'displayOrder',v."DisplayOrder") ORDER BY v."DisplayOrder",v."Name")::text FROM "MenuItemVariants" v WHERE v."MenuItemId"=mi."MenuItemId"), '[]')
    FROM "MenuItems" mi JOIN "MenuCategories" mc ON mc."MenuCategoryId"=mi."MenuCategoryId"
    WHERE mi."TenantId"=p_tenantid AND mi."BranchId"=p_branchid AND (p_menuitemid IS NULL OR mi."MenuItemId"=p_menuitemid) AND (p_includeinactive OR mi."IsActive")
    ORDER BY mc."DisplayOrder",mi."DisplayOrder",mi."Name";
$$;

CREATE OR REPLACE FUNCTION public.menuitem_upsert_variants(p_tenantid uuid,p_branchid uuid,p_menuitemid uuid,p_variantsjson text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM "MenuItemVariants" WHERE "MenuItemId"=p_menuitemid;
    INSERT INTO "MenuItemVariants" ("MenuItemVariantId","TenantId","BranchId","MenuItemId","Name","Price","IsAvailable","DisplayOrder")
    SELECT COALESCE(NULLIF(x->>'menuItemVariantId','')::uuid, gen_random_uuid()), p_tenantid, p_branchid, p_menuitemid, x->>'name', COALESCE((x->>'price')::numeric,0), COALESCE((x->>'isAvailable')::boolean,true), COALESCE((x->>'displayOrder')::integer,0)
    FROM jsonb_array_elements(COALESCE(NULLIF(p_variantsjson,'')::jsonb,'[]'::jsonb)) AS x
    WHERE NULLIF(x->>'name','') IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.menuitem_create(p_menuitemid uuid,p_tenantid uuid,p_branchid uuid,p_menucategoryid uuid,p_name text,p_description text,p_price numeric,p_isavailable boolean,p_displayorder integer,p_imageurl text,p_imagealttext text,p_variantsjson text)
RETURNS TABLE("MenuItemId" uuid,"TenantId" uuid,"BranchId" uuid,"MenuCategoryId" uuid,"CategoryName" varchar,"Name" varchar,"Description" varchar,"Price" numeric,"IsAvailable" boolean,"IsActive" boolean,"DisplayOrder" integer,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz,"ImageUrl" varchar,"ImageAltText" varchar,"VariantsJson" text)
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "MenuCategories" mc WHERE mc."TenantId"=p_tenantid AND mc."BranchId"=p_branchid AND mc."MenuCategoryId"=p_menucategoryid AND mc."IsActive") THEN PERFORM public.raise_app_error(51501); END IF;
    INSERT INTO "MenuItems" ("MenuItemId","TenantId","BranchId","MenuCategoryId","Name","Description","Price","IsAvailable","DisplayOrder","ImageUrl","ImageAltText")
    VALUES (p_menuitemid,p_tenantid,p_branchid,p_menucategoryid,p_name,p_description,p_price,p_isavailable,p_displayorder,p_imageurl,p_imagealttext);
    PERFORM public.menuitem_upsert_variants(p_tenantid,p_branchid,p_menuitemid,p_variantsjson);
    RETURN QUERY SELECT * FROM public.menuitem_select(p_tenantid,p_branchid,p_menuitemid,true);
EXCEPTION WHEN unique_violation THEN PERFORM public.raise_app_error(51502);
END;
$$;

CREATE OR REPLACE FUNCTION public.menuitem_update(p_tenantid uuid,p_branchid uuid,p_menuitemid uuid,p_menucategoryid uuid,p_name text,p_description text,p_price numeric,p_isavailable boolean,p_isactive boolean,p_displayorder integer,p_imageurl text,p_imagealttext text,p_variantsjson text)
RETURNS TABLE("MenuItemId" uuid,"TenantId" uuid,"BranchId" uuid,"MenuCategoryId" uuid,"CategoryName" varchar,"Name" varchar,"Description" varchar,"Price" numeric,"IsAvailable" boolean,"IsActive" boolean,"DisplayOrder" integer,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz,"ImageUrl" varchar,"ImageAltText" varchar,"VariantsJson" text)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE "MenuItems" SET "MenuCategoryId"=p_menucategoryid,"Name"=p_name,"Description"=p_description,"Price"=p_price,"IsAvailable"=p_isavailable,"IsActive"=p_isactive,"DisplayOrder"=p_displayorder,"ImageUrl"=p_imageurl,"ImageAltText"=p_imagealttext,"UpdatedAtUtc"=public.app_now()
    WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid AND "MenuItemId"=p_menuitemid;
    IF NOT FOUND THEN PERFORM public.raise_app_error(51503); END IF;
    PERFORM public.menuitem_upsert_variants(p_tenantid,p_branchid,p_menuitemid,p_variantsjson);
    RETURN QUERY SELECT * FROM public.menuitem_select(p_tenantid,p_branchid,p_menuitemid,true);
EXCEPTION WHEN unique_violation THEN PERFORM public.raise_app_error(51502);
END;
$$;

CREATE OR REPLACE FUNCTION public.menuitem_getlistbybranch(p_tenantid uuid,p_branchid uuid,p_includeinactive boolean)
RETURNS TABLE("MenuItemId" uuid,"TenantId" uuid,"BranchId" uuid,"MenuCategoryId" uuid,"CategoryName" varchar,"Name" varchar,"Description" varchar,"Price" numeric,"IsAvailable" boolean,"IsActive" boolean,"DisplayOrder" integer,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz,"ImageUrl" varchar,"ImageAltText" varchar,"VariantsJson" text)
LANGUAGE sql STABLE AS $$ SELECT * FROM public.menuitem_select(p_tenantid,p_branchid,NULL,p_includeinactive); $$;

CREATE OR REPLACE FUNCTION public.menuitem_deactivate(p_tenantid uuid,p_branchid uuid,p_menuitemid uuid)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN UPDATE "MenuItems" SET "IsActive"=false,"UpdatedAtUtc"=public.app_now() WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid AND "MenuItemId"=p_menuitemid; IF NOT FOUND THEN PERFORM public.raise_app_error(51503); END IF; END; $$;

CREATE OR REPLACE FUNCTION public.publicmenu_getbybranch(p_branchid uuid)
RETURNS TABLE("BranchId" uuid,"BranchName" varchar,"BranchLogoUrl" varchar,"MenuCategoryId" uuid,"CategoryName" varchar,"CategoryDisplayOrder" integer,"MenuItemId" uuid,"ItemName" varchar,"Description" varchar,"Price" numeric,"ItemDisplayOrder" integer,"ImageUrl" varchar,"ImageAltText" varchar,"VariantsJson" text)
LANGUAGE sql STABLE AS $$
    SELECT b."BranchId",b."Name",b."LogoUrl",mc."MenuCategoryId",mc."Name",mc."DisplayOrder",mi."MenuItemId",mi."Name",mi."Description",mi."Price",mi."DisplayOrder",mi."ImageUrl",mi."ImageAltText",
           COALESCE((SELECT jsonb_agg(jsonb_build_object('menuItemVariantId',v."MenuItemVariantId",'menuItemId',v."MenuItemId",'name',v."Name",'price',v."Price",'isAvailable',v."IsAvailable",'displayOrder',v."DisplayOrder") ORDER BY v."DisplayOrder",v."Name")::text FROM "MenuItemVariants" v WHERE v."MenuItemId"=mi."MenuItemId" AND v."IsAvailable"), '[]')
    FROM "Branches" b JOIN "MenuCategories" mc ON mc."BranchId"=b."BranchId" AND mc."IsActive" JOIN "MenuItems" mi ON mi."MenuCategoryId"=mc."MenuCategoryId" AND mi."IsActive" AND mi."IsAvailable"
    WHERE b."BranchId"=p_branchid AND b."IsActive"
    ORDER BY mc."DisplayOrder",mi."DisplayOrder",mi."Name";
$$;

CREATE OR REPLACE FUNCTION public.branchtable_create(p_tenantid uuid,p_branchid uuid,p_tableid uuid,p_name text,p_displayorder integer,p_qrtoken text)
RETURNS SETOF "BranchTables" LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Branches" WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid AND "IsActive") THEN PERFORM public.raise_app_error(51601); END IF;
    INSERT INTO "BranchTables" ("TableId","TenantId","BranchId","Name","DisplayOrder","QrToken") VALUES (p_tableid,p_tenantid,p_branchid,p_name,p_displayorder,p_qrtoken);
    RETURN QUERY SELECT * FROM "BranchTables" WHERE "TableId"=p_tableid;
EXCEPTION WHEN unique_violation THEN
    IF EXISTS (SELECT 1 FROM "BranchTables" WHERE "QrToken"=p_qrtoken) THEN PERFORM public.raise_app_error(51604); END IF;
    PERFORM public.raise_app_error(51602);
END;
$$;

CREATE OR REPLACE FUNCTION public.branchtable_update(p_tenantid uuid,p_branchid uuid,p_tableid uuid,p_name text,p_displayorder integer,p_isactive boolean)
RETURNS SETOF "BranchTables" LANGUAGE plpgsql AS $$
BEGIN
    UPDATE "BranchTables" SET "Name"=p_name,"DisplayOrder"=p_displayorder,"IsActive"=p_isactive,"UpdatedAtUtc"=public.app_now() WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid AND "TableId"=p_tableid;
    IF NOT FOUND THEN PERFORM public.raise_app_error(51603); END IF;
    RETURN QUERY SELECT * FROM "BranchTables" WHERE "TableId"=p_tableid;
EXCEPTION WHEN unique_violation THEN PERFORM public.raise_app_error(51602);
END;
$$;

CREATE OR REPLACE FUNCTION public.branchtable_getlistbybranch(p_tenantid uuid,p_branchid uuid,p_includeinactive boolean)
RETURNS SETOF "BranchTables" LANGUAGE sql STABLE AS $$ SELECT * FROM "BranchTables" WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid AND (p_includeinactive OR "IsActive") ORDER BY "DisplayOrder","Name"; $$;

CREATE OR REPLACE FUNCTION public.branchtable_deactivate(p_tenantid uuid,p_branchid uuid,p_tableid uuid)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN UPDATE "BranchTables" SET "IsActive"=false,"UpdatedAtUtc"=public.app_now() WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid AND "TableId"=p_tableid; IF NOT FOUND THEN PERFORM public.raise_app_error(51603); END IF; END; $$;

CREATE OR REPLACE FUNCTION public.branchtable_regenerateqrtoken(p_tenantid uuid,p_branchid uuid,p_tableid uuid,p_qrtoken text)
RETURNS SETOF "BranchTables" LANGUAGE plpgsql AS $$ BEGIN UPDATE "BranchTables" SET "QrToken"=p_qrtoken,"UpdatedAtUtc"=public.app_now() WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid AND "TableId"=p_tableid; IF NOT FOUND THEN PERFORM public.raise_app_error(51603); END IF; RETURN QUERY SELECT * FROM "BranchTables" WHERE "TableId"=p_tableid; EXCEPTION WHEN unique_violation THEN PERFORM public.raise_app_error(51604); END; $$;

CREATE OR REPLACE FUNCTION public.publicmenu_getbyqrtoken(p_qrtoken text)
RETURNS TABLE("BranchId" uuid,"BranchName" varchar,"BranchLogoUrl" varchar,"TableId" uuid,"TableName" varchar,"QrToken" varchar,"EnableDirectQrOrdering" boolean,"RequireCustomerName" boolean,"RequireCustomerWhatsApp" boolean,"WaiterCallEnabled" boolean,"TaxEnabled" boolean,"TaxName" varchar,"TaxRate" numeric,"TaxMode" varchar,"ServiceChargeEnabled" boolean,"ServiceChargeName" varchar,"ServiceChargeRate" numeric,"RoundingMode" varchar,"MenuCategoryId" uuid,"CategoryName" varchar,"CategoryDisplayOrder" integer,"MenuItemId" uuid,"ItemName" varchar,"Description" varchar,"Price" numeric,"ItemDisplayOrder" integer,"ImageUrl" varchar,"ImageAltText" varchar,"VariantsJson" text)
LANGUAGE sql STABLE AS $$
    SELECT b."BranchId",b."Name",b."LogoUrl",bt."TableId",bt."Name",bt."QrToken",
           COALESCE(bos."EnableDirectQrOrdering",false),COALESCE(bos."RequireCustomerName",false),COALESCE(bos."RequireCustomerWhatsApp",false),COALESCE(bos."WaiterCallEnabled",true),
           COALESCE(bs."TaxEnabled",false),COALESCE(bs."TaxName",''),COALESCE(bs."TaxRate",0),COALESCE(bs."TaxMode",'Exclusive'),COALESCE(bs."ServiceChargeEnabled",false),COALESCE(bs."ServiceChargeName",''),COALESCE(bs."ServiceChargeRate",0),COALESCE(bs."RoundingMode",'None'),
           mc."MenuCategoryId",mc."Name",mc."DisplayOrder",mi."MenuItemId",mi."Name",mi."Description",mi."Price",mi."DisplayOrder",mi."ImageUrl",mi."ImageAltText",
           COALESCE((SELECT jsonb_agg(jsonb_build_object('menuItemVariantId',v."MenuItemVariantId",'menuItemId',v."MenuItemId",'name',v."Name",'price',v."Price",'isAvailable',v."IsAvailable",'displayOrder',v."DisplayOrder") ORDER BY v."DisplayOrder",v."Name")::text FROM "MenuItemVariants" v WHERE v."MenuItemId"=mi."MenuItemId" AND v."IsAvailable"), '[]')
    FROM "BranchTables" bt JOIN "Branches" b ON b."BranchId"=bt."BranchId" AND b."IsActive"
    LEFT JOIN "BranchOrderSettings" bos ON bos."BranchId"=b."BranchId"
    LEFT JOIN "BranchBillingSettings" bs ON bs."BranchId"=b."BranchId"
    LEFT JOIN "MenuCategories" mc ON mc."BranchId"=b."BranchId" AND mc."IsActive"
    LEFT JOIN "MenuItems" mi ON mi."MenuCategoryId"=mc."MenuCategoryId" AND mi."IsActive" AND mi."IsAvailable"
    WHERE bt."QrToken"=p_qrtoken AND bt."IsActive"
    ORDER BY mc."DisplayOrder",mi."DisplayOrder",mi."Name";
$$;

-- Offers
CREATE OR REPLACE FUNCTION public.branchoffer_create(p_tenantid uuid,p_branchid uuid,p_branchofferid uuid,p_title text,p_subtitle text,p_discounttext text,p_imageurl text,p_imagealttext text,p_displayorder integer,p_startsatutc timestamptz,p_endsatutc timestamptz,p_discounttypecode text,p_discountvalue numeric,p_minimumorderamount numeric,p_maxdiscountamount numeric,p_autoapply boolean)
RETURNS SETOF "BranchOffers" LANGUAGE plpgsql AS $$ BEGIN INSERT INTO "BranchOffers" ("BranchOfferId","TenantId","BranchId","Title","Subtitle","DiscountText","ImageUrl","ImageAltText","DisplayOrder","StartsAtUtc","EndsAtUtc","DiscountTypeCode","DiscountValue","MinimumOrderAmount","MaxDiscountAmount","AutoApply") VALUES (p_branchofferid,p_tenantid,p_branchid,p_title,p_subtitle,p_discounttext,p_imageurl,p_imagealttext,p_displayorder,p_startsatutc,p_endsatutc,p_discounttypecode,p_discountvalue,p_minimumorderamount,p_maxdiscountamount,p_autoapply); RETURN QUERY SELECT bo.* FROM "BranchOffers" bo WHERE bo."BranchOfferId"=p_branchofferid; END; $$;
CREATE OR REPLACE FUNCTION public.branchoffer_update(p_tenantid uuid,p_branchid uuid,p_branchofferid uuid,p_title text,p_subtitle text,p_discounttext text,p_imageurl text,p_imagealttext text,p_displayorder integer,p_startsatutc timestamptz,p_endsatutc timestamptz,p_discounttypecode text,p_discountvalue numeric,p_minimumorderamount numeric,p_maxdiscountamount numeric,p_autoapply boolean,p_isactive boolean)
RETURNS SETOF "BranchOffers" LANGUAGE plpgsql AS $$ BEGIN UPDATE "BranchOffers" bo SET "Title"=p_title,"Subtitle"=p_subtitle,"DiscountText"=p_discounttext,"ImageUrl"=p_imageurl,"ImageAltText"=p_imagealttext,"DisplayOrder"=p_displayorder,"StartsAtUtc"=p_startsatutc,"EndsAtUtc"=p_endsatutc,"DiscountTypeCode"=p_discounttypecode,"DiscountValue"=p_discountvalue,"MinimumOrderAmount"=p_minimumorderamount,"MaxDiscountAmount"=p_maxdiscountamount,"AutoApply"=p_autoapply,"IsActive"=p_isactive,"UpdatedAtUtc"=public.app_now() WHERE bo."TenantId"=p_tenantid AND bo."BranchId"=p_branchid AND bo."BranchOfferId"=p_branchofferid; RETURN QUERY SELECT bo.* FROM "BranchOffers" bo WHERE bo."BranchOfferId"=p_branchofferid; END; $$;
CREATE OR REPLACE FUNCTION public.branchoffer_getlistbybranch(p_tenantid uuid,p_branchid uuid,p_includeinactive boolean) RETURNS SETOF "BranchOffers" LANGUAGE sql STABLE AS $$ SELECT bo.* FROM "BranchOffers" bo WHERE bo."TenantId"=p_tenantid AND bo."BranchId"=p_branchid AND (p_includeinactive OR bo."IsActive") ORDER BY bo."DisplayOrder",bo."CreatedAtUtc" DESC; $$;
CREATE OR REPLACE FUNCTION public.branchoffer_deactivate(p_tenantid uuid,p_branchid uuid,p_branchofferid uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN UPDATE "BranchOffers" bo SET "IsActive"=false,"UpdatedAtUtc"=public.app_now() WHERE bo."TenantId"=p_tenantid AND bo."BranchId"=p_branchid AND bo."BranchOfferId"=p_branchofferid; END; $$;
CREATE OR REPLACE FUNCTION public.publicoffers_getbyqrtoken(p_qrtoken text) RETURNS SETOF "BranchOffers" LANGUAGE sql STABLE AS $$ SELECT bo.* FROM "BranchTables" bt JOIN "BranchOffers" bo ON bo."BranchId"=bt."BranchId" WHERE bt."QrToken"=p_qrtoken AND bt."IsActive" AND bo."IsActive" AND (bo."StartsAtUtc" IS NULL OR bo."StartsAtUtc" <= public.app_now()) AND (bo."EndsAtUtc" IS NULL OR bo."EndsAtUtc" >= public.app_now()) ORDER BY bo."DisplayOrder"; $$;

-- Orders
CREATE OR REPLACE FUNCTION public.publicorder_select(p_orderid uuid)
RETURNS TABLE("OrderId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"SubtotalAmount" numeric,"TotalAmount" numeric,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"AppliedOfferDiscountAmount" numeric,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz)
LANGUAGE sql STABLE AS $$ SELECT "OrderId","TenantId","BranchId","TableId","OrderStatusCode","CustomerName","CustomerWhatsApp","Notes","SubtotalAmount","TotalAmount","AppliedBranchOfferId","AppliedOfferTitle","AppliedOfferDiscountAmount","CreatedAtUtc","UpdatedAtUtc" FROM "Orders" WHERE "OrderId"=p_orderid; $$;

CREATE OR REPLACE FUNCTION public.publicorder_getitemsbyorder(p_orderid uuid)
RETURNS TABLE("OrderItemId" uuid,"OrderId" uuid,"MenuItemId" uuid,"MenuItemVariantId" uuid,"MenuItemName" varchar,"VariantName" varchar,"ItemNote" varchar,"UnitPrice" numeric,"Quantity" integer,"LineTotal" numeric)
LANGUAGE sql STABLE AS $$ SELECT "OrderItemId","OrderId","MenuItemId","MenuItemVariantId","MenuItemName","VariantName","ItemNote","UnitPrice","Quantity","LineTotal" FROM "OrderItems" WHERE "OrderId"=p_orderid ORDER BY "RowId"; $$;

CREATE OR REPLACE FUNCTION public.publicorder_createfromqrtoken(p_qrtoken text,p_orderid uuid,p_customername text,p_customerwhatsapp text,p_notes text,p_itemsjson text,p_marketingconsent boolean,p_marketingconsentsource text)
RETURNS TABLE("OrderId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"SubtotalAmount" numeric,"TotalAmount" numeric,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"AppliedOfferDiscountAmount" numeric,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz)
LANGUAGE plpgsql AS $$
DECLARE
    ctx record;
    customer_id uuid;
    subtotal numeric;
    billing record;
    offer_id uuid;
    offer_title varchar;
    discount numeric := 0;
    taxable numeric := 0;
    tax numeric := 0;
    service_charge numeric := 0;
    total_before_rounding numeric := 0;
    rounding_amount numeric := 0;
    payable_total numeric := 0;
BEGIN
    SELECT bt."TenantId",bt."BranchId",bt."TableId",COALESCE(bos."EnableDirectQrOrdering",false) enabled,COALESCE(bos."RequireCustomerName",false) req_name,COALESCE(bos."RequireCustomerWhatsApp",false) req_whatsapp
    INTO ctx FROM "BranchTables" bt JOIN "Branches" b ON b."BranchId"=bt."BranchId" AND b."IsActive" LEFT JOIN "BranchOrderSettings" bos ON bos."BranchId"=bt."BranchId" WHERE bt."QrToken"=p_qrtoken AND bt."IsActive";
    IF ctx."TableId" IS NULL THEN PERFORM public.raise_app_error(51701); END IF;
    IF NOT ctx.enabled THEN PERFORM public.raise_app_error(51702); END IF;
    IF ctx.req_name AND NULLIF(btrim(p_customername),'') IS NULL THEN PERFORM public.raise_app_error(51703); END IF;
    IF ctx.req_whatsapp AND NULLIF(btrim(p_customerwhatsapp),'') IS NULL THEN PERFORM public.raise_app_error(51704); END IF;

    CREATE TEMP TABLE tmp_order_items ON COMMIT DROP AS
    SELECT gen_random_uuid() "OrderItemId", mi."MenuItemId", v."MenuItemVariantId", mi."Name" "MenuItemName", v."Name" "VariantName", NULLIF(x->>'itemNote','') "ItemNote", COALESCE(v."Price",mi."Price") "UnitPrice", GREATEST(COALESCE((x->>'quantity')::integer,0),0) "Quantity"
    FROM jsonb_array_elements(COALESCE(NULLIF(p_itemsjson,'')::jsonb,'[]'::jsonb)) x
    JOIN "MenuItems" mi ON mi."MenuItemId"=(x->>'menuItemId')::uuid AND mi."TenantId"=ctx."TenantId" AND mi."BranchId"=ctx."BranchId" AND mi."IsActive" AND mi."IsAvailable"
    LEFT JOIN "MenuItemVariants" v ON v."MenuItemVariantId"=NULLIF(x->>'menuItemVariantId','')::uuid AND v."MenuItemId"=mi."MenuItemId" AND v."IsAvailable";
    DELETE FROM tmp_order_items WHERE "Quantity" <= 0;
    IF NOT EXISTS (SELECT 1 FROM tmp_order_items) THEN PERFORM public.raise_app_error(51705); END IF;
    SELECT SUM("UnitPrice"*"Quantity") INTO subtotal FROM tmp_order_items;

    IF NULLIF(btrim(p_customerwhatsapp),'') IS NOT NULL THEN
        INSERT INTO "Customers" ("CustomerId","TenantId","BranchId","Name","WhatsAppNumber","VisitCount","LastVisitAtUtc","MarketingConsent","MarketingConsentSource","MarketingConsentAtUtc")
        VALUES (gen_random_uuid(),ctx."TenantId",ctx."BranchId",COALESCE(NULLIF(p_customername,''),'Guest'),p_customerwhatsapp,1,public.app_now(),p_marketingconsent,p_marketingconsentsource,CASE WHEN p_marketingconsent THEN public.app_now() END)
        ON CONFLICT ("TenantId","BranchId","WhatsAppNumber") DO UPDATE SET "Name"=COALESCE(NULLIF(EXCLUDED."Name",''),"Customers"."Name"),"VisitCount"="Customers"."VisitCount"+1,"LastVisitAtUtc"=public.app_now(),"MarketingConsent"=("Customers"."MarketingConsent" OR EXCLUDED."MarketingConsent"),"UpdatedAtUtc"=public.app_now()
        RETURNING "CustomerId" INTO customer_id;
    END IF;

    SELECT
        COALESCE(bs."TaxEnabled",false) "TaxEnabled",
        COALESCE(bs."TaxRate",0) "TaxRate",
        COALESCE(bs."TaxMode",'Exclusive') "TaxMode",
        COALESCE(bs."ServiceChargeEnabled",false) "ServiceChargeEnabled",
        COALESCE(bs."ServiceChargeRate",0) "ServiceChargeRate",
        COALESCE(bs."RoundingMode",'None') "RoundingMode"
    INTO billing
    FROM "Branches" b
    LEFT JOIN "BranchBillingSettings" bs ON bs."TenantId"=b."TenantId" AND bs."BranchId"=b."BranchId"
    WHERE b."TenantId"=ctx."TenantId" AND b."BranchId"=ctx."BranchId";

    SELECT selected_offer."BranchOfferId", selected_offer."Title", selected_offer.computed_discount
    INTO offer_id, offer_title, discount
    FROM (
        SELECT bo.*,
               round(LEAST(
                   subtotal,
                   GREATEST(
                       0,
                       CASE
                           WHEN bo."MaxDiscountAmount" IS NOT NULL THEN LEAST(
                               CASE bo."DiscountTypeCode"
                                   WHEN 'Percentage' THEN round(subtotal * bo."DiscountValue" / 100,2)
                                   ELSE round(bo."DiscountValue",2)
                               END,
                               bo."MaxDiscountAmount"
                           )
                           ELSE CASE bo."DiscountTypeCode"
                               WHEN 'Percentage' THEN round(subtotal * bo."DiscountValue" / 100,2)
                               ELSE round(bo."DiscountValue",2)
                           END
                       END
                   )
               ),2) AS computed_discount
        FROM "BranchOffers" bo
        WHERE bo."TenantId"=ctx."TenantId"
          AND bo."BranchId"=ctx."BranchId"
          AND bo."IsActive"
          AND bo."AutoApply"
          AND bo."DiscountTypeCode" <> 'DisplayOnly'
          AND bo."DiscountValue" > 0
          AND subtotal >= bo."MinimumOrderAmount"
          AND (bo."StartsAtUtc" IS NULL OR bo."StartsAtUtc" <= public.app_now())
          AND (bo."EndsAtUtc" IS NULL OR bo."EndsAtUtc" >= public.app_now())
        ORDER BY computed_discount DESC, bo."DisplayOrder", bo."Title"
        LIMIT 1
    ) selected_offer;
    discount := COALESCE(discount,0);

    taxable := round(GREATEST(subtotal - discount,0),2);
    IF billing."TaxEnabled" AND billing."TaxRate" > 0 THEN
        tax := CASE
            WHEN billing."TaxMode" = 'Inclusive' THEN round(taxable - taxable / (1 + billing."TaxRate" / 100),2)
            ELSE round(taxable * billing."TaxRate" / 100,2)
        END;
    END IF;
    IF billing."ServiceChargeEnabled" AND billing."ServiceChargeRate" > 0 THEN
        service_charge := round(taxable * billing."ServiceChargeRate" / 100,2);
    END IF;
    total_before_rounding := round((CASE WHEN billing."TaxMode" = 'Inclusive' THEN taxable ELSE taxable + tax END) + service_charge,2);
    rounding_amount := CASE WHEN billing."RoundingMode" IN ('NearestRupee','Nearest') THEN round(total_before_rounding) - total_before_rounding ELSE 0 END;
    payable_total := round(total_before_rounding + rounding_amount,2);

    INSERT INTO "Orders" ("OrderId","TenantId","BranchId","TableId","CustomerId","CustomerName","CustomerWhatsApp","Notes","SubtotalAmount","AppliedBranchOfferId","AppliedOfferTitle","AppliedOfferDiscountAmount","TotalAmount")
    VALUES (p_orderid,ctx."TenantId",ctx."BranchId",ctx."TableId",customer_id,p_customername,p_customerwhatsapp,p_notes,subtotal,offer_id,offer_title,discount,payable_total);
    INSERT INTO "OrderItems" ("OrderItemId","TenantId","BranchId","OrderId","MenuItemId","MenuItemVariantId","MenuItemName","VariantName","ItemNote","UnitPrice","Quantity","LineTotal")
    SELECT "OrderItemId",ctx."TenantId",ctx."BranchId",p_orderid,"MenuItemId","MenuItemVariantId","MenuItemName","VariantName","ItemNote","UnitPrice","Quantity","UnitPrice"*"Quantity" FROM tmp_order_items;
    INSERT INTO "OrderStatusHistory" ("OrderStatusHistoryId","TenantId","BranchId","OrderId","StatusCode") VALUES (gen_random_uuid(),ctx."TenantId",ctx."BranchId",p_orderid,'Placed');
    RETURN QUERY SELECT * FROM public.publicorder_select(p_orderid);
END;
$$;

CREATE OR REPLACE FUNCTION public.publicorder_getbyqrtoken(p_qrtoken text,p_orderid uuid)
RETURNS TABLE("OrderId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"SubtotalAmount" numeric,"TotalAmount" numeric,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"AppliedOfferDiscountAmount" numeric,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz)
LANGUAGE plpgsql AS $$ BEGIN IF NOT EXISTS (SELECT 1 FROM "Orders" o JOIN "BranchTables" bt ON bt."TableId"=o."TableId" WHERE o."OrderId"=p_orderid AND bt."QrToken"=p_qrtoken) THEN PERFORM public.raise_app_error(51709); END IF; RETURN QUERY SELECT * FROM public.publicorder_select(p_orderid); END; $$;

CREATE OR REPLACE FUNCTION public.adminorder_getlistbybranch(p_tenantid uuid,p_branchid uuid,p_includecompleted boolean)
RETURNS TABLE("OrderId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"TableName" varchar,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"SubtotalAmount" numeric,"TotalAmount" numeric,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"AppliedOfferDiscountAmount" numeric,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz)
LANGUAGE sql STABLE AS $$ SELECT o."OrderId",o."TenantId",o."BranchId",o."TableId",bt."Name",o."OrderStatusCode",o."CustomerName",o."CustomerWhatsApp",o."Notes",o."SubtotalAmount",o."TotalAmount",o."AppliedBranchOfferId",o."AppliedOfferTitle",o."AppliedOfferDiscountAmount",o."CreatedAtUtc",o."UpdatedAtUtc" FROM "Orders" o JOIN "BranchTables" bt ON bt."TableId"=o."TableId" WHERE o."TenantId"=p_tenantid AND o."BranchId"=p_branchid AND (p_includecompleted OR o."OrderStatusCode" NOT IN ('Completed','Cancelled','Served')) ORDER BY o."CreatedAtUtc" DESC LIMIT 200; $$;
CREATE OR REPLACE FUNCTION public.adminorder_getitemsbybranch(p_tenantid uuid,p_branchid uuid) RETURNS TABLE("OrderItemId" uuid,"OrderId" uuid,"MenuItemId" uuid,"MenuItemVariantId" uuid,"MenuItemName" varchar,"VariantName" varchar,"ItemNote" varchar,"UnitPrice" numeric,"Quantity" integer,"LineTotal" numeric) LANGUAGE sql STABLE AS $$ SELECT oi."OrderItemId",oi."OrderId",oi."MenuItemId",oi."MenuItemVariantId",oi."MenuItemName",oi."VariantName",oi."ItemNote",oi."UnitPrice",oi."Quantity",oi."LineTotal" FROM "OrderItems" oi JOIN "Orders" o ON o."OrderId"=oi."OrderId" WHERE oi."TenantId"=p_tenantid AND oi."BranchId"=p_branchid ORDER BY oi."RowId"; $$;
CREATE OR REPLACE FUNCTION public.adminorder_updatestatus(p_tenantid uuid,p_branchid uuid,p_orderid uuid,p_orderstatuscode text,p_reason text,p_changedbyuserid uuid)
RETURNS TABLE("OrderId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"TableName" varchar,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"SubtotalAmount" numeric,"TotalAmount" numeric,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"AppliedOfferDiscountAmount" numeric,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz)
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

-- Staff, waiter calls, notifications, campaigns, feedback, billing, reports
CREATE OR REPLACE FUNCTION public.staffuser_row(p_tenantid uuid)
RETURNS TABLE("UserId" uuid,"TenantUserId" uuid,"TenantId" uuid,"BranchId" uuid,"BranchName" varchar,"Email" varchar,"DisplayName" varchar,"RoleCode" varchar,"IsActive" boolean,"TenantUserIsActive" boolean,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz)
LANGUAGE sql STABLE AS $$ SELECT u."UserId",tu."TenantUserId",tu."TenantId",tu."BranchId",b."Name",u."Email",u."DisplayName",tu."RoleCode",u."IsActive",tu."IsActive",u."CreatedAtUtc",u."UpdatedAtUtc" FROM "TenantUsers" tu JOIN "Users" u ON u."UserId"=tu."UserId" LEFT JOIN "Branches" b ON b."BranchId"=tu."BranchId" WHERE tu."TenantId"=p_tenantid; $$;
CREATE OR REPLACE FUNCTION public.staffuser_create(p_tenantid uuid,p_userid uuid,p_tenantuserid uuid,p_branchid uuid,p_email text,p_displayname text,p_passwordhash text,p_rolecode text) RETURNS TABLE("UserId" uuid,"TenantUserId" uuid,"TenantId" uuid,"BranchId" uuid,"BranchName" varchar,"Email" varchar,"DisplayName" varchar,"RoleCode" varchar,"IsActive" boolean,"TenantUserIsActive" boolean,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz) LANGUAGE plpgsql AS $$ BEGIN INSERT INTO "Users" ("UserId","Email","DisplayName","PasswordHash") VALUES (p_userid,p_email,p_displayname,p_passwordhash); INSERT INTO "TenantUsers" ("TenantUserId","TenantId","UserId","BranchId","RoleCode") VALUES (p_tenantuserid,p_tenantid,p_userid,p_branchid,p_rolecode); RETURN QUERY SELECT s.* FROM public.staffuser_row(p_tenantid) s WHERE s."UserId"=p_userid; EXCEPTION WHEN unique_violation THEN PERFORM public.raise_app_error(51301); END; $$;
CREATE OR REPLACE FUNCTION public.staffuser_getlist(p_tenantid uuid,p_includeinactive boolean) RETURNS TABLE("UserId" uuid,"TenantUserId" uuid,"TenantId" uuid,"BranchId" uuid,"BranchName" varchar,"Email" varchar,"DisplayName" varchar,"RoleCode" varchar,"IsActive" boolean,"TenantUserIsActive" boolean,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz) LANGUAGE sql STABLE AS $$ SELECT s.* FROM public.staffuser_row(p_tenantid) s WHERE p_includeinactive OR s."TenantUserIsActive" ORDER BY s."CreatedAtUtc" DESC; $$;
CREATE OR REPLACE FUNCTION public.staffuser_update(p_tenantid uuid,p_userid uuid,p_branchid uuid,p_displayname text,p_rolecode text,p_isactive boolean) RETURNS TABLE("UserId" uuid,"TenantUserId" uuid,"TenantId" uuid,"BranchId" uuid,"BranchName" varchar,"Email" varchar,"DisplayName" varchar,"RoleCode" varchar,"IsActive" boolean,"TenantUserIsActive" boolean,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz) LANGUAGE plpgsql AS $$ BEGIN UPDATE "Users" u SET "DisplayName"=p_displayname,"IsActive"=p_isactive,"UpdatedAtUtc"=public.app_now() WHERE u."UserId"=p_userid; UPDATE "TenantUsers" tu SET "BranchId"=p_branchid,"RoleCode"=p_rolecode,"IsActive"=p_isactive,"UpdatedAtUtc"=public.app_now() WHERE tu."TenantId"=p_tenantid AND tu."UserId"=p_userid; RETURN QUERY SELECT s.* FROM public.staffuser_row(p_tenantid) s WHERE s."UserId"=p_userid; END; $$;

CREATE OR REPLACE FUNCTION public.waitercall_select(p_tenantid uuid,p_branchid uuid,p_include_resolved boolean DEFAULT true) RETURNS TABLE("WaiterCallId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"TableName" varchar,"StatusCode" varchar,"CustomerName" varchar,"Note" varchar,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz) LANGUAGE sql STABLE AS $$ SELECT wc."WaiterCallId",wc."TenantId",wc."BranchId",wc."TableId",bt."Name",wc."StatusCode",wc."CustomerName",wc."Note",wc."CreatedAtUtc",wc."UpdatedAtUtc" FROM "WaiterCalls" wc JOIN "BranchTables" bt ON bt."TableId"=wc."TableId" WHERE wc."TenantId"=p_tenantid AND wc."BranchId"=p_branchid AND (p_include_resolved OR wc."StatusCode" <> 'Resolved') ORDER BY wc."CreatedAtUtc" DESC; $$;
CREATE OR REPLACE FUNCTION public.waitercall_createfromqrtoken(p_qrtoken text,p_waitercallid uuid,p_customername text,p_note text) RETURNS TABLE("WaiterCallId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"TableName" varchar,"StatusCode" varchar,"CustomerName" varchar,"Note" varchar,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz) LANGUAGE plpgsql AS $$
DECLARE ctx record;
BEGIN
    SELECT bt."TenantId",bt."BranchId",bt."TableId",COALESCE(bos."WaiterCallEnabled",true) enabled
    INTO ctx
    FROM "BranchTables" bt
    LEFT JOIN "BranchOrderSettings" bos ON bos."BranchId"=bt."BranchId"
    WHERE bt."QrToken"=p_qrtoken AND bt."IsActive";

    IF ctx."TableId" IS NULL THEN
        PERFORM public.raise_app_error(51801);
    END IF;
    IF NOT ctx.enabled THEN
        PERFORM public.raise_app_error(51802);
    END IF;

    INSERT INTO "WaiterCalls" ("WaiterCallId","TenantId","BranchId","TableId","CustomerName","Note")
    VALUES (p_waitercallid,ctx."TenantId",ctx."BranchId",ctx."TableId",p_customername,p_note);

    RETURN QUERY
    SELECT wc.*
    FROM public.waitercall_select(ctx."TenantId",ctx."BranchId",true) wc
    WHERE wc."WaiterCallId"=p_waitercallid;
END;
$$;
CREATE OR REPLACE FUNCTION public.waitercall_getlistbybranch(p_tenantid uuid,p_branchid uuid,p_includeresolved boolean) RETURNS TABLE("WaiterCallId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"TableName" varchar,"StatusCode" varchar,"CustomerName" varchar,"Note" varchar,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz) LANGUAGE sql STABLE AS $$ SELECT * FROM public.waitercall_select(p_tenantid,p_branchid,p_includeresolved); $$;
CREATE OR REPLACE FUNCTION public.waitercall_updatestatus(p_tenantid uuid,p_branchid uuid,p_waitercallid uuid,p_statuscode text) RETURNS TABLE("WaiterCallId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"TableName" varchar,"StatusCode" varchar,"CustomerName" varchar,"Note" varchar,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz) LANGUAGE plpgsql AS $$
BEGIN
    IF p_statuscode NOT IN ('Open','Acknowledged','Resolved','Cancelled') THEN
        PERFORM public.raise_app_error(51803);
    END IF;

    UPDATE "WaiterCalls" wc
    SET "StatusCode"=p_statuscode,
        "UpdatedAtUtc"=public.app_now(),
        "ResolvedAtUtc"=CASE WHEN p_statuscode='Resolved' THEN public.app_now() ELSE wc."ResolvedAtUtc" END
    WHERE wc."TenantId"=p_tenantid AND wc."BranchId"=p_branchid AND wc."WaiterCallId"=p_waitercallid;

    IF NOT FOUND THEN
        PERFORM public.raise_app_error(51804);
    END IF;

    RETURN QUERY
    SELECT wc.*
    FROM public.waitercall_select(p_tenantid,p_branchid,true) wc
    WHERE wc."WaiterCallId"=p_waitercallid;
END;
$$;

CREATE OR REPLACE FUNCTION public.adminnotification_create(p_tenantid uuid,p_adminnotificationid uuid,p_branchid uuid,p_typecode text,p_title text,p_message text,p_targeturl text) RETURNS SETOF "AdminNotifications" LANGUAGE plpgsql AS $$ BEGIN INSERT INTO "AdminNotifications" ("AdminNotificationId","TenantId","BranchId","TypeCode","Title","Message","TargetUrl") VALUES (p_adminnotificationid,p_tenantid,p_branchid,p_typecode,p_title,p_message,p_targeturl); RETURN QUERY SELECT * FROM "AdminNotifications" WHERE "AdminNotificationId"=p_adminnotificationid; END; $$;
CREATE OR REPLACE FUNCTION public.adminnotification_getlist(p_tenantid uuid,p_branchid uuid) RETURNS SETOF "AdminNotifications" LANGUAGE sql STABLE AS $$ SELECT * FROM "AdminNotifications" WHERE "TenantId"=p_tenantid AND (p_branchid IS NULL OR "BranchId"=p_branchid) ORDER BY "CreatedAtUtc" DESC LIMIT 30; $$;
CREATE OR REPLACE FUNCTION public.adminnotification_markread(p_tenantid uuid,p_adminnotificationid uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN UPDATE "AdminNotifications" SET "IsRead"=true,"ReadAtUtc"=public.app_now() WHERE "TenantId"=p_tenantid AND "AdminNotificationId"=p_adminnotificationid; END; $$;
CREATE OR REPLACE FUNCTION public.adminnotification_markallread(p_tenantid uuid,p_branchid uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN UPDATE "AdminNotifications" SET "IsRead"=true,"ReadAtUtc"=COALESCE("ReadAtUtc",public.app_now()) WHERE "TenantId"=p_tenantid AND (p_branchid IS NULL OR "BranchId"=p_branchid); END; $$;
CREATE OR REPLACE FUNCTION public.adminsearch(p_tenantid uuid,p_branchid uuid,p_query text) RETURNS TABLE("TypeCode" text,"EntityId" uuid,"BranchId" uuid,"Title" text,"Subtitle" text,"TargetUrl" text,"CreatedAtUtc" timestamptz) LANGUAGE sql STABLE AS $$ SELECT 'order',o."OrderId",o."BranchId",'Order '||left(o."OrderId"::text,8),COALESCE(o."CustomerName",'Guest'),'/admin/orders',o."CreatedAtUtc" FROM "Orders" o WHERE o."TenantId"=p_tenantid AND (p_branchid IS NULL OR o."BranchId"=p_branchid) AND (p_query='' OR o."CustomerName" ILIKE '%'||p_query||'%' OR o."CustomerWhatsApp" ILIKE '%'||p_query||'%') LIMIT 20; $$;

CREATE OR REPLACE FUNCTION public.whatsappcampaign_previewrecipients(p_tenantid uuid,p_branchid uuid,p_targetsegment text) RETURNS integer LANGUAGE sql STABLE AS $$ SELECT COUNT(*)::integer FROM "Customers" WHERE "TenantId"=p_tenantid AND (p_branchid IS NULL OR "BranchId"=p_branchid) AND "WhatsAppNumber" IS NOT NULL AND (p_targetsegment <> 'consented' OR "MarketingConsent"); $$;
CREATE OR REPLACE FUNCTION public.whatsappcampaign_create(p_tenantid uuid,p_campaignid uuid,p_branchid uuid,p_name text,p_targetsegment text,p_messagetext text) RETURNS TABLE("CampaignId" uuid,"TenantId" uuid,"BranchId" uuid,"BranchName" varchar,"Name" varchar,"TargetSegment" varchar,"MessageText" varchar,"StatusCode" varchar,"RecipientCount" integer,"SentCount" integer,"FailedCount" integer,"CreatedAtUtc" timestamptz,"QueuedAtUtc" timestamptz,"StartedAtUtc" timestamptz,"CompletedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz) LANGUAGE plpgsql AS $$ DECLARE cnt integer; BEGIN SELECT public.whatsappcampaign_previewrecipients(p_tenantid,p_branchid,p_targetsegment) INTO cnt; INSERT INTO "WhatsAppCampaigns" ("CampaignId","TenantId","BranchId","Name","TargetSegment","MessageText","RecipientCount") VALUES (p_campaignid,p_tenantid,p_branchid,p_name,p_targetsegment,p_messagetext,cnt); RETURN QUERY SELECT * FROM public.whatsappcampaign_getlist(p_tenantid,p_branchid) WHERE "CampaignId"=p_campaignid; END; $$;
CREATE OR REPLACE FUNCTION public.whatsappcampaign_getlist(p_tenantid uuid,p_branchid uuid) RETURNS TABLE("CampaignId" uuid,"TenantId" uuid,"BranchId" uuid,"BranchName" varchar,"Name" varchar,"TargetSegment" varchar,"MessageText" varchar,"StatusCode" varchar,"RecipientCount" integer,"SentCount" integer,"FailedCount" integer,"CreatedAtUtc" timestamptz,"QueuedAtUtc" timestamptz,"StartedAtUtc" timestamptz,"CompletedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz) LANGUAGE sql STABLE AS $$ SELECT c."CampaignId",c."TenantId",c."BranchId",b."Name",c."Name",c."TargetSegment",c."MessageText",c."StatusCode",c."RecipientCount",0,0,c."CreatedAtUtc",c."QueuedAtUtc",c."StartedAtUtc",c."CompletedAtUtc",c."UpdatedAtUtc" FROM "WhatsAppCampaigns" c LEFT JOIN "Branches" b ON b."BranchId"=c."BranchId" WHERE c."TenantId"=p_tenantid AND (p_branchid IS NULL OR c."BranchId"=p_branchid) ORDER BY c."CreatedAtUtc" DESC; $$;

-- Billing and reports are intentionally SQL-native and deterministic.
CREATE OR REPLACE FUNCTION public.branchbillingsettings_getbybranch(p_tenantid uuid,p_branchid uuid) RETURNS SETOF "BranchBillingSettings" LANGUAGE sql STABLE AS $$ SELECT * FROM "BranchBillingSettings" WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid; $$;
CREATE OR REPLACE FUNCTION public.branchbillingsettings_save(p_tenantid uuid,p_branchid uuid,p_branchbillingsettingsid uuid,p_taxenabled boolean,p_taxname text,p_taxrate numeric,p_taxmode text,p_servicechargeenabled boolean,p_servicechargename text,p_servicechargerate numeric,p_discountenabled boolean,p_staffcanapplydiscount boolean,p_roundingmode text) RETURNS SETOF "BranchBillingSettings" LANGUAGE plpgsql AS $$ BEGIN INSERT INTO "BranchBillingSettings" ("BranchBillingSettingsId","TenantId","BranchId","TaxEnabled","TaxName","TaxRate","TaxMode","ServiceChargeEnabled","ServiceChargeName","ServiceChargeRate","DiscountEnabled","StaffCanApplyDiscount","RoundingMode") VALUES (p_branchbillingsettingsid,p_tenantid,p_branchid,p_taxenabled,COALESCE(p_taxname,''),p_taxrate,p_taxmode,p_servicechargeenabled,COALESCE(p_servicechargename,''),p_servicechargerate,p_discountenabled,p_staffcanapplydiscount,p_roundingmode) ON CONFLICT ("TenantId","BranchId") DO UPDATE SET "TaxEnabled"=EXCLUDED."TaxEnabled","TaxName"=EXCLUDED."TaxName","TaxRate"=EXCLUDED."TaxRate","TaxMode"=EXCLUDED."TaxMode","ServiceChargeEnabled"=EXCLUDED."ServiceChargeEnabled","ServiceChargeName"=EXCLUDED."ServiceChargeName","ServiceChargeRate"=EXCLUDED."ServiceChargeRate","DiscountEnabled"=EXCLUDED."DiscountEnabled","StaffCanApplyDiscount"=EXCLUDED."StaffCanApplyDiscount","RoundingMode"=EXCLUDED."RoundingMode","UpdatedAtUtc"=public.app_now(); RETURN QUERY SELECT * FROM "BranchBillingSettings" WHERE "TenantId"=p_tenantid AND "BranchId"=p_branchid; END; $$;

CREATE OR REPLACE FUNCTION public.orderbill_row(p_tenantid uuid,p_branchid uuid,p_orderid uuid)
RETURNS TABLE("OrderBillId" uuid,"TenantId" uuid,"BranchId" uuid,"OrderId" uuid,"BillNumber" varchar,"PaymentStatusCode" varchar,"PaymentMethod" varchar,"SubtotalAmount" numeric,"DiscountAmount" numeric,"TaxableAmount" numeric,"TaxAmount" numeric,"ServiceChargeAmount" numeric,"RoundingAmount" numeric,"TotalAmount" numeric,"TaxEnabled" boolean,"TaxName" varchar,"TaxRate" numeric,"TaxMode" varchar,"ServiceChargeEnabled" boolean,"ServiceChargeName" varchar,"ServiceChargeRate" numeric,"DiscountEnabled" boolean,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"RefundStatusCode" varchar,"RefundAmount" numeric,"RefundReason" varchar,"RefundedAtUtc" timestamptz,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz)
LANGUAGE sql STABLE AS $$ SELECT ob."OrderBillId",ob."TenantId",ob."BranchId",ob."OrderId",ob."BillNumber",ob."PaymentStatusCode",ob."PaymentMethod",ob."SubtotalAmount",ob."DiscountAmount",ob."TaxableAmount",ob."TaxAmount",ob."ServiceChargeAmount",ob."RoundingAmount",ob."TotalAmount",ob."TaxEnabled",ob."TaxName",ob."TaxRate",ob."TaxMode",ob."ServiceChargeEnabled",ob."ServiceChargeName",ob."ServiceChargeRate",ob."DiscountEnabled",ob."AppliedBranchOfferId",ob."AppliedOfferTitle",ob."RefundStatusCode",ob."RefundAmount",ob."RefundReason",ob."RefundedAtUtc",ob."GeneratedAtUtc",ob."UpdatedAtUtc" FROM "OrderBills" ob WHERE ob."TenantId"=p_tenantid AND ob."BranchId"=p_branchid AND ob."OrderId"=p_orderid; $$;
CREATE OR REPLACE FUNCTION public.orderbill_getbyorder(p_tenantid uuid,p_branchid uuid,p_orderid uuid) RETURNS TABLE("OrderBillId" uuid,"TenantId" uuid,"BranchId" uuid,"OrderId" uuid,"BillNumber" varchar,"PaymentStatusCode" varchar,"PaymentMethod" varchar,"SubtotalAmount" numeric,"DiscountAmount" numeric,"TaxableAmount" numeric,"TaxAmount" numeric,"ServiceChargeAmount" numeric,"RoundingAmount" numeric,"TotalAmount" numeric,"TaxEnabled" boolean,"TaxName" varchar,"TaxRate" numeric,"TaxMode" varchar,"ServiceChargeEnabled" boolean,"ServiceChargeName" varchar,"ServiceChargeRate" numeric,"DiscountEnabled" boolean,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"RefundStatusCode" varchar,"RefundAmount" numeric,"RefundReason" varchar,"RefundedAtUtc" timestamptz,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz) LANGUAGE sql STABLE AS $$ SELECT * FROM public.orderbill_row(p_tenantid,p_branchid,p_orderid); $$;
CREATE OR REPLACE FUNCTION public.orderbill_generate(p_tenantid uuid,p_branchid uuid,p_orderid uuid,p_discountamount numeric,p_servicechargeamount numeric,p_overridereason text,p_changedbyuserid uuid) RETURNS TABLE("OrderBillId" uuid,"TenantId" uuid,"BranchId" uuid,"OrderId" uuid,"BillNumber" varchar,"PaymentStatusCode" varchar,"PaymentMethod" varchar,"SubtotalAmount" numeric,"DiscountAmount" numeric,"TaxableAmount" numeric,"TaxAmount" numeric,"ServiceChargeAmount" numeric,"RoundingAmount" numeric,"TotalAmount" numeric,"TaxEnabled" boolean,"TaxName" varchar,"TaxRate" numeric,"TaxMode" varchar,"ServiceChargeEnabled" boolean,"ServiceChargeName" varchar,"ServiceChargeRate" numeric,"DiscountEnabled" boolean,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"RefundStatusCode" varchar,"RefundAmount" numeric,"RefundReason" varchar,"RefundedAtUtc" timestamptz,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz)
LANGUAGE plpgsql AS $$
DECLARE
    o record;
    bs record;
    taxable numeric;
    tax numeric;
    svc numeric;
    total numeric;
BEGIN
    SELECT ord.*
    INTO o
    FROM "Orders" ord
    WHERE ord."TenantId"=p_tenantid AND ord."BranchId"=p_branchid AND ord."OrderId"=p_orderid;

    IF o."OrderId" IS NULL THEN
        PERFORM public.raise_app_error(51708);
    END IF;

    SELECT settings.*
    INTO bs
    FROM "BranchBillingSettings" settings
    WHERE settings."TenantId"=p_tenantid AND settings."BranchId"=p_branchid;

    taxable := GREATEST(o."SubtotalAmount" - COALESCE(p_discountamount,0),0);
    tax := CASE WHEN COALESCE(bs."TaxEnabled",false) THEN round(taxable*COALESCE(bs."TaxRate",0)/100,2) ELSE 0 END;
    svc := COALESCE(p_servicechargeamount, CASE WHEN COALESCE(bs."ServiceChargeEnabled",false) THEN round(taxable*COALESCE(bs."ServiceChargeRate",0)/100,2) ELSE 0 END);
    total := taxable + tax + svc;

    INSERT INTO "OrderBills" ("OrderBillId","TenantId","BranchId","OrderId","BillNumber","SubtotalAmount","DiscountAmount","TaxableAmount","TaxAmount","ServiceChargeAmount","RoundingAmount","TotalAmount","TaxEnabled","TaxName","TaxRate","TaxMode","ServiceChargeEnabled","ServiceChargeName","ServiceChargeRate","DiscountEnabled","AppliedBranchOfferId","AppliedOfferTitle")
    VALUES (gen_random_uuid(),p_tenantid,p_branchid,p_orderid,'BILL-'||substr(p_orderid::text,1,8),o."SubtotalAmount",COALESCE(p_discountamount,0),taxable,tax,svc,0,total,COALESCE(bs."TaxEnabled",false),COALESCE(bs."TaxName",''),COALESCE(bs."TaxRate",0),COALESCE(bs."TaxMode",'Exclusive'),COALESCE(bs."ServiceChargeEnabled",false),COALESCE(bs."ServiceChargeName",''),COALESCE(bs."ServiceChargeRate",0),COALESCE(bs."DiscountEnabled",false),o."AppliedBranchOfferId",o."AppliedOfferTitle")
    ON CONFLICT ON CONSTRAINT "UQ_OrderBills_OrderId" DO UPDATE SET
        "DiscountAmount"=EXCLUDED."DiscountAmount",
        "TaxableAmount"=EXCLUDED."TaxableAmount",
        "TaxAmount"=EXCLUDED."TaxAmount",
        "ServiceChargeAmount"=EXCLUDED."ServiceChargeAmount",
        "TotalAmount"=EXCLUDED."TotalAmount",
        "UpdatedAtUtc"=public.app_now();

    RETURN QUERY SELECT * FROM public.orderbill_row(p_tenantid,p_branchid,p_orderid);
END;
$$;
CREATE OR REPLACE FUNCTION public.orderbill_updatepaymentstatus(p_tenantid uuid,p_branchid uuid,p_orderid uuid,p_paymentstatuscode text,p_paymentmethod text,p_reason text,p_changedbyuserid uuid) RETURNS TABLE("OrderBillId" uuid,"TenantId" uuid,"BranchId" uuid,"OrderId" uuid,"BillNumber" varchar,"PaymentStatusCode" varchar,"PaymentMethod" varchar,"SubtotalAmount" numeric,"DiscountAmount" numeric,"TaxableAmount" numeric,"TaxAmount" numeric,"ServiceChargeAmount" numeric,"RoundingAmount" numeric,"TotalAmount" numeric,"TaxEnabled" boolean,"TaxName" varchar,"TaxRate" numeric,"TaxMode" varchar,"ServiceChargeEnabled" boolean,"ServiceChargeName" varchar,"ServiceChargeRate" numeric,"DiscountEnabled" boolean,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"RefundStatusCode" varchar,"RefundAmount" numeric,"RefundReason" varchar,"RefundedAtUtc" timestamptz,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz) LANGUAGE plpgsql AS $$ BEGIN UPDATE "OrderBills" ob SET "PaymentStatusCode"=p_paymentstatuscode,"PaymentMethod"=p_paymentmethod,"PaidAtUtc"=CASE WHEN p_paymentstatuscode='Paid' THEN public.app_now() ELSE ob."PaidAtUtc" END,"UpdatedAtUtc"=public.app_now() WHERE ob."TenantId"=p_tenantid AND ob."BranchId"=p_branchid AND ob."OrderId"=p_orderid; RETURN QUERY SELECT * FROM public.orderbill_row(p_tenantid,p_branchid,p_orderid); END; $$;
CREATE OR REPLACE FUNCTION public.orderbill_updaterefundstatus(p_tenantid uuid,p_branchid uuid,p_orderid uuid,p_refundstatuscode text,p_refundamount numeric,p_reason text,p_changedbyuserid uuid) RETURNS TABLE("OrderBillId" uuid,"TenantId" uuid,"BranchId" uuid,"OrderId" uuid,"BillNumber" varchar,"PaymentStatusCode" varchar,"PaymentMethod" varchar,"SubtotalAmount" numeric,"DiscountAmount" numeric,"TaxableAmount" numeric,"TaxAmount" numeric,"ServiceChargeAmount" numeric,"RoundingAmount" numeric,"TotalAmount" numeric,"TaxEnabled" boolean,"TaxName" varchar,"TaxRate" numeric,"TaxMode" varchar,"ServiceChargeEnabled" boolean,"ServiceChargeName" varchar,"ServiceChargeRate" numeric,"DiscountEnabled" boolean,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"RefundStatusCode" varchar,"RefundAmount" numeric,"RefundReason" varchar,"RefundedAtUtc" timestamptz,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz) LANGUAGE plpgsql AS $$ BEGIN UPDATE "OrderBills" ob SET "RefundStatusCode"=p_refundstatuscode,"RefundAmount"=p_refundamount,"RefundReason"=p_reason,"RefundedAtUtc"=CASE WHEN p_refundstatuscode <> 'NotRefunded' THEN public.app_now() ELSE NULL END,"UpdatedAtUtc"=public.app_now() WHERE ob."TenantId"=p_tenantid AND ob."BranchId"=p_branchid AND ob."OrderId"=p_orderid; RETURN QUERY SELECT * FROM public.orderbill_row(p_tenantid,p_branchid,p_orderid); END; $$;

-- Feedback and reports
CREATE OR REPLACE FUNCTION public.orderfeedback_createfromqrtoken(p_qrtoken text,p_orderid uuid,p_orderfeedbackid uuid,p_rating integer,p_comment text) RETURNS SETOF "OrderFeedback" LANGUAGE plpgsql AS $$ DECLARE o record; BEGIN SELECT o.* INTO o FROM "Orders" o JOIN "BranchTables" bt ON bt."TableId"=o."TableId" WHERE o."OrderId"=p_orderid AND bt."QrToken"=p_qrtoken; IF o."OrderId" IS NULL THEN PERFORM public.raise_app_error(51709); END IF; INSERT INTO "OrderFeedback" ("OrderFeedbackId","TenantId","BranchId","OrderId","Rating","Comment","CustomerName","CustomerWhatsApp") VALUES (p_orderfeedbackid,o."TenantId",o."BranchId",p_orderid,p_rating,p_comment,o."CustomerName",o."CustomerWhatsApp"); RETURN QUERY SELECT * FROM "OrderFeedback" WHERE "OrderFeedbackId"=p_orderfeedbackid; END; $$;
CREATE OR REPLACE FUNCTION public.orderfeedback_getbyqrtoken(p_qrtoken text,p_orderid uuid) RETURNS SETOF "OrderFeedback" LANGUAGE sql STABLE AS $$ SELECT f.* FROM "OrderFeedback" f JOIN "Orders" o ON o."OrderId"=f."OrderId" JOIN "BranchTables" bt ON bt."TableId"=o."TableId" WHERE f."OrderId"=p_orderid AND bt."QrToken"=p_qrtoken; $$;
CREATE OR REPLACE FUNCTION public.adminfeedback_getlist(p_tenantid uuid,p_branchid uuid) RETURNS TABLE("OrderFeedbackId" uuid,"TenantId" uuid,"BranchId" uuid,"BranchName" varchar,"OrderId" uuid,"TableName" varchar,"CustomerId" uuid,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Rating" integer,"Comment" varchar,"OrderCreatedAtUtc" timestamptz,"CreatedAtUtc" timestamptz) LANGUAGE sql STABLE AS $$ SELECT f."OrderFeedbackId",f."TenantId",f."BranchId",b."Name",f."OrderId",bt."Name",o."CustomerId",f."CustomerName",f."CustomerWhatsApp",f."Rating",f."Comment",o."CreatedAtUtc",f."CreatedAtUtc" FROM "OrderFeedback" f JOIN "Orders" o ON o."OrderId"=f."OrderId" JOIN "Branches" b ON b."BranchId"=f."BranchId" JOIN "BranchTables" bt ON bt."TableId"=o."TableId" WHERE f."TenantId"=p_tenantid AND (p_branchid IS NULL OR f."BranchId"=p_branchid) ORDER BY f."CreatedAtUtc" DESC LIMIT 200; $$;
CREATE OR REPLACE FUNCTION public.publiccustomer_lookupbyqrtoken(p_qrtoken text,p_customerwhatsapp text) RETURNS TABLE("CustomerId" uuid,"Name" varchar,"WhatsAppNumber" varchar,"MarketingConsent" boolean,"VisitCount" integer,"TotalOrderCount" integer,"TotalOrderValue" numeric,"LastVisitAtUtc" timestamptz) LANGUAGE sql STABLE AS $$ SELECT c."CustomerId",c."Name",c."WhatsAppNumber",c."MarketingConsent",c."VisitCount",COUNT(o."OrderId")::integer,COALESCE(SUM(o."TotalAmount"),0),COALESCE(c."LastVisitAtUtc",c."CreatedAtUtc") FROM "Customers" c JOIN "BranchTables" bt ON bt."BranchId"=c."BranchId" LEFT JOIN "Orders" o ON o."CustomerId"=c."CustomerId" WHERE bt."QrToken"=p_qrtoken AND c."WhatsAppNumber"=p_customerwhatsapp GROUP BY c."CustomerId"; $$;
CREATE OR REPLACE FUNCTION public.publiccustomer_recentordersbycustomer(p_customerid uuid) RETURNS TABLE("OrderId" uuid,"CreatedAtUtc" timestamptz,"TotalAmount" numeric) LANGUAGE sql STABLE AS $$ SELECT o."OrderId",o."CreatedAtUtc",o."TotalAmount" FROM "Orders" o WHERE o."CustomerId"=p_customerid ORDER BY o."CreatedAtUtc" DESC LIMIT 5; $$;
CREATE OR REPLACE FUNCTION public.publiccustomer_recentorderitemsbycustomer(p_customerid uuid) RETURNS TABLE("OrderId" uuid,"MenuItemId" uuid,"MenuItemVariantId" uuid,"MenuItemName" varchar,"VariantName" varchar,"ItemNote" varchar,"Quantity" integer) LANGUAGE sql STABLE AS $$ SELECT oi."OrderId",oi."MenuItemId",oi."MenuItemVariantId",oi."MenuItemName",oi."VariantName",oi."ItemNote",oi."Quantity" FROM "OrderItems" oi JOIN (SELECT o."OrderId" FROM "Orders" o WHERE o."CustomerId"=p_customerid ORDER BY o."CreatedAtUtc" DESC LIMIT 5) recent ON recent."OrderId"=oi."OrderId" ORDER BY oi."RowId"; $$;

CREATE OR REPLACE FUNCTION public.report_orders(p_tenantid uuid,p_branchid uuid,p_datefrom timestamptz,p_dateto timestamptz,p_statuscode text,p_search text) RETURNS TABLE("OrderId" uuid,"BranchId" uuid,"BranchName" varchar,"TableId" uuid,"TableName" varchar,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"TotalAmount" numeric,"ItemCount" integer,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz,"AcceptedAtUtc" timestamptz,"PreparingAtUtc" timestamptz,"ReadyAtUtc" timestamptz,"ServedAtUtc" timestamptz,"CompletedAtUtc" timestamptz,"CancelledAtUtc" timestamptz,"LatestReason" varchar) LANGUAGE sql STABLE AS $$ SELECT o."OrderId",o."BranchId",b."Name",o."TableId",bt."Name",o."OrderStatusCode",o."CustomerName",o."CustomerWhatsApp",o."Notes",o."TotalAmount",COUNT(oi."OrderItemId")::integer,o."CreatedAtUtc",o."UpdatedAtUtc",NULL::timestamptz,NULL::timestamptz,NULL::timestamptz,NULL::timestamptz,NULL::timestamptz,NULL::timestamptz,NULL::varchar FROM "Orders" o JOIN "Branches" b ON b."BranchId"=o."BranchId" JOIN "BranchTables" bt ON bt."TableId"=o."TableId" LEFT JOIN "OrderItems" oi ON oi."OrderId"=o."OrderId" WHERE o."TenantId"=p_tenantid AND (p_branchid IS NULL OR o."BranchId"=p_branchid) AND (p_datefrom IS NULL OR o."CreatedAtUtc">=p_datefrom) AND (p_dateto IS NULL OR o."CreatedAtUtc"<p_dateto) AND (p_statuscode IS NULL OR o."OrderStatusCode"=p_statuscode) AND (p_search IS NULL OR o."CustomerName" ILIKE '%'||p_search||'%' OR o."CustomerWhatsApp" ILIKE '%'||p_search||'%') GROUP BY o."OrderId",b."Name",bt."Name" ORDER BY o."CreatedAtUtc" DESC LIMIT 500; $$;
CREATE OR REPLACE FUNCTION public.report_ordersummary(p_tenantid uuid,p_branchid uuid,p_datefrom timestamptz,p_dateto timestamptz,p_statuscode text,p_search text) RETURNS TABLE("TotalOrders" integer,"CompletedOrders" integer,"CancelledOrders" integer,"TotalOrderValue" numeric,"AverageOrderValue" numeric,"AverageReadyMinutes" numeric) LANGUAGE sql STABLE AS $$ SELECT COUNT(*)::integer,COUNT(*) FILTER (WHERE "OrderStatusCode"='Completed')::integer,COUNT(*) FILTER (WHERE "OrderStatusCode" IN ('Cancelled','Void'))::integer,COALESCE(SUM("TotalAmount"),0),COALESCE(AVG("TotalAmount"),0),0::numeric FROM "Orders" WHERE "TenantId"=p_tenantid AND (p_branchid IS NULL OR "BranchId"=p_branchid); $$;
CREATE OR REPLACE FUNCTION public.report_items(p_tenantid uuid,p_branchid uuid,p_datefrom timestamptz,p_dateto timestamptz,p_statuscode text,p_search text) RETURNS TABLE("ItemName" varchar,"VariantName" varchar,"Quantity" integer,"OrderCount" integer,"TotalValue" numeric) LANGUAGE sql STABLE AS $$ SELECT oi."MenuItemName",oi."VariantName",SUM(oi."Quantity")::integer,COUNT(DISTINCT oi."OrderId")::integer,SUM(oi."LineTotal") FROM "OrderItems" oi JOIN "Orders" o ON o."OrderId"=oi."OrderId" WHERE o."TenantId"=p_tenantid AND (p_branchid IS NULL OR o."BranchId"=p_branchid) GROUP BY oi."MenuItemName",oi."VariantName" ORDER BY SUM(oi."LineTotal") DESC; $$;
CREATE OR REPLACE FUNCTION public.report_customers(p_tenantid uuid,p_branchid uuid,p_datefrom timestamptz,p_dateto timestamptz,p_statuscode text,p_search text) RETURNS TABLE("CustomerId" uuid,"CustomerKey" text,"CustomerName" varchar,"CustomerWhatsApp" varchar,"MarketingConsent" boolean,"VisitCount" integer,"OrderCount" integer,"TotalValue" numeric,"FirstVisitAtUtc" timestamptz,"LastVisitAtUtc" timestamptz,"LastOrderAtUtc" timestamptz,"BranchesVisited" integer,"FirstBranchName" varchar,"LastBranchName" varchar,"FavoriteItemName" varchar,"FavoriteVariantName" varchar,"FavoriteItemQuantity" integer) LANGUAGE sql STABLE AS $$ SELECT c."CustomerId",COALESCE(c."WhatsAppNumber",c."CustomerId"::text),c."Name",c."WhatsAppNumber",c."MarketingConsent",c."VisitCount",COUNT(o."OrderId")::integer,COALESCE(SUM(o."TotalAmount"),0),c."CreatedAtUtc",c."LastVisitAtUtc",MAX(o."CreatedAtUtc"),COUNT(DISTINCT o."BranchId")::integer,NULL::varchar,NULL::varchar,NULL::varchar,NULL::varchar,0 FROM "Customers" c LEFT JOIN "Orders" o ON o."CustomerId"=c."CustomerId" WHERE c."TenantId"=p_tenantid AND (p_branchid IS NULL OR c."BranchId"=p_branchid) GROUP BY c."CustomerId" ORDER BY MAX(o."CreatedAtUtc") DESC NULLS LAST; $$;
CREATE OR REPLACE FUNCTION public.report_orderdetail(p_tenantid uuid,p_orderid uuid) RETURNS TABLE("OrderId" uuid,"BranchId" uuid,"BranchName" varchar,"TableId" uuid,"TableName" varchar,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"TotalAmount" numeric,"ItemCount" integer,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz,"AcceptedAtUtc" timestamptz,"PreparingAtUtc" timestamptz,"ReadyAtUtc" timestamptz,"ServedAtUtc" timestamptz,"CompletedAtUtc" timestamptz,"CancelledAtUtc" timestamptz,"LatestReason" varchar) LANGUAGE sql STABLE AS $$ SELECT * FROM public.report_orders(p_tenantid,NULL,NULL,NULL,NULL,NULL) WHERE "OrderId"=p_orderid; $$;
CREATE OR REPLACE FUNCTION public.report_orderitemsbyorder(p_tenantid uuid,p_orderid uuid) RETURNS TABLE("OrderItemId" uuid,"MenuItemId" uuid,"MenuItemVariantId" uuid,"MenuItemName" varchar,"VariantName" varchar,"ItemNote" varchar,"UnitPrice" numeric,"Quantity" integer,"LineTotal" numeric) LANGUAGE sql STABLE AS $$ SELECT oi."OrderItemId",oi."MenuItemId",oi."MenuItemVariantId",oi."MenuItemName",oi."VariantName",oi."ItemNote",oi."UnitPrice",oi."Quantity",oi."LineTotal" FROM "OrderItems" oi WHERE oi."TenantId"=p_tenantid AND oi."OrderId"=p_orderid ORDER BY oi."RowId"; $$;
CREATE OR REPLACE FUNCTION public.report_orderhistorybyorder(p_tenantid uuid,p_orderid uuid) RETURNS TABLE("OrderStatusHistoryId" uuid,"OrderId" uuid,"OldStatusCode" varchar,"NewStatusCode" varchar,"Reason" varchar,"ChangedByUserId" uuid,"CreatedAtUtc" timestamptz) LANGUAGE sql STABLE AS $$ SELECT h."OrderStatusHistoryId",h."OrderId",LAG(h."StatusCode") OVER (PARTITION BY h."OrderId" ORDER BY h."CreatedAtUtc")::varchar,h."StatusCode",h."Reason",h."ChangedByUserId",h."CreatedAtUtc" FROM "OrderStatusHistory" h WHERE h."TenantId"=p_tenantid AND h."OrderId"=p_orderid ORDER BY h."CreatedAtUtc"; $$;
