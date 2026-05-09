"use client";

import { cn } from "@/lib/utils";

export function SkeletonCard({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-gray-200", className)} />;
}

export function SkeletonText({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-gray-200 h-4", className)} />;
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-full bg-gray-200", className)} />;
}
