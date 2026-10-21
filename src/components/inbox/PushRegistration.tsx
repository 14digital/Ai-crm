"use client";

import { useEffect } from "react";

export function PushRegistration({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;

    async function register() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) return; // Already subscribed

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
        });

        const json = sub.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

        await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
        });
      } catch {
        // Best-effort, silent fail
      }
    }

    // Delay registration slightly to not block page load
    const timer = setTimeout(register, 2000);
    return () => clearTimeout(timer);
  }, [userId]);

  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
