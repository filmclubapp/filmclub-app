"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./lib/auth-context";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth");
    } else if (!profile || !profile.display_name || profile.display_name === profile.username) {
      // New user who hasn't completed onboarding yet
      router.replace("/onboarding");
    } else {
      router.replace("/home");
    }
  }, [user, profile, loading, router]);

  // Splash screen while checking auth
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <p className="font-mono text-[9px] tracking-[0.28em] uppercase text-muted mb-8">
        — est. 2026 —
      </p>
      <h1 className="font-anton text-6xl md:text-8xl text-navy text-center leading-[0.88] tracking-wide mb-6">
        FILM<br />
        <span className="text-fc-red">CLUB</span>
      </h1>
      <p className="font-sans text-sm md:text-base text-muted text-center italic font-light max-w-md leading-relaxed mb-10">
        for people who feel things watching films.
      </p>
      <div className="w-9 h-0.5 bg-fc-red opacity-70 mb-10" />
      <p className="font-mono text-[8px] tracking-[0.22em] uppercase text-fc-red/70">
        the social home of film
      </p>
    </main>
  );
}
