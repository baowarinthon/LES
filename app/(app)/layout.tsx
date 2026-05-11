"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppNavbar } from "@/components/shared/AppNavbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPrivileged = role === "admin" || role === "super_admin";

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (pathname === "/onboarding") return;

    if (!user.onboardingComplete) {
      router.replace("/onboarding");
      return;
    }

    // Status check — admins bypass
    if (!isPrivileged) {
      const status = user.status ?? "approved"; // existing users without field default to approved
      if (status === "pending") {
        router.replace("/pending");
        return;
      }
      if (status === "rejected") {
        router.replace("/rejected");
        return;
      }
    }
  }, [user, role, loading, router, pathname, isPrivileged]);

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

  // Block render while redirecting pending/rejected
  if (!isPrivileged) {
    const status = user.status ?? "approved";
    if (status === "pending" || status === "rejected") return null;
  }

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
