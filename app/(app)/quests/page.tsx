"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Search, Clock, CheckCircle2, RotateCcw, BookOpen, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getSubmissionsByTeam, getUserPublicProfiles, type UserPublicProfile } from "@/lib/firestore";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { DeadlineBadge } from "@/components/shared/DeadlineBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useInView } from "@/lib/animations";
import type { Quest, Submission, SubmissionStatus } from "@/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "pending" | "approved" | "not_submitted";

const FILTER_LABELS: Record<Filter, string> = {
  all: "ทั้งหมด",
  not_submitted: "ยังไม่ส่ง",
  pending: "รอตรวจ",
  approved: "ผ่านแล้ว",
};

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string; icon: React.FC<{ size?: number; className?: string }> }> = {
  pending: { label: "รอตรวจ", color: "bg-orange-100 text-orange-600", icon: Clock },
  approved: { label: "ผ่านแล้ว", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  returned: { label: "ส่งคืน", color: "bg-red-100 text-red-600", icon: RotateCcw },
};

function ThumbnailPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1E3A8A] to-[#3D5BAA]">
      <div className="flex flex-col items-center gap-2 text-white/70">
        <BookOpen size={28} />
        <span className="text-xs font-semibold tracking-widest opacity-60">AOT SLES</span>
      </div>
    </div>
  );
}

export default function QuestsPage() {
  const { user, role, fetchQuests } = useAuth();
  const router = useRouter();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [creatorProfiles, setCreatorProfiles] = useState<Map<string, UserPublicProfile>>(new Map());
  const gridView = useInView(0.05);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [qs, subs] = await Promise.all([
          fetchQuests(),
          getSubmissionsByTeam(user!.uid),
        ]);
        setQuests(qs);
        setSubmissions(subs);
        const creatorUids = qs.map((q) => q.createdBy).filter(Boolean);
        const profiles = await getUserPublicProfiles(creatorUids);
        setCreatorProfiles(profiles);
      } catch (err) {
        console.error("Quests load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Map questId → submission
  const subMap = new Map(submissions.map((s) => [s.questId, s]));

  // Set of approved quest IDs for lock check
  const approvedQuestIds = new Set(
    submissions.filter((s) => s.status === "approved").map((s) => s.questId),
  );

  // admins/super_admin see all quests as unlocked
  const isPrivileged = role === "admin" || role === "super_admin";

  function isLocked(quest: Quest): boolean {
    if (isPrivileged) return false;
    if (!quest.prerequisiteQuestId) return false;
    return !approvedQuestIds.has(quest.prerequisiteQuestId);
  }

  // Quest title lookup for prerequisite label
  const questTitleMap = new Map(quests.map((q) => [q.id, q.title]));

  const filtered = quests.filter((q) => {
    const sub = subMap.get(q.id);
    if (filter === "all") return true;
    if (filter === "not_submitted") return !sub;
    return sub?.status === filter;
  });

  const filters: Filter[] = ["all", "not_submitted", "pending", "approved"];

  return (
    <main className="py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass size={20} className="text-[#274897]" />
            <h1 className="text-xl font-bold text-gray-900">ภารกิจ</h1>
            {!loading && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                {filtered.length} ภารกิจ
              </span>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                filter === f ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700",
              )}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} className="h-64" />
            ))}
          </div>
        ) : quests.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="ยังไม่มีภารกิจในขณะนี้"
            description="แอดมินจะเพิ่มภารกิจเร็วๆ นี้"
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="ไม่พบภารกิจที่ค้นหา" />
        ) : (
          <div ref={gridView.ref} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
            {filtered.map((quest, idx) => {
              const sub = subMap.get(quest.id);
              const statusCfg = sub ? STATUS_CONFIG[sub.status] : null;
              const StatusIcon = statusCfg?.icon;
              const delayMs = Math.min(idx * 75, 300);
              const delayClass = delayMs > 0 ? `animation-delay-${delayMs}` : "";
              const locked = isLocked(quest);
              const prereqTitle = quest.prerequisiteQuestId ? questTitleMap.get(quest.prerequisiteQuestId) : null;

              const card = (
                <div
                  className={cn(
                    "flex flex-col h-full w-full overflow-hidden rounded-2xl border bg-white shadow-sm text-left",
                    locked ? "opacity-60" : "hover:shadow-md transition-shadow",
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-t-xl shrink-0">
                    {quest.thumbnailUrl ? (
                      <>
                        <img
                          src={quest.thumbnailUrl}
                          alt={quest.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                        <div style={{ display: "none" }} className="h-full w-full items-center justify-center">
                          <ThumbnailPlaceholder />
                        </div>
                      </>
                    ) : (
                      <ThumbnailPlaceholder />
                    )}
                    {/* Lock overlay */}
                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Lock size={32} className="text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1 p-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold text-gray-900">{quest.title}</h2>
                        {statusCfg && StatusIcon && !locked && (
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusCfg.color)}>
                            <StatusIcon size={11} />
                            {statusCfg.label}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">{quest.description}</p>

                      {locked && prereqTitle ? (
                        <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                          <Lock size={11} />
                          ต้องผ่าน: <span className="font-medium">{prereqTitle}</span>
                        </p>
                      ) : (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          <span className="font-medium text-yellow-600">{quest.xpReward} XP</span>
                          {quest.badgeReward && (
                            <span className="text-purple-500">{quest.badgeReward}</span>
                          )}
                          <DeadlineBadge deadline={quest.deadline} />
                        </div>
                      )}

                      {locked && (
                        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                          <Lock size={10} />
                          ล็อค
                        </div>
                      )}
                    </div>

                    {/* Creator — only when not locked */}
                    {!locked && (() => {
                      const cp = creatorProfiles.get(quest.createdBy);
                      if (!cp) return null;
                      return (
                        <div className="mt-auto pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <UserAvatar name={cp.teamName} imageUrl={cp.profileImageUrl} size="sm" />
                            <span>โดย</span>
                            <span className="font-medium text-gray-500">{cp.teamName}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );

              if (locked) {
                return (
                  <div
                    key={quest.id}
                    className={cn(gridView.inView && `animate-fade-in-up ${delayClass}`)}
                  >
                    {card}
                  </div>
                );
              }

              return (
                <button
                  key={quest.id}
                  type="button"
                  onClick={() => router.push(`/quests/detail?id=${quest.id}`)}
                  className={cn(
                    "flex flex-col h-full w-full text-left",
                    gridView.inView && `animate-fade-in-up ${delayClass}`,
                  )}
                >
                  {card}
                </button>
              );
            })}
          </div>
        )}
      </main>
  );
}
