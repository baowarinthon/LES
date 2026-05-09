"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { user, role, loading, authError } = useAuth();
  const router = useRouter();
  const [signing, setSigning] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace(role === "executive" ? "/executive/dashboard" : "/home");
    }
  }, [user, role, loading, router]);

  const error = localError ?? authError;

  async function handleSignIn() {
    setSigning(true);
    setLocalError(null);
    try {
      // signInWithRedirect navigates away — no need to setSigning(false)
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed. Please try again.";
      console.error("[Login] Sign in error:", err);
      setLocalError(msg);
      setSigning(false);
    }
  }

  // Show spinner while checking auth state OR while redirect is in progress
  if (loading || signing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">
            {signing ? "Redirecting to Google…" : "Loading…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Brand */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-2">
            L
          </div>
          <h1 className="text-2xl font-bold tracking-tight">LES</h1>
          <p className="text-sm text-muted-foreground">Learning Ecosystem System</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in with your team&apos;s Google account
            </p>
          </div>

          {/* Auth error — shown prominently so it's visible */}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p className="font-medium">Sign in failed</p>
              <p className="mt-0.5 text-xs opacity-80 break-all">{error}</p>
            </div>
          )}

          <Button
            onClick={handleSignIn}
            variant="outline"
            className="w-full gap-3 h-11 font-medium"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          One account per team · 3 members per account
        </p>
      </div>
    </div>
  );
}
