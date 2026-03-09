self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json()
        const options = {
            body: data.body,
            icon: data.icon || '/samrat-avatar.png',
            badge: '/samrat-avatar.png',
            vibrate: [100, 50, 100],
            tag: 'smart-money-notif-' + Date.now(), // Unique tag to prevent stacking in some cases, or same tag to overwrite
            renotify: true,
            timestamp: Date.now(),
            data: {
                dateOfArrival: Date.now(),
                url: data.url || '/notifications'
            }
        }
        event.waitUntil(self.registration.showNotification(data.title, options))
    }
})

self.addEventListener('notificationclick', function (event) {
    const url = event.notification.data?.url || '/notifications'
    event.notification.close()
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i]
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus()
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url)
            }
        })
    )
})
