// Web Push (notification_system.md Phase 2). This is what reaches a
// user even with every Vokazi tab fully closed - the one thing the
// in-app Phoenix Channel layer (Phase 1) can never do on its own.

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Vokazi";

  const options = {
    body: data.body || "",
    icon: "/favicon.svg",
    data: { link: data.link || null },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({ type: "notification_click", link });
          return client.focus();
        }
      }

      // No open tab at all - open a fresh one carrying the link as a
      // query param, the same pattern already used for the Google
      // Calendar OAuth redirect.
      if (self.clients.openWindow) {
        const url = link ? `/?notification_link=${encodeURIComponent(link)}` : "/";
        return self.clients.openWindow(url);
      }
    })
  );
});
