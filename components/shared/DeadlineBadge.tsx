"use client";

import { Clock, AlertCircle, XCircle } from "lucide-react";
import type { Timestamp } from "firebase/firestore";

interface Props {
  deadline: Timestamp | null | undefined;
}

function getDaysLeft(deadline: Timestamp): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dl = deadline.toDate();
  dl.setHours(0, 0, 0, 0);
  return Math.round((dl.getTime() - now.getTime()) / 86400000);
}

export function DeadlineBadge({ deadline }: Props) {
  if (!deadline) return null;

  const days = getDaysLeft(deadline);

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-400">
        <XCircle size={11} />
        หมดเขตแล้ว
      </span>
    );
  }

  if (days === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
        <AlertCircle size={11} />
        หมดเขตวันนี้!
      </span>
    );
  }

  if (days <= 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">
        <AlertCircle size={11} />
        เหลือ {days} วัน!
      </span>
    );
  }

  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600">
        <Clock size={11} />
        {days} วันที่เหลือ
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
      <Clock size={11} />
      {days} วันที่เหลือ
    </span>
  );
}
