"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Upload, User, ArrowRight, CheckCircle, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { updateUser } from "@/lib/firestore";
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

// TOTAL_STEPS is computed per-role inside the component

export default function OnboardingPage() {
  const { user, role, refreshUser } = useAuth();
  const router = useRouter();

  const isAdmin = role === "admin" || role === "super_admin";
  const TOTAL_STEPS = isAdmin ? 2 : 3;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [previewUrl, setPreviewUrl] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [teamName, setTeamName] = useState(user?.teamName ?? "");
  const [airport, setAirport] = useState(AIRPORTS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [members, setMembers] = useState(["", "", ""]);

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function setMember(index: number, value: string) {
    setMembers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    try {
      let imageUrl = "";
      if (pendingFile) {
        imageUrl = await uploadProfileImage(user.uid, pendingFile);
      }
      const updateData: Parameters<typeof updateUser>[1] = {
        teamName: teamName.trim() || user.teamName,
        airport,
        profileImageUrl: imageUrl,
        onboardingComplete: true,
      };
      if (!isAdmin) {
        updateData.memberNames = members.map((m) => m.trim()).filter(Boolean);
      }
      await updateUser(user.uid, updateData);
      await refreshUser();
      router.replace("/home");
    } catch (err) {
      console.error("Onboarding save error:", err);
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-xl items-center gap-2 text-[#274897]">
          <Plane size={20} />
          <span className="font-bold">AOT SLES</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10">
        {/* Step indicator */}
        <div className="mb-10 flex items-center justify-center gap-3">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            // For admin: indicator 1 = step 1, indicator 2 = step 3
            const indicatorNum = i + 1;
            const actualStep = isAdmin && indicatorNum === 2 ? 3 : indicatorNum;
            const done = step > actualStep;
            const active = step === actualStep;
            return (
              <div key={indicatorNum} className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    done && "bg-[#274897] text-white",
                    active && "border-2 border-[#274897] text-[#274897]",
                    !done && !active && "border border-gray-200 text-gray-400",
                  )}
                >
                  {done ? <Check size={16} /> : indicatorNum}
                </div>
                {indicatorNum < TOTAL_STEPS && (
                  <div className={cn("h-px w-12", step > actualStep ? "bg-[#274897]" : "bg-gray-200")} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">ทีมของคุณ</h2>
              <p className="mt-1 text-sm text-gray-500">ตั้งค่าโปรไฟล์ทีมก่อนเริ่มต้น</p>
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">ภาพโปรไฟล์ทีม</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 transition-colors",
                  previewUrl
                    ? "border-[#274897]/40 bg-[#274897]/5"
                    : "border-gray-200 bg-white hover:border-[#274897]/40 hover:bg-[#274897]/5",
                )}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="team preview"
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow"
                  />
                ) : (
                  <>
                    <div className="rounded-xl bg-gray-100 p-3">
                      <Upload size={24} className="text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">คลิกเพื่ออัปโหลดภาพ</p>
                      <p className="text-xs text-gray-400">PNG, JPG (ไม่เกิน 2 MB)</p>
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* Team name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">ชื่อทีม</label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="เช่น ทีม Alpha"
              />
            </div>

            {/* Airport — native select with Tailwind styling */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">สนามบิน</label>
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

            <Button
              className="w-full bg-[#274897] text-white hover:bg-[#1E3A8A]"
              onClick={() => setStep(isAdmin ? 3 : 2)}
              disabled={!teamName.trim()}
            >
              ถัดไป
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">สมาชิกทีม</h2>
              <p className="mt-1 text-sm text-gray-500">ระบุชื่อสมาชิกทั้ง 3 คนในทีม</p>
            </div>

            <div className="space-y-4">
              {([1, 2, 3] as const).map((n) => (
                <div key={n} className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    ชื่อสมาชิก คนที่ {n}
                  </label>
                  <div className="relative">
                    <User
                      size={15}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      value={members[n - 1]}
                      onChange={(e) => setMember(n - 1, e.target.value)}
                      placeholder={`ชื่อ-นามสกุล สมาชิกคนที่ ${n}`}
                      className="pl-8"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                ย้อนกลับ
              </Button>
              <Button
                className="flex-1 bg-[#274897] text-white hover:bg-[#1E3A8A]"
                onClick={() => setStep(3)}
              >
                ถัดไป
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle size={52} className="text-[#274897]" />
              <h2 className="text-xl font-bold text-gray-900">พร้อมแล้ว!</h2>
              <p className="text-sm text-gray-500">ตรวจสอบข้อมูลของคุณก่อนเริ่ม</p>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
              <div className="flex justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={teamName}
                    className="h-20 w-20 rounded-full object-cover ring-4 ring-[#274897]/20"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#274897]/10">
                    <Plane size={32} className="text-[#274897]" />
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{teamName}</p>
                <p className="text-sm text-[#274897]">{airport}</p>
              </div>

              <div className="space-y-2 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  สมาชิกทีม
                </p>
                {members.filter((m) => m.trim()).length > 0 ? (
                  members.filter((m) => m.trim()).map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <User size={14} className="shrink-0 text-gray-400" />
                      {m}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">ไม่ได้ระบุสมาชิก</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(isAdmin ? 1 : 2)}
                disabled={saving}
              >
                ย้อนกลับ
              </Button>
              <Button
                className="flex-1 bg-[#274897] text-white hover:bg-[#1E3A8A]"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? "กำลังบันทึก…" : "เริ่มภารกิจเลย!"}
                {!saving && <ArrowRight size={16} className="ml-2" />}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
