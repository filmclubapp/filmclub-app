"use client";

/* ============================================================
   FILM CLUB — NotificationsToggle
   Drop-in button for profile page. Registers the service worker,
   asks the user for permission, and subscribes them to push.
   ============================================================ */

import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import {
  registerServiceWorker,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  showLocalNotification,
} from "../lib/push";

type Status =
  | "unsupported"
  | "idle"
  | "granted"
  | "denied"
  | "subscribing"
  | "subscribed"
  | "error";

export default function NotificationsToggle() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    const p = getNotificationPermission();
    if (p === "granted") setStatus("granted");
    else if (p === "denied") setStatus("denied");
    registerServiceWorker().catch(() => {});
  }, []);

  const handleEnable = async () => {
    setError(null);
    if (!user) {
      setError("Sign in first.");
      return;
    }
    try {
      setStatus("subscribing");
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      await subscribeToPush(user.id);
      setStatus("subscribed");
      showLocalNotification(
        "You're in.",
        "We'll ping you when your clubs are buzzing.",
        "/home"
      );
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  };

  if (status === "unsupported") return null;

  const label =
    status === "subscribed" || status === "granted"
      ? "NOTIFICATIONS ON"
      : status === "subscribing"
      ? "TURNING ON…"
      : status === "denied"
      ? "BLOCKED — ENABLE IN BROWSER SETTINGS"
      : "TURN ON NOTIFICATIONS";

  const disabled = status === "subscribing" || status === "denied" || status === "subscribed" || status === "granted";

  return (
    <section className="mb-6 rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#F4EFD8]/40">
            / NOTIFICATIONS
          </span>
          <h3 className="mt-1 font-anton text-[20px] uppercase tracking-[0.02em] text-[#F4EFD8]">
            DON&apos;T MISS THE CLUB
          </h3>
          <p className="mt-1 text-[13px] leading-[1.4] text-[#F4EFD8]/60">
            Get pinged when your clubs post, a Film of the Week lands, or your streak is about to break.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleEnable}
        disabled={disabled}
        className="mt-4 w-full rounded-full border border-fc-red bg-fc-red px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#0E0D18] transition hover:bg-fc-red/90 disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-[#F4EFD8]/40"
      >
        {label}
      </button>

      {error && (
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-fc-red/80">
          {error}
        </p>
      )}
    </section>
  );
}
