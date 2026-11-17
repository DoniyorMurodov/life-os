/* Imported into the generated service worker (workbox importScripts). Shows focus-timer pushes. */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  const scope = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(data.title || 'Life OS', {
      body: data.body || '',
      tag: data.tag || 'lifeos-focus',
      renotify: true,
      icon: scope + 'icons/icon-192.png',
      badge: scope + 'icons/icon-192.png',
      data: { url: new URL((data.url || '/').replace(/^\//, ''), scope).href },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
