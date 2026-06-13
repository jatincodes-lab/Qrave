"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "loading";

type Toast = {
  id: string;
  message: string;
  title?: string;
  variant: ToastVariant;
};

type ToastInput = {
  message: string;
  title?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  dismissToast: (id: string) => void;
  showToast: (toast: ToastInput) => string;
  toastError: (message: string, title?: string) => string;
  toastInfo: (message: string, title?: string) => string;
  toastLoading: (message: string, title?: string) => string;
  toastSuccess: (message: string, title?: string) => string;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const AutoDismissMs = 4_500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, title, variant = "info" }: ToastInput) => {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      const toast = { id, message, title, variant };

      setToasts((current) => [toast, ...current.filter((item) => item.message !== message || item.variant !== variant)].slice(0, 4));

      if (variant !== "loading") {
        const timer = setTimeout(() => dismissToast(id), AutoDismissMs);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      dismissToast,
      showToast,
      toastError: (message, title = "Action failed") => showToast({ message, title, variant: "error" }),
      toastInfo: (message, title = "Notice") => showToast({ message, title, variant: "info" }),
      toastLoading: (message, title = "Working") => showToast({ message, title, variant: "loading" }),
      toastSuccess: (message, title = "Done") => showToast({ message, title, variant: "success" })
    }),
    [dismissToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onClose={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}

function ToastViewport({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[100] grid w-[min(24rem,calc(100vw-2rem))] gap-3" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const isError = toast.variant === "error";
  const Icon = toast.variant === "success" ? CheckCircle2 : toast.variant === "loading" ? Loader2 : isError ? AlertCircle : Info;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border bg-white p-4 shadow-lg ring-1 ring-black/5 ${
        isError ? "border-destructive/25" : toast.variant === "success" ? "border-primary/25" : "border-outline-variant/50"
      }`}
      role={isError ? "alert" : "status"}
    >
      <div className={`mt-0.5 ${isError ? "text-destructive" : toast.variant === "success" ? "text-primary" : "text-on-surface-variant"}`}>
        <Icon className={`h-5 w-5 ${toast.variant === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        {toast.title ? <p className="text-sm font-extrabold text-on-surface">{toast.title}</p> : null}
        <p className="mt-1 text-sm font-semibold leading-5 text-on-surface-variant">{toast.message}</p>
      </div>
      <button type="button" className="rounded-md p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface" onClick={onClose} aria-label="Dismiss notification">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
