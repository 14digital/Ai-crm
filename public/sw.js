self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "NexaDesk", {
      body: data.body || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: { url: data.url || "/inbox" },
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const url = event.notification.data?.url || "/inbox";
        const existing = clientList.find((c) => c.url.includes(url) && "focus" in c);
        if (existing) return existing.focus();
        return clients.openWindow(url);
      })
  );
});
