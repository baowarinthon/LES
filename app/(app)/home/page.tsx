"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  BookOpen,
  Compass,
  Trophy,
  ChevronRight,
  Clock,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getSubmissionsByTeam, type LeaderboardEntry } from "@/lib/firestore";
import { SkeletonText } from "@/components/shared/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { DeadlineBadge } from "@/components/shared/DeadlineBadge";
import { useInView } from "@/lib/animations";
import type { Quest, Submission } from "@/types";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { user, role, fetchQuests, fetchLeaderboard } = useAuth();
  const router = useRouter();

  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [allQuests, setAllQuests] = useState<Quest[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [fullLeaderboard, setFullLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (role === "executive") {
      router.replace("/executive/dashboard");
    }
  }, [role, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [quests, subs, lb] = await Promise.all([
          fetchQuests(),
          getSubmissionsByTeam(user!.uid),
          fetchLeaderboard(),
        ]);
        setAllQuests(quests);
        setActiveQuests(quests.slice(0, 5));
        setSubmissions(subs);
        setFullLeaderboard(lb);
        setLeaderboard(lb.slice(0, 5));
      } catch (err) {
        console.error("Home data load error:", err);
      } finally {
        setDataLoading(false);
      }
    }
    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const statsView = useInView(0.1);
  const contentView = useInView(0.05);

  if (role === "executive") return null;

  const subMap = new Map(submissions.map((s) => [s.questId, s]));

  const SUB_STATUS = {
    pending: { label: "รอตรวจ", color: "bg-orange-100 text-orange-600", icon: Clock },
    approved: { label: "ผ่านแล้ว", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
    returned: { label: "ส่งคืน", color: "bg-red-100 text-red-600", icon: RotateCcw },
  } as const;

  const myRank = user ? fullLeaderboard.findIndex((t) => t.uid === user.uid) + 1 : 0;
  const isPrivileged = role === "admin" || role === "super_admin";
  const approvedQuestIds = new Set(
    submissions.filter((s) => s.status === "approved").map((s) => s.questId),
  );
  const pendingCount = allQuests.filter((q) => {
    const sub = subMap.get(q.id);
    if (sub && sub.status !== "returned") return false;
    // Exclude locked quests from "ยังไม่ได้ทำ" count
    if (!isPrivileged && q.prerequisiteQuestId && !approvedQuestIds.has(q.prerequisiteQuestId)) return false;
    return true;
  }).length;

  const stats = [
    { icon: Zap,     label: "XP สะสม",      value: `${(user?.xp ?? 0).toLocaleString()} XP`,                        color: "text-yellow-500", bg: "bg-yellow-50" },
    { icon: BookOpen, label: "เควสต์สำเร็จ", value: `${submissions.filter((s) => s.status === "approved").length} ภารกิจ`, color: "text-blue-500",   bg: "bg-blue-50" },
    { icon: Compass,  label: "ยังไม่ได้ทำ",   value: `${pendingCount} ภารกิจ`,                                          color: "text-amber-500",  bg: "bg-amber-50" },
    { icon: Trophy,   label: "อันดับทีม",     value: myRank > 0 ? `#${myRank}` : "—",                                 color: "text-[#274897]",  bg: "bg-[#274897]/10" },
  ];

  return (
    <main className="py-8 space-y-6">

      {/* ── STATS — 4-col on sm+ ── */}
      <div ref={statsView.ref} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, value, color, bg }, i) => {
          const delays = ["", "animation-delay-100", "animation-delay-200", "animation-delay-300"];
          return (<div
            key={label}
            className={cn(
              "rounded-2xl border bg-white p-5 shadow-sm text-center",
              statsView.inView && `animate-fade-in-up ${delays[i] ?? ""}`
            )}
          >
            <div className={cn("mx-auto mb-2 inline-flex rounded-xl p-2.5", bg)}>
              <Icon size={22} className={color} />
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
          );
        })}
      </div>

      {/* ── MAIN CONTENT — 5-col on desktop (3 quests + 2 leaderboard) ── */}
      <div ref={contentView.ref} className={cn("grid gap-6 lg:grid-cols-5", contentView.inView && "animate-fade-in-up animation-delay-100")}>

        {/* Left — quests (3/5) */}
        <section className="lg:col-span-3 rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <Compass size={18} className="text-[#274897]" />
              <h2 className="font-semibold text-gray-900">เควสต์ที่เปิดอยู่</h2>
            </div>
            <button
              type="button"
              onClick={() => router.push("/quests")}
              className="flex items-center gap-1 text-xs text-[#274897] hover:underline"
            >
              ดูทั้งหมด <ChevronRight size={14} />
            </button>
          </div>

          {dataLoading ? (
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between px-5 py-4 gap-4">
                  <div className="flex-1 space-y-2">
                    <SkeletonText className="w-3/4" />
                    <SkeletonText className="w-1/4 h-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeQuests.length === 0 ? (
            <EmptyState icon={BookOpen} title="ยังไม่มีภารกิจที่เปิดอยู่" />
          ) : (
            <div className="divide-y divide-gray-100">
              {activeQuests.map((quest) => {
                const sub = subMap.get(quest.id);
                const statusCfg = sub ? SUB_STATUS[sub.status] : null;
                const StatusIcon = statusCfg?.icon;
                return (
                  <button
                    key={quest.id}
                    type="button"
                    onClick={() => router.push(`/quests/detail?id=${quest.id}`)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900">{quest.title}</p>
                        {statusCfg && StatusIcon && (
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusCfg.color)}>
                            <StatusIcon size={11} />
                            {statusCfg.label}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-yellow-600 font-medium">{quest.xpReward} XP</p>
                        <DeadlineBadge deadline={quest.deadline} />
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Right — leaderboard preview (2/5) */}
        <section className="lg:col-span-2 rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-[#274897]" />
              <h2 className="font-semibold text-gray-900">อันดับ</h2>
              {myRank > 0 && (
                <span className="rounded-full bg-[#274897]/10 px-2 py-0.5 text-xs font-semibold text-[#274897]">
                  #{myRank}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => router.push("/leaderboard")}
              className="flex items-center gap-1 text-xs text-[#274897] hover:underline"
            >
              ดูทั้งหมด <ChevronRight size={14} />
            </button>
          </div>

          {dataLoading ? (
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <SkeletonText className="w-7 h-7 rounded-full shrink-0" />
                  <SkeletonText className="w-7 h-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <SkeletonText className="w-2/3" />
                    <SkeletonText className="w-1/3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <EmptyState icon={Trophy} title="ยังไม่มีข้อมูลอันดับ" />
          ) : (
            <div className="divide-y divide-gray-100">
              {leaderboard.map((u, idx) => {
                const rank = idx + 1;
                const isMe = u.uid === user?.uid;
                const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;
                return (
                  <div
                    key={u.uid}
                    className={cn("flex items-center gap-3 px-5 py-3.5", isMe && "bg-[#274897]/5")}
                  >
                    <span className={cn("w-7 text-center shrink-0", rank <= 3 ? "text-lg" : "text-sm font-bold text-gray-400")}>
                      {rankEmoji}
                    </span>
                    {u.profileImageUrl ? (
                      <img src={u.profileImageUrl} alt={u.teamName} className="h-8 w-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#274897]/10 shrink-0">
                        <span className="text-xs font-bold text-[#274897]">{u.teamName.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", isMe ? "text-[#274897]" : "text-gray-900")}>
                        {u.teamName}{isMe && " ★"}
                      </p>
                      {u.airport && <p className="text-xs text-gray-400 truncate">{u.airport}</p>}
                    </div>
                    <span className="text-sm font-bold text-yellow-600 shrink-0">{(u.xp ?? 0).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
