import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Left: brand */}
        <div className="flex items-center">
          <img src="/images/aot_sles_logo.png" alt="AOT SLES" className="h-9 w-auto" />
        </div>

        {/* Right: CTA */}
        <Link
          href="/login"
          className="rounded-lg bg-[#274897] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1E3A8A] hover:shadow-md"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    </header>
  );
}
