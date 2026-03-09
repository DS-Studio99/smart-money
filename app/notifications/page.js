'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'

export default function NotificationsPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [notifications, setNotifications] = useState([])
    const [fetching, setFetching] = useState(true)

    useEffect(() => {
        if (!loading && !user) router.push('/')
    }, [user, loading, router])

    useEffect(() => {
        if (user) fetchNotifications()
    }, [user])

    async function fetchNotifications() {
        if (!user) return
        setFetching(true)
        try {
            const res = await fetch(`/api/notifications?userId=${user.id}`);
            const data = await res.json();
            setNotifications(Array.isArray(data) ? data : []);

            // Mark all fetched as read implicitly for UX, or we can use a "Mark all as read" button
            const unreadIds = (Array.isArray(data) ? data : []).filter(n => !n.is_read).map(n => n.id);
            if (unreadIds.length > 0) {
                await fetch('/api/notifications', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, is_read: true })
                });
            }
        } catch (e) {
            console.error(e);
        }
        setFetching(false)
    }

    async function handleDelete(id) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
    }

    async function handleClearAll() {
        if (!confirm('আপনি কি নিশ্চিত যে সব নোটিফিকেশন মুছে ফেলতে চান?')) return;
        setNotifications([]);
        await fetch(`/api/notifications?userId=${user.id}`, { method: 'DELETE' });
    }

    function getIcon(type) {
        switch (type) {
            case 'danger': return '🚨';
            case 'warning': return '⚠️';
            case 'success': return '✅';
            case 'info':
            default: return '💡';
        }
    }

    if (loading || fetching) return (
        <div className="app-layout">
            <Sidebar />
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
                    <div className="gl-hero" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(99,102,241,0.1))' }}>
                        <div className="gl-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon">🔔</span>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title">নোটিফিকেশন সেন্টার</h1>
                                    <p className="exp-hero-sub">আপনার সকল অ্যালার্ট এবং রিমাইন্ডার</p>
                                </div>
                            </div>
                            {notifications.length > 0 && (
                                <button className="exp-delete-btn" style={{ padding: '8px 16px', borderRadius: 8 }} onClick={handleClearAll}>সব মুছুন</button>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {notifications.length === 0 ? (
                            <div className="gl-glass-card" style={{ padding: 40, textAlign: 'center' }}>
                                <span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>📭</span>
                                <h3>কোনো নোটিফিকেশন নেই!</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>আপনি একদম আপ-টু-ডেট আছেন।</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className="gl-glass-card" style={{ padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start', borderLeft: !n.is_read ? '4px solid #3B82F6' : '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: 24, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>{getIcon(n.type)}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <h4 style={{ fontSize: 16, fontWeight: !n.is_read ? 700 : 500, color: '#F1F5F9' }}>{n.title}</h4>
                                            <button onClick={() => handleDelete(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕</button>
                                        </div>
                                        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>{n.message}</p>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
                                            {new Date(n.created_at).toLocaleString('bn-BD', { hour12: true, month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
