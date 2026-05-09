"use client";

import { useEffect, useState } from "react";
import { Users, BookOpen, Plane, Zap } from "lucide-react";
import { getPublicStats, type PublicStats } from "@/lib/firestore";
import { useInView, useCountUp } from "@/lib/animations";

function StatItem({
  icon: Icon,
  target,
  suffix,
  label,
  enabled,
}: {
  icon: typeof Users;
  target: number;
  suffix: string;
  label: string;
  enabled: boolean;
}) {
  const count = useCountUp(target, 1400, enabled);
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="rounded-xl bg-[#274897]/8 p-3">
        <Icon size={22} className="text-[#274897]" />
      </div>
      <p className="text-2xl font-bold text-[#274897]">
        {!enabled ? "—" : target > 0 ? `${count.toLocaleString()}${suffix}` : "0"}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

export function StatsBar() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const { ref, inView } = useInView(0.3);

  useEffect(() => {
    getPublicStats().then(setStats).catch(console.error);
  }, []);

  const enabled = inView && stats !== null;

  return (
    <div ref={ref} className="grid grid-cols-2 gap-8 sm:grid-cols-4">
      <StatItem icon={Users}    target={stats?.totalTeams    ?? 0} suffix="+" label="ผู้เรียน AOT"      enabled={enabled} />
      <StatItem icon={BookOpen} target={stats?.totalQuests   ?? 0} suffix=""  label="เควสต์ที่เปิดอยู่" enabled={enabled} />
      <StatItem icon={Plane}    target={stats?.totalAirports ?? 0} suffix=""  label="สนามบิน"           enabled={enabled} />
      <StatItem icon={Zap}      target={stats?.totalXP       ?? 0} suffix="+" label="XP รวมสะสม"        enabled={enabled} />
    </div>
  );
}
