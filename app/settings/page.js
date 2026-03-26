'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import BengaliNumberInput from '@/components/BengaliNumberInput'

// ── PIN Lock Overlay Component ──
function PinLockScreen({ onUnlock, onReset }) {
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [showReset, setShowReset] = useState(false)
    const [resetEmail, setResetEmail] = useState('')

    const storedPin = typeof window !== 'undefined' ? localStorage.getItem('sm_pin') : null

    function handleDigit(d) {
        if (pin.length >= 4) return
        const newPin = pin + d
        setPin(newPin)
        if (newPin.length === 4) {
            setTimeout(() => {
                if (newPin === storedPin) {
                    onUnlock()
                } else {
                    setError('❌ ভুল PIN। আবার চেষ্টা করুন।')
                    setPin('')
                }
            }, 200)
        }
    }

    function handleDelete() {
        setPin(p => p.slice(0, -1))
        setError('')
    }

    async function handleReset() {
        if (!resetEmail) return
        await supabase.auth.resetPasswordForEmail(resetEmail)
        alert('✅ আপনার ইমেইলে একটি রিসেট লিংক পাঠানো হয়েছে। লিংকে ক্লিক করার পরে PIN রিসেট হবে।')
        localStorage.removeItem('sm_pin')
        localStorage.removeItem('sm_pin_enabled')
        onUnlock()
    }

    const digits = [1,2,3,4,5,6,7,8,9]

    return (
        <div className="pin-overlay">
            <div className="pin-card">
                <div className="pin-icon">🔐</div>
                <div className="pin-title">স্মার্ট মানি</div>
                <div className="pin-sub">আপনার PIN কোড দিন</div>
                <div className="pin-dots">
                    {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`}></div>)}
                </div>
                {error && <div className="pin-error">{error}</div>}
                <div className="pin-pad">
                    {digits.map(d => (
                        <button key={d} className="pin-btn" onClick={() => handleDigit(d.toString())}>{d}</button>
                    ))}
                    <button className="pin-btn" style={{ visibility: 'hidden' }}></button>
                    <button className="pin-btn zero" onClick={() => handleDigit('0')}>0</button>
                    <button className="pin-btn delete" onClick={handleDelete}>⌫</button>
                </div>
                {!showReset ? (
                    <button className="pin-reset-btn" onClick={() => setShowReset(true)}>PIN ভুলে গেছেন?</button>
                ) : (
                    <div style={{ marginTop: 16 }}>
                        <input type="email" className="exp-form-input" placeholder="আপনার ইমেইল দিন" value={resetEmail} onChange={e => setResetEmail(e.target.value)} style={{ marginBottom: 10 }} />
                        <button onClick={handleReset} className="exp-modal-save" style={{ width: '100%', background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                            🔓 PIN রিসেট করুন
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function SettingsPage() {
    const { user, profile, fetchProfile } = useAuth()
    const router = useRouter()
    const [form, setForm] = useState({ name: profile?.name || '', monthly_income: profile?.monthly_income || '' })
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    // PIN Lock States
    const [pinEnabled, setPinEnabled] = useState(false)
    const [pinLocked, setPinLocked] = useState(false)
    const [showSetPin, setShowSetPin] = useState(false)
    const [newPin, setNewPin] = useState('')
    const [confirmPin, setConfirmPin] = useState('')
    const [pinMsg, setPinMsg] = useState('')

    // Backup States
    const [backupMsg, setBackupMsg] = useState('')
    const [backupLoading, setBackupLoading] = useState(false)
    const [autoBackup, setAutoBackup] = useState(false)
    const [lastBackup, setLastBackup] = useState(null)
    const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'security' | 'backup'

    useEffect(() => {
        if (profile) {
            setForm({ name: profile.name || '', monthly_income: profile.monthly_income || '' })
        }
    }, [profile])

    useEffect(() => {
        const enabled = localStorage.getItem('sm_pin_enabled') === 'true'
        const hasPin = !!localStorage.getItem('sm_pin')
        setPinEnabled(enabled && hasPin)
        if (enabled && hasPin) setPinLocked(true)

        const ab = localStorage.getItem('sm_auto_backup') === 'true'
        setAutoBackup(ab)
        const lb = localStorage.getItem('sm_last_backup')
        if (lb) setLastBackup(lb)
    }, [])

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

    // PIN Functions
    function handleSetPinSave() {
        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { setPinMsg('❌ PIN অবশ্যই ৪ সংখ্যার হতে হবে।'); return }
        if (newPin !== confirmPin) { setPinMsg('❌ PIN মিলছে না।'); return }
        localStorage.setItem('sm_pin', newPin)
        localStorage.setItem('sm_pin_enabled', 'true')
        setPinEnabled(true)
        setShowSetPin(false)
        setNewPin('')
        setConfirmPin('')
        setPinMsg('✅ PIN সফলভাবে সেট করা হয়েছে!')
        setTimeout(() => setPinMsg(''), 3000)
    }

    function handleDisablePin() {
        if (!confirm('PIN লক নিষ্ক্রিয় করবেন?')) return
        localStorage.removeItem('sm_pin')
        localStorage.setItem('sm_pin_enabled', 'false')
        setPinEnabled(false)
        setPinMsg('✅ PIN লক নিষ্ক্রিয় করা হয়েছে।')
        setTimeout(() => setPinMsg(''), 3000)
    }

    // Backup Functions
    async function handleDownloadBackup() {
        if (!user) return
        setBackupLoading(true)
        try {
            const [expRes, incRes, budgetRes, goalRes, loanRes] = await Promise.all([
                fetch(`/api/expenses?userId=${user.id}`),
                fetch(`/api/income-entries?userId=${user.id}`),
                fetch(`/api/budgets?userId=${user.id}`),
                fetch(`/api/goals?userId=${user.id}`),
                fetch(`/api/loans?userId=${user.id}`)
            ])
            const [expenses, incomes, budgets, goals, loans] = await Promise.all([
                expRes.json(), incRes.json(), budgetRes.json(), goalRes.json(), loanRes.json()
            ])
            const backup = {
                exported_at: new Date().toISOString(),
                user_id: user.id,
                user_name: profile?.name || '',
                version: '1.0',
                data: {
                    expenses: Array.isArray(expenses) ? expenses : [],
                    incomes: Array.isArray(incomes) ? incomes : [],
                    budgets: Array.isArray(budgets) ? budgets : [],
                    goals: Array.isArray(goals) ? goals : [],
                    loans: Array.isArray(loans) ? loans : []
                }
            }
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `smart-money-backup-${new Date().toISOString().split('T')[0]}.json`
            a.click()
            URL.revokeObjectURL(url)
            const now = new Date().toLocaleString('bn-BD')
            localStorage.setItem('sm_last_backup', now)
            setLastBackup(now)
            setBackupMsg('✅ ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে!')
        } catch (err) {
            setBackupMsg('❌ ব্যাকআপ করতে সমস্যা হয়েছে।')
        }
        setBackupLoading(false)
        setTimeout(() => setBackupMsg(''), 4000)
    }

    async function handleRestoreBackup(e) {
        const file = e.target.files[0]
        if (!file) return
        setBackupLoading(true)
        try {
            const text = await file.text()
            const backup = JSON.parse(text)
            if (!backup.data || !backup.version) { setBackupMsg('❌ অবৈধ ব্যাকআপ ফাইল।'); setBackupLoading(false); return }

            if (!confirm(`"${file.name}" থেকে ব্যাকআপ রিস্টোর করবেন? এটি বিদ্যমান ডেটা মুছবে না, শুধু নতুন এন্ট্রি যোগ হবে।`)) {
                setBackupLoading(false); return
            }

            let restored = 0
            // Restore expenses
            if (backup.data.expenses?.length > 0) {
                for (const exp of backup.data.expenses) {
                    const { id, created_at, ...rest } = exp
                    await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...rest, user_id: user.id }) })
                    restored++
                }
            }
            setBackupMsg(`✅ রিস্টোর সফল! ${restored}টি রেকর্ড যোগ হয়েছে।`)
        } catch (err) {
            setBackupMsg('❌ ফাইল পড়তে সমস্যা হয়েছে। সঠিক JSON ফাইল দিন।')
        }
        setBackupLoading(false)
        e.target.value = ''
        setTimeout(() => setBackupMsg(''), 5000)
    }

    if (pinLocked) {
        return <PinLockScreen onUnlock={() => setPinLocked(false)} onReset={() => { setPinLocked(false); setPinEnabled(false) }} />
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner" style={{ maxWidth: 760 }}>
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
                                    <p className="exp-hero-sub">প্রোফাইল, নিরাপত্তা ও ডেটা ম্যানেজমেন্ট</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="inc-tabs" style={{ marginBottom: 24 }}>
                        <button className={`inc-tab ${activeTab === 'profile' ? 'active' : ''}`} style={activeTab === 'profile' ? { color: '#60A5FA', background: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)' } : {}} onClick={() => setActiveTab('profile')}>
                            👤 প্রোফাইল
                        </button>
                        <button className={`inc-tab ${activeTab === 'security' ? 'active' : ''}`} style={activeTab === 'security' ? { color: '#FCD34D', background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' } : {}} onClick={() => setActiveTab('security')}>
                            🔐 নিরাপত্তা
                        </button>
                        <button className={`inc-tab ${activeTab === 'backup' ? 'active' : ''}`} style={activeTab === 'backup' ? { color: '#6EE7B7', background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' } : {}} onClick={() => setActiveTab('backup')}>
                            💾 ব্যাকআপ
                        </button>
                    </div>

                    {/* ── PROFILE TAB ── */}
                    {activeTab === 'profile' && (
                        <>
                            <div className="sec-section-card">
                                <div className="sec-section-title">👤 প্রোফাইল তথ্য</div>
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
                            <div className="sec-section-card">
                                <div className="sec-section-title">📧 অ্যাকাউন্ট তথ্য</div>
                                <div className="sec-toggle-row">
                                    <div>
                                        <div className="sec-toggle-label">📧 ইমেইল</div>
                                        <div className="sec-toggle-sub">{user?.email}</div>
                                    </div>
                                </div>
                                <div className="sec-toggle-row">
                                    <div>
                                        <div className="sec-toggle-label">📅 একাউন্ট তৈরির তারিখ</div>
                                        <div className="sec-toggle-sub">{user?.created_at ? new Date(user.created_at).toLocaleDateString('bn-BD') : '—'}</div>
                                    </div>
                                </div>
                            </div>
                            {profile?.is_admin && (
                                <div className="sec-section-card" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div className="sec-section-title" style={{ marginBottom: 4 }}>🛡️ অ্যাডমিন প্যানেল</div>
                                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>সিস্টেম সেটিংস ও ব্যবহারকারী পরিচালনা</p>
                                        </div>
                                        <button className="gl-refresh-btn" onClick={() => router.push('/admin')}>প্যানেলে যান ➔</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── SECURITY TAB ── */}
                    {activeTab === 'security' && (
                        <>
                            <div className="sec-section-card">
                                <div className="sec-section-title">🔐 PIN লক</div>
                                {pinMsg && <div className={`gl-alert ${pinMsg.includes('✅') ? 'gl-alert-success' : 'gl-alert-danger'}`} style={{ marginBottom: 16 }}>{pinMsg}</div>}

                                <div className="sec-toggle-row">
                                    <div>
                                        <div className="sec-toggle-label">PIN কোড লক</div>
                                        <div className="sec-toggle-sub">অ্যাপ খুলতে ৪ সংখ্যার PIN দরকার হবে</div>
                                    </div>
                                    <button className={`sec-toggle ${pinEnabled ? 'on' : ''}`} onClick={() => pinEnabled ? handleDisablePin() : setShowSetPin(true)}></button>
                                </div>

                                {!pinEnabled && !showSetPin && (
                                    <div style={{ marginTop: 16, padding: '14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                                        💡 PIN লক চালু করতে উপরের টগলে ক্লিক করুন
                                    </div>
                                )}

                                {pinEnabled && (
                                    <div style={{ marginTop: 16 }}>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                                            <span style={{ fontSize: 22 }}>✅</span>
                                            <div>
                                                <div style={{ fontSize: 14, color: '#34D399', fontWeight: 600 }}>PIN লক সক্রিয়</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>আপনার অ্যাপ সুরক্ষিত</div>
                                            </div>
                                        </div>
                                        <button className="exp-add-btn" style={{ background: 'rgba(245,158,11,0.15)', boxShadow: 'none', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.3)' }} onClick={() => setShowSetPin(true)}>
                                            🔄 PIN পরিবর্তন করুন
                                        </button>
                                    </div>
                                )}

                                {showSetPin && (
                                    <div style={{ marginTop: 20, padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
                                        <div className="exp-form-label" style={{ marginBottom: 16, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                                            🔑 নতুন PIN সেট করুন
                                        </div>
                                        <div className="exp-form-section">
                                            <label className="exp-form-label">নতুন PIN (৪ সংখ্যা)</label>
                                            <div className="pin-input-row">
                                                <input
                                                    type="password"
                                                    className="pin-input"
                                                    maxLength={4}
                                                    pattern="\d{4}"
                                                    placeholder="••••"
                                                    value={newPin}
                                                    onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                                                />
                                            </div>
                                        </div>
                                        <div className="exp-form-section">
                                            <label className="exp-form-label">PIN নিশ্চিত করুন</label>
                                            <div className="pin-input-row">
                                                <input
                                                    type="password"
                                                    className="pin-input"
                                                    maxLength={4}
                                                    pattern="\d{4}"
                                                    placeholder="••••"
                                                    value={confirmPin}
                                                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                            <button type="button" className="exp-modal-cancel" onClick={() => { setShowSetPin(false); setNewPin(''); setConfirmPin('') }}>বাতিল</button>
                                            <button type="button" className="exp-modal-save" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 20px rgba(245,158,11,0.4)', flex: 1 }} onClick={handleSetPinSave}>
                                                🔐 PIN সেট করুন
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="sec-section-card">
                                <div className="sec-section-title">🛡️ নিরাপত্তা পরামর্শ</div>
                                {[
                                    { icon: '🔑', tip: 'সহজ PIN ব্যবহার করবেন না (১২৩৪, ০০০০)' },
                                    { icon: '📵', tip: 'অন্যদের সামনে PIN দেখাবেন না' },
                                    { icon: '💾', tip: 'নিয়মিত ডেটা ব্যাকআপ রাখুন' },
                                    { icon: '🔒', tip: 'ব্যবহারের পরে লগআউট করুন' }
                                ].map((item, i) => (
                                    <div key={i} className="sec-toggle-row">
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <span style={{ fontSize: 20 }}>{item.icon}</span>
                                            <div className="sec-toggle-label">{item.tip}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── BACKUP TAB ── */}
                    {activeTab === 'backup' && (
                        <>
                            {backupMsg && <div className={`gl-alert ${backupMsg.includes('✅') ? 'gl-alert-success' : 'gl-alert-danger'}`} style={{ marginBottom: 20 }}>{backupMsg}</div>}

                            <div className="sec-section-card">
                                <div className="sec-section-title">📥 লোকাল ব্যাকআপ</div>
                                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.7 }}>
                                    আপনার সমস্ত খরচ, আয়, বাজেট, লক্ষ্য ও লোনের ডেটা JSON ফাইলে ডাউনলোড করুন।
                                </div>
                                {lastBackup && (
                                    <div style={{ fontSize: 12, color: '#34D399', marginBottom: 12 }}>
                                        🕐 সর্বশেষ ব্যাকআপ: {lastBackup}
                                    </div>
                                )}
                                <button
                                    className="exp-add-btn"
                                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.4)', width: '100%', justifyContent: 'center' }}
                                    onClick={handleDownloadBackup}
                                    disabled={backupLoading}
                                >
                                    {backupLoading ? <><span className="exp-save-spinner"></span> ডাউনলোড হচ্ছে...</> : <>📥 ব্যাকআপ ডাউনলোড করুন</>}
                                    <div className="exp-add-btn-shine"></div>
                                </button>
                            </div>

                            <div className="sec-section-card">
                                <div className="sec-section-title">📤 ডেটা রিস্টোর</div>
                                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.7 }}>
                                    পূর্বে ডাউনলোড করা JSON ব্যাকআপ ফাইল থেকে ডেটা ফিরিয়ে আনুন।
                                </div>
                                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#FCD34D', display: 'flex', gap: 8 }}>
                                    ⚠️ শুধুমাত্র Smart Money ব্যাকআপ ফাইল রিস্টোর করুন
                                </div>
                                <label className="exp-add-btn" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)', cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                                    <span>📤 ব্যাকআপ ফাইল বেছে নিন</span>
                                    <div className="exp-add-btn-shine"></div>
                                    <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleRestoreBackup} disabled={backupLoading} />
                                </label>
                            </div>

                            <div className="sec-section-card">
                                <div className="sec-section-title">🔄 অটো-ব্যাকআপ</div>
                                <div className="sec-toggle-row">
                                    <div>
                                        <div className="sec-toggle-label">অটো-ব্যাকআপ রিমাইন্ডার</div>
                                        <div className="sec-toggle-sub">প্রতি সপ্তাহে ব্যাকআপের কথা মনে করিয়ে দেবে</div>
                                    </div>
                                    <button
                                        className={`sec-toggle ${autoBackup ? 'on' : ''}`}
                                        onClick={() => {
                                            const newVal = !autoBackup
                                            setAutoBackup(newVal)
                                            localStorage.setItem('sm_auto_backup', newVal.toString())
                                        }}
                                    ></button>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.7 }}>
                                    💡 ভবিষ্যতে Google Drive ক্লাউড ব্যাকআপ সাপোর্ট আসবে
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}
