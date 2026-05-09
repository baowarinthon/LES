"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Search, ExternalLink, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getArchiveWithQuestData, type ArchiveEntry } from "@/lib/firestore";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { SubmissionPreview } from "@/components/shared/SubmissionPreview";
import { cn } from "@/lib/utils";

function ArchiveCard({ entry, isMe }: { entry: ArchiveEntry; isMe: boolean }) {
  const { submission, questTitle, questThumbnailUrl, teamAirport, teamProfileImageUrl } = entry;

  function handleOpenFile() {
    window.open(submission.driveFileUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={cn(
      "flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md",
      isMe && "ring-2 ring-[#274897]/30",
    )}>
      {/* Preview */}
      <div className="relative aspect-video w-full overflow-hidden">
        <SubmissionPreview
          fileUrl={submission.driveFileUrl}
          fileName={submission.fileName}
          questThumbnailUrl={questThumbnailUrl}
          onClick={handleOpenFile}
          className="h-full w-full"
        />

        {/* Hover overlay — pointer-events-none so clicks reach SubmissionPreview */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity hover:opacity-100">
          <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow">
            <ExternalLink size={12} />
            ดูไฟล์
          </div>
        </div>

        {/* "ผลงานของเรา" badge */}
        {isMe && (
          <div className="absolute left-2.5 top-2.5">
            <span className="rounded-full bg-[#274897] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
              ผลงานของเรา
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Quest title */}
        <p className="font-semibold leading-snug text-gray-900 line-clamp-2">{questTitle}</p>

        {/* Team row */}
        <div className="flex items-center gap-2">
          <UserAvatar name={submission.teamName} imageUrl={teamProfileImageUrl} size="sm" />
          <div className="min-w-0">
            <p className={cn("truncate text-sm font-medium", isMe ? "text-[#274897]" : "text-gray-700")}>
              {submission.teamName}
            </p>
            {teamAirport && (
              <p className="truncate text-xs text-gray-400">{teamAirport}</p>
            )}
          </div>
        </div>

        {/* Date + view button */}
        <div className="mt-auto flex items-center justify-between pt-1">
          {submission.reviewedAt ? (
            <p className="text-xs text-gray-400">
              {new Date(submission.reviewedAt.toMillis()).toLocaleDateString("th-TH", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </p>
          ) : <span />}
          <button
            type="button"
            onClick={handleOpenFile}
            className="flex items-center gap-1 rounded-lg border border-[#274897]/30 px-3 py-1.5 text-xs font-medium text-[#274897] transition-colors hover:bg-[#274897]/5"
          >
            ดูผลงาน
            <ExternalLink size={11} />
          </button>
        </div>
      </div>

      {/* XP footer */}
      {submission.xpAwarded != null && (
        <div className="flex items-center justify-between border-t bg-amber-50 px-4 py-2">
          <span className="text-xs text-gray-500">รางวัล XP</span>
          <span className="text-sm font-bold text-yellow-600">+{submission.xpAwarded} XP</span>
        </div>
      )}
    </div>
  );
}

export default function ArchivesPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [questFilter, setQuestFilter] = useState("all");
  const [airportFilter, setAirportFilter] = useState("all");

  useEffect(() => {
    getArchiveWithQuestData()
      .then(setEntries)
      .catch((err) => console.error("Archives load error:", err))
      .finally(() => setLoading(false));
  }, []);

  const questOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of entries) {
      if (!seen.has(e.submission.questId)) {
        seen.set(e.submission.questId, e.questTitle);
      }
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [entries]);

  const airportOptions = useMemo(
    () => [...new Set(entries.map((e) => e.teamAirport).filter(Boolean))].sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter((e) => {
      const matchSearch =
        !q ||
        e.submission.teamName.toLowerCase().includes(q) ||
        e.questTitle.toLowerCase().includes(q);
      const matchQuest = questFilter === "all" || e.submission.questId === questFilter;
      const matchAirport = airportFilter === "all" || e.teamAirport === airportFilter;
      return matchSearch && matchQuest && matchAirport;
    });
  }, [entries, search, questFilter, airportFilter]);

  const hasActiveFilter = search || questFilter !== "all" || airportFilter !== "all";

  function clearFilters() {
    setSearch("");
    setQuestFilter("all");
    setAirportFilter("all");
  }

  return (
    <main className="py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Archive size={20} className="text-[#274897]" />
          <h1 className="text-xl font-bold text-gray-900">คลังภารกิจ</h1>
          {!loading && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
              {filtered.length} ผลงาน
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-400">ผลงานที่ผ่านการตรวจสอบแล้วทั้งหมด</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อทีม หรือชื่อภารกิจ"
            className="h-9 w-full rounded-lg border border-input bg-white pl-8 pr-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Quest filter */}
        <select
          value={questFilter}
          onChange={(e) => setQuestFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="all">ทุกภารกิจ</option>
          {questOptions.map((q) => (
            <option key={q.value} value={q.value}>{q.label}</option>
          ))}
        </select>

        {/* Airport filter */}
        <select
          value={airportFilter}
          onChange={(e) => setAirportFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="all">ทุกสนามบิน</option>
          {airportOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Clear button */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <X size={13} />
            ล้าง
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} className="h-72" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border bg-white py-24 shadow-sm">
          <div className="rounded-full bg-gray-100 p-5">
            <Archive size={32} className="text-gray-300" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-500">ยังไม่มีผลงานในคลัง</p>
            <p className="mt-1 text-sm text-gray-400">ผลงานจะปรากฏที่นี่เมื่อได้รับการอนุมัติ</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border bg-white py-20 shadow-sm">
          <div className="rounded-full bg-gray-100 p-4">
            <Search size={24} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">ไม่พบผลงานที่ค้นหา</p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-[#274897] hover:underline"
          >
            ล้างตัวกรอง
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <ArchiveCard
              key={entry.submission.id}
              entry={entry}
              isMe={entry.submission.teamId === user?.uid}
            />
          ))}
        </div>
      )}
    </main>
  );
}
