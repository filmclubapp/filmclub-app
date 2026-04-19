"use client";

/* ============================================================
   PUSH NOTIFICATIONS — client helpers
   - Registers the service worker
   - Requests notification permission
   - Subscribes to web push (requires VAPID public key + backend)
   - Stores subscription in Supabase (push_subscriptions table)
   ============================================================ */

import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}

/** Register the service worker. Returns the registration or null. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch {
    return null;
  }
}

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

export function getNotificationPermission(): PushPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PushPermissionState;
}

/** Ask the user for notification permission. */
export async function requestNotificationPermission(): Promise<PushPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission as PushPermissionState;
  const result = await Notification.requestPermission();
  return result as PushPermissionState;
}

/** Subscribe the user to web push and persist to Supabase. */
export async function subscribeToPush(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!VAPID_PUBLIC_KEY) return { ok: false, error: "Push not configured (missing VAPID key)" };

  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, error: "Service worker not supported" };

  const perm = await requestNotificationPermission();
  if (perm !== "granted") return { ok: false, error: "Permission denied" };

  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });

    // Persist subscription to Supabase
    await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        subscription: sub.toJSON(),
      },
      { onConflict: "user_id,endpoint" }
    );

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Subscription failed" };
  }
}

/** Show a local notification (no server needed) — for in-app testing. */
export function showLocalNotification(title: string, body: string, url?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) return;
    reg.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: url || "/home" },
    });
  });
}
