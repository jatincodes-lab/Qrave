"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Shield } from "lucide-react";
import { ApiError, bootstrapSuperAdmin, loginSuperAdmin } from "../../../lib/api";
import { setSuperAdminAccessToken, setSuperAdminSession } from "../../../lib/auth";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "bootstrap">("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = mode === "login"
        ? await loginSuperAdmin(email, password)
        : await bootstrapSuperAdmin({ email, displayName, password, setupToken });

      setSuperAdminAccessToken(response.accessToken);
      setSuperAdminSession({
        expiresAtUtc: response.expiresAtUtc,
        user: {
          userId: response.user.userId,
          email: response.user.email,
          displayName: response.user.displayName,
          roleCode: response.user.roleCode
        }
      });
      router.replace("/superadmin/dashboard");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Super admin login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8">
      <Card className="w-full max-w-md border-outline-variant/50 bg-surface-container-lowest shadow-soft-saas">
        <CardHeader>
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-white">
            <Shield size={23} />
          </div>
          <CardTitle className="mt-4 text-2xl text-primary">Qrave Super Admin</CardTitle>
          <CardDescription>Platform-only access for managing restaurants, subscriptions, and internal actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            </Field>
            {mode === "bootstrap" ? (
              <Field label="Display name">
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required autoComplete="name" />
              </Field>
            ) : null}
            <Field label="Password">
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </Field>
            {mode === "bootstrap" ? (
              <Field label="Setup token">
                <Input type="password" value={setupToken} onChange={(event) => setSetupToken(event.target.value)} required />
              </Field>
            ) : null}

            {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-semibold text-destructive">{error}</p> : null}

            <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
              <LockKeyhole size={17} />
              {isSubmitting ? "Working..." : mode === "login" ? "Login" : "Create first super admin"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode(mode === "login" ? "bootstrap" : "login");
            }}
            className="mt-4 w-full rounded-lg px-3 py-2 text-sm font-bold text-primary hover:bg-primary/5"
          >
            {mode === "login" ? "First-time setup" : "Back to login"}
          </button>
        </CardContent>
      </Card>
    </main>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
