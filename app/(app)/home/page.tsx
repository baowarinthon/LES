"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { user, role } = useAuth();
  const router = useRouter();

  // Executives have their own dashboard
  if (role === "executive") {
    router.replace("/executive/dashboard");
    return null;
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-primary text-xl tracking-tight">LES</span>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
        {/* Welcome */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold">
            Welcome, {user?.teamName ?? "Team"}! 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            Role: {user?.role}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-card p-6 shadow-sm text-center">
            <p className="text-4xl font-bold text-primary">{user?.xp ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Total XP</p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-sm text-center">
            <p className="text-4xl font-bold text-primary">
              {user?.badges?.length ?? 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Badges Earned</p>
          </div>
        </div>

        {/* Admin quick links */}
        {role === "admin" && (
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Admin Panel
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => router.push("/admin/quests")}>
                Manage Quests
              </Button>
              <Button size="sm" variant="outline" onClick={() => router.push("/admin/review")}>
                Review Submissions
              </Button>
              <Button size="sm" variant="outline" onClick={() => router.push("/admin/rewards")}>
                Manage Rewards
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
