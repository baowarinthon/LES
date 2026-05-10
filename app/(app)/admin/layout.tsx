"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Users,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { updatePublicStats } from "@/lib/firestore";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "ภาพรวม", href: "/admin" },
  { icon: BookOpen, label: "จัดการเควสต์", href: "/admin/quests" },
  { icon: ClipboardCheck, label: "ตรวจงาน", href: "/admin/review" },
  { icon: Users, label: "จัดการผู้ใช้", href: "/admin/users" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.replace("/home");
    }
  }, [role, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#274897]/20 border-t-[#274897]" />
      </div>
    );
  }

  if (role !== "admin") return null;

  // Sync public landing page stats once per admin session
  updatePublicStats().catch(console.error);

  return (
    <div className="flex flex-1 bg-gray-50">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-white lg:flex">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <LayoutDashboard size={18} className="text-[#274897]" />
          <span className="font-bold text-sm text-[#274897]">Admin Panel</span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
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
                {label}
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
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = pathname === href;
            return (
              <button
                key={href}
                type="button"
                onClick={() => router.push(href)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-[#274897]" : "text-gray-400 hover:text-gray-600",
                )}
              >
                <Icon size={18} />
                <span className="truncate max-w-[52px] text-center leading-tight">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
