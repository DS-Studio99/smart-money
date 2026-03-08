'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
    const router = useRouter()
    const [tab, setTab] = useState('login')
    const [form, setForm] = useState({ name: '', email: '', password: '', income: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [msg, setMsg] = useState('')
    const [isSignupEnabled, setIsSignupEnabled] = useState(true)

    // Check setting on load
    useEffect(() => {
        async function checkSettings() {
            try {
                const res = await fetch('/api/admin/settings')
                const settings = await res.json()
                if (Array.isArray(settings)) {
                    const s = settings.find(x => x.key === 'signup_enabled')
                    if (s && s.value === 'false') setIsSignupEnabled(false)
                    else setIsSignupEnabled(true)
                }
            } catch (e) {
                console.error(e)
            }
        }
        checkSettings()
    }, [])

    function handleChange(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    }

    async function handleLogin(e) {
        e.preventDefault()
        setLoading(true); setError('')
        const { error } = await supabase.auth.signInWithPassword({
            email: form.email, password: form.password
        })
        setLoading(false)
        if (error) setError(error.message)
        else router.push('/dashboard')
    }

    async function handleSignup(e) {
        e.preventDefault()
        if (!isSignupEnabled) {
            setError('বর্তমানে নতুন একাউন্ট খোলা বন্ধ আছে।')
            return
        }
        setLoading(true); setError('')
        const { data, error } = await supabase.auth.signUp({
            email: form.email, password: form.password
        })
        if (error) { setError(error.message); setLoading(false); return; }

        if (data.user) {
            await supabase.from('profiles').insert({
                id: data.user.id,
                name: form.name,
                monthly_income: parseFloat(form.income) || 0
            })
        }
        setLoading(false)
        setMsg('নিবন্ধন সফল! এখন লগইন করুন।')
        setTab('login')
    }

    return (
        <div className="gl-auth-page">
            {/* Animated background */}
            <div className="gl-auth-bg">
                <div className="gl-auth-orb gl-orb-1"></div>
                <div className="gl-auth-orb gl-orb-2"></div>
                <div className="gl-auth-orb gl-orb-3"></div>
                <div className="gl-auth-grid"></div>
            </div>

            <div className="gl-auth-card">
                <div className="gl-auth-card-glow"></div>
                <div className="gl-auth-card-inner">
                    {/* Logo */}
                    <div className="gl-auth-logo">
                        <div className="gl-auth-logo-icon">
                            <span>💰</span>
                            <div className="gl-auth-logo-ring"></div>
                        </div>
                        <h1>স্মার্ট মানি ম্যানেজার</h1>
                        <p>আপনার অর্থনৈতিক সাফল্যের পথপ্রদর্শক</p>
                    </div>

                    {/* Tabs */}
                    <div className="gl-auth-tabs">
                        <button className={`gl-auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')} style={{ width: isSignupEnabled ? '50%' : '100%' }}>
                            <span className="gl-tab-icon">🔑</span> লগইন
                        </button>
                        {isSignupEnabled && (
                            <button className={`gl-auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')} style={{ width: '50%' }}>
                                <span className="gl-tab-icon">✨</span> নিবন্ধন
                            </button>
                        )}
                        <div className="gl-tab-indicator" style={{
                            transform: tab === 'login' ? 'translateX(0)' : 'translateX(100%)',
                            width: isSignupEnabled ? '50%' : '100%'
                        }}></div>
                    </div>

                    {error && <div className="gl-auth-alert gl-alert-error">⚠️ {error}</div>}
                    {msg && <div className="gl-auth-alert gl-alert-success">✅ {msg}</div>}

                    {tab === 'login' ? (
                        <form onSubmit={handleLogin} className="gl-auth-form">
                            <div className="gl-form-group">
                                <label className="gl-form-label">📧 ইমেইল</label>
                                <input className="gl-form-input" type="email" name="email" placeholder="আপনার ইমেইল" value={form.email} onChange={handleChange} required />
                            </div>
                            <div className="gl-form-group">
                                <label className="gl-form-label">🔒 পাসওয়ার্ড</label>
                                <input className="gl-form-input" type="password" name="password" placeholder="পাসওয়ার্ড" value={form.password} onChange={handleChange} required />
                            </div>
                            <button className="gl-auth-submit" type="submit" disabled={loading}>
                                {loading ? <><span className="gl-spinner"></span> অপেক্ষা করুন...</> : <>🚀 লগইন করুন</>}
                                <div className="gl-btn-shine"></div>
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSignup} className="gl-auth-form">
                            <div className="gl-form-group">
                                <label className="gl-form-label">👤 আপনার নাম</label>
                                <input className="gl-form-input" type="text" name="name" placeholder="পুরো নাম লিখুন" value={form.name} onChange={handleChange} required />
                            </div>
                            <div className="gl-form-group">
                                <label className="gl-form-label">📧 ইমেইল</label>
                                <input className="gl-form-input" type="email" name="email" placeholder="আপনার ইমেইল" value={form.email} onChange={handleChange} required />
                            </div>
                            <div className="gl-form-group">
                                <label className="gl-form-label">🔒 পাসওয়ার্ড</label>
                                <input className="gl-form-input" type="password" name="password" placeholder="কমপক্ষে ৬ অক্ষর" value={form.password} onChange={handleChange} required />
                            </div>
                            <div className="gl-form-group">
                                <label className="gl-form-label">💰 মোট আয় (৳)</label>
                                <input className="gl-form-input" type="number" name="income" placeholder="মাসে কত টাকা আয় করেন?" value={form.income} onChange={handleChange} />
                            </div>
                            <button className="gl-auth-submit" type="submit" disabled={loading}>
                                {loading ? <><span className="gl-spinner"></span> নিবন্ধন হচ্ছে...</> : <>✨ একাউন্ট খুলুন</>}
                                <div className="gl-btn-shine"></div>
                            </button>
                        </form>
                    )}

                    <div className="gl-auth-footer">
                        <p>নিরাপদ • এনক্রিপ্টেড • আপনার ডেটা শুধু আপনার</p>
                        <div className="gl-auth-features">
                            <div className="gl-auth-feature" title="সঞ্চয়"><span>💎</span></div>
                            <div className="gl-auth-feature" title="লক্ষ্য"><span>🎯</span></div>
                            <div className="gl-auth-feature" title="AI"><span>🤖</span></div>
                            <div className="gl-auth-feature" title="রিপোর্ট"><span>📊</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
