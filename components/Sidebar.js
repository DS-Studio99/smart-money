'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useUI } from '@/context/UIContext'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

const navItems = [
    { href: '/dashboard', icon: '🏠', label: 'ড্যাশবোর্ড', color: '#F59E0B' },
    { href: '/income', icon: '💰', label: 'আয় ব্যবস্থাপনা', color: '#10B981' },
    { href: '/expenses', icon: '💸', label: 'খরচ ট্র্যাকার', color: '#EF4444' },
    { href: '/budget', icon: '📊', label: 'বাজেট ম্যানেজার', color: '#3B82F6' },
    { href: '/goals', icon: '🎯', label: 'লক্ষ্য ও সঞ্চয়', color: '#A855F7' },
    { href: '/report', icon: '📈', label: 'মাসিক রিপোর্ট', color: '#10B981' },
    { href: '/savings', icon: '🏦', label: 'প্রকৃত সঞ্চয় (Vault)', color: '#14B8A6' },
    { href: '/loans', icon: '🤝', label: 'লোন ম্যানেজমেন্ট', color: '#60A5FA' },
    { href: '/credit', icon: '🏪', label: 'দোকান বাকি', color: '#F59E0B' },
    { href: '/calculator', icon: '🧮', label: 'সম্পদ ক্যালকুলেটর', color: '#F97316' },
    { href: '/challenges', icon: '🏆', label: 'সেভিং চ্যালেঞ্জ', color: '#EC4899' },
    { href: '/notifications', icon: '🔔', label: 'নোটিফিকেশন', color: '#F43F5E' },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { user, profile } = useAuth()
    const { sidebarOpen, closeSidebar, toggleSidebar } = useUI()
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [showInstallBtn, setShowInstallBtn] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setShowInstallBtn(true)
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    useEffect(() => {
        if (user) {
            fetch(`/api/notifications?userId=${user.id}`).then(res => res.json()).then(data => {
                if (Array.isArray(data)) setUnreadCount(data.filter(n => !n.is_read).length)
            }).catch(console.error)
        }
    }, [user, pathname])

    async function installApp() {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
            setDeferredPrompt(null)
            setShowInstallBtn(false)
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/')
    }

    const displayName = profile?.name || user?.email?.split('@')[0] || 'ব্যবহারকারী'
    const initials = displayName.charAt(0).toUpperCase()

    return (
        <>
            <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                {/* Logo */}
                <div className="gl-sidebar-logo">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
                            <div className="gl-sidebar-logo-icon" style={{ fontSize: 28, background: 'rgba(245, 158, 11, 0.15)', padding: '6px 10px', borderRadius: 12 }}>💰</div>
                            <div>
                                <h1 style={{ fontSize: 18, color: '#F59E0B', margin: 0, fontWeight: 700 }}>স্মার্ট মানি</h1>
                                <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>আপনার অর্থনৈতিক সহকারী</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button onClick={() => { if (window.innerWidth <= 768) closeSidebar(); router.push('/notifications'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 20 }}>🔔</span>
                                {unreadCount > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: '#EF4444', color: '#FFF', fontSize: 10, fontWeight: 800, padding: '2px 5px', borderRadius: 10, border: '2px solid rgba(19, 31, 51, 1)' }}>{unreadCount}</span>}
                            </button>
                            <button className="gl-sidebar-toggle" onClick={toggleSidebar}>
                                {sidebarOpen ? '✕' : '☰'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="gl-sidebar-nav">
                    <div className="gl-nav-label">মূল মেনু</div>
                    {navItems.map(item => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`gl-nav-item ${isActive ? 'gl-nav-active' : ''}`}
                                onClick={() => { if (window.innerWidth <= 768) closeSidebar() }}
                                style={isActive ? { '--nav-color': item.color } : {}}
                            >
                                <span className="gl-nav-icon">{item.icon}</span>
                                <span style={{ flex: 1 }}>{item.label}</span>
                                {item.href === '/notifications' && unreadCount > 0 && (
                                    <span style={{ background: '#EF4444', color: '#FFF', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 10, marginLeft: 'auto' }}>
                                        {unreadCount}
                                    </span>
                                )}
                                {isActive && <div className="gl-nav-active-bar"></div>}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="gl-sidebar-footer">
                    {showInstallBtn && (
                        <button
                            className="gl-nav-item"
                            onClick={installApp}
                            style={{
                                marginBottom: 12,
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                color: '#F59E0B'
                            }}
                        >
                            <div style={{ position: 'relative', width: 22, height: 22, marginRight: 12, borderRadius: 4, overflow: 'hidden' }}>
                                <Image src="/samrat-avatar.png" alt="App" fill style={{ objectFit: 'cover' }} />
                            </div>
                            <span>অ্যাপ ইনস্টল করুন</span>
                        </button>
                    )}
                    <div className="gl-user-card">
                        <div className="gl-user-avatar">{initials}</div>
                        <div className="gl-user-info">
                            <p className="gl-user-name">{displayName}</p>
                            <span className="gl-user-income">{profile?.monthly_income ? `মাসিক: ৳${Number(profile.monthly_income).toLocaleString('bn-BD')}` : 'প্রোফাইল আপডেট করুন'}</span>
                        </div>
                    </div>
                    <Link href="/settings" className={`gl-nav-item ${pathname === '/settings' ? 'gl-nav-active' : ''}`} style={{ marginBottom: 6, ...(pathname === '/settings' ? { '--nav-color': '#6B7280' } : {}) }} onClick={() => { if (window.innerWidth <= 768) closeSidebar() }}>
                        <span className="gl-nav-icon">⚙️</span><span>সেটিংস</span>
                        {pathname === '/settings' && <div className="gl-nav-active-bar"></div>}
                    </Link>
                    <button className="gl-nav-item gl-logout-btn" onClick={handleLogout}>
                        <span className="gl-nav-icon">🚪</span><span>লগআউট</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
