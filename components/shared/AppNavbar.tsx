"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Compass,
  Trophy,
  Archive,
  Settings,
  LayoutDashboard,
  BarChart2,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function AppNavbar() {
  const { user, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.replace("/");
  }

  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/executive");

  const menuItems = [
    { icon: Settings, label: "ตั้งค่าทีม", href: "/settings", show: true },
    { icon: LayoutDashboard, label: "Admin Panel", href: "/admin", show: role === "admin" },
    { icon: BarChart2, label: "Executive Dashboard", href: "/executive/dashboard", show: role === "admin" },
  ].filter((item) => item.show);

  return (
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-sm">
      <div className={cn("mx-auto flex w-full items-center justify-between px-6 py-3", !isAdminArea && "max-w-7xl")}>
        {/* Left: brand */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="hover:opacity-80 transition-opacity"
          >
            <img src="/images/aot_sles_logo.png" alt="AOT SLES" className="h-8 w-auto" />
          </button>

          {/* Nav links — hidden in admin/executive area */}
          {!isAdminArea && role !== "executive" && (
            <nav className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => router.push("/quests")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  pathname.startsWith("/quests")
                    ? "bg-[#274897]/10 text-[#274897] font-medium"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                <Compass size={15} />
                ภารกิจ
              </button>
              <button
                type="button"
                onClick={() => router.push("/archives")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  pathname === "/archives"
                    ? "bg-[#274897]/10 text-[#274897] font-medium"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                <Archive size={15} />
                คลังภารกิจ
              </button>
              <button
                type="button"
                onClick={() => router.push("/leaderboard")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  pathname === "/leaderboard"
                    ? "bg-[#274897]/10 text-[#274897] font-medium"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                <Trophy size={15} />
                อันดับ
              </button>
            </nav>
          )}
        </div>

        {/* Right: avatar dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-100"
          >
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user?.teamName}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-[#274897]/20"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#274897]/10 text-xs font-bold text-[#274897]">
                {user?.teamName?.[0] ?? "T"}
              </div>
            )}
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-gray-900 leading-none">
                {user?.teamName ?? "ทีม"}
              </p>
              {user?.airport && (
                <p className="mt-0.5 text-xs text-[#274897]">{user.airport}</p>
              )}
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border bg-white shadow-lg z-50">
              {/* Profile header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b">
                {user?.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user?.teamName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#274897]/10 text-sm font-bold text-[#274897]">
                    {user?.teamName?.[0] ?? "T"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900 text-sm">
                    {user?.teamName ?? "ทีม"}
                  </p>
                  {user?.airport && (
                    <p className="truncate text-xs text-gray-400">{user.airport}</p>
                  )}
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                {menuItems.map(({ icon: Icon, label, href }) => (
                  <button
                    key={href}
                    type="button"
                    onClick={() => { setMenuOpen(false); router.push(href); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Icon size={16} className="text-gray-400" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Logout */}
              <div className="border-t py-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  ออกจากระบบ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
