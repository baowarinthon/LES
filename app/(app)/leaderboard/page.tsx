"use client";

import { useEffect, useState } from "react";
import { Trophy, Users, Zap, Plane } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { type LeaderboardEntry } from "@/lib/firestore";
import { useInView } from "@/lib/animations";
import { cn } from "@/lib/utils";

const GOLD = "#F5A623";
const SILVER = "#9CA3AF";
const BRONZE = "#CD7F32";

function TeamAvatar({ entry, size }: { entry: LeaderboardEntry; size: number }) {
  if (entry.profileImageUrl) {
    return (
      <img
        src={entry.profileImageUrl}
        alt={entry.teamName}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-2 ring-white shadow"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, backgroundColor: "#274897" }}
      className="rounded-full flex items-center justify-center ring-2 ring-white shadow shrink-0"
    >
      <span className="font-bold text-white" style={{ fontSize: size * 0.38 }}>
        {entry.teamName.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function PodiumCard({
  entry,
  rank,
  isMe,
  platformHeight,
  avatarSize,
}: {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
  isMe: boolean;
  platformHeight: number;
  avatarSize: number;
}) {
  const color = rank === 1 ? GOLD : rank === 2 ? SILVER : BRONZE;
  const rankLabel = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className={cn("flex flex-col items-center gap-1 text-center", isMe && "opacity-100")}>
        <div className="relative">
          <TeamAvatar entry={entry} size={avatarSize} />
          {rank === 1 && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Trophy size={16} style={{ color: GOLD }} />
            </div>
          )}
        </div>
        <p className={cn("font-semibold text-gray-900 leading-tight max-w-[90px] truncate", rank === 1 ? "text-sm" : "text-xs")}>
          {entry.teamName}{isMe ? " ★" : ""}
        </p>
        {entry.airport && (
          <p className="text-[10px] text-gray-400 max-w-[90px] truncate">{entry.airport}</p>
        )}
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {(entry.xp ?? 0).toLocaleString()} XP
        </span>
      </div>
      <div
        className="w-full rounded-t-xl flex items-center justify-center"
        style={{ height: platformHeight, backgroundColor: color + "33", borderTop: `3px solid ${color}` }}
      >
        <span className="text-2xl">{rankLabel}</span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-5 animate-pulse">
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-gray-200" />)}
        </div>
        <div className="h-64 rounded-2xl bg-gray-200" />
      </div>
      <div className="lg:col-span-3 space-y-3">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-gray-200" />
        ))}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user, fetchLeaderboard } = useAuth();
  const [teams, setTeams] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const leftView = useInView(0.05);
  const rightView = useInView(0.05);

  useEffect(() => {
    fetchLeaderboard()
      .then(setTeams)
      .catch((err) => console.error("Leaderboard load error:", err))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const myRank = user ? teams.findIndex((t) => t.uid === user.uid) + 1 : 0;

  const totalXP = teams.reduce((s, t) => s + t.xp, 0);
  const airportCounts: Record<string, number> = {};
  for (const t of teams) {
    if (t.airport) airportCounts[t.airport] = (airportCounts[t.airport] ?? 0) + 1;
  }
  const topAirport = Object.entries(airportCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const top3 = teams.slice(0, 3);

  return (
    <main className="py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-[#274897]" />
          <h1 className="text-xl font-bold text-gray-900">อันดับ</h1>
        </div>
        {myRank > 0 && (
          <span className="rounded-full bg-[#274897]/10 px-3 py-1 text-sm font-semibold text-[#274897]">
            อันดับของเรา: #{myRank}
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : teams.length === 0 ? (
        <div className="rounded-2xl border bg-white shadow-sm">
          <EmptyState icon={Users} title="ยังไม่มีทีมในระบบ" description="รอทีมอื่นมาร่วมสนุก" />
        </div>
      ) : (
        /* ── 5-col desktop: left = stats+podium, right = full rankings ── */
        <div className="grid gap-6 lg:grid-cols-5">

          {/* Left — stats + podium (2/5) */}
          <div ref={leftView.ref} className="lg:col-span-2 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Users, label: "ทีมทั้งหมด", value: teams.length, color: "text-[#274897]" },
                { icon: Zap, label: "XP รวม", value: totalXP.toLocaleString(), color: "text-yellow-500" },
                { icon: Plane, label: "สนามบินนำ", value: topAirport, color: "text-emerald-500" },
              ].map(({ icon: Icon, label, value, color }, i) => {
                const d = ["", "animation-delay-75", "animation-delay-150"][i] ?? "";
                return (<div key={label} className={cn("rounded-2xl border bg-white p-4 shadow-sm text-center", leftView.inView && `animate-scale-in ${d}`)}>
                  <Icon size={18} className={cn("mx-auto mb-1", color)} />
                  <p className={cn("text-lg font-bold truncate", color)}>{value}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
                </div>
                );
              })}
            </div>

            {/* Podium */}
            {top3.length > 0 && (
              <div className="rounded-2xl border bg-white shadow-sm p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-6 text-center">
                  ผู้นำตาราง
                </p>
                <div className="flex items-end gap-2">
                  {top3[1] ? (
                    <PodiumCard entry={top3[1]} rank={2} isMe={top3[1].uid === user?.uid} platformHeight={64} avatarSize={52} />
                  ) : <div className="flex-1" />}
                  <PodiumCard entry={top3[0]} rank={1} isMe={top3[0].uid === user?.uid} platformHeight={96} avatarSize={68} />
                  {top3[2] ? (
                    <PodiumCard entry={top3[2]} rank={3} isMe={top3[2].uid === user?.uid} platformHeight={48} avatarSize={44} />
                  ) : <div className="flex-1" />}
                </div>
              </div>
            )}
          </div>

          {/* Right — full rankings list (3/5) */}
          <div ref={rightView.ref} className="lg:col-span-3">
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100">
                {teams.map((entry, idx) => {
                  const rank = idx + 1;
                  const isMe = entry.uid === user?.uid;
                  const medalEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
                  const rowDelay = Math.min(idx * 50, 300);
                  const rowDelayClass = rowDelay > 0 ? `animation-delay-${rowDelay}` : "";
                  return (
                    <div
                      key={entry.uid}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3.5 transition-colors",
                        isMe ? "border-l-4 border-[#274897] bg-[#274897]/5" : "hover:bg-gray-50",
                        rightView.inView && `animate-fade-in-up ${rowDelayClass}`,
                      )}
                    >
                      <span className={cn("w-8 text-center shrink-0", medalEmoji ? "text-lg" : "text-sm font-bold text-gray-400")}>
                        {medalEmoji ?? rank}
                      </span>
                      {entry.profileImageUrl ? (
                        <img
                          src={entry.profileImageUrl}
                          alt={entry.teamName}
                          className="h-9 w-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#274897]/10 shrink-0">
                          <span className="text-sm font-bold text-[#274897]">
                            {entry.teamName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium text-sm truncate", isMe ? "text-[#274897]" : "text-gray-900")}>
                          {entry.teamName}{isMe && " ★"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {entry.airport && (
                            <span className="text-xs text-gray-400">{entry.airport}</span>
                          )}
                          <span className="text-xs text-emerald-600">{entry.completedQuests} ภารกิจ</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-yellow-600 shrink-0">
                        {(entry.xp ?? 0).toLocaleString()} XP
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}
    </main>
  );
}
