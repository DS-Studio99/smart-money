'use client'
import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function PushNotificationManager() {
    const { user } = useAuth()

    useEffect(() => {
        if (!user) return
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

        async function init() {
            try {
                // Register our smart service worker
                const reg = await navigator.serviceWorker.register('/smart-money-sw.js', { scope: '/' })
                await navigator.serviceWorker.ready

                // If already granted, re-subscribe silently
                if (Notification.permission === 'granted') {
                    const sub = await reg.pushManager.getSubscription()
                    if (!sub) {
                        // Re-subscribe
                        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
                        if (vapidKey) {
                            const urlBase64ToUint8Array = (base64String) => {
                                const padding = '='.repeat((4 - base64String.length % 4) % 4)
                                const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
                                const rawData = window.atob(base64)
                                const outputArray = new Uint8Array(rawData.length)
                                for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
                                return outputArray
                            }
                            try {
                                const newSub = await reg.pushManager.subscribe({
                                    userVisibleOnly: true,
                                    applicationServerKey: urlBase64ToUint8Array(vapidKey)
                                })
                                await fetch('/api/webpush', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: user.id, subscription: newSub.toJSON() })
                                })
                            } catch (e) { /* Silent fail */ }
                        }
                    }
                }

                // Register periodic sync
                if (reg.active) {
                    reg.active.postMessage({ type: 'REGISTER_PERIODIC_SYNC' })
                }

                // Listen for messages from SW
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data?.type === 'NOTIFICATION_CLICK') {
                        window.location.href = event.data.url || '/notifications'
                    }
                })

            } catch (e) {
                // Silent fail — don't disrupt the user
                console.log('[PushManager] Init failed:', e.message)
            }
        }

        init()
    }, [user])

    return null // No UI
}
