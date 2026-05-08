"use client";

import Link from "next/link";

const BG = "#1E1D2B";

function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconDiscover() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
    </svg>
  );
}
function IconClubs() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M17 21v-8M12 21V3M7 21v-5" />
    </svg>
  );
}
function IconProfile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0116 0" />
    </svg>
  );
}

export default function DiscoverPage() {
  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: BG }}>
      <div className="mx-auto max-w-[480px]">
        <header
          className="fixed left-1/2 top-0 z-40 w-full max-w-[480px] -translate-x-1/2 border-b border-white/[0.06] px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))]"
          style={{ backgroundColor: BG }}
        >
          <h1 className="font-anton text-[22px] tracking-[0.08em] text-fc-red">DISCOVER</h1>
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.22em] text-[#E8E4D4]/40">
            Taste-engine under construction
          </p>
        </header>

        <main className="px-4 pt-[calc(6.5rem+env(safe-area-inset-top))]">
          <section className="rounded-[20px] border border-white/[0.08] bg-[#2A293A] p-6">
            <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-fc-red/85">COMING SOON</p>
            <h2 className="mt-2 font-anton text-[38px] leading-[0.9] text-[#E8E4D4]">
              DISCOVER
              <br />
              <span className="text-fc-red">REWIRED.</span>
            </h2>
            <p className="mt-3 font-sans text-[13px] font-light italic leading-relaxed text-[#E8E4D4]/60">
              Mood-led discovery, taste twins, and deep cuts are being rebuilt for MVP quality.
            </p>
          </section>
        </main>

        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-white/[0.06] px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2" style={{ backgroundColor: BG }}>
          <div className="grid grid-cols-5 items-end">
            <NavItem icon={<IconHome />} label="Home" href="/home" />
            <NavItem icon={<IconDiscover />} label="Discover" active />
            <div className="flex flex-col items-center justify-end pb-0.5">
              <Link href="/log" aria-label="Log a film" className="flex h-[38px] w-[38px] -translate-y-2 items-center justify-center rounded-full bg-fc-red text-2xl font-light leading-none text-white shadow-[0_4px_14px_rgba(255,87,87,0.4)]">
                +
              </Link>
              <span className="mt-0.5 font-mono text-[6.5px] uppercase tracking-wider text-[#E8E4D4]/20">LOG</span>
            </div>
            <NavItem icon={<IconClubs />} label="Clubs" href="/clubs" />
            <NavItem icon={<IconProfile />} label="Profile" href="/profile" />
          </div>
        </nav>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, href }: { icon: React.ReactNode; label: string; active?: boolean; href?: string }) {
  const inner = (
    <>
      <span className={active ? "text-fc-red" : "text-[#E8E4D4]/20"}>{icon}</span>
      <span className={`font-mono text-[6.5px] uppercase tracking-wider ${active ? "text-fc-red/90" : "text-[#E8E4D4]/20"}`}>{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="flex flex-col items-center justify-end gap-1 pb-0.5">
      {inner}
    </Link>
  ) : (
    <button type="button" className="flex flex-col items-center justify-end gap-1 pb-0.5">
      {inner}
    </button>
  );
}
