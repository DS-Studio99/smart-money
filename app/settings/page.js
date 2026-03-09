'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import BengaliNumberInput from '@/components/BengaliNumberInput'

export default function SettingsPage() {
    const { user, profile, fetchProfile } = useAuth()
    const [form, setForm] = useState({ name: profile?.name || '', monthly_income: profile?.monthly_income || '' })
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

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
