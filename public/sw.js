self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Listen for notification click — open the vaults page
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const vaultClient = clients.find((c) => c.url.includes("/vaults"));
      if (vaultClient) return vaultClient.focus();
      return self.clients.openWindow("/vaults");
    })
  );
});

// Message from page: check vaults and fire notifications
self.addEventListener("message", (e) => {
  if (e.data?.type === "CHECK_VAULTS") {
    const vaults = e.data.vaults ?? [];
    const now = Date.now();

    for (const vault of vaults) {
      if (vault.status !== "alive") continue;

      const total = vault.intervalMs || 1;
      const remaining = Math.max(0, vault.deadlineMs - now);
      const elapsed = (total - remaining) / total;

      const notifKey = `fuse-notif-${vault.id}`;
      const lastNotif = parseInt(self.__notifSent?.[notifKey] ?? "0");

      let title = null;
      let body = null;
      let threshold = null;

      if (elapsed >= 0.95 && lastNotif < 3) {
        title = "⚠️ Vault settling soon";
        body = `"${vault.label}" will deliver in ${formatRemaining(remaining)}. Check in now.`;
        threshold = 3;
      } else if (elapsed >= 0.80 && lastNotif < 2) {
        title = "🔔 Vault reminder";
        body = `"${vault.label}" is 80% through its countdown. Check in to hold delivery.`;
        threshold = 2;
      } else if (elapsed >= 0.50 && lastNotif < 1) {
        title = "⚡ Fuse check-in reminder";
        body = `"${vault.label}" is halfway to delivery. Check in to reset the timer.`;
        threshold = 1;
      }

      if (title && threshold > lastNotif) {
        if (!self.__notifSent) self.__notifSent = {};
        self.__notifSent[notifKey] = String(threshold);

        self.registration.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `${vault.id}-${threshold}`,
          requireInteraction: elapsed >= 0.95,
          actions: [{ action: "checkin", title: "Check In →" }],
        });
      }
    }
  }
});

function formatRemaining(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
