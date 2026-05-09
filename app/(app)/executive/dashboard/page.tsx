"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Trophy, Zap, Star, ArrowRight } from "lucide-react";
import { getLeaderboard, getSubmissionStats, type LeaderboardEntry } from "@/lib/firestore";
import { cn } from "@/lib/utils";

export default function ExecutiveDashboardPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState({ teams: 0, completed: 0, totalXP: 0, topTeam: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [rows, subStats] = await Promise.all([
          getLeaderboard(),
          getSubmissionStats(),
        ]);

        const totalXP = rows.reduce((s, r) => s + r.xp, 0);
        const topTeam = rows[0]?.teamName ?? "—";

        setTeams(rows);
        setStats({ teams: rows.length, completed: subStats.approved, totalXP, topTeam });
      } catch (err) {
        console.error("Executive dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { icon: Users, label: "ทีมทั้งหมด", value: stats.teams, color: "text-blue-500", bg: "bg-blue-50" },
    { icon: Trophy, label: "เควสต์สำเร็จ", value: stats.completed, color: "text-emerald-500", bg: "bg-emerald-50" },
    { icon: Zap, label: "XP รวม", value: `${stats.totalXP.toLocaleString()} XP`, color: "text-yellow-500", bg: "bg-yellow-50" },
    { icon: Star, label: "ทีมนำ", value: stats.topTeam || "—", color: "text-purple-500", bg: "bg-purple-50" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2 text-[#274897]">
            <Star size={20} />
            <span className="font-bold">Executive Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/leaderboard")}
              className="flex items-center gap-1 text-sm text-[#274897] hover:underline"
            >
              Leaderboard <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => router.push("/archives")}
              className="flex items-center gap-1 text-sm text-[#274897] hover:underline"
            >
              Archives <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* ── Stats ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm text-center">
              <div className={cn("mx-auto mb-2 inline-flex rounded-xl p-2.5", bg)}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-lg font-bold text-gray-900 break-words">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Team Progress Table ── */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            ความคืบหน้าทีม
          </h2>
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#274897]/20 border-t-[#274897]" />
              </div>
            ) : teams.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-400">ยังไม่มีทีม</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-3">อันดับ</th>
                      <th className="px-4 py-3">ชื่อทีม</th>
                      <th className="px-4 py-3">สนามบิน</th>
                      <th className="px-4 py-3">XP</th>
                      <th className="px-4 py-3">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {teams.map((team, idx) => (
                      <tr key={team.uid} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                            idx === 0 && "bg-yellow-100 text-yellow-700",
                            idx === 1 && "bg-gray-100 text-gray-600",
                            idx === 2 && "bg-orange-100 text-orange-700",
                            idx > 2 && "bg-gray-50 text-gray-400",
                          )}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {team.profileImageUrl ? (
                              <img src={team.profileImageUrl} alt={team.teamName} className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#274897]/10">
                                <span className="text-[10px] font-bold text-[#274897]">{team.teamName.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <span className="font-medium text-gray-900">{team.teamName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{team.airport}</td>
                        <td className="px-4 py-3 font-bold text-yellow-600">{team.xp.toLocaleString()} XP</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            team.xp > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
                          )}>
                            {team.xp > 0 ? "กำลังแข่ง" : "ยังไม่เริ่ม"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── Top 5 Preview ── */}
        {!loading && teams.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Top 5</h2>
              <button
                type="button"
                onClick={() => router.push("/leaderboard")}
                className="flex items-center gap-1 text-xs text-[#274897] hover:underline"
              >
                ดูทั้งหมด <ArrowRight size={12} />
              </button>
            </div>
            <div className="rounded-2xl border bg-white shadow-sm divide-y">
              {teams.slice(0, 5).map((team, idx) => (
                <div key={team.uid} className="flex items-center gap-4 px-5 py-3">
                  <span className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    idx === 0 && "bg-yellow-100 text-yellow-700",
                    idx === 1 && "bg-gray-100 text-gray-500",
                    idx === 2 && "bg-orange-100 text-orange-600",
                    idx > 2 && "bg-gray-50 text-gray-400",
                  )}>
                    {idx + 1}
                  </span>
                  {team.profileImageUrl ? (
                    <img src={team.profileImageUrl} alt={team.teamName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#274897]/10">
                      <span className="text-xs font-bold text-[#274897]">{team.teamName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">{team.teamName}</p>
                    <p className="text-xs text-gray-400">{team.airport}</p>
                  </div>
                  <span className="font-bold text-yellow-600">{team.xp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
