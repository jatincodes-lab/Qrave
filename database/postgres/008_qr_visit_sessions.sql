-- Adds short-lived QR table sessions. Public menu browsing remains available,
-- but order placement and waiter calls must include an active session id.

CREATE TABLE IF NOT EXISTS "QrVisitSessions" (
    "QrSessionId" uuid PRIMARY KEY,
    "TenantId" uuid NOT NULL REFERENCES "Tenants"("TenantId") ON DELETE CASCADE,
    "BranchId" uuid NOT NULL REFERENCES "Branches"("BranchId") ON DELETE CASCADE,
    "TableId" uuid NOT NULL REFERENCES "BranchTables"("TableId") ON DELETE CASCADE,
    "QrToken" varchar(80) NOT NULL,
    "StartedAtUtc" timestamptz NOT NULL DEFAULT public.app_now(),
    "ExpiresAtUtc" timestamptz NOT NULL,
    "RevokedAtUtc" timestamptz NULL,
    "CreatedAtUtc" timestamptz NOT NULL DEFAULT public.app_now()
);

CREATE INDEX IF NOT EXISTS "IX_QrVisitSessions_QrToken_ExpiresAtUtc"
ON "QrVisitSessions" ("QrToken","ExpiresAtUtc");

CREATE OR REPLACE FUNCTION public.qrvisitsession_create(p_qrtoken text,p_qrsessionid uuid,p_ttlminutes integer)
RETURNS TABLE("QrSessionId" uuid,"BranchId" uuid,"TableId" uuid,"StartedAtUtc" timestamptz,"ExpiresAtUtc" timestamptz,"IsExpired" boolean)
LANGUAGE plpgsql AS $$
DECLARE
    ctx record;
    started_at timestamptz := public.app_now();
    ttl_minutes integer := LEAST(GREATEST(COALESCE(p_ttlminutes,240),15),720);
BEGIN
    PERFORM public.publicqr_assert_tenant_available(p_qrtoken);

    SELECT bt."TenantId",bt."BranchId",bt."TableId"
    INTO ctx
    FROM "BranchTables" bt
    JOIN "Branches" b ON b."BranchId"=bt."BranchId" AND b."IsActive"
    WHERE bt."QrToken"=p_qrtoken AND bt."IsActive";

    IF ctx."TableId" IS NULL THEN
        PERFORM public.raise_app_error(51701);
    END IF;

    INSERT INTO "QrVisitSessions" ("QrSessionId","TenantId","BranchId","TableId","QrToken","StartedAtUtc","ExpiresAtUtc")
    VALUES (p_qrsessionid,ctx."TenantId",ctx."BranchId",ctx."TableId",p_qrtoken,started_at,started_at + make_interval(mins => ttl_minutes));

    RETURN QUERY
    SELECT qvs."QrSessionId",qvs."BranchId",qvs."TableId",qvs."StartedAtUtc",qvs."ExpiresAtUtc",(qvs."ExpiresAtUtc" <= public.app_now() OR qvs."RevokedAtUtc" IS NOT NULL)
    FROM "QrVisitSessions" qvs
    WHERE qvs."QrSessionId"=p_qrsessionid;
END;
$$;

CREATE OR REPLACE FUNCTION public.qrvisitsession_assert_active(p_qrtoken text,p_qrsessionid uuid)
RETURNS TABLE("TenantId" uuid,"BranchId" uuid,"TableId" uuid)
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM public.publicqr_assert_tenant_available(p_qrtoken);

    RETURN QUERY
    SELECT qvs."TenantId",qvs."BranchId",qvs."TableId"
    FROM "QrVisitSessions" qvs
    JOIN "BranchTables" bt ON bt."TableId"=qvs."TableId" AND bt."QrToken"=p_qrtoken AND bt."IsActive"
    JOIN "Branches" b ON b."BranchId"=qvs."BranchId" AND b."IsActive"
    WHERE qvs."QrSessionId"=p_qrsessionid
      AND qvs."QrToken"=p_qrtoken
      AND qvs."RevokedAtUtc" IS NULL
      AND qvs."ExpiresAtUtc" > public.app_now();

    IF NOT FOUND THEN
        PERFORM public.raise_app_error(52001);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.publicorder_createfromqrtoken(p_qrtoken text,p_qrsessionid uuid,p_orderid uuid,p_customername text,p_customerwhatsapp text,p_notes text,p_itemsjson text,p_marketingconsent boolean,p_marketingconsentsource text)
RETURNS TABLE("OrderId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"OrderStatusCode" varchar,"CustomerName" varchar,"CustomerWhatsApp" varchar,"Notes" varchar,"SubtotalAmount" numeric,"TotalAmount" numeric,"AppliedBranchOfferId" uuid,"AppliedOfferTitle" varchar,"AppliedOfferDiscountAmount" numeric,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz)
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM 1 FROM public.qrvisitsession_assert_active(p_qrtoken,p_qrsessionid);
    RETURN QUERY SELECT * FROM public.publicorder_createfromqrtoken(p_qrtoken,p_orderid,p_customername,p_customerwhatsapp,p_notes,p_itemsjson,p_marketingconsent,p_marketingconsentsource);
END;
$$;

CREATE OR REPLACE FUNCTION public.waitercall_createfromqrtoken(p_qrtoken text,p_qrsessionid uuid,p_waitercallid uuid,p_customername text,p_note text)
RETURNS TABLE("WaiterCallId" uuid,"TenantId" uuid,"BranchId" uuid,"TableId" uuid,"TableName" varchar,"StatusCode" varchar,"CustomerName" varchar,"Note" varchar,"CreatedAtUtc" timestamptz,"UpdatedAtUtc" timestamptz)
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM 1 FROM public.qrvisitsession_assert_active(p_qrtoken,p_qrsessionid);
    RETURN QUERY SELECT * FROM public.waitercall_createfromqrtoken(p_qrtoken,p_waitercallid,p_customername,p_note);
END;
$$;
