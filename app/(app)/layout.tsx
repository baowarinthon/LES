"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppNavbar } from "@/components/shared/AppNavbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (pathname === "/onboarding") return;

    if (!user.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  if (pathname === "/onboarding") return <>{children}</>;

  if (!user.onboardingComplete) return null;

  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/executive");

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppNavbar />
      {isAdminArea ? (
        <div className="flex flex-1 flex-col">{children}</div>
      ) : (
        <div className="mx-auto w-full max-w-7xl px-6 flex flex-1 flex-col">
          {children}
        </div>
      )}
    </div>
  );
}
