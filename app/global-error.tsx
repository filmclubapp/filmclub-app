"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#1E1D2B] text-[#E8E4D4] antialiased">
        <main className="min-h-screen flex items-center justify-center px-6">
          <section className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#2A293A] p-6 text-center">
            <p className="font-mono text-[10px] tracking-[0.2em] text-muted mb-3">
              FILM CLUB
            </p>
            <h1 className="font-anton text-4xl text-fc-red tracking-wide mb-2">
              WE HIT A REEL JAM.
            </h1>
            <p className="font-sans text-sm italic text-[#E8E4D4]/70 mb-6">
              Reload the frame and keep going.
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-fc-red px-6 py-2.5 font-anton text-xs tracking-[0.1em] text-white"
            >
              RELOAD
            </button>
            {process.env.NODE_ENV === "development" ? (
              <p className="mt-4 break-words font-mono text-[10px] text-[#E8E4D4]/40">
                {error?.message}
              </p>
            ) : null}
          </section>
        </main>
      </body>
    </html>
  );
}
