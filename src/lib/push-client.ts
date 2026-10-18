"use client";

import { createClient } from "@/lib/supabase/client";

export type PushSupport = "ok" | "unsupported" | "ios-install" | "denied";

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Can this device get phone notifications right now?
export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

function keyToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// Ask permission, subscribe this device and save it. Returns an error message or "".
export async function enablePush(): Promise<string> {
  const support = pushSupport();
  if (support === "ios-install") return "On iPhone, first tap Share → Add to Home Screen, then open the app from there.";
  if (support === "unsupported") return "This browser can't do notifications. Try Chrome, or pick email instead.";
  if (support === "denied") return "Notifications are blocked for this site. Allow them in your browser settings.";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "Notifications weren't allowed.";

  const supabase = createClient();
  const { data: key, error: keyError } = await supabase.rpc("get_vapid_public_key");
  if (keyError || !key) return "Couldn't set up notifications. Please try again.";

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key as string) }));
  const json = sub.toJSON();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !json.endpoint || !json.keys) return "Couldn't set up notifications. Please try again.";

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
      { onConflict: "endpoint" },
    );
  return error ? "Couldn't save this device. Please try again." : "";
}
