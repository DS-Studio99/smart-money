// ═══════════════════════════════════════════════════════════
// Smart Money - Advanced Push Notification Service Worker
// OneSignal-style Push Notification Handler
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = 'smart-money-v3';
const NOTIFICATION_ICON = '/samrat-avatar.png';
const NOTIFICATION_BADGE = '/samrat-avatar.png';
const APP_URL = self.location.origin;

// ─── Push Event Handler ───────────────────────────────────
self.addEventListener('push', function (event) {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: 'Smart Money', body: event.data.text() };
    }

    const {
        title = '💰 Smart Money',
        body = '',
        icon = NOTIFICATION_ICON,
        badge = NOTIFICATION_BADGE,
        tag = 'smart-money-' + Date.now(),
        type = 'info',
        url = '/',
        actions = [],
        requireInteraction = false,
        data: notifData = {}
    } = data;

    // Type-based badge colors and icons
    const typeConfig = {
        danger: { vibrate: [200, 100, 200, 100, 300], renotify: true },
        warning: { vibrate: [100, 50, 100], renotify: true },
        success: { vibrate: [100, 50, 100, 50, 100], renotify: false },
        info: { vibrate: [100], renotify: false },
        reminder: { vibrate: [200, 100, 200], renotify: true },
    };

    const config = typeConfig[type] || typeConfig.info;

    const notificationOptions = {
        body,
        icon,
        badge,
        tag,
        data: { url, type, ...notifData },
        vibrate: config.vibrate,
        renotify: config.renotify,
        requireInteraction: type === 'danger' || requireInteraction,
        timestamp: Date.now(),
        actions: actions.length > 0 ? actions : getDefaultActions(type),
        silent: false,
        dir: 'ltr',
    };

    event.waitUntil(
        self.registration.showNotification(title, notificationOptions)
    );
});

// ─── Default Actions by Type ─────────────────────────────
function getDefaultActions(type) {
    switch (type) {
        case 'danger':
            return [
                { action: 'view', title: '📊 দেখুন', icon: NOTIFICATION_ICON },
                { action: 'dismiss', title: '✕ বাতিল' }
            ];
        case 'warning':
            return [
                { action: 'view', title: '⚠️ দেখুন' },
                { action: 'dismiss', title: '✕ পরে' }
            ];
        case 'reminder':
            return [
                { action: 'add_expense', title: '➕ খরচ যোগ করুন' },
                { action: 'dismiss', title: '✕ পরে' }
            ];
        default:
            return [
                { action: 'view', title: '👁️ দেখুন' }
            ];
    }
}

// ─── Notification Click Handler ───────────────────────────
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const action = event.action;
    const notifData = event.notification.data || {};

    let targetUrl = APP_URL + (notifData.url || '/');

    if (action === 'add_expense') {
        targetUrl = APP_URL + '/expenses';
    } else if (action === 'view') {
        targetUrl = APP_URL + (notifData.url || '/notifications');
    } else if (action === 'dismiss') {
        return;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Focus existing tab if open
            for (const client of clientList) {
                if (client.url.includes(APP_URL) && 'focus' in client) {
                    client.focus();
                    client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl, notifData });
                    return;
                }
            }
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// ─── Notification Close Handler ───────────────────────────
self.addEventListener('notificationclose', function (event) {
    // Track dismissals for analytics
    const notifData = event.notification.data || {};
    console.log('[SW] Notification dismissed:', event.notification.title, notifData.type);
});

// ─── Background Sync ─────────────────────────────────────
self.addEventListener('sync', function (event) {
    if (event.tag === 'check-notifications') {
        event.waitUntil(checkAndSendNotifications());
    }
    if (event.tag === 'sync-expenses') {
        event.waitUntil(syncPendingExpenses());
    }
});

// ─── Periodic Background Sync ─────────────────────────────
self.addEventListener('periodicsync', function (event) {
    if (event.tag === 'daily-reminder') {
        event.waitUntil(sendDailyReminder());
    }
    if (event.tag === 'spending-check') {
        event.waitUntil(checkAndSendNotifications());
    }
});

async function checkAndSendNotifications() {
    try {
        // This would ping the server to check and send notifications
        await fetch('/api/notifications/trigger', { method: 'POST' });
    } catch (e) {
        console.log('[SW] Background check failed:', e.message);
    }
}

async function sendDailyReminder() {
    try {
        const hour = new Date().getHours();
        if (hour >= 20) { // Evening reminder
            await fetch('/api/notifications/daily-reminder', { method: 'POST' });
        }
    } catch (e) {
        console.log('[SW] Daily reminder failed:', e.message);
    }
}

async function syncPendingExpenses() {
    console.log('[SW] Syncing pending expenses...');
}

// ─── Message Handler ──────────────────────────────────────
self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'REGISTER_PERIODIC_SYNC') {
        registerPeriodicSync();
    }
});

async function registerPeriodicSync() {
    try {
        if ('periodicSync' in self.registration) {
            await self.registration.periodicSync.register('daily-reminder', {
                minInterval: 24 * 60 * 60 * 1000 // 24 hours
            });
            await self.registration.periodicSync.register('spending-check', {
                minInterval: 4 * 60 * 60 * 1000 // 4 hours
            });
        }
    } catch (e) {
        console.log('[SW] Periodic sync registration failed:', e.message);
    }
}

// ─── Fetch Handler (Cache First for assets) ───────────────
self.addEventListener('fetch', function (event) {
    // Only handle same-origin requests
    if (!event.request.url.startsWith(self.location.origin)) return;
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        caches.match(event.request).then(function (cached) {
            return cached || fetch(event.request).catch(() => {
                if (event.request.destination === 'document') {
                    return caches.match('/');
                }
            });
        })
    );
});

// ─── Activate ─────────────────────────────────────────────
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keyList) {
            return Promise.all(keyList.map(function (key) {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        }).then(() => self.clients.claim())
    );
});

// ─── Install ──────────────────────────────────────────────
self.addEventListener('install', function (event) {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll([
                '/',
                '/manifest.json',
                '/samrat-avatar.png'
            ]).catch(() => {});
        })
    );
});
