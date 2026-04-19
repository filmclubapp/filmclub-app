/* ============================================================
   Sentry — Client-side config
   ============================================================
   Add NEXT_PUBLIC_SENTRY_DSN to .env.local to enable.
   Without it, Sentry is a no-op (safe for dev).
   ============================================================ */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.2, // 20% of transactions for perf monitoring
    replaysSessionSampleRate: 0, // disable session replay for MVP
    replaysOnErrorSampleRate: 1.0, // capture replay on errors
  });
}
