"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Zap,
  Award,
  Clock,
  CheckCircle2,
  RotateCcw,
  ChevronRight,
  BookOpen,
  ExternalLink,
  Gift,
} from "lucide-react";
import type { RewardType } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { getQuest, getSubmissionsByTeam, getUserPublicProfile, type UserPublicProfile } from "@/lib/firestore";
import { SubmissionPreview } from "@/components/shared/SubmissionPreview";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { Quest, Submission } from "@/types";
import { DeadlineBadge } from "@/components/shared/DeadlineBadge";
import { cn } from "@/lib/utils";


const REWARD_TYPE_CONFIG: Record<RewardType, { label: string; color: string }> = {
  digital: { label: "Digital Reward", color: "bg-blue-100 text-blue-700" },
  physical: { label: "ของขวัญ", color: "bg-purple-100 text-purple-700" },
  recognition: { label: "ใบประกาศ", color: "bg-amber-100 text-amber-700" },
};

const STATUS_CONFIG = {
  pending: { label: "รอตรวจ", bg: "bg-orange-50", border: "border-orange-200", icon: Clock },
  approved: { label: "ผ่านแล้ว", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2 },
  returned: { label: "ส่งคืน — แก้ไขและส่งใหม่", bg: "bg-red-50", border: "border-red-200", icon: RotateCcw },
} as const;

function HeroImage({ thumbnailUrl, title, statusLabel }: { thumbnailUrl: string | null; title: string; statusLabel?: string }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
      {thumbnailUrl && !imgError ? (
        <img
          src={thumbnailUrl}
          alt={title}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1E3A8A] to-[#3D5BAA]">
          <div className="flex flex-col items-center gap-2 text-white/60">
            <BookOpen size={36} />
            <span className="text-sm font-semibold tracking-widest">AOT SLES</span>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#274897]/80 via-[#274897]/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h1 className="text-lg font-bold text-white leading-snug">{title}</h1>
        {statusLabel && (
          <span className="mt-1.5 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function QuestDetail() {
  const { user, role } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const questId = searchParams.get("id") ?? "";

  const [quest, setQuest] = useState<Quest | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatorProfile, setCreatorProfile] = useState<UserPublicProfile | null>(null);
  const [reviewerProfile, setReviewerProfile] = useState<UserPublicProfile | null>(null);

  const isPrivileged = role === "admin" || role === "super_admin";

  useEffect(() => {
    if (!user || !questId) return;
    async function load() {
      try {
        const [q, subs] = await Promise.all([
          getQuest(questId),
          getSubmissionsByTeam(user!.uid),
        ]);
        setQuest(q);
        const sub = subs.find((s) => s.questId === questId) ?? null;
        setSubmission(sub);

        // Lock check — redirect if prerequisite not met
        if (!isPrivileged && q?.prerequisiteQuestId) {
          const prereqMet = subs.some(
            (s) => s.questId === q.prerequisiteQuestId && s.status === "approved",
          );
          if (!prereqMet) {
            router.replace("/quests");
            return;
          }
        }
        // Fetch attribution profiles in parallel
        const profileFetches: Promise<void>[] = [];
        if (q?.createdBy) {
          profileFetches.push(
            getUserPublicProfile(q.createdBy).then((p) => setCreatorProfile(p)),
          );
        }
        if (sub?.reviewedBy) {
          profileFetches.push(
            getUserPublicProfile(sub.reviewedBy).then((p) => setReviewerProfile(p)),
          );
        }
        await Promise.all(profileFetches);
      } catch (err) {
        console.error("Quest detail load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, questId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#274897]/20 border-t-[#274897]" />
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
        <p className="text-gray-400">ไม่พบภารกิจนี้</p>
        <button type="button" onClick={() => router.push("/quests")} className="text-sm text-[#274897]">กลับ</button>
      </div>
    );
  }

  const statusCfg = submission ? STATUS_CONFIG[submission.status] : null;
  const StatusIcon = statusCfg?.icon;
  const canSubmit = !submission || submission.status === "returned";

  return (
    <main className="py-8 space-y-6">
        <button
          type="button"
          onClick={() => router.push("/quests")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          ภารกิจทั้งหมด
        </button>

        {/* 2-col desktop layout */}
        <div className="grid gap-6 lg:grid-cols-5">

          {/* Left — hero + content (3/5) */}
          <div className="lg:col-span-3 space-y-5">
            <HeroImage
              thumbnailUrl={quest.thumbnailUrl ?? null}
              title={quest.title}
              statusLabel={statusCfg?.label}
            />

            {creatorProfile && (
              <div className="flex items-center gap-2">
                <UserAvatar name={creatorProfile.teamName} imageUrl={creatorProfile.profileImageUrl} size="sm" />
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span>สร้างโดย</span>
                  <span className="font-medium text-gray-600">{creatorProfile.teamName}</span>
                  {creatorProfile.airport && <span>· {creatorProfile.airport}</span>}
                </div>
              </div>
            )}

            <div className="rounded-2xl border bg-white shadow-sm p-6 space-y-5">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">รายละเอียด</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{quest.description}</p>
              </div>
              <div className="rounded-xl bg-gray-50 border p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">สิ่งที่ต้องส่ง</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{quest.requirements}</p>
              </div>
            </div>
          </div>

          {/* Right — sidebar (2/5) sticky on desktop */}
          <div className="lg:col-span-2 space-y-4">
            <div className="lg:sticky lg:top-20 space-y-4">
              {/* Rewards / deadline card */}
              <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-2 text-yellow-600 font-bold text-lg">
                  <Zap size={20} />
                  {quest.xpReward} XP
                </div>
                {quest.badgeReward && (
                  <div className="flex items-center gap-2 text-purple-600 font-medium text-sm">
                    <Award size={16} />
                    {quest.badgeReward}
                  </div>
                )}
                <DeadlineBadge deadline={quest.deadline} />
              </div>

              {/* Reward card */}
              {quest.rewardType && (
                <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift size={16} className="text-purple-500" />
                      <h3 className="text-sm font-semibold text-gray-900">รางวัลพิเศษ</h3>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", REWARD_TYPE_CONFIG[quest.rewardType].color)}>
                      {REWARD_TYPE_CONFIG[quest.rewardType].label}
                    </span>
                  </div>
                  {quest.rewardImageUrl && (
                    <img src={quest.rewardImageUrl} alt={quest.rewardTitle ?? "reward"} className="w-full rounded-xl object-cover" />
                  )}
                  {quest.rewardTitle && <p className="font-semibold text-gray-900 text-sm">{quest.rewardTitle}</p>}
                  {quest.rewardDescription && <p className="text-xs text-gray-500">{quest.rewardDescription}</p>}
                  {submission?.status === "approved" && (
                    submission.rewardStatus === "delivered" ? (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 space-y-1">
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          ส่งมอบรางวัลแล้ว
                        </p>
                        {submission.rewardNote && (
                          <p className="text-sm text-gray-700 font-mono break-all">{submission.rewardNote}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock size={13} />
                        รอการส่งมอบรางวัล
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Submission status */}
              {submission && statusCfg && StatusIcon && (
                <div className={cn("rounded-2xl border p-5 space-y-3", statusCfg.bg, statusCfg.border)}>
                  <div className="flex items-center gap-2">
                    <StatusIcon size={18} />
                    <span className="font-semibold text-sm">{statusCfg.label}</span>
                  </div>
                  {submission.driveFileUrl.startsWith("https://") ? (
                    <div className="space-y-1.5">
                      <SubmissionPreview
                        fileUrl={submission.driveFileUrl}
                        fileName={submission.fileName}
                        questThumbnailUrl={quest.thumbnailUrl ?? null}
                        onClick={() => window.open(submission.driveFileUrl, "_blank", "noopener,noreferrer")}
                        className="max-h-64 w-full overflow-hidden rounded-lg"
                      />
                      <a
                        href={submission.driveFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[#274897] transition-colors"
                      >
                        <ExternalLink size={11} />
                        {submission.fileName}
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-red-500">ลิงก์ไฟล์ไม่ถูกต้อง กรุณาส่งงานใหม่</p>
                  )}
                  {submission.feedback && (
                    <p className="text-sm text-gray-700">{submission.feedback}</p>
                  )}
                  {submission.status === "approved" && submission.xpAwarded != null && (
                    <p className="text-sm font-semibold text-emerald-700">
                      +{submission.xpAwarded} XP ได้รับแล้ว
                      {submission.badgeAwarded ? ` · ${submission.badgeAwarded}` : ""}
                    </p>
                  )}
                  {reviewerProfile && (
                    <div className="flex items-center gap-2 pt-1">
                      <UserAvatar name={reviewerProfile.teamName} imageUrl={reviewerProfile.profileImageUrl} size="sm" />
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <span>ตรวจโดย</span>
                        <span className="font-medium text-gray-600">{reviewerProfile.teamName}</span>
                        {reviewerProfile.airport && <span>· {reviewerProfile.airport}</span>}
                        {submission.reviewedAt && (
                          <span>· {new Date(submission.reviewedAt.toMillis()).toLocaleDateString("th-TH")}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit button */}
              {canSubmit && (
                <button
                  type="button"
                  onClick={() => router.push(`/submit?id=${quest.id}`)}
                  className="flex w-full items-center justify-between rounded-2xl bg-[#274897] px-6 py-4 text-white hover:bg-[#1e3a7a] transition-colors"
                >
                  <span className="font-semibold">
                    {submission?.status === "returned" ? "ส่งงานใหม่" : "ส่งงาน"}
                  </span>
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          </div>

        </div>
      </main>
  );
}

export default function QuestDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#274897]/20 border-t-[#274897]" />
      </div>
    }>
      <QuestDetail />
    </Suspense>
  );
}
