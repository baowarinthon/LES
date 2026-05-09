import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navbar */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-primary text-xl tracking-tight">LES</span>
        <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
          Sign In
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center text-center px-6 py-20">
        <div className="space-y-6 max-w-2xl">
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground">
            Airports of Thailand · Internal Platform
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
            LES — Learning
            <br />
            <span className="text-primary">Ecosystem System</span>
          </h1>

          <p className="text-xl text-muted-foreground font-medium">
            Rise of Learners. Forge your path.
          </p>

          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Complete quests, earn XP and badges, and rise on the leaderboard.
            A gamified internal learning platform built for AOT teams.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg" }), "px-8")}
            >
              Join Now
            </Link>
            <Link
              href="/leaderboard"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </main>

      {/* Feature highlights */}
      <section className="border-t py-16 px-6 bg-muted/30">
        <div className="mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          <div className="space-y-3">
            <div className="text-4xl">🗡️</div>
            <h3 className="font-semibold">Quests</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Complete learning challenges created by admins and earn rewards for your team.
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-4xl">⚡</div>
            <h3 className="font-semibold">XP &amp; Badges</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Accumulate XP points and collect badges that showcase your team&apos;s achievements.
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-4xl">🏆</div>
            <h3 className="font-semibold">Leaderboard</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              See how your team ranks against others and compete to reach the top.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Airports of Thailand · LES Platform
      </footer>
    </div>
  );
}
