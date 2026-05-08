"use client";

/* ============================================================
   PostHogProvider — initializes PostHog + identifies user
   Wrap around the app in layout.tsx
   ============================================================ */

import { useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { initPostHog, identifyUser, resetUser } from "../lib/analytics";

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();

  // Initialize PostHog once
  useEffect(() => {
    initPostHog();
  }, []);

  // Identify / reset on auth change
  useEffect(() => {
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        display_name: profile?.display_name,
        taste_tribe: profile?.taste_tribe,
      });
    } else {
      resetUser();
    }
  }, [user, profile]);

  return <>{children}</>;
}
