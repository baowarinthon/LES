"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, CheckCircle2, XCircle, RotateCcw, ChevronDown, ExternalLink, Gift, PackageCheck, Download, Archive } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getAllSubmissions, awardSubmission, returnSubmission, getQuests, getUserPublicProfiles, updateSubmissionReward, getAllUsers, type UserPublicProfile } from "@/lib/firestore";
import { SubmissionPreview } from "@/components/shared/SubmissionPreview";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { Quest, Submission, SubmissionStatus } from "@/types";
import { cn } from "@/lib/utils";

type Toast = { type: "success" | "error"; message: string };
type Tab = "all" | SubmissionStatus;

const TAB_LABELS: Record<Tab, string> = {
  all: "ทั้งหมด",
  pending: "รอตรวจ",
  approved: "ผ่านแล้ว",
  returned: "ส่งคืน",
};

const TAB_COLORS: Record<Tab, string> = {
  all: "text-gray-600",
  pending: "text-orange-500",
  approved: "text-emerald-500",
  returned: "text-red-500",
};

function AdminReviewContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewerProfiles, setReviewerProfiles] = useState<Map<string, UserPublicProfile>>(new Map());
  const [tab, setTab] = useState<Tab>("pending");
  const [selectedQuestId, setSelectedQuestId] = useState<string>("");
  const [toast, setToast] = useState<Toast | null>(null);

  // Approve dialog
  const [approveTarget, setApproveTarget] = useState<Submission | null>(null);
  const [xpOverride, setXpOverride] = useState(0);
  const [badgeInput, setBadgeInput] = useState("");
  const [approving, setApproving] = useState(false);

  // Return dialog
  const [returnTarget, setReturnTarget] = useState<Submission | null>(null);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [returning, setReturning] = useState(false);

  // Reward delivery dialog
  const [deliverTarget, setDeliverTarget] = useState<Submission | null>(null);
  const [deliverQuest, setDeliverQuest] = useState<Quest | null>(null);
  const [rewardNoteInput, setRewardNoteInput] = useState("");
  const [delivering, setDelivering] = useState(false);

  // Pre-select quest from URL param
  useEffect(() => {
    const qid = searchParams.get("questId") ?? "";
    setSelectedQuestId(qid);
  }, [searchParams]);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    try {
      const [data, questList] = await Promise.all([
        getAllSubmissions(),
        getQuests(),
      ]);
      setSubmissions(data);
      setQuests(questList);
      // Batch fetch reviewer profiles for approved/returned submissions
      const reviewerUids = data
        .filter((s) => s.reviewedBy && (s.status === "approved" || s.status === "returned"))
        .map((s) => s.reviewedBy as string);
      const profiles = await getUserPublicProfiles(reviewerUids);
      setReviewerProfiles(profiles);
    } catch (err) {
      console.error("Review load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Quest lookup maps
  const questTitleMap: Record<string, string> = {};
  const questMap: Record<string, Quest> = {};
  for (const q of quests) {
    questTitleMap[q.id] = q.title;
    questMap[q.id] = q;
  }

  async function handleDeliverReward() {
    if (!deliverTarget) return;
    setDelivering(true);
    try {
      await updateSubmissionReward(deliverTarget.id, {
        rewardStatus: "delivered",
        rewardNote: rewardNoteInput.trim() || null,
      });
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === deliverTarget.id
            ? { ...s, rewardStatus: "delivered" as const, rewardNote: rewardNoteInput.trim() || null }
            : s,
        ),
      );
      showToast("success", "ส่งมอบรางวัลเรียบร้อยแล้ว");
      setDeliverTarget(null);
      setRewardNoteInput("");
    } catch (err) {
      console.error("Deliver reward error:", err);
      showToast("error", "ส่งมอบรางวัลไม่สำเร็จ");
    } finally {
      setDelivering(false);
    }
  }

  // Filter by tab AND selected quest
  const filtered = submissions
    .filter((s) => tab === "all" || s.status === tab)
    .filter((s) => !selectedQuestId || s.questId === selectedQuestId);

  // Tab counts respect the quest filter
  const byQuest = (status?: SubmissionStatus) =>
    submissions.filter((s) => (!status || s.status === status) && (!selectedQuestId || s.questId === selectedQuestId)).length;
  const counts: Record<Tab, number> = {
    all:      byQuest(),
    pending:  byQuest("pending"),
    approved: byQuest("approved"),
    returned: byQuest("returned"),
  };

  // Dropdown shows only quests that have at least one submission
  const questsWithSubmissions = quests.filter((q) => submissions.some((s) => s.questId === q.id));

  function openApprove(s: Submission) {
    const quest = quests.find((q) => q.id === s.questId);
    setApproveTarget(s);
    setXpOverride(s.xpAwarded ?? quest?.xpReward ?? 100);
    setBadgeInput(s.badgeAwarded ?? quest?.badgeReward ?? "");
  }

  async function handleApprove() {
    if (!approveTarget || !user) return;
    setApproving(true);
    try {
      await awardSubmission(
        approveTarget.id,
        approveTarget.teamId,
        xpOverride,
        badgeInput.trim() || null,
        user.uid,
        user.teamName,
      );
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === approveTarget.id
            ? { ...s, status: "approved", xpAwarded: xpOverride, badgeAwarded: badgeInput.trim() || null, reviewedBy: user.uid, reviewedByName: user.teamName }
            : s,
        ),
      );
      setReviewerProfiles((prev) => {
        const next = new Map(prev);
        next.set(user.uid, { teamName: user.teamName, profileImageUrl: user.profileImageUrl ?? "", airport: user.airport ?? "" });
        return next;
      });
      showToast("success", "อนุมัติเรียบร้อยแล้ว");
      setApproveTarget(null);
    } catch (err) {
      console.error("Approve error:", err);
      showToast("error", "อนุมัติไม่สำเร็จ");
    } finally {
      setApproving(false);
    }
  }

  async function handleReturn() {
    if (!returnTarget || !user) return;
    if (!feedbackInput.trim()) {
      showToast("error", "กรุณาใส่ข้อเสนอแนะ");
      return;
    }
    setReturning(true);
    try {
      await returnSubmission(returnTarget.id, feedbackInput.trim(), user.uid, user.teamName);
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === returnTarget.id
            ? { ...s, status: "returned", feedback: feedbackInput.trim(), reviewedBy: user.uid, reviewedByName: user.teamName }
            : s,
        ),
      );
      setReviewerProfiles((prev) => {
        const next = new Map(prev);
        next.set(user.uid, { teamName: user.teamName, profileImageUrl: user.profileImageUrl ?? "", airport: user.airport ?? "" });
        return next;
      });
      showToast("success", "ส่งคืนงานเรียบร้อยแล้ว");
      setReturnTarget(null);
      setFeedbackInput("");
    } catch (err) {
      console.error("Return error:", err);
      showToast("error", "ส่งคืนไม่สำเร็จ");
    } finally {
      setReturning(false);
    }
  }

  const tabs: Tab[] = ["all", "pending", "approved", "returned"];

  async function handleExportCSV() {
    const STATUS_TH: Record<Tab, string> = { all: "ทั้งหมด", pending: "รอตรวจ", approved: "ผ่านแล้ว", returned: "ส่งคืน" };
    const allUsers = await getAllUsers();
    const userMap = new Map(allUsers.map((u) => [u.uid, u]));

    function fmt(ts: { toMillis(): number } | null | undefined): string {
      if (!ts) return "";
      return new Date(ts.toMillis()).toLocaleDateString("th-TH");
    }
    function esc(v: string | number | null | undefined): string {
      if (v == null) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"` : s;
    }

    const headers = ["ชื่อทีม","สนามบิน","สมาชิก","ชื่อภารกิจ","สถานะ","XP ที่ได้รับ","วันที่ส่ง","วันที่ตรวจ","ตรวจโดย","ลิงก์ไฟล์","หมายเหตุ"];
    const rows = submissions.map((s) => {
      const u = userMap.get(s.teamId);
      return [
        esc(s.teamName),
        esc(u?.airport ?? ""),
        esc(u?.memberNames?.join(" | ") ?? ""),
        esc(questTitleMap[s.questId] ?? "ภารกิจถูกลบแล้ว"),
        esc(STATUS_TH[s.status]),
        esc(s.xpAwarded),
        esc(fmt(s.submittedAt)),
        esc(fmt(s.reviewedAt)),
        esc(s.reviewedByName),
        esc(s.driveFileUrl),
        esc(s.feedback ?? s.rewardNote ?? ""),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `les-submissions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ตรวจงาน</h1>
          <p className="text-sm text-gray-500 mt-0.5">ตรวจสอบและให้คะแนนงานที่ส่งมา</p>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={submissions.length === 0}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Quest filter dropdown */}
      <div className="relative w-full max-w-xs">
        <select
          value={selectedQuestId}
          onChange={(e) => setSelectedQuestId(e.target.value)}
          className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20 transition-colors"
        >
          <option value="">ทุกเควสต์</option>
          {questsWithSubmissions.map((q) => (
            <option key={q.id} value={q.id}>{q.title}</option>
          ))}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700",
            )}
          >
            {TAB_LABELS[t]}
            {counts[t] > 0 && (
              <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-bold leading-none", tab === t ? TAB_COLORS[t] : "text-gray-400")}>
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#274897]/20 border-t-[#274897]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-4">
            {(tab === "all") && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="rounded-full bg-gray-100 p-4"><ClipboardCheck size={28} className="text-gray-400" /></div>
                <p className="text-base font-medium text-gray-600">ยังไม่มีการส่งงาน</p>
              </div>
            )}
            {tab === "pending" && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="rounded-full bg-gray-100 p-4"><CheckCircle2 size={28} className="text-gray-400" /></div>
                <div><p className="text-base font-medium text-gray-600">ไม่มีงานรอตรวจ</p><p className="text-sm text-gray-400">ทุกงานได้รับการตรวจสอบแล้ว</p></div>
              </div>
            )}
            {tab === "approved" && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="rounded-full bg-gray-100 p-4"><Archive size={28} className="text-gray-400" /></div>
                <p className="text-base font-medium text-gray-600">ยังไม่มีงานที่ผ่านแล้ว</p>
              </div>
            )}
            {tab === "returned" && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="rounded-full bg-gray-100 p-4"><RotateCcw size={28} className="text-gray-400" /></div>
                <p className="text-base font-medium text-gray-600">ยังไม่มีงานที่ส่งคืน</p>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((sub) => (
              <div key={sub.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{sub.teamName}</p>
                    <p className="text-xs text-[#274897] font-medium mt-0.5">
                      {questTitleMap[sub.questId] ?? "ภารกิจถูกลบแล้ว"}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(sub.submittedAt.toMillis()).toLocaleDateString("th-TH")}
                      </span>
                    </div>
                    {sub.driveFileUrl.startsWith("https://") ? (
                      <div className="mt-2 space-y-1.5">
                        <SubmissionPreview
                          fileUrl={sub.driveFileUrl}
                          fileName={sub.fileName}
                          questThumbnailUrl={questMap[sub.questId]?.thumbnailUrl ?? null}
                          onClick={() => window.open(sub.driveFileUrl, "_blank", "noopener,noreferrer")}
                          className="h-40 w-full max-w-xs overflow-hidden rounded-lg"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={sub.driveFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#274897] transition-colors"
                          >
                            <ExternalLink size={11} />
                            {sub.fileName}
                          </a>
                          {sub.driveWebViewLink && (
                            <a
                              href={sub.driveWebViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <svg viewBox="0 0 87.3 78" width="13" height="13">
                                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                              </svg>
                              เปิดไฟล์ใน Drive
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs font-medium text-red-500">ลิงก์ไฟล์ไม่ถูกต้อง</p>
                    )}
                    {sub.feedback && (
                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                        ข้อเสนอแนะ: {sub.feedback}
                      </p>
                    )}
                    {sub.status === "approved" && sub.xpAwarded != null && (
                      <p className="mt-2 text-xs text-emerald-600 font-medium">
                        +{sub.xpAwarded} XP{sub.badgeAwarded ? ` · ${sub.badgeAwarded}` : ""}
                      </p>
                    )}
                    {(sub.status === "approved" || sub.status === "returned") && sub.reviewedBy && reviewerProfiles.get(sub.reviewedBy) && (() => {
                      const rp = reviewerProfiles.get(sub.reviewedBy!)!;
                      return (
                        <div className="mt-2 flex items-center gap-2">
                          <UserAvatar name={rp.teamName} imageUrl={rp.profileImageUrl} size="sm" />
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <span>ตรวจโดย</span>
                            <span className="font-medium text-gray-600">{rp.teamName}</span>
                            {rp.airport && <span>· {rp.airport}</span>}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {sub.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => { setReturnTarget(sub); setFeedbackInput(""); }}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <RotateCcw size={13} />
                        ส่งคืน
                      </button>
                      <button
                        type="button"
                        onClick={() => openApprove(sub)}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
                      >
                        <CheckCircle2 size={13} />
                        อนุมัติ
                      </button>
                    </div>
                  )}
                  {sub.status === "approved" && questMap[sub.questId]?.rewardType && (
                    sub.rewardStatus === "delivered" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 shrink-0">
                        <PackageCheck size={12} />
                        ส่งมอบแล้ว
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDeliverTarget(sub);
                          setDeliverQuest(questMap[sub.questId]);
                          setRewardNoteInput("");
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-purple-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600 transition-colors shrink-0"
                      >
                        <Gift size={13} />
                        ส่งมอบรางวัล
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve dialog */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
            <h2 className="font-semibold text-gray-900 mb-1">อนุมัติงาน</h2>
            <p className="text-sm text-gray-500 mb-4">
              {approveTarget.teamName}
              {questTitleMap[approveTarget.questId] && (
                <span className="ml-1 text-[#274897]">· {questTitleMap[approveTarget.questId]}</span>
              )}
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">XP ที่ให้</label>
                <input
                  type="number"
                  min={0}
                  value={xpOverride}
                  onChange={(e) => setXpOverride(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">เหรียญตรา (ถ้ามี)</label>
                <input
                  type="text"
                  value={badgeInput}
                  onChange={(e) => setBadgeInput(e.target.value)}
                  placeholder="ชื่อเหรียญตรา"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20"
                />
              </div>
              {/* Reward info — read-only reminder for admin */}
              {(() => {
                const quest = questMap[approveTarget.questId];
                if (!quest?.rewardType || !quest?.rewardTitle) return null;
                return (
                  <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Gift size={13} className="text-purple-500" />
                      <span className="text-xs font-semibold text-purple-700">รางวัลพิเศษ (ต้องส่งมอบหลังอนุมัติ)</span>
                    </div>
                    {quest.rewardImageUrl && (
                      <img
                        src={quest.rewardImageUrl}
                        alt={quest.rewardTitle}
                        className="w-full rounded-lg object-cover max-h-24"
                      />
                    )}
                    <p className="text-xs font-medium text-gray-800">{quest.rewardTitle}</p>
                    {quest.rewardDescription && (
                      <p className="text-xs text-gray-500">{quest.rewardDescription}</p>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors"
              >
                <CheckCircle2 size={15} />
                {approving ? "กำลังบันทึก…" : "อนุมัติ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return dialog */}
      {returnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
            <h2 className="font-semibold text-gray-900 mb-1">ส่งคืนงาน</h2>
            <p className="text-sm text-gray-500 mb-4">{returnTarget.teamName}</p>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">ข้อเสนอแนะ *</label>
              <textarea
                rows={3}
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="แจ้งให้ทีมทราบว่าต้องแก้ไขอะไร"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20 resize-none"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setReturnTarget(null); setFeedbackInput(""); }}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleReturn}
                disabled={returning}
                className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
              >
                <XCircle size={15} />
                {returning ? "กำลังบันทึก…" : "ส่งคืน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reward delivery dialog */}
      {deliverTarget && deliverQuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Gift size={18} className="text-purple-500" />
              <h2 className="font-semibold text-gray-900">ส่งมอบรางวัล</h2>
            </div>
            <p className="text-sm text-gray-500">
              {deliverTarget.teamName}
              {questTitleMap[deliverTarget.questId] && (
                <span className="ml-1 text-[#274897]">· {questTitleMap[deliverTarget.questId]}</span>
              )}
            </p>
            {/* Reward info */}
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 space-y-2">
              {deliverQuest.rewardImageUrl && (
                <img src={deliverQuest.rewardImageUrl} alt={deliverQuest.rewardTitle ?? ""} className="w-full rounded-lg object-cover max-h-32" />
              )}
              {deliverQuest.rewardTitle && <p className="font-semibold text-sm text-gray-900">{deliverQuest.rewardTitle}</p>}
              {deliverQuest.rewardDescription && <p className="text-xs text-gray-500">{deliverQuest.rewardDescription}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                รายละเอียด / Code สำหรับผู้รับรางวัล
              </label>
              <textarea
                rows={3}
                value={rewardNoteInput}
                onChange={(e) => setRewardNoteInput(e.target.value)}
                placeholder="เช่น GIFT-XXXX-YYYY หรือรายละเอียดการรับรางวัล"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setDeliverTarget(null); setRewardNoteInput(""); }}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeliverReward}
                disabled={delivering}
                className="flex items-center gap-1.5 rounded-xl bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-60 transition-colors"
              >
                <PackageCheck size={15} />
                {delivering ? "กำลังบันทึก…" : "ยืนยันส่งมอบรางวัล"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={cn(
          "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg",
          toast.type === "success" ? "bg-emerald-500" : "bg-red-500",
        )}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function AdminReviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#274897]/20 border-t-[#274897]" />
      </div>
    }>
      <AdminReviewContent />
    </Suspense>
  );
}
