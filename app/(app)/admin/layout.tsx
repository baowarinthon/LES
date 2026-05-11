"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Users,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getAllUsers, updatePublicStats } from "@/lib/firestore";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  const isAdmin = role === "admin" || role === "super_admin";

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/home");
    }
  }, [isAdmin, loading, router]);

  useEffect(() => {
    if (!isAdmin) return;
    getAllUsers()
      .then((users) => {
        const count = users.filter((u) => (u.status ?? "approved") === "pending").length;
        setPendingCount(count);
      })
      .catch(console.error);
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#274897]/20 border-t-[#274897]" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // Sync public landing page stats once per admin session
  updatePublicStats().catch(console.error);

  const NAV_ITEMS = [
    { icon: LayoutDashboard, label: "ภาพรวม", href: "/admin", badge: 0 },
    { icon: BookOpen, label: "จัดการเควสต์", href: "/admin/quests", badge: 0 },
    { icon: ClipboardCheck, label: "ตรวจงาน", href: "/admin/review", badge: 0 },
    { icon: Users, label: "จัดการผู้ใช้", href: "/admin/users", badge: pendingCount },
  ];

  return (
    <div className="flex flex-1 bg-gray-50">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-white lg:flex">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <LayoutDashboard size={18} className="text-[#274897]" />
          <span className="font-bold text-sm text-[#274897]">Admin Panel</span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV_ITEMS.map(({ icon: Icon, label, href, badge }) => {
            const active = pathname === href;
            return (
              <button
                key={href}
                type="button"
                onClick={() => router.push(href)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#274897] text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{label}</span>
                {badge > 0 && (
                  <span className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                    active ? "bg-white text-[#274897]" : "bg-red-500 text-white",
                  )}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={16} />
            กลับหน้าหลัก
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>

        {/* Mobile bottom tabs */}
        <nav className="flex border-t bg-white lg:hidden">
          {NAV_ITEMS.map(({ icon: Icon, label, href, badge }) => {
            const active = pathname === href;
            return (
              <button
                key={href}
                type="button"
                onClick={() => router.push(href)}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-[#274897]" : "text-gray-400 hover:text-gray-600",
                )}
              >
                <span className="relative">
                  <Icon size={18} />
                  {badge > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="truncate max-w-[52px] text-center leading-tight">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
