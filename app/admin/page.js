'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/context/AuthContext'

export default function AdminPage() {
    const { user, profile, loading } = useAuth()
    const router = useRouter()

    const [users, setUsers] = useState([])
    const [signupEnabled, setSignupEnabled] = useState(true)
    const [fetching, setFetching] = useState(true)

    // Admin access check based on profile database
    const isAdmin = profile?.is_admin === true

    useEffect(() => {
        if (!loading && !user) router.push('/')
        else if (!loading && user && profile !== null) {
            if (!isAdmin) router.push('/dashboard')
            else fetchData()
        }
    }, [user, profile, loading, router, isAdmin])

    async function fetchData() {
        setFetching(true)
        try {
            // Fetch users
            const usersRes = await fetch('/api/admin/users')
            if (usersRes.ok) {
                const u = await usersRes.json()
                setUsers(Array.isArray(u) ? u : [])
            }

            // Fetch settings
            const settRes = await fetch('/api/admin/settings')
            if (settRes.ok) {
                const s = await settRes.json()
                const setting = s.find(i => i.key === 'signup_enabled')
                if (setting) {
                    setSignupEnabled(setting.value === 'true')
                }
            }
        } catch (error) {
            console.error(error)
        }
        setFetching(false)
    }

    async function toggleSignup() {
        const newValue = !signupEnabled
        setSignupEnabled(newValue)

        try {
            await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'signup_enabled', value: newValue ? 'true' : 'false' })
            })
            alert(`Sign-up is now ${newValue ? 'Enabled' : 'Disabled'}`)
        } catch (error) {
            console.error(error)
            alert('Failed to update settings database. Make sure you ran the SQL query!')
            setSignupEnabled(!newValue)
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

    if (!isAdmin) return null

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">
                    <div className="gl-hero">
                        <div className="gl-hero-bg" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(0,0,0,0))' }}></div>
                        <div className="gl-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon" style={{ filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.5))' }}>🛡️</span>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title">অ্যাডমিন প্যানেল</h1>
                                    <p className="exp-hero-sub">সিস্টেম সেটিংস এবং ব্যবহারকারী পরিচালনা করুন</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="gl-glass-card" style={{ marginTop: '2rem', padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>⚙️ সিস্টেম সেটিংস</span>
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                            <div>
                                <h4 style={{ color: '#F1F5F9', marginBottom: 4 }}>নতুন একাউন্ট খোলা (Sign Up)</h4>
                                <p style={{ color: '#94A3B8', fontSize: 13 }}>ব্যবহারকারীরা নতুন একাউন্ট খুলতে পারবেন কিনা তা নিয়ন্ত্রণ করুন।</p>
                            </div>
                            <button
                                onClick={toggleSignup}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    border: 'none',
                                    background: signupEnabled ? '#10B981' : '#EF4444',
                                    color: '#FFF',
                                    transition: '0.2s'
                                }}
                            >
                                {signupEnabled ? 'এনাবল (উন্মুক্ত)' : 'ডিজেবল (বন্ধ)'}
                            </button>
                        </div>
                    </div>

                    <div className="gl-section-title" style={{ marginTop: '2rem' }}>👥 ব্যবহারকারীর তালিকা ({users.length})</div>
                    <div className="gl-glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: '500' }}>নাম</th>
                                        <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: '500' }}>ইমেইল</th>
                                        <th style={{ padding: '12px 16px', color: '#94A3B8', fontWeight: '500' }}>যোগদানের তারিখ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u, idx) => (
                                        <tr key={u.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '12px 16px', color: '#F1F5F9' }}>{u.name}</td>
                                            <td style={{ padding: '12px 16px', color: '#94A3B8' }}>{u.email}</td>
                                            <td style={{ padding: '12px 16px', color: '#94A3B8' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                                                কোনো ব্যবহারকারী পাওয়া যায়নি।
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
