"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Plane, Zap, Target, Map, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/shared/Navbar";
import { StatsBar } from "@/components/shared/StatsBar";
import { useInView } from "@/lib/animations";

export default function LandingPage() {
  const features = useInView(0.1);
  const cta = useInView(0.2);

  return (
    <div className="flex min-h-screen flex-col bg-white">

      <Navbar />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1E3A8A] via-[#274897] to-[#3D5BAA]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="flex flex-col-reverse gap-12 lg:flex-row lg:items-center">

            {/* Left — hero image */}
            <div className="flex-1 animate-fade-in animation-delay-150">
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
                <img
                  src="/images/Hero-2048x2048.jpg"
                  alt="AOT SLES"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Right — copy */}
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90 animate-fade-in-up">
                <Plane size={14} />
                Airports of Thailand &bull; Sustainable Learning Ecosystem
              </div>

              <div className="space-y-1 animate-fade-in-up animation-delay-100">
                <p className="text-lg font-semibold tracking-widest text-white/60 uppercase">AOT</p>
                <h1 className="text-7xl font-bold leading-none tracking-tight text-white lg:text-8xl">
                  SLES
                </h1>
                <p className="mt-3 text-xl font-light text-white/80">Rise of Learners. Forge your path.</p>
                <p className="text-base text-white/50">Rise AOT together</p>
              </div>

              <div className="flex flex-wrap gap-3 animate-fade-in-up animation-delay-200">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  เข้าสู่ระบบด้วย Google
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  ดูเควสต์เพิ่มเติม
                  <ChevronDown size={16} />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="border-b bg-white py-10">
        <div className="mx-auto max-w-5xl px-6">
          <StatsBar />
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="bg-gray-50 py-20 px-6">
        <div ref={features.ref} className="mx-auto max-w-5xl">
          <div className={cn("mb-4 flex items-center gap-2 text-sm font-semibold text-[#274897]", features.inView && "animate-fade-in-up")}>
            <Target size={16} />
            ทำไมต้อง AOT SLES
          </div>
          <h2 className={cn("text-3xl font-bold text-gray-900", features.inView && "animate-fade-in-up animation-delay-75")}>
            เรียนรู้แบบ Game ได้จริง
          </h2>
          <p className={cn("mt-2 text-gray-500", features.inView && "animate-fade-in-up animation-delay-150")}>
            ระบบ Gamification ที่ออกแบบมาเพื่อพนักงาน AOT โดยเฉพาะ
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Map,
                color: "bg-blue-50",
                iconColor: "text-blue-600",
                title: "เควสต์การเรียนรู้",
                desc: "ภารกิจที่ออกแบบตาม workflow จริงของงาน AOT แต่ละแผนก",
                delay: "",
              },
              {
                icon: Zap,
                color: "bg-yellow-50",
                iconColor: "text-yellow-600",
                title: "สะสม XP & ระดับ",
                desc: "ยิ่งทำเควสต์มาก ยิ่งได้ XP สูง และเลื่อนระดับในทีม",
                delay: "animation-delay-100",
              },
              {
                icon: Trophy,
                color: "bg-purple-50",
                iconColor: "text-purple-600",
                title: "Leaderboard ทีม",
                desc: "แข่งขันเชิงสร้างสรรค์ระหว่างทีม ดูอันดับได้แบบ Real-time",
                delay: "animation-delay-200",
              },
            ].map(({ icon: Icon, color, iconColor, title, desc, delay }) => (
              <div
                key={title}
                className={cn(
                  "rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md",
                  features.inView && `animate-fade-in-up ${delay}`
                )}
              >
                <div className={cn("mb-4 inline-flex rounded-xl p-3", color)}>
                  <Icon size={22} className={iconColor} />
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="bg-gradient-to-br from-[#1E3A8A] via-[#274897] to-[#3D5BAA] py-20 px-6 text-center">
        <div
          ref={cta.ref}
          className={cn("mx-auto max-w-xl space-y-5", cta.inView && "animate-fade-in-up")}
        >
          <h2 className="text-3xl font-bold text-white">พร้อมเริ่มภารกิจแล้วหรือยัง?</h2>
          <p className="text-white/70">
            เข้าร่วม AOT SLES วันนี้ และเริ่มต้นการเดินทางการเรียนรู้ของคุณ
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-[#274897] shadow-lg transition-all hover:bg-white/90"
          >
            เริ่มต้นเลย
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t bg-white px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2 text-[#274897]">
            <Plane size={18} />
            <span className="font-bold">AOT SLES</span>
            <span className="text-gray-400 text-sm">Rise of Learners</span>
          </div>
          <p className="text-xs text-gray-400">
            &copy; 2025 Airports of Thailand. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
