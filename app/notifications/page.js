'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

const NOTIFICATION_TYPES = [
    {
        id: 'budget_alert',
        icon: '🚨',
        title: 'বাজেট অ্যালার্ট',
        desc: 'বাজেটের ৭৫%, ৯০% বা পার হলে তাৎক্ষণিক নোটিফিকেশন',
        defaultOn: true,
        type: 'danger'
    },
    {
        id: 'high_spending',
        icon: '💸',
        title: 'অতিরিক্ত খরচ সতর্কতা',
        desc: 'আজকের খরচ স্বাভাবিকের বেশি হলে alert',
        defaultOn: true,
        type: 'warning'
    },
    {
        id: 'daily_reminder',
        icon: '📅',
        title: 'ডেইলি রিমাইন্ডার',
        desc: 'আজকের খরচ যোগ না হলে সন্ধ্যায় রিমাইন্ডার',
        defaultOn: true,
        type: 'reminder'
    },
    {
        id: 'weekly_compare',
        icon: '📊',
        title: 'সাপ্তাহিক তুলনা',
        desc: 'গত সপ্তাহের তুলনায় বেশি খরচ হলে',
        defaultOn: true,
        type: 'warning'
    },
    {
        id: 'loan_reminder',
        icon: '🤝',
        title: 'লোন রিমাইন্ডার',
        desc: 'লোনের সময়সীমা কাছে এলে alert',
        defaultOn: true,
        type: 'warning'
    },
    {
        id: 'goal_progress',
        icon: '🎯',
        title: 'লক্ষ্য অগ্রগতি',
        desc: 'সঞ্চয় লক্ষ্যের মাইলফলক অর্জনে',
        defaultOn: true,
        type: 'success'
    },
    {
        id: 'smart_suggestion',
        icon: '🧩',
        title: 'স্মার্ট পরামর্শ',
        desc: 'খরচ কমানোর AI-পরামর্শ',
        defaultOn: true,
        type: 'info'
    },
    {
        id: 'savings_rate',
        icon: '💎',
        title: 'সঞ্চয় রেট নজরদারি',
        desc: 'আয়ের বেশি খরচ হলে বা ভালো সঞ্চয়ে',
        defaultOn: true,
        type: 'info'
    },
    {
        id: 'motivation',
        icon: '💡',
        title: 'মোটিভেশন টিপস',
        desc: 'প্রতি ৩ দিনে একটি আর্থিক পরামর্শ',
        defaultOn: true,
        type: 'info'
    },
    {
        id: 'no_spend_day',
        icon: '🌟',
        title: 'নো-স্পেন্ড ডে',
        desc: 'শূন্য খরচের দিনে অর্জন উদযাপন',
        defaultOn: false,
        type: 'success'
    },
]

function ToggleSwitch({ checked, onChange }) {
    return (
        <div
            onClick={() => onChange(!checked)}
            style={{
                width: 46, height: 26, borderRadius: 13, cursor: 'pointer',
                background: checked ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.1)',
                border: checked ? 'none' : '1px solid rgba(255,255,255,0.15)',
                position: 'relative', transition: 'all 0.3s', flexShrink: 0,
                boxShadow: checked ? '0 0 12px rgba(16,185,129,0.4)' : 'none'
            }}
        >
            <div style={{
                position: 'absolute', top: 3, left: checked ? 23 : 3,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'left 0.3s', boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }} />
        </div>
    )
}

export default function NotificationsPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [notifications, setNotifications] = useState([])
    const [fetching, setFetching] = useState(true)
    const [activeTab, setActiveTab] = useState('notifications') // 'notifications' | 'settings'
    const [pushEnabled, setPushEnabled] = useState(false)
    const [pushLoading, setPushLoading] = useState(false)
    const [pushStatus, setPushStatus] = useState('') // message
    const [settings, setSettings] = useState(() =>
        Object.fromEntries(NOTIFICATION_TYPES.map(t => [t.id, t.defaultOn]))
    )
    const [triggerLoading, setTriggerLoading] = useState(false)
    const [filterType, setFilterType] = useState('all')
    const swRef = useRef(null)

    useEffect(() => {
        if (!loading && !user) router.push('/')
    }, [user, loading, router])

    useEffect(() => {
        if (user) {
            fetchNotifications()
            checkPushStatus()
            loadSettings()
        }
    }, [user])

    // ─── Service Worker Registration ─────────────────────
    async function registerSmartServiceWorker() {
        if (!('serviceWorker' in navigator)) return null
        try {
            const reg = await navigator.serviceWorker.register('/smart-money-sw.js', { scope: '/' })
            await navigator.serviceWorker.ready
            swRef.current = reg
            return reg
        } catch (e) {
            console.error('SW registration failed:', e)
            return null
        }
    }

    async function checkPushStatus() {
        if (!('Notification' in window)) {
            setPushStatus('এই ব্রাউজার নোটিফিকেশন সাপোর্ট করে না')
            return
        }
        const perm = Notification.permission
        setPushEnabled(perm === 'granted')
        if (perm === 'granted') {
            setPushStatus('✅ পুশ নোটিফিকেশন সক্রিয় আছে')
        } else if (perm === 'denied') {
            setPushStatus('❌ নোটিফিকেশন ব্লক করা আছে। ব্রাউজার সেটিংস থেকে অনুমতি দিন।')
        } else {
            setPushStatus('অনুমতি নেওয়া হয়নি')
        }
    }

    async function enablePushNotifications() {
        setPushLoading(true)
        setPushStatus('অনুমতি নিচ্ছি...')

        try {
            if (!('Notification' in window)) {
                setPushStatus('❌ এই ব্রাউজার সাপোর্ট করে না')
                return
            }

            const permission = await Notification.requestPermission()

            if (permission !== 'granted') {
                setPushStatus('❌ অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংস থেকে অনুমতি দিন।')
                setPushEnabled(false)
                return
            }

            setPushStatus('Service Worker রেজিস্ট্রেশন হচ্ছে...')
            const reg = await registerSmartServiceWorker()
            if (!reg) {
                setPushStatus('❌ Service Worker রেজিস্ট্রেশন ব্যর্থ')
                return
            }

            setPushStatus('সাবস্ক্রিপশন তৈরি হচ্ছে...')
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) {
                setPushStatus('❌ VAPID key পাওয়া যাচ্ছে না')
                return
            }

            // Convert VAPID key
            const urlBase64ToUint8Array = (base64String) => {
                const padding = '='.repeat((4 - base64String.length % 4) % 4)
                const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
                const rawData = window.atob(base64)
                const outputArray = new Uint8Array(rawData.length)
                for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
                return outputArray
            }

            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            })

            setPushStatus('সার্ভারে সেভ হচ্ছে...')
            const res = await fetch('/api/webpush', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, subscription: subscription.toJSON() })
            })

            if (res.ok) {
                setPushEnabled(true)
                setPushStatus('✅ পুশ নোটিফিকেশন সফলভাবে চালু হয়েছে! একটি পরীক্ষামূলক নোটিফিকেশন পাঠানো হয়েছে।')
                // Register periodic sync
                if (reg.active) {
                    reg.active.postMessage({ type: 'REGISTER_PERIODIC_SYNC' })
                }
            } else {
                setPushStatus('❌ সার্ভারে সেভ করতে ব্যর্থ')
            }
        } catch (e) {
            setPushStatus('❌ ভুল হয়েছে: ' + e.message)
        } finally {
            setPushLoading(false)
        }
    }

    async function disablePushNotifications() {
        setPushLoading(true)
        try {
            const reg = await navigator.serviceWorker.getRegistration('/smart-money-sw.js')
            if (reg) {
                const sub = await reg.pushManager.getSubscription()
                if (sub) await sub.unsubscribe()
            }
            setPushEnabled(false)
            setPushStatus('❌ পুশ নোটিফিকেশন বন্ধ করা হয়েছে')
        } catch (e) {
            setPushStatus('❌ বন্ধ করতে ব্যর্থ: ' + e.message)
        }
        setPushLoading(false)
    }

    async function sendTestNotification() {
        if (!pushEnabled) {
            alert('আগে পুশ নোটিফিকেশন চালু করুন')
            return
        }
        // Show browser notification directly
        const reg = await navigator.serviceWorker.ready
        reg.showNotification('💰 স্মার্ট মানি — টেস্ট নোটিফিকেশন', {
            body: '🎉 আপনার পুশ নোটিফিকেশন সিস্টেম সঠিকভাবে কাজ করছে! App বন্ধ থাকলেও এই ধরনের নোটিফিকেশন আসবে।',
            icon: '/samrat-avatar.png',
            badge: '/samrat-avatar.png',
            vibrate: [200, 100, 200],
            tag: 'test-' + Date.now(),
            requireInteraction: false,
            actions: [
                { action: 'view', title: '📊 দেখুন' }
            ]
        })
    }

    async function triggerNow() {
        setTriggerLoading(true)
        try {
            const res = await fetch('/api/notifications/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            })
            const data = await res.json()
            if (data.success) {
                await fetchNotifications()
                setPushStatus('✅ নোটিফিকেশন চেক সম্পন্ন! নতুন কোনো আপডেট থাকলে দেখাবে।')
            }
        } catch (e) {
            console.error(e)
        }
        setTriggerLoading(false)
    }

    function loadSettings() {
        try {
            const saved = localStorage.getItem(`notif-settings-${user?.id}`)
            if (saved) setSettings({ ...settings, ...JSON.parse(saved) })
        } catch (e) { }
    }

    function saveSettings(newSettings) {
        setSettings(newSettings)
        localStorage.setItem(`notif-settings-${user?.id}`, JSON.stringify(newSettings))
    }

    async function fetchNotifications() {
        if (!user) return
        setFetching(true)
        try {
            const res = await fetch(`/api/notifications?userId=${user.id}`)
            const data = await res.json()
            setNotifications(Array.isArray(data) ? data : [])
            // Mark as read
            const unread = (Array.isArray(data) ? data : []).filter(n => !n.is_read).map(n => n.id)
            if (unread.length > 0) {
                await fetch('/api/notifications', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, is_read: true })
                })
            }
        } catch (e) { console.error(e) }
        setFetching(false)
    }

    async function handleDelete(id) {
        setNotifications(prev => prev.filter(n => n.id !== id))
        await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
    }

    async function handleClearAll() {
        if (!confirm('সব নোটিফিকেশন মুছবেন?')) return
        setNotifications([])
        await fetch(`/api/notifications?userId=${user.id}`, { method: 'DELETE' })
    }

    const typeConfig = {
        danger: { color: '#EF4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.2)', icon: '🚨' },
        warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.2)', icon: '⚠️' },
        success: { color: '#10B981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.2)', icon: '✅' },
        info: { color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.2)', icon: '💡' },
        reminder: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.2)', icon: '📅' },
    }

    const filteredNotifs = filterType === 'all' ? notifications : notifications.filter(n => n.type === filterType)
    const unreadCount = notifications.filter(n => !n.is_read).length

    if (loading) return (
        <div className="app-layout"><Sidebar />
            <main className="main-content">
                <div className="gl-loading-full"><div className="exp-loading-ring"></div><p>লোড হচ্ছে...</p></div>
            </main>
        </div>
    )

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">

                    {/* ─── HERO ─── */}
                    <div className="gl-hero">
                        <div className="gl-hero-bg" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(99,102,241,0.10), rgba(16,185,129,0.08))' }}></div>
                        <div className="gl-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon" style={{ filter: 'drop-shadow(0 0 14px rgba(236,72,153,0.5))' }}>🔔</span>
                                    <div className="exp-hero-icon-ring" style={{ borderColor: 'rgba(236,72,153,0.3)' }}></div>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title" style={{ background: 'linear-gradient(135deg, #F1F5F9, #F472B6, #818CF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                        স্মার্ট নোটিফিকেশন সিস্টেম
                                    </h1>
                                    <p className="exp-hero-sub">Real-time alerts + Phone notification bar + Lock screen সাপোর্ট</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {unreadCount > 0 && (
                                    <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: '6px 14px', color: '#FCA5A5', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        🔴 {unreadCount} অপঠিত
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ─── TABS ─── */}
                    <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 5, border: '1px solid rgba(255,255,255,0.06)' }}>
                        {[
                            { id: 'notifications', label: '🔔 নোটিফিকেশন', count: notifications.length },
                            { id: 'settings', label: '⚙️ সেটিংস ও Push' },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                                flex: 1, padding: '11px 20px', border: 'none', borderRadius: 10, cursor: 'pointer',
                                background: activeTab === tab.id ? 'linear-gradient(135deg, #EC4899, #6366F1)' : 'transparent',
                                color: activeTab === tab.id ? '#fff' : '#64748B',
                                fontSize: 14, fontWeight: 700, transition: 'all 0.3s',
                                boxShadow: activeTab === tab.id ? '0 4px 16px rgba(236,72,153,0.3)' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}>
                                {tab.label}
                                {tab.count > 0 && <span style={{ background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(99,102,241,0.2)', borderRadius: 20, padding: '1px 8px', fontSize: 12 }}>{tab.count}</span>}
                            </button>
                        ))}
                    </div>

                    {/* ══════════════ NOTIFICATIONS TAB ══════════════ */}
                    {activeTab === 'notifications' && (
                        <>
                            {/* Filter + Actions */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 6, flex: 1, overflowX: 'auto' }}>
                                    {['all', 'danger', 'warning', 'success', 'info', 'reminder'].map(t => (
                                        <button key={t} onClick={() => setFilterType(t)} style={{
                                            padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                            background: filterType === t ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'rgba(255,255,255,0.05)',
                                            color: filterType === t ? '#fff' : '#64748B', fontSize: 12, fontWeight: 600
                                        }}>
                                            {t === 'all' ? '📋 সব' : t === 'danger' ? '🚨 বিপদ' : t === 'warning' ? '⚠️ সতর্কতা' : t === 'success' ? '✅ সাফল্য' : t === 'info' ? '💡 তথ্য' : '📅 রিমাইন্ডার'}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={triggerNow} disabled={triggerLoading} style={{
                                        padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                        background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff',
                                        fontSize: 12, fontWeight: 700
                                    }}>
                                        {triggerLoading ? '⏳' : '🔄'} চেক করুন
                                    </button>
                                    {notifications.length > 0 && (
                                        <button onClick={handleClearAll} style={{
                                            padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                            background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: 12, fontWeight: 700
                                        }}>🗑️ সব মুছুন</button>
                                    )}
                                </div>
                            </div>

                            {/* Notification List */}
                            {fetching ? (
                                <div className="gl-loading-full"><div className="exp-loading-ring"></div></div>
                            ) : filteredNotifs.length === 0 ? (
                                <div className="exp-empty">
                                    <div className="exp-empty-icon">📭</div>
                                    <h3>কোনো নোটিফিকেশন নেই</h3>
                                    <p>নতুন alerts আসলে এখানে দেখাবে। "চেক করুন" বাটনে চাপুন।</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {filteredNotifs.map(n => {
                                        const tc = typeConfig[n.type] || typeConfig.info
                                        return (
                                            <div key={n.id} style={{
                                                background: n.is_read ? 'rgba(15,23,42,0.4)' : tc.bg,
                                                border: `1px solid ${n.is_read ? 'rgba(255,255,255,0.06)' : tc.border}`,
                                                borderLeft: `4px solid ${n.is_read ? 'rgba(255,255,255,0.1)' : tc.color}`,
                                                borderRadius: 14, padding: '16px 18px',
                                                display: 'flex', gap: 14, alignItems: 'flex-start',
                                                animation: 'fadeInUp 0.3s ease', transition: 'all 0.2s'
                                            }}>
                                                <div style={{ fontSize: 26, flexShrink: 0 }}>{tc.icon}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                                        <h4 style={{ fontSize: 15, fontWeight: n.is_read ? 500 : 700, color: '#F1F5F9', marginBottom: 4 }}>{n.title}</h4>
                                                        <button onClick={() => handleDelete(n.id)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
                                                    </div>
                                                    <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>{n.message}</p>
                                                    <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>
                                                        {new Date(n.created_at).toLocaleString('bn-BD', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* ══════════════ SETTINGS TAB ══════════════ */}
                    {activeTab === 'settings' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                            {/* Push Notification Card */}
                            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                                    <div style={{ width: 46, height: 46, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>🔔</div>
                                    <div>
                                        <h3 style={{ color: '#F1F5F9', fontSize: 17, fontWeight: 700 }}>Real Push Notification</h3>
                                        <p style={{ color: '#64748B', fontSize: 12 }}>Phone bar • Lock screen • App বন্ধ থাকলেও</p>
                                    </div>
                                </div>

                                {/* Status Banner */}
                                <div style={{
                                    padding: '12px 16px', borderRadius: 12, marginBottom: 16,
                                    background: pushEnabled ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                                    border: `1px solid ${pushEnabled ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                    display: 'flex', alignItems: 'center', gap: 10
                                }}>
                                    <span style={{ fontSize: 20 }}>{pushEnabled ? '✅' : '❌'}</span>
                                    <span style={{ fontSize: 13, color: pushEnabled ? '#6EE7B7' : '#FCA5A5', fontWeight: 600 }}>
                                        {pushStatus || (pushEnabled ? 'সক্রিয়' : 'নিষ্ক্রিয়')}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {!pushEnabled ? (
                                        <button onClick={enablePushNotifications} disabled={pushLoading} style={{
                                            flex: 1, padding: '13px 20px', border: 'none', borderRadius: 12, cursor: pushLoading ? 'not-allowed' : 'pointer',
                                            background: pushLoading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                                            color: '#fff', fontSize: 14, fontWeight: 700,
                                            boxShadow: '0 4px 20px rgba(99,102,241,0.4)'
                                        }}>
                                            {pushLoading ? '⏳ প্রক্রিয়া চলছে...' : '🔔 Push Notification চালু করুন'}
                                        </button>
                                    ) : (
                                        <>
                                            <button onClick={sendTestNotification} style={{
                                                flex: 1, padding: '12px 18px', border: 'none', borderRadius: 12, cursor: 'pointer',
                                                background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontSize: 13, fontWeight: 700,
                                                boxShadow: '0 4px 16px rgba(16,185,129,0.3)'
                                            }}>📱 টেস্ট নোটিফিকেশন পাঠান</button>
                                            <button onClick={disablePushNotifications} disabled={pushLoading} style={{
                                                padding: '12px 14px', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, cursor: 'pointer',
                                                background: 'rgba(239,68,68,0.08)', color: '#FCA5A5', fontSize: 13, fontWeight: 700
                                            }}>🔕 বন্ধ করুন</button>
                                        </>
                                    )}
                                </div>

                                {/* How it works */}
                                <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.8 }}>
                                        📱 <strong style={{ color: '#94A3B8' }}>কীভাবে কাজ করে:</strong> "চালু করুন" চাপুন → ব্রাউজার অনুমতি দিন → এরপর থেকে ফোনের notification bar-এ, lock screen-এ এবং app বন্ধ থাকলেও notifications আসবে।
                                    </p>
                                </div>
                            </div>

                            {/* Auto Check Settings */}
                            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
                                <h3 style={{ color: '#F1F5F9', fontSize: 16, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>⚙️ অটোমেশন সেটিংস</h3>
                                <p style={{ color: '#64748B', fontSize: 13, marginBottom: 18 }}>প্রতিটি notification type আলাদাভাবে চালু/বন্ধ করুন</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {NOTIFICATION_TYPES.map(t => {
                                        const tc = typeConfig[t.type] || typeConfig.info
                                        return (
                                            <div key={t.id} style={{
                                                display: 'flex', alignItems: 'center', gap: 14,
                                                padding: '14px 16px', borderRadius: 12,
                                                background: settings[t.id] ? tc.bg : 'rgba(255,255,255,0.02)',
                                                border: `1px solid ${settings[t.id] ? tc.border : 'rgba(255,255,255,0.06)'}`,
                                                transition: 'all 0.2s'
                                            }}>
                                                <span style={{ fontSize: 24, flexShrink: 0 }}>{t.icon}</span>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0', marginBottom: 2 }}>{t.title}</p>
                                                    <p style={{ fontSize: 12, color: '#64748B' }}>{t.desc}</p>
                                                </div>
                                                <ToggleSwitch
                                                    checked={settings[t.id]}
                                                    onChange={v => saveSettings({ ...settings, [t.id]: v })}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Manual Trigger */}
                            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 20, padding: 24 }}>
                                <h3 style={{ color: '#F1F5F9', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>🚀 এখনই চেক করুন</h3>
                                <p style={{ color: '#64748B', fontSize: 13, marginBottom: 14 }}>আপনার সব financial data এখনই বিশ্লেষণ করে নতুন notifications তৈরি করুন</p>
                                <button onClick={triggerNow} disabled={triggerLoading} style={{
                                    width: '100%', padding: '14px', border: 'none', borderRadius: 12, cursor: 'pointer',
                                    background: triggerLoading ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #10B981, #059669)',
                                    color: '#fff', fontSize: 14, fontWeight: 700,
                                    boxShadow: '0 4px 20px rgba(16,185,129,0.3)'
                                }}>
                                    {triggerLoading ? '⏳ চেক হচ্ছে...' : '🔍 Smart Notification চেক করুন'}
                                </button>
                            </div>

                            {/* Cron Setup Guide */}
                            <div style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 16, padding: 20 }}>
                                <h4 style={{ color: '#FCD34D', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>⏰ Auto Schedule (Cron) সেটআপ</h4>
                                <p style={{ color: '#64748B', fontSize: 12, lineHeight: 1.8, marginBottom: 10 }}>
                                    প্রতিদিন স্বয়ংক্রিয়ভাবে নোটিফিকেশন পাঠাতে এই URL টি cron job-এ যোগ করুন:
                                </p>
                                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#60A5FA', wordBreak: 'break-all' }}>
                                    GET {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/notifications/trigger?secret=smart-money-cron-2024
                                </div>
                                <p style={{ color: '#475569', fontSize: 11, marginTop: 8 }}>
                                    💡 cron-job.org বা Vercel Cron-এ প্রতি ৬ ঘণ্টায় একবার চালান।
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
