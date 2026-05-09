"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, BookOpen, ClipboardCheck, Award, Zap, RefreshCw } from "lucide-react";
import {
  getAllUsers,
  getSubmissionStats,
  getTotalXP,
  getActiveQuestCount,
  updatePublicStats,
} from "@/lib/firestore";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ users: 0, activeQuests: 0, pending: 0, totalXP: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [allUsers, subStats, totalXP, activeQuests] = await Promise.all([
          getAllUsers(),
          getSubmissionStats(),
          getTotalXP(),
          getActiveQuestCount(),
        ]);
        setStats({
          users: allUsers.length,
          activeQuests,
          pending: subStats.pending,
          totalXP,
        });
      } catch (err) {
        console.error("Admin dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSyncStats() {
    setSyncing(true);
    try {
      await updatePublicStats();
      setSyncedAt(new Date());
    } catch (err) {
      console.error("Sync stats error:", err);
    } finally {
      setSyncing(false);
    }
  }

  const statCards = [
    { icon: Users, label: "ทีมทั้งหมด", value: stats.users, color: "text-blue-500", bg: "bg-blue-50" },
    { icon: BookOpen, label: "เควสต์ที่เปิด", value: stats.activeQuests, color: "text-emerald-500", bg: "bg-emerald-50" },
    { icon: ClipboardCheck, label: "รอตรวจงาน", value: stats.pending, color: "text-orange-500", bg: "bg-orange-50" },
    { icon: Zap, label: "XP รวม", value: `${stats.totalXP.toLocaleString()} XP`, color: "text-yellow-500", bg: "bg-yellow-50" },
  ];

  const quickActions = [
    { icon: BookOpen, label: "จัดการเควสต์", href: "/admin/quests", color: "text-blue-600", bg: "bg-blue-50 hover:bg-blue-100" },
    { icon: ClipboardCheck, label: "ตรวจงาน", href: "/admin/review", color: "text-orange-600", bg: "bg-orange-50 hover:bg-orange-100" },
    { icon: Award, label: "จัดการรางวัล", href: "/admin/rewards", color: "text-purple-600", bg: "bg-purple-50 hover:bg-purple-100" },
    { icon: Users, label: "จัดการผู้ใช้", href: "/admin/users", color: "text-gray-600", bg: "bg-gray-50 hover:bg-gray-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ภาพรวม</h1>
          <p className="text-sm text-gray-500 mt-0.5">สถานะระบบ AOT SLES</p>
        </div>
        <button
          type="button"
          onClick={handleSyncStats}
          disabled={syncing}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
          {syncing ? "กำลัง Sync…" : syncedAt ? `Sync แล้ว ${syncedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}` : "Sync สถิติหน้าแรก"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm text-center">
            {loading ? (
              <div className="mx-auto h-10 w-16 animate-pulse rounded-lg bg-gray-100" />
            ) : (
              <>
                <div className={cn("mx-auto mb-2 inline-flex rounded-xl p-2.5", bg)}>
                  <Icon size={20} className={color} />
                </div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">ทางลัด</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map(({ icon: Icon, label, href, color, bg }) => (
            <button
              key={href}
              type="button"
              onClick={() => router.push(href)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border p-5 transition-colors",
                bg,
              )}
            >
              <Icon size={22} className={color} />
              <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
