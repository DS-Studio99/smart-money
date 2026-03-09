'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useUI } from '@/context/UIContext'

export default function MobileNav() {
    const { toggleSidebar } = useUI()
    const { user } = useAuth()
    const router = useRouter()
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        if (user) {
            fetch(`/api/notifications?userId=${user.id}`).then(res => res.json()).then(data => {
                if (Array.isArray(data)) setUnreadCount(data.filter(n => !n.is_read).length)
            }).catch(console.error)
        }
    }, [user])

    return (
        <div className="mobile-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
            <button className="hamburger" onClick={toggleSidebar} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, padding: 0 }}>☰</button>
            <div className="mobile-logo" style={{ fontSize: 18, fontWeight: 'bold', color: '#F59E0B' }} onClick={() => router.push('/dashboard')}>💰 স্মার্ট মানি</div>
            <button onClick={() => router.push('/notifications')} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20 }}>🔔</span>
                {unreadCount > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: '#EF4444', color: '#FFF', fontSize: 10, fontWeight: 800, padding: '2px 5px', borderRadius: 10 }}>{unreadCount}</span>}
            </button>
        </div>
    )
}
