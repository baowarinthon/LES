"use client";

import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, User, Save, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { syncUserProfile } from "@/lib/firestore";
import { uploadProfileImage } from "@/lib/storage";
import { cn } from "@/lib/utils";

const AIRPORTS = [
  "ท่าอากาศยานสุวรรณภูมิ",
  "ท่าอากาศยานดอนเมือง",
  "ท่าอากาศยานภูเก็ต",
  "ท่าอากาศยานหาดใหญ่",
  "ท่าอากาศยานเชียงรายแม่ฟ้าหลวง",
  "ท่าอากาศยานเชียงใหม่",
];

type Toast = { type: "success" | "error"; message: string };

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teamName, setTeamName] = useState(user?.teamName ?? "");
  const [airport, setAirport] = useState(user?.airport ?? AIRPORTS[0]);
  const [members, setMembers] = useState<[string, string, string]>([
    user?.memberNames?.[0] ?? "",
    user?.memberNames?.[1] ?? "",
    user?.memberNames?.[2] ?? "",
  ]);
  const [previewUrl, setPreviewUrl] = useState(user?.profileImageUrl ?? "");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!user) return;
    setTeamName(user.teamName ?? "");
    setAirport(user.airport ?? AIRPORTS[0]);
    setMembers([
      user.memberNames?.[0] ?? "",
      user.memberNames?.[1] ?? "",
      user.memberNames?.[2] ?? "",
    ]);
    setPreviewUrl(user.profileImageUrl ?? "");
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function setMember(index: 0 | 1 | 2, value: string) {
    setMembers((prev) => {
      const next: [string, string, string] = [...prev] as [string, string, string];
      next[index] = value;
      return next;
    });
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      let imageUrl = previewUrl;
      if (pendingFile) {
        setUploadProgress(0);
        imageUrl = await uploadProfileImage(user.uid, pendingFile, setUploadProgress);
        setUploadProgress(null);
        setPendingFile(null);
      }
      await syncUserProfile(user.uid, {
        teamName: teamName.trim() || user.teamName,
        airport,
        memberNames: members.map((m) => m.trim()).filter(Boolean),
        profileImageUrl: imageUrl,
      });
      await refreshUser();
      showToast("success", "บันทึกเรียบร้อยแล้ว");
    } catch (err) {
      console.error("Settings save error:", err);
      setUploadProgress(null);
      showToast("error", "บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  }

  const isBusy = saving || uploadProgress !== null;

  return (
    <>
      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">ตั้งค่าทีม</h1>
        </div>

        {/* 2-col grid on desktop */}
        <div className="grid gap-6 lg:grid-cols-12">

          {/* Left — profile image (4/12 ≈ 35%) */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-sm font-semibold text-gray-700">รูปโปรไฟล์ทีม</h2>
              <div className="flex flex-col items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="team profile"
                      className="h-24 w-24 rounded-full object-cover ring-4 ring-[#274897]/10"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#274897]/10">
                      <Plane size={32} className="text-[#274897]" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBusy}
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#274897] text-white shadow-sm transition-colors hover:bg-[#1e3a7a] disabled:opacity-50"
                  >
                    <Camera size={14} />
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

                {pendingFile && uploadProgress === null && (
                  <p className="text-center text-xs text-amber-600">รูปจะถูกอัปโหลดเมื่อกดบันทึก</p>
                )}

                {uploadProgress !== null && (
                  <div className="w-full">
                    <div className="mb-1 flex justify-between text-xs text-gray-500">
                      <span>กำลังอัปโหลด…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#274897] transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#274897] px-4 py-2 text-sm font-medium text-[#274897] transition-colors hover:bg-[#274897]/5 disabled:opacity-50"
                >
                  <Camera size={14} />
                  {pendingFile ? "เปลี่ยนรูปอีกครั้ง" : "เปลี่ยนรูปภาพ"}
                </button>
              </div>
            </div>
          </div>

          {/* Right — form (8/12 ≈ 65%) */}
          <div className="lg:col-span-8 space-y-4">

            {/* Team Info */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">ข้อมูลทีม</h2>

              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">ชื่อทีม</label>
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="ชื่อทีม"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">สนามบิน</label>
                <select
                  value={airport}
                  onChange={(e) => setAirport(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {AIRPORTS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Members */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">สมาชิกทีม</h2>
              {([0, 1, 2] as const).map((i) => (
                <div key={i} className="space-y-1.5">
                  <label className="block text-sm text-gray-600">สมาชิก คนที่ {i + 1}</label>
                  <div className="relative">
                    <User size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={members[i]}
                      onChange={(e) => setMember(i, e.target.value)}
                      placeholder={`ชื่อ-นามสกุล สมาชิกคนที่ ${i + 1}`}
                      className="pl-8"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Save button */}
            <Button
              className="w-full bg-[#274897] text-white hover:bg-[#1E3A8A]"
              onClick={handleSave}
              disabled={isBusy || !teamName.trim()}
            >
              <Save size={16} className="mr-2" />
              {uploadProgress !== null
                ? `กำลังอัปโหลด ${uploadProgress}%…`
                : saving
                ? "กำลังบันทึก…"
                : "บันทึกการเปลี่ยนแปลง"}
            </Button>

          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg",
            toast.type === "success" ? "bg-emerald-500" : "bg-red-500",
          )}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
