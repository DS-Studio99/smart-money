'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/context/AuthContext'
import { useAISettings, OPENROUTER_MODELS } from '@/context/AISettingsContext'
import { supabase } from '@/lib/supabase'
import BengaliNumberInput from '@/components/BengaliNumberInput'

export default function SettingsPage() {
    const { user, profile, fetchProfile } = useAuth()
    const { settings: aiSettings, updateSettings: updateAISettings } = useAISettings()
    const [form, setForm] = useState({ name: profile?.name || '', monthly_income: profile?.monthly_income || '' })
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

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
    const [showGeminiKey, setShowGeminiKey] = useState(false)
    const [showORKey, setShowORKey] = useState(false)

    useEffect(() => {
        setAiForm({
            provider: aiSettings.provider || 'gemini',
            geminiKey: aiSettings.geminiKey || '',
            openrouterKey: aiSettings.openrouterKey || '',
            openrouterModel: aiSettings.openrouterModel || 'auto',
            enableReasoning: aiSettings.enableReasoning || false,
        })
    }, [aiSettings])

    async function handleSave(e) {
        e.preventDefault()
        setSaving(true)
        const { error } = await supabase.from('profiles').upsert({
            id: user.id, name: form.name, monthly_income: parseFloat(form.monthly_income) || 0
        })
        setSaving(false)
        if (!error) { setMsg('✅ প্রোফাইল সংরক্ষিত হয়েছে!'); fetchProfile(user.id) }
        else setMsg('❌ সমস্যা হয়েছে, আবার চেষ্টা করুন।')
        setTimeout(() => setMsg(''), 3000)
    }

    function handleAISave() {
        updateAISettings(aiForm)
        setAiMsg('✅ AI সেটিংস সংরক্ষিত হয়েছে!')
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

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner" style={{ maxWidth: 700 }}>
                    {/* Hero */}
                    <div className="gl-hero">
                        <div className="gl-hero-bg" style={{ background: 'linear-gradient(135deg, rgba(107,114,128,0.15), rgba(59,130,246,0.10), rgba(168,85,247,0.08))' }}></div>
                        <div className="gl-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon" style={{ filter: 'drop-shadow(0 0 12px rgba(107,114,128,0.5))' }}>⚙️</span>
                                    <div className="exp-hero-icon-ring" style={{ borderColor: 'rgba(107,114,128,0.3)' }}></div>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title" style={{ background: 'linear-gradient(135deg, #F1F5F9, #60A5FA, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>সেটিংস</h1>
                                    <p className="exp-hero-sub">প্রোফাইল, AI কনফিগারেশন ও অ্যাকাউন্ট তথ্য</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══ AI Configuration ═══ */}
                    <div className="gl-glass-card mb-6">
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
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>ফ্রি API | সীমিত কোটা</p>
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
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>ফ্রি মডেল | বেশি কোটা</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* API Key Input - Gemini */}
                            {aiForm.provider === 'gemini' && (
                                <div className="exp-form-section">
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
                                        💡 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: '#FCD34D', textDecoration: 'underline' }}>aistudio.google.com</a> থেকে ফ্রি API Key নিন। খালি রাখলে .env.local ফাইলের key ব্যবহার হবে।
                                    </div>
                                </div>
                            )}

                            {/* API Key Input - OpenRouter */}
                            {aiForm.provider === 'openrouter' && (
                                <div className="exp-form-section">
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
                                        🚀 <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: '#FCD34D', textDecoration: 'underline' }}>openrouter.ai/keys</a> থেকে ফ্রি API Key নিন। অনেক বেশি কোটা ও মডেল অপশন পাবেন!
                                    </div>
                                </div>
                            )}

                            {/* Model Selector - OpenRouter */}
                            {aiForm.provider === 'openrouter' && (
                                <div className="exp-form-section">
                                    <label className="exp-form-label">🧠 AI মডেল নির্বাচন</label>
                                    <div className="gl-model-grid">
                                        {OPENROUTER_MODELS.map(m => (
                                            <button
                                                key={m.id}
                                                className={`gl-model-card ${aiForm.openrouterModel === m.id ? 'gl-model-active' : ''}`}
                                                onClick={() => setAiForm(f => ({ ...f, openrouterModel: m.id }))}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: aiForm.openrouterModel === m.id ? '#60A5FA' : 'var(--text-primary)' }}>{m.name}</span>
                                                    {m.free && <span className="gl-badge-glow" style={{ '--badge-color': '#10B981', fontSize: 10, padding: '2px 8px' }}>FREE</span>}
                                                </div>
                                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{m.desc}</p>
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
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontWeight: 800, fontSize: 14 }}>Reasoning Mode {aiForm.enableReasoning ? 'ON' : 'OFF'}</p>
                                                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>চালু করলে AI আগে চিন্তা করে তারপর উত্তর দেবে (Trinity মডেলে সবচেয়ে ভালো কাজ করে)</p>
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
                                <button className="exp-add-btn" style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg, #A855F7, #7C3AED)', boxShadow: '0 6px 24px rgba(139,92,246,0.4)' }} onClick={handleAISave}>
                                    💾 AI সেটিংস সংরক্ষণ <div className="exp-add-btn-shine"></div>
                                </button>
                                <button className="gl-refresh-btn" style={{ padding: '10px 20px' }} onClick={testAI} disabled={aiTesting}>
                                    {aiTesting ? '⏳ টেস্ট...' : '🧪 টেস্ট করুন'}
                                </button>
                            </div>

                            {/* Current Status */}
                            <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)' }}>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>📊 বর্তমান অবস্থা</p>
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

                    {/* Profile Card */}
                    <div className="gl-glass-card mb-6">
                        <div className="gl-glass-card-bg"></div>
                        <div className="gl-glass-card-inner">
                            <div className="gl-section-title">👤 প্রোফাইল তথ্য</div>
                            {msg && <div className={`gl-alert ${msg.includes('✅') ? 'gl-alert-success' : 'gl-alert-danger'}`}>{msg}</div>}
                            <form onSubmit={handleSave}>
                                <div className="exp-form-section">
                                    <label className="exp-form-label">👤 আপনার নাম</label>
                                    <input className="exp-form-input" type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="পুরো নাম লিখুন" />
                                </div>
                                <div className="exp-form-section">
                                    <label className="exp-form-label">💰 মোট আয় (৳)</label>
                                    <BengaliNumberInput value={String(form.monthly_income)} onChange={val => setForm(f => ({ ...f, monthly_income: val }))} placeholder="প্রতি মাসে মোট আয়" className="exp-form-input" />
                                </div>
                                <button type="submit" className="exp-add-btn" disabled={saving}>
                                    {saving ? '⏳ সংরক্ষণ হচ্ছে...' : '💾 সংরক্ষণ করুন'}
                                    <div className="exp-add-btn-shine"></div>
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="gl-glass-card">
                        <div className="gl-glass-card-bg"></div>
                        <div className="gl-glass-card-inner">
                            <div className="gl-section-title">📧 অ্যাকাউন্ট তথ্য</div>
                            <div className="gl-list-item">
                                <div className="gl-list-left">
                                    <div className="gl-list-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>📧</div>
                                    <div><p className="gl-list-sub">ইমেইল</p><p className="gl-list-name">{user?.email}</p></div>
                                </div>
                            </div>
                            <div className="gl-list-item">
                                <div className="gl-list-left">
                                    <div className="gl-list-icon" style={{ background: 'rgba(168,85,247,0.15)' }}>📅</div>
                                    <div><p className="gl-list-sub">একাউন্ট তৈরির তারিখ</p><p className="gl-list-name" style={{ fontFamily: 'Inter' }}>{user?.created_at ? new Date(user.created_at).toLocaleDateString('bn-BD') : '—'}</p></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Admin Link */}
                    {profile?.is_admin && (
                        <div className="gl-glass-card mt-6" style={{ marginTop: 24 }}>
                            <div className="gl-glass-card-bg" style={{ borderColor: 'rgba(239,68,68,0.15)' }}></div>
                            <div className="gl-glass-card-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 'bold', color: '#F1F5F9' }}>🛡️ অ্যাডমিন প্যানেল</h3>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>সিস্টেম সেটিংস এবং ব্যবহারকারী পরিচালনা করুন</p>
                                </div>
                                <button className="gl-refresh-btn" onClick={() => window.location.href = '/admin'}>
                                    প্যানেলে যান ➔
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
