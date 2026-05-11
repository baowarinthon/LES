"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Upload, CheckCircle2, FileText, X, BookOpen } from "lucide-react";
import { SubmissionPreview } from "@/components/shared/SubmissionPreview";
import { useAuth } from "@/lib/auth-context";
import { getQuest, createSubmission, getSubmissionsByTeam } from "@/lib/firestore";
import { uploadSubmissionFile } from "@/lib/storage";
import type { Quest } from "@/types";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";

function QuestThumbnail({ thumbnailUrl, title }: { thumbnailUrl: string | null; title: string }) {
  const [imgError, setImgError] = useState(false);
  if (!thumbnailUrl || imgError) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-t-xl bg-gradient-to-br from-[#1E3A8A] to-[#3D5BAA]">
        <div className="flex flex-col items-center gap-1.5 text-white/60">
          <BookOpen size={24} />
          <span className="text-xs font-semibold tracking-widest">AOT SLES</span>
        </div>
      </div>
    );
  }
  return (
    <img
      src={thumbnailUrl}
      alt={title}
      className="aspect-video w-full rounded-t-xl object-cover"
      onError={() => setImgError(true)}
    />
  );
}

function SubmitForm() {
  const { user, role } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const questId = searchParams.get("id") ?? "";

  useEffect(() => {
    if (role === "admin" || role === "super_admin") router.replace("/home");
  }, [role, router]);

  const [quest, setQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const isPrivileged = role === "admin" || role === "super_admin";

  useEffect(() => {
    if (!questId || !user) { setLoading(false); return; }
    async function load() {
      try {
        const [q, subs] = await Promise.all([
          getQuest(questId),
          getSubmissionsByTeam(user!.uid),
        ]);
        if (!q) { setError("ไม่พบภารกิจนี้"); return; }
        // Lock check
        if (!isPrivileged && q.prerequisiteQuestId) {
          const prereqMet = subs.some(
            (s) => s.questId === q.prerequisiteQuestId && s.status === "approved",
          );
          if (!prereqMet) { router.replace("/quests"); return; }
        }
        setQuest(q);
      } catch {
        setError("ไม่พบภารกิจนี้");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [questId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (filePreview) URL.revokeObjectURL(filePreview); };
  }, [filePreview]);

  function applyFile(f: File | null) {
    setFile(f);
    setError(null);
    setFilePreview(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    applyFile(e.target.files?.[0] ?? null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    applyFile(e.dataTransfer.files[0] ?? null);
  }

  async function handleSubmit() {
    if (!file || !user || !quest) return;
    setSubmitting(true);
    setError(null);
    try {
      const { url, path } = await uploadSubmissionFile(quest.id, user.uid, file, setProgress);
      setUploadedUrl(url);
      setUploadedFileName(file.name);
      await createSubmission({
        questId: quest.id,
        questTitle: quest.title,
        teamId: user.uid,
        teamName: user.teamName,
        driveFileUrl: url,
        driveFileId: path,
        fileName: file.name,
        status: "pending",
        feedback: null,
        xpAwarded: null,
        badgeAwarded: null,
        submittedAt: Timestamp.now(),
        reviewedAt: null,
        reviewedBy: null,
        reviewedByName: null,
        rewardStatus: null,
        rewardNote: null,
      });
      setDone(true);
      setToast("ส่งภารกิจเรียบร้อยแล้ว รอการตรวจสอบจากแอดมิน");
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error("Submit error:", err);
      setError("ส่งงานไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  }

  if (role === "admin" || role === "super_admin") {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-sm text-red-500 font-medium">แอดมินไม่สามารถส่งภารกิจได้</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#274897]/20 border-t-[#274897]" />
      </div>
    );
  }

  if (done) {
    return (
      <>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
          <div className="rounded-full bg-emerald-100 p-5">
            <CheckCircle2 size={36} className="text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">ส่งงานเรียบร้อยแล้ว</h1>
          <p className="text-sm text-gray-400 text-center">ทีมงานจะตรวจสอบและอนุมัติ XP ให้ในเร็วๆ นี้</p>
          {uploadedUrl && uploadedFileName && (
            <div className="w-full max-w-sm overflow-hidden rounded-xl">
              <SubmissionPreview
                fileUrl={uploadedUrl}
                fileName={uploadedFileName}
                questThumbnailUrl={quest?.thumbnailUrl ?? null}
                onClick={() => window.open(uploadedUrl, "_blank", "noopener,noreferrer")}
                className="max-h-80 w-full rounded-xl"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => router.push("/quests")}
            className="mt-2 rounded-xl bg-[#274897] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1e3a7a] transition-colors"
          >
            กลับหน้าภารกิจ
          </button>
        </div>
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
            <div className="flex items-center gap-2.5 rounded-2xl bg-gray-900 px-5 py-3 text-sm text-white shadow-lg">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              {toast}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          กลับ
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">ส่งงาน</h1>
          {quest && <p className="text-sm text-gray-400">{quest.title}</p>}
        </div>
      </div>

      {/* 2-col grid on desktop */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Left — quest info (3/5) */}
        <div className="lg:col-span-3">
          {quest ? (
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <QuestThumbnail thumbnailUrl={quest.thumbnailUrl ?? null} title={quest.title} />
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{quest.title}</h2>
                  <p className="mt-1 text-sm text-gray-500">{quest.description}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">สิ่งที่ต้องส่ง</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{quest.requirements}</p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-sm font-semibold text-yellow-600">{quest.xpReward} XP</span>
                  {quest.badgeReward && (
                    <span className="text-sm text-purple-500">{quest.badgeReward}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border bg-white shadow-sm p-8 flex items-center justify-center text-sm text-gray-400">
              ไม่พบข้อมูลภารกิจ
            </div>
          )}
        </div>

        {/* Right — upload panel (2/5), sticky on desktop */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-8 space-y-4">

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-white cursor-pointer transition-colors",
                file ? "border-[#274897]/30 p-5" : "border-gray-200 p-10 hover:border-[#274897]/40 hover:bg-[#274897]/5"
              )}
            >
              <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
              {file ? (
                filePreview ? (
                  <div className="w-full space-y-3">
                    <div className="flex justify-center my-3">
                      <img
                        src={filePreview}
                        alt={file.name}
                        className="max-w-full max-h-64 object-contain rounded-xl"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); applyFile(null); if (inputRef.current) inputRef.current.value = ""; }}
                        className="ml-3 flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <X size={12} />เปลี่ยน
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#274897]/10">
                      <FileText size={24} className="text-[#274897]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); applyFile(null); if (inputRef.current) inputRef.current.value = ""; }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={12} />เปลี่ยนไฟล์
                    </button>
                  </>
                )
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                    <Upload size={24} className="text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">คลิกหรือลากไฟล์มาวางที่นี่</p>
                    <p className="text-xs text-gray-400 mt-0.5">รองรับทุกประเภทไฟล์</p>
                  </div>
                </>
              )}
            </div>

            {/* Upload progress */}
            {progress !== null && (
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#274897] transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 text-right">{progress}%</p>
              </div>
            )}

            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

            {/* Submit button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!file || submitting}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-colors",
                file && !submitting
                  ? "bg-[#274897] text-white hover:bg-[#1e3a7a]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed",
              )}
            >
              {submitting ? "กำลังอัปโหลด…" : "ส่งงาน"}
            </button>

          </div>
        </div>

      </div>
    </main>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#274897]/20 border-t-[#274897]" />
      </div>
    }>
      <SubmitForm />
    </Suspense>
  );
}
