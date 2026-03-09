'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/context/AuthContext'
import { OPENROUTER_MODELS } from '@/context/AISettingsContext'

export default function AdminPage() {
    const { user, profile, loading } = useAuth()
    const router = useRouter()

    const [users, setUsers] = useState([])
    const [signupEnabled, setSignupEnabled] = useState(true)
    const [fetching, setFetching] = useState(true)

    // AI form state
    const [aiForm, setAiForm] = useState({
        provider: 'gemini',
        geminiKey: '',
        openrouterKey: '',
        openrouterModel: 'auto',
        enableReasoning: false,
    })
    const [aiMsg, setAiMsg] = useState('')
    const [aiTesting, setAiTesting] = useState(false)
    const [aiSaving, setAiSaving] = useState(false)
    const [showGeminiKey, setShowGeminiKey] = useState(false)
    const [showORKey, setShowORKey] = useState(false)

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
                const aiSetting = s.find(i => i.key === 'ai_settings')
                if (aiSetting && aiSetting.value) {
                    try {
                        const parsed = JSON.parse(aiSetting.value)
                        setAiForm(f => ({ ...f, ...parsed }))
                    } catch (e) { }
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

    async function handleAISave() {
        setAiSaving(true)
        try {
            await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'ai_settings', value: JSON.stringify(aiForm) })
            })
            setAiMsg('✅ AI সেটিংস সংরক্ষিত হয়েছে!')
        } catch (error) {
            setAiMsg('❌ সেটিংস সংরক্ষণ ব্যর্থ হয়েছে!')
        }
        setAiSaving(false)
        setTimeout(() => setAiMsg(''), 3000)
    }

    async function testAI() {
        setAiTesting(true)
        setAiMsg('🔄 AI টেস্ট করা হচ্ছে...')
        try {
            const body = {
                message: 'হ্যালো! তুমি কি কাজ করছ?',
                userId: user.id,
                aiProvider: aiForm.provider,
                ...(aiForm.provider === 'gemini' && aiForm.geminiKey ? { aiGeminiKey: aiForm.geminiKey } : {}),
                ...(aiForm.provider === 'openrouter' && aiForm.openrouterKey ? { aiOpenrouterKey: aiForm.openrouterKey } : {}),
                aiModel: aiForm.openrouterModel,
                aiReasoning: aiForm.enableReasoning,
                isTest: true,
            }
            const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            const data = await res.json()
            if (data.reply && !data.reply.includes('সমস্যা') && !data.reply.includes('কোটা') && !data.reply.includes('সেটাপ')) {
                setAiMsg(`✅ ${aiForm.provider === 'openrouter' ? 'OpenRouter' : 'Gemini'} সফলভাবে কাজ করছে!`)
            } else {
                setAiMsg(`⚠️ AI উত্তর: ${data.reply?.substring(0, 100)}...`)
            }
        } catch (err) {
            setAiMsg(`❌ সংযোগ ব্যর্থ: ${err.message}`)
        }
        setAiTesting(false)
    }

    function maskKey(key) {
        if (!key || key.length < 10) return key
        return key.substring(0, 6) + '••••••••' + key.substring(key.length - 4)
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

                    {/* ═══ AI Configuration ═══ */}
                    <div className="gl-glass-card mb-6" style={{ marginTop: '2rem' }}>
                        <div className="gl-glass-card-bg" style={{ borderColor: 'rgba(139,92,246,0.15)' }}></div>
                        <div className="gl-glass-card-inner">
                            <div className="gl-section-title">🤖 AI কনফিগারেশন</div>

                            {aiMsg && <div className={`gl-alert ${aiMsg.includes('✅') ? 'gl-alert-success' : aiMsg.includes('❌') ? 'gl-alert-danger' : 'gl-alert-info'}`}>{aiMsg}</div>}

                            {/* Provider Toggle */}
                            <div style={{ marginBottom: 20 }}>
                                <label className="exp-form-label">AI সার্ভিস নির্বাচন করুন</label>
                                <div className="gl-provider-toggle">
                                    <button
                                        className={`gl-provider-btn ${aiForm.provider === 'gemini' ? 'gl-provider-active' : ''}`}
                                        onClick={() => setAiForm(f => ({ ...f, provider: 'gemini' }))}
                                        style={aiForm.provider === 'gemini' ? { '--prov-color': '#F59E0B' } : {}}
                                    >
                                        <span style={{ fontSize: 24 }}>💎</span>
                                        <div>
                                            <p style={{ fontWeight: 800, fontSize: 14 }}>Google Gemini</p>
                                            <p style={{ fontSize: 11, color: '#94A3B8' }}>ফ্রি API | সীমিত কোটা</p>
                                        </div>
                                    </button>
                                    <button
                                        className={`gl-provider-btn ${aiForm.provider === 'openrouter' ? 'gl-provider-active' : ''}`}
                                        onClick={() => setAiForm(f => ({ ...f, provider: 'openrouter' }))}
                                        style={aiForm.provider === 'openrouter' ? { '--prov-color': '#3B82F6' } : {}}
                                    >
                                        <span style={{ fontSize: 24 }}>🌐</span>
                                        <div>
                                            <p style={{ fontWeight: 800, fontSize: 14 }}>OpenRouter</p>
                                            <p style={{ fontSize: 11, color: '#94A3B8' }}>ফ্রি মডেল | বেশি কোটা</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* API Key Input - Gemini */}
                            {aiForm.provider === 'gemini' && (
                                <div className="exp-form-section" style={{ marginBottom: 16 }}>
                                    <label className="exp-form-label">🔑 Gemini API Key</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            className="exp-form-input"
                                            type={showGeminiKey ? 'text' : 'password'}
                                            value={aiForm.geminiKey}
                                            onChange={e => setAiForm(f => ({ ...f, geminiKey: e.target.value }))}
                                            placeholder="AIzaSy... (খালি রাখলে .env ব্যবহার হবে)"
                                            style={{ fontFamily: 'Inter', flex: 1 }}
                                        />
                                        <button className="gl-refresh-btn" style={{ whiteSpace: 'nowrap' }} onClick={() => setShowGeminiKey(!showGeminiKey)}>
                                            {showGeminiKey ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                    <div className="gl-alert gl-alert-info" style={{ marginTop: 10, fontSize: 12 }}>
                                        💡 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: '#FCD34D', textDecoration: 'underline' }}>aistudio.google.com</a> থেকে ফ্রি API Key নিন।
                                    </div>
                                </div>
                            )}

                            {/* API Key Input - OpenRouter */}
                            {aiForm.provider === 'openrouter' && (
                                <div className="exp-form-section" style={{ marginBottom: 16 }}>
                                    <label className="exp-form-label">🔑 OpenRouter API Key</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            className="exp-form-input"
                                            type={showORKey ? 'text' : 'password'}
                                            value={aiForm.openrouterKey}
                                            onChange={e => setAiForm(f => ({ ...f, openrouterKey: e.target.value }))}
                                            placeholder="sk-or-v1-... (OpenRouter API Key)"
                                            style={{ fontFamily: 'Inter', flex: 1 }}
                                        />
                                        <button className="gl-refresh-btn" style={{ whiteSpace: 'nowrap' }} onClick={() => setShowORKey(!showORKey)}>
                                            {showORKey ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                    <div className="gl-alert gl-alert-success" style={{ marginTop: 10, fontSize: 12 }}>
                                        🚀 <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: '#FCD34D', textDecoration: 'underline' }}>openrouter.ai/keys</a> থেকে ফ্রি API Key নিন।
                                    </div>
                                </div>
                            )}

                            {/* Model Selector - OpenRouter */}
                            {aiForm.provider === 'openrouter' && (
                                <div className="exp-form-section" style={{ marginBottom: 16 }}>
                                    <label className="exp-form-label">🧠 AI মডেল নির্বাচন</label>
                                    <div className="gl-model-grid">
                                        {OPENROUTER_MODELS.map(m => (
                                            <button
                                                key={m.id}
                                                className={`gl-model-card ${aiForm.openrouterModel === m.id ? 'gl-model-active' : ''}`}
                                                onClick={() => setAiForm(f => ({ ...f, openrouterModel: m.id }))}
                                                style={{ marginBottom: 8 }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: aiForm.openrouterModel === m.id ? '#60A5FA' : '#F1F5F9' }}>{m.name}</span>
                                                    {m.free && <span className="gl-badge-glow" style={{ '--badge-color': '#10B981', fontSize: 10, padding: '2px 8px' }}>FREE</span>}
                                                </div>
                                                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{m.desc}</p>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Reasoning Toggle */}
                                    <div className="gl-reasoning-toggle" style={{ marginTop: 14 }}>
                                        <button
                                            className={`gl-provider-btn ${aiForm.enableReasoning ? 'gl-provider-active' : ''}`}
                                            onClick={() => setAiForm(f => ({ ...f, enableReasoning: !f.enableReasoning }))}
                                            style={{ width: '100%', ...(aiForm.enableReasoning ? { '--prov-color': '#A855F7' } : {}) }}
                                        >
                                            <span style={{ fontSize: 24 }}>{aiForm.enableReasoning ? '🧠' : '💤'}</span>
                                            <div style={{ flex: 1, textAlign: 'left' }}>
                                                <p style={{ fontWeight: 800, fontSize: 14 }}>Reasoning Mode {aiForm.enableReasoning ? 'ON' : 'OFF'}</p>
                                                <p style={{ fontSize: 11, color: '#94A3B8' }}>চালু করলে AI আগে চিন্তা করে তারপর উত্তর দেবে</p>
                                            </div>
                                            <div style={{ width: 44, height: 24, borderRadius: 12, background: aiForm.enableReasoning ? 'linear-gradient(135deg, #A855F7, #7C3AED)' : 'rgba(255,255,255,0.08)', transition: 'all 0.3s', position: 'relative' }}>
                                                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: aiForm.enableReasoning ? 23 : 3, transition: 'all 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}></div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Actions & Current Status */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                                <button className="exp-add-btn" style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg, #A855F7, #7C3AED)', boxShadow: '0 6px 24px rgba(139,92,246,0.4)', padding: '12px 20px', borderRadius: '12px', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }} onClick={handleAISave} disabled={aiSaving}>
                                    {aiSaving ? '⏳ সংরক্ষণ হচ্ছে...' : '💾 AI সেটিংস সংরক্ষণ'}
                                </button>
                                <button className="gl-refresh-btn" style={{ padding: '10px 20px' }} onClick={testAI} disabled={aiTesting}>
                                    {aiTesting ? '⏳ টেস্ট...' : '🧪 টেস্ট করুন'}
                                </button>
                            </div>

                            {/* Current Status */}
                            <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)' }}>
                                <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8, fontWeight: 700 }}>📊 বর্তমান অবস্থা</p>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    <span className="gl-badge-glow" style={{ '--badge-color': aiForm.provider === 'openrouter' ? '#3B82F6' : '#F59E0B' }}>
                                        {aiForm.provider === 'openrouter' ? '🌐 OpenRouter' : '💎 Gemini'}
                                    </span>
                                    {aiForm.provider === 'gemini' && (
                                        <span className="gl-badge-glow" style={{ '--badge-color': aiForm.geminiKey ? '#10B981' : '#F59E0B' }}>
                                            {aiForm.geminiKey ? `🔑 কাস্টম Key: ${maskKey(aiForm.geminiKey)}` : '🔑 .env Key ব্যবহৃত'}
                                        </span>
                                    )}
                                    {aiForm.provider === 'openrouter' && (
                                        <span className="gl-badge-glow" style={{ '--badge-color': aiForm.openrouterKey ? '#10B981' : '#EF4444' }}>
                                            {aiForm.openrouterKey ? `🔑 Key: ${maskKey(aiForm.openrouterKey)}` : '⚠️ Key দরকার'}
                                        </span>
                                    )}
                                </div>
                            </div>
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
