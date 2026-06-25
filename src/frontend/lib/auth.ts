const TokenStorageKey = "qrapp.admin.accessToken";
const SessionStorageKey = "qrapp.admin.session";
const SuperAdminTokenStorageKey = "qrapp.superadmin.accessToken";
const SuperAdminSessionStorageKey = "qrapp.superadmin.session";
const TokenExpirySkewSeconds = 30;

type JwtPayload = {
  exp?: number;
  role_code?: string;
  branch_id?: string;
};

export type StoredAdminSession = {
  tenant: {
    tenantId: string;
    name: string;
    slug: string;
    accessStatus: {
      tenantId: string;
      planCode: string;
      trialStartAtUtc: string | null;
      trialEndAtUtc: string | null;
      subscriptionStatusCode: string;
      accountStatusCode: string;
      isTenantActive: boolean;
      isAccountActive: boolean;
      isTrialExpired: boolean;
      isAccessAllowed: boolean;
      trialDaysRemaining: number | null;
      message: string;
    };
  };
};

export type StoredSuperAdminSession = {
  user: {
    userId: string;
    email: string;
    displayName: string;
    roleCode: string;
  };
  expiresAtUtc: string;
};

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return getValidStoredToken(TokenStorageKey, clearAccessToken);
}

export function setAccessToken(token: string): void {
  if (!isUsableJwt(token)) {
    clearAccessToken();
    return;
  }

  window.localStorage.setItem(TokenStorageKey, token);
}

export function setAdminSession(session: StoredAdminSession): void {
  window.localStorage.setItem(SessionStorageKey, JSON.stringify(session));
}

export function getAdminSession(): StoredAdminSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SessionStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAdminSession;
  } catch {
    window.localStorage.removeItem(SessionStorageKey);
    return null;
  }
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TokenStorageKey);
  window.localStorage.removeItem(SessionStorageKey);
}

export function getSuperAdminAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return getValidStoredToken(SuperAdminTokenStorageKey, clearSuperAdminSession);
}

export function setSuperAdminAccessToken(token: string): void {
  if (!isUsableJwt(token)) {
    clearSuperAdminSession();
    return;
  }

  window.localStorage.setItem(SuperAdminTokenStorageKey, token);
}

export function setSuperAdminSession(session: StoredSuperAdminSession): void {
  window.localStorage.setItem(SuperAdminSessionStorageKey, JSON.stringify(session));
}

export function getSuperAdminSession(): StoredSuperAdminSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SuperAdminSessionStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSuperAdminSession;
  } catch {
    window.localStorage.removeItem(SuperAdminSessionStorageKey);
    return null;
  }
}

export function clearSuperAdminSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SuperAdminTokenStorageKey);
  window.localStorage.removeItem(SuperAdminSessionStorageKey);
}

export function getCurrentRoleCode(): string | null {
  return getTokenPayload()?.role_code ?? null;
}

export function getCurrentBranchId(): string | null {
  return getTokenPayload()?.branch_id ?? null;
}

export function getAccessTokenExpiresAt(): number | null {
  const payload = getTokenPayload();
  return payload?.exp ? payload.exp * 1000 : null;
}

function getTokenPayload(): JwtPayload | null {
  const token = getAccessToken();
  if (!token) {
    return null;
  }

  return readJwtPayload(token);
}

function getValidStoredToken(storageKey: string, clearSession: () => void): string | null {
  const token = window.localStorage.getItem(storageKey);
  if (!token) {
    return null;
  }

  if (!isUsableJwt(token)) {
    clearSession();
    return null;
  }

  return token;
}

function isUsableJwt(token: string): boolean {
  const payload = readJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowSeconds + TokenExpirySkewSeconds;
}

function readJwtPayload(token: string): JwtPayload | null {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(window.atob(toBase64(payload))) as JwtPayload;
  } catch {
    return null;
  }
}

function toBase64(value: string): string {
  return value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
}
