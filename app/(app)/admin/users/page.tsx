"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Plane } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getAllUsers, updateUserRole } from "@/lib/firestore";
import type { User, UserRole } from "@/types";
import { cn } from "@/lib/utils";

type Toast = { type: "success" | "error"; message: string };

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  executive: "Executive",
  employee: "Employee",
  super_admin: "Super Admin",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-blue-100 text-blue-700",
  executive: "bg-purple-100 text-purple-700",
  employee: "bg-gray-100 text-gray-600",
  super_admin: "bg-[#1E3A8A] text-white",
};

export default function AdminUsersPage() {
  const { user: currentUser, role: currentRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const isSuperAdmin = currentRole === "super_admin";

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    getAllUsers()
      .then(setUsers)
      .catch((err) => console.error("Users load error:", err))
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(uid: string, newRole: UserRole) {
    setUpdatingRole(uid);
    try {
      await updateUserRole(uid, newRole);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
      showToast("success", "อัปเดต Role เรียบร้อยแล้ว");
    } catch (err) {
      console.error("Role update error:", err);
      showToast("error", "อัปเดต Role ไม่สำเร็จ");
    } finally {
      setUpdatingRole(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">จัดการผู้ใช้</h1>
        <p className="text-sm text-gray-500 mt-0.5">เปลี่ยน Role และดูข้อมูลทีม</p>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#274897]/20 border-t-[#274897]" />
          </div>
        ) : users.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">ยังไม่มีผู้ใช้</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">รูป</th>
                  <th className="px-4 py-3">ชื่อทีม / อีเมล</th>
                  <th className="px-4 py-3">สนามบิน</th>
                  <th className="px-4 py-3">สมาชิก</th>
                  <th className="px-4 py-3">XP</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const isSelf = u.uid === currentUser?.uid;
                  const isUpdating = updatingRole === u.uid;
                  const targetIsSuperAdmin = u.role === "super_admin";
                  // Only super_admin can manage another super_admin; regular admin cannot touch them
                  const canManage = !isSelf && (!targetIsSuperAdmin || isSuperAdmin);

                  return (
                    <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {u.profileImageUrl ? (
                          <img
                            src={u.profileImageUrl}
                            alt={u.teamName}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#274897]/10">
                            <Plane size={14} className="text-[#274897]" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{u.teamName}</p>
                        {u.email && (
                          <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{u.airport || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {u.memberNames?.length ? u.memberNames.join(", ") : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-yellow-600">
                        {(u.xp || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", ROLE_COLORS[u.role])}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <div className="relative inline-block">
                            <select
                              value={u.role}
                              disabled={isUpdating}
                              onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                              className={cn(
                                "appearance-none rounded-lg border border-gray-200 bg-white py-1 pl-2.5 pr-7 text-xs font-medium text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-[#274897] focus:ring-2 focus:ring-[#274897]/20",
                                isUpdating && "cursor-not-allowed opacity-50",
                              )}
                            >
                              <option value="employee">Employee</option>
                              <option value="executive">Executive</option>
                              <option value="admin">Admin</option>
                              {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                            </select>
                            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {isSelf ? "ตัวเอง" : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
