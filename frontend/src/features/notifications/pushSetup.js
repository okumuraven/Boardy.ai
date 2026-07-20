const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

// Registers the Service Worker, requests browser permission, subscribes
// via the Push API, and hands the subscription to the backend. Only
// ever called from a user-initiated click (NotificationBell's "Enable
// push alerts" link) - never fired automatically on page load, so the
// native browser permission prompt never surprises anyone.
export async function enablePushNotifications(profile, apiUrl) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications aren't supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission wasn't granted.");
  }

  const registration = await navigator.serviceWorker.register("/service-worker.js");
  await navigator.serviceWorker.ready;

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const raw = subscription.toJSON();
  await fetch(`${apiUrl}/api/push_subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: profile.id, endpoint: raw.endpoint, keys: raw.keys }),
  });

  return subscription;
}
