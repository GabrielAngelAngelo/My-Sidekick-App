// Logra service worker: shows push alerts when the app is closed.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch (err) {}
  e.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const focused = clients.some(c => c.focused);
    await self.registration.showNotification(d.title || 'Logra', {
      body: d.body || '',
      tag: d.tag || 'logra',
      silent: focused,
      data: { url: './' }
    });
    // The app is open and in view: the in-app badge is enough, so hide the pop-up.
    if (focused) {
      setTimeout(async () => {
        const list = await self.registration.getNotifications({ tag: d.tag || 'logra' });
        list.forEach(n => n.close());
      }, 1500);
    }
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clients.length) { await clients[0].focus(); return; }
    await self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  })());
});
