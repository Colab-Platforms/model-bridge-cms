"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const error = params.get("error");

    if (error || !accessToken || !refreshToken) {
      router.replace("/auth/login");
      return;
    }

    // Seed localStorage so the api interceptor can attach the token on the
    // /users/me call that follows immediately below.
    const raw = localStorage.getItem("auth-storage");
    const stored = raw ? JSON.parse(raw) : { state: {} };
    stored.state.accessToken = accessToken;
    stored.state.refreshToken = refreshToken;
    localStorage.setItem("auth-storage", JSON.stringify(stored));

    api
      .get("/users/me")
      .then(({ data }) => {
        setAuth(data, accessToken, refreshToken);
        // Best-effort wallet creation for new Google sign-ups.
        api.post("/wallets").catch(() => {});
        const isAdmin = (data.role as string)?.toLowerCase() === "admin";
        router.replace(isAdmin ? "/admin/statistics" : "/dashboard");
      })
      .catch(() => {
        localStorage.removeItem("auth-storage");
        router.replace("/auth/login");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
        <p className="text-sm text-muted-foreground">Completing sign-in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
