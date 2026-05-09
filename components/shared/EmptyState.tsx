"use client";

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="rounded-full bg-gray-100 p-4">
        <Icon size={28} className="text-gray-400" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-gray-600">{title}</p>
        {description && (
          <p className="text-sm text-gray-400">{description}</p>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 rounded-xl bg-[#274897] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1e3a7a]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
