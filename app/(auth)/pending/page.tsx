"use client";

import { Clock, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";

export default function PendingPage() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#274897]/10">
          <Clock size={40} className="text-[#274897]" />
        </div>

        <h1 className="text-xl font-bold text-gray-900">รอการอนุมัติจากแอดมิน</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          บัญชีของคุณกำลังรอการตรวจสอบจากผู้ดูแลระบบ
          <br />
          กรุณารอการยืนยันก่อนเข้าใช้งาน
        </p>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          <LogOut size={16} />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
