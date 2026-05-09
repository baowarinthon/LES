"use client";

interface Props {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md";
}

export function UserAvatar({ name, imageUrl, size = "md" }: Props) {
  const dim = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${dim} rounded-full object-cover shrink-0`}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full bg-[#274897] flex items-center justify-center shrink-0`}
    >
      <span className="font-semibold text-white leading-none">{initial}</span>
    </div>
  );
}
