"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, BookOpen, ImagePlus, X, ClipboardList, Gift, Lock } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { DeadlineBadge } from "@/components/shared/DeadlineBadge";
import { useAuth } from "@/lib/auth-context";
import { getQuests, createQuest, updateQuest, updateQuestStatus, deleteQuest } from "@/lib/firestore";
import { uploadQuestThumbnail, uploadRewardImage } from "@/lib/storage";
import type { Quest, QuestStatus, RewardType } from "@/types";
import { cn } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Toast = { type: "success" | "error"; message: string };

const STATUS_LABELS: Record<QuestStatus, string> = {
  draft: "ร่าง",
  active: "เปิดอยู่",
  closed: "ปิดแล้ว",
};

const STATUS_COLORS: Record<QuestStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-emerald-100 text-emerald-700",
  closed: "bg-red-100 text-red-600",
};

interface QuestFormData {
  title: string;
  description: string;
  requirements: string;
  xpReward: number;
  badgeReward: string;
  deadline: string;
  status: QuestStatus;
  rewardType: RewardType | "";
  rewardTitle: string;
  rewardDescription: string;
  prerequisiteQuestId: string;
}

const EMPTY_FORM: QuestFormData = {
  title: "",
  description: "",
  requirements: "",
  xpReward: 100,
  badgeReward: "",
  deadline: "",
  status: "draft",
  rewardType: "",
  rewardTitle: "",
  rewardDescription: "",
  prerequisiteQuestId: "",
};

export default function AdminQuestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [form, setForm] = useState<QuestFormData>(EMPTY_FORM);

  // Thumbnail state
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // Reward image state
  const [rewardImageFile, setRewardImageFile] = useState<File | null>(null);
  const [rewardImagePreview, setRewardImagePreview] = useState<string | null>(null);
  const [existingRewardImageUrl, setExistingRewardImageUrl] = useState<string | null>(null);
  const rewardImgInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Quest | null>(null);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    try {
      const data = await getQuests();
      setQuests(data);
    } catch (err) {
      console.error("Quests load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    if (rewardImagePreview) URL.revokeObjectURL(rewardImagePreview);
    setEditingQuest(null);
    setForm(EMPTY_FORM);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setExistingThumbnailUrl(null);
    setRewardImageFile(null);
    setRewardImagePreview(null);
    setExistingRewardImageUrl(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    if (rewardImagePreview) URL.revokeObjectURL(rewardImagePreview);
    setThumbnailPreview(null);
    setThumbnailFile(null);
    setRewardImagePreview(null);
    setRewardImageFile(null);
    setModalOpen(false);
  }

  function openEdit(quest: Quest) {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    if (rewardImagePreview) URL.revokeObjectURL(rewardImagePreview);
    setEditingQuest(quest);
    const deadline = quest.deadline
      ? new Date(quest.deadline.toMillis()).toISOString().split("T")[0]
      : "";
    setForm({
      title: quest.title,
      description: quest.description,
      requirements: quest.requirements,
      xpReward: quest.xpReward,
      badgeReward: quest.badgeReward ?? "",
      deadline,
      status: quest.status,
      rewardType: quest.rewardType ?? "",
      rewardTitle: quest.rewardTitle ?? "",
      rewardDescription: quest.rewardDescription ?? "",
      prerequisiteQuestId: quest.prerequisiteQuestId ?? "",
    });
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setExistingThumbnailUrl(quest.thumbnailUrl ?? null);
    setRewardImageFile(null);
    setRewardImagePreview(null);
    setExistingRewardImageUrl(quest.rewardImageUrl ?? null);
    setModalOpen(true);
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setThumbnailFile(f);
    setThumbnailPreview(URL.createObjectURL(f));
  }

  function handleThumbnailDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    setThumbnailFile(f);
    setThumbnailPreview(URL.createObjectURL(f));
  }

  function clearThumbnail() {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setExistingThumbnailUrl(null);
    if (imgInputRef.current) imgInputRef.current.value = "";
  }

  function handleRewardImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setRewardImageFile(f);
    setRewardImagePreview(URL.createObjectURL(f));
  }

  function handleRewardImageDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    setRewardImageFile(f);
    setRewardImagePreview(URL.createObjectURL(f));
  }

  function clearRewardImage() {
    setRewardImageFile(null);
    setRewardImagePreview(null);
    setExistingRewardImageUrl(null);
    if (rewardImgInputRef.current) rewardImgInputRef.current.value = "";
  }

  async function uploadToDrive(
    questId: string,
    questTitle: string,
    file: File,
  ): Promise<{ driveFileId: string; driveFileUrl: string }> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Not authenticated");
    const idToken = await getIdToken(currentUser);

    const res = await fetch(
      "/api/uploadQuestImage",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          questId,
          questTitle,
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type,
        }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error ?? "Upload failed");
    }
    return res.json() as Promise<{ driveFileId: string; driveFileUrl: string }>;
  }

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim() || !form.requirements.trim()) {
      showToast("error", "กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    setSaving(true);
    try {
      const deadline = form.deadline ? Timestamp.fromDate(new Date(form.deadline)) : null;
      const baseData = {
        title: form.title.trim(),
        description: form.description.trim(),
        requirements: form.requirements.trim(),
        xpReward: form.xpReward,
        badgeReward: form.badgeReward.trim() || null,
        deadline,
        status: form.status,
        createdBy: user?.uid ?? "",
        createdByName: user?.teamName ?? "",
        thumbnailUrl: existingThumbnailUrl ?? null,
        driveFileId: editingQuest?.driveFileId ?? null,
        driveFileUrl: editingQuest?.driveFileUrl ?? null,
        rewardType: form.rewardType || null,
        rewardTitle: form.rewardType && form.rewardTitle.trim() ? form.rewardTitle.trim() : null,
        rewardDescription: form.rewardType && form.rewardDescription.trim() ? form.rewardDescription.trim() : null,
        rewardImageUrl: form.rewardType ? (existingRewardImageUrl ?? null) : null,
        prerequisiteQuestId: form.prerequisiteQuestId || null,
      };

      let uploadWarning = false;

      if (editingQuest) {
        let thumbnailUrl = existingThumbnailUrl ?? null;
        let driveFileId = editingQuest.driveFileId ?? null;
        let driveFileUrl = editingQuest.driveFileUrl ?? null;
        let rewardImageUrl = form.rewardType ? (existingRewardImageUrl ?? null) : null;

        if (thumbnailFile) {
          try {
            console.log("[upload] starting thumbnail upload for quest", editingQuest.id);
            thumbnailUrl = await uploadQuestThumbnail(editingQuest.id, thumbnailFile);
            console.log("[upload] thumbnail URL:", thumbnailUrl);
            try {
              const driveResult = await uploadToDrive(editingQuest.id, form.title.trim(), thumbnailFile);
              driveFileId = driveResult.driveFileId;
              driveFileUrl = driveResult.driveFileUrl;
            } catch (driveErr) {
              console.error("[upload] Drive upload failed:", driveErr);
            }
          } catch (err) {
            console.error("[upload] Thumbnail upload failed:", err);
            uploadWarning = true;
          }
        }

        if (rewardImageFile && form.rewardType) {
          try {
            console.log("[upload] starting reward image upload for quest", editingQuest.id);
            rewardImageUrl = await uploadRewardImage(editingQuest.id, rewardImageFile);
            console.log("[upload] reward image URL:", rewardImageUrl);
          } catch (err) {
            console.error("[upload] Reward image upload failed:", err);
            uploadWarning = true;
          }
        }

        await updateQuest(editingQuest.id, { ...baseData, thumbnailUrl, driveFileId, driveFileUrl, rewardImageUrl });
        showToast("success", uploadWarning ? "บันทึกแล้ว (อัปโหลดรูปไม่สำเร็จ)" : "อัปเดตเควสต์เรียบร้อยแล้ว");
      } else {
        const newId = await createQuest({ ...baseData, thumbnailUrl: null, driveFileId: null, driveFileUrl: null, rewardImageUrl: null });
        const updates: Record<string, unknown> = {};

        if (thumbnailFile) {
          try {
            console.log("[upload] starting thumbnail upload for new quest", newId);
            const thumbnailUrl = await uploadQuestThumbnail(newId, thumbnailFile);
            console.log("[upload] thumbnail URL:", thumbnailUrl);
            updates.thumbnailUrl = thumbnailUrl;
            try {
              const driveResult = await uploadToDrive(newId, form.title.trim(), thumbnailFile);
              updates.driveFileId = driveResult.driveFileId;
              updates.driveFileUrl = driveResult.driveFileUrl;
            } catch (driveErr) {
              console.error("[upload] Drive upload failed:", driveErr);
            }
          } catch (err) {
            console.error("[upload] Thumbnail upload failed:", err);
            uploadWarning = true;
          }
        }

        if (rewardImageFile && form.rewardType) {
          try {
            console.log("[upload] starting reward image upload for new quest", newId);
            const rewardImageUrl = await uploadRewardImage(newId, rewardImageFile);
            console.log("[upload] reward image URL:", rewardImageUrl);
            updates.rewardImageUrl = rewardImageUrl;
          } catch (err) {
            console.error("[upload] Reward image upload failed:", err);
            uploadWarning = true;
          }
        }

        if (Object.keys(updates).length > 0) {
          await updateQuest(newId, updates as Parameters<typeof updateQuest>[1]);
        }
        showToast("success", uploadWarning ? "สร้างเควสต์แล้ว (อัปโหลดรูปไม่สำเร็จ)" : "สร้างเควสต์เรียบร้อยแล้ว");
      }

      closeModal();
      await load();
    } catch (err) {
      console.error("Save quest error:", err);
      showToast("error", "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(quest: Quest) {
    const next: QuestStatus = quest.status === "active" ? "closed" : "active";
    try {
      await updateQuestStatus(quest.id, next);
      setQuests((prev) => prev.map((q) => q.id === quest.id ? { ...q, status: next } : q));
      showToast("success", next === "active" ? "เปิดเควสต์แล้ว" : "ปิดเควสต์แล้ว");
    } catch (err) {
      console.error("Toggle status error:", err);
      showToast("error", "อัปเดตสถานะไม่สำเร็จ");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteQuest(deleteTarget.id);
      setQuests((prev) => prev.filter((q) => q.id !== deleteTarget.id));
      showToast("success", "ลบเควสต์เรียบร้อยแล้ว");
    } catch (err) {
      console.error("Delete quest error:", err);
      showToast("error", "ลบไม่สำเร็จ");
    } finally {
      setDeleteTarget(null);
      setDeletingId(null);
    }
  }

  const previewUrl = thumbnailPreview ?? existingThumbnailUrl;
  // rewardImagePreview and existingRewardImageUrl are used inline

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">จัดการเควสต์</h1>
          <p className="text-sm text-gray-500 mt-0.5">สร้าง แก้ไข และจัดการภารกิจ</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[#274897] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1e3a7a]"
        >
          <Plus size={16} />
          สร้างเควสต์
        </button>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#274897]/20 border-t-[#274897]" />
          </div>
        ) : quests.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="ยังไม่มีภารกิจ"
            description="สร้างภารกิจแรกได้เลย"
            action={{ label: "สร้างภารกิจ", onClick: openCreate }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">รูป</th>
                  <th className="px-4 py-3">ชื่อภารกิจ</th>
                  <th className="px-4 py-3 whitespace-nowrap">XP</th>
                  <th className="px-4 py-3 whitespace-nowrap">กำหนดส่ง</th>
                  <th className="px-4 py-3 whitespace-nowrap">สร้างโดย</th>
                  <th className="px-4 py-3 whitespace-nowrap">สถานะ</th>
                  <th className="px-4 py-3">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quests.map((quest) => (
                  <tr key={quest.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {quest.thumbnailUrl ? (
                        <img
                          src={quest.thumbnailUrl}
                          alt={quest.title}
                          className="h-10 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-16 rounded-lg bg-gradient-to-br from-[#1E3A8A] to-[#3D5BAA] flex items-center justify-center">
                          <BookOpen size={14} className="text-white/60" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-medium text-gray-900">
                        {quest.title}
                        {quest.prerequisiteQuestId && (
                          <span title={`ต้องผ่าน: ${quests.find(q => q.id === quest.prerequisiteQuestId)?.title ?? quest.prerequisiteQuestId}`}>
                            <Lock size={12} className="text-gray-400 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{quest.description}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-yellow-600">{quest.xpReward} XP</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {quest.deadline ? <DeadlineBadge deadline={quest.deadline} /> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {quest.createdByName || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_COLORS[quest.status])}>
                        {STATUS_LABELS[quest.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {quest.driveFolderUrl && (
                          <a
                            href={quest.driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="เปิดโฟลเดอร์ใน Google Drive"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-green-50 transition-colors"
                          >
                            <svg viewBox="0 0 87.3 78" width="15" height="15">
                              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                            </svg>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/review?questId=${quest.id}`)}
                          title="ดูงานที่ส่ง"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-[#274897]/10 hover:text-[#274897] transition-colors"
                        >
                          <ClipboardList size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(quest)}
                          title={quest.status === "active" ? "ปิดเควสต์" : "เปิดเควสต์"}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          {quest.status === "active"
                            ? <ToggleRight size={18} className="text-emerald-500" />
                            : <ToggleLeft size={18} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(quest)}
                          title="แก้ไข"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(quest)}
                          disabled={deletingId === quest.id}
                          title="ลบ"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center gap-3 border-b px-6 py-4">
              <BookOpen size={18} className="text-[#274897]" />
              <h2 className="font-semibold text-gray-900">
                {editingQuest ? "แก้ไขเควสต์" : "สร้างเควสต์ใหม่"}
              </h2>
            </div>
            <div className="overflow-y-auto max-h-[70vh] px-6 py-5 space-y-4">

              {/* Thumbnail upload */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  รูปภาพประกอบภารกิจ (1920×1080)
                </label>
                {previewUrl ? (
                  <div className="relative w-full">
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                      <img src={previewUrl} alt="thumbnail preview" className="h-full w-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={clearThumbnail}
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDrop={handleThumbnailDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => imgInputRef.current?.click()}
                    className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-[#274897]/40 hover:bg-[#274897]/5 transition-colors"
                  >
                    <ImagePlus size={28} className="text-gray-300" />
                    <p className="text-xs text-gray-400">คลิกหรือลากรูปมาวาง</p>
                  </div>
                )}
                <input
                  ref={imgInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnailChange}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">ชื่อภารกิจ *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="ชื่อเควสต์"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">รายละเอียด *</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="อธิบายรายละเอียดของภารกิจ"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20 resize-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">สิ่งที่ต้องส่ง *</label>
                <textarea
                  rows={2}
                  value={form.requirements}
                  onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
                  placeholder="ระบุสิ่งที่ทีมต้องส่งมอบ"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">XP รางวัล</label>
                  <input
                    type="number"
                    min={0}
                    value={form.xpReward}
                    onChange={(e) => setForm((f) => ({ ...f, xpReward: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">กำหนดส่ง</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">เหรียญตรา (ถ้ามี)</label>
                <input
                  type="text"
                  value={form.badgeReward}
                  onChange={(e) => setForm((f) => ({ ...f, badgeReward: e.target.value }))}
                  placeholder="ชื่อเหรียญตรา"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">สถานะ</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as QuestStatus }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20"
                >
                  <option value="draft">ร่าง</option>
                  <option value="active">เปิดอยู่</option>
                  <option value="closed">ปิดแล้ว</option>
                </select>
              </div>

              {/* Prerequisite quest */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">ต้องทำภารกิจก่อนหน้า</label>
                <select
                  value={form.prerequisiteQuestId}
                  onChange={(e) => setForm((f) => ({ ...f, prerequisiteQuestId: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20"
                >
                  <option value="">ไม่มี (เปิดให้ทำได้เลย)</option>
                  {quests
                    .filter((q) => !editingQuest || q.id !== editingQuest.id)
                    .map((q) => (
                      <option key={q.id} value={q.id}>{q.title}</option>
                    ))}
                </select>
              </div>

              {/* Reward section */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Gift size={14} className="text-purple-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">รางวัลพิเศษ</h3>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">ประเภทรางวัล</label>
                  <select
                    value={form.rewardType}
                    onChange={(e) => setForm((f) => ({ ...f, rewardType: e.target.value as RewardType | "" }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20"
                  >
                    <option value="">ไม่มีรางวัล</option>
                    <option value="digital">Digital (Gift card, E-voucher)</option>
                    <option value="physical">Physical (ของขวัญ)</option>
                    <option value="recognition">Recognition (ใบประกาศ)</option>
                  </select>
                </div>
                {form.rewardType && (
                  <>
                    {/* Reward image upload */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">
                        รูปรางวัล เช่น gift card, voucher
                      </label>
                      {(rewardImagePreview ?? existingRewardImageUrl) ? (
                        <div className="relative w-full">
                          <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                            <img src={(rewardImagePreview ?? existingRewardImageUrl)!} alt="reward preview" className="h-full w-full object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={clearRewardImage}
                            className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDrop={handleRewardImageDrop}
                          onDragOver={(e) => e.preventDefault()}
                          onClick={() => rewardImgInputRef.current?.click()}
                          className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-purple-400/40 hover:bg-purple-50/30 transition-colors"
                        >
                          <ImagePlus size={24} className="text-gray-300" />
                          <p className="text-xs text-gray-400">คลิกหรือลากรูปมาวาง</p>
                        </div>
                      )}
                      <input
                        ref={rewardImgInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleRewardImageChange}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">ชื่อรางวัล *</label>
                      <input
                        type="text"
                        value={form.rewardTitle}
                        onChange={(e) => setForm((f) => ({ ...f, rewardTitle: e.target.value }))}
                        placeholder="เช่น Gift Card 500 บาท"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">รายละเอียดรางวัล</label>
                      <textarea
                        rows={2}
                        value={form.rewardDescription}
                        onChange={(e) => setForm((f) => ({ ...f, rewardDescription: e.target.value }))}
                        placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับรางวัล"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20 resize-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-[#274897] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a7a] disabled:opacity-60 transition-colors"
              >
                {saving ? "กำลังบันทึก…" : editingQuest ? "บันทึก" : "สร้าง"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
            <h2 className="font-semibold text-gray-900 mb-2">ลบเควสต์</h2>
            <p className="text-sm text-gray-500 mb-6">
              คุณต้องการลบ <span className="font-medium text-gray-900">&ldquo;{deleteTarget.title}&rdquo;</span> ใช่ไหม? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
              >
                ลบ
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
