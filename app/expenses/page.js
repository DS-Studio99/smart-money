'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import BengaliNumberInput from '@/components/BengaliNumberInput'

const CATEGORIES = ['বাজার খরচ', 'বাসা ভাড়া', 'মাসিক বিল', 'যাতায়াত', 'চিকিৎসা', 'শিক্ষা', 'পারশনাল খরচ', 'মোটরসাইকেল খরচ', 'বিনোদন', 'কেনাকাটা', 'অন্যান্য']
const CAT_ICONS = { 'বাজার খরচ': '🍚', 'বাসা ভাড়া': '🏠', 'মাসিক বিল': '🧾', 'যাতায়াত': '🚌', 'চিকিৎসা': '💊', 'শিক্ষা': '📚', 'পারশনাল খরচ': '💆', 'মোটরসাইকেল খরচ': '🏍️', 'বিনোদন': '🎬', 'কেনাকাটা': '🛍️', 'অন্যান্য': '📌' }
const CAT_COLORS = {
    'বাজার খরচ': { gradient: 'linear-gradient(135deg, #FF6B35, #F7931E)', glow: 'rgba(255, 107, 53, 0.4)', bg: 'rgba(255, 107, 53, 0.12)', text: '#FF8A5C' },
    'বাসা ভাড়া': { gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)', glow: 'rgba(168, 85, 247, 0.4)', bg: 'rgba(168, 85, 247, 0.12)', text: '#C084FC' },
    'মাসিক বিল': { gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)', glow: 'rgba(20, 184, 166, 0.4)', bg: 'rgba(20, 184, 166, 0.12)', text: '#5EEAD4' },
    'যাতায়াত': { gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)', glow: 'rgba(59, 130, 246, 0.4)', bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA' },
    'চিকিৎসা': { gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', glow: 'rgba(239, 68, 68, 0.4)', bg: 'rgba(239, 68, 68, 0.12)', text: '#FCA5A5' },
    'শিক্ষা': { gradient: 'linear-gradient(135deg, #10B981, #059669)', glow: 'rgba(16, 185, 129, 0.4)', bg: 'rgba(16, 185, 129, 0.12)', text: '#6EE7B7' },
    'পারশনাল খরচ': { gradient: 'linear-gradient(135deg, #F43F5E, #E11D48)', glow: 'rgba(244, 63, 94, 0.4)', bg: 'rgba(244, 63, 94, 0.12)', text: '#FDA4AF' },
    'মোটরসাইকেল খরচ': { gradient: 'linear-gradient(135deg, #EAB308, #CA8A04)', glow: 'rgba(234, 179, 8, 0.4)', bg: 'rgba(234, 179, 8, 0.12)', text: '#FDE047' },
    'বিনোদন': { gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', glow: 'rgba(245, 158, 11, 0.4)', bg: 'rgba(245, 158, 11, 0.12)', text: '#FCD34D' },
    'কেনাকাটা': { gradient: 'linear-gradient(135deg, #EC4899, #DB2777)', glow: 'rgba(236, 72, 153, 0.4)', bg: 'rgba(236, 72, 153, 0.12)', text: '#F9A8D4' },
    'অন্যান্য': { gradient: 'linear-gradient(135deg, #6B7280, #4B5563)', glow: 'rgba(107, 114, 128, 0.4)', bg: 'rgba(107, 114, 128, 0.12)', text: '#9CA3AF' }
}

function Modal({ open, onClose, title, children }) {
    if (!open) return null
    return (
        <div className="exp-modal-overlay" onClick={onClose}>
            <div className="exp-modal" onClick={e => e.stopPropagation()}>
                <div className="exp-modal-header">
                    <h2>{title}</h2>
                    <button className="exp-modal-close" onClick={onClose}>✕</button>
                </div>
                {children}
            </div>
        </div>
    )
}

export default function ExpensesPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [expenses, setExpenses] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [filterCat, setFilterCat] = useState('')
    const [fetching, setFetching] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleteId, setDeleteId] = useState(null)
    const now = new Date()
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())
    const [form, setForm] = useState({ category: 'বাজার খরচ', amount: '', note: '', date: now.toISOString().split('T')[0] })

    const fetchExpenses = useCallback(async () => {
        if (!user) return
        setFetching(true)
        const res = await fetch(`/api/expenses?userId=${user.id}&month=${month}&year=${year}`)
        const data = await res.json()
        setExpenses(Array.isArray(data) ? data : [])
        setFetching(false)
    }, [user, month, year])

    useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])
    useEffect(() => { if (user) fetchExpenses() }, [user, fetchExpenses])

    function openAdd() { setEditItem(null); setForm({ category: 'বাজার খরচ', amount: '', note: '', date: now.toISOString().split('T')[0] }); setShowModal(true) }
    function openEdit(e) { setEditItem(e); setForm({ category: e.category, amount: e.amount, note: e.note || '', date: e.date }); setShowModal(true) }

    async function handleSave(ev) {
        ev.preventDefault()
        setSaving(true)
        const payload = { category: form.category, amount: parseFloat(form.amount), note: form.note, date: form.date, user_id: user.id }
        if (editItem) {
            await fetch(`/api/expenses/${editItem.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        } else {
            await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        }
        setSaving(false); setShowModal(false); fetchExpenses()
    }

    async function handleDelete(id) {
        if (!confirm('এই খরচটি মুছে ফেলবেন?')) return
        setDeleteId(id)
        await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
        setDeleteId(null)
        fetchExpenses()
    }

    const filtered = filterCat ? expenses.filter(e => e.category === filterCat) : expenses
    const total = filtered.reduce((s, e) => s + Number(e.amount), 0)

    // Category breakdown
    const catBreakdown = CATEGORIES.map(cat => {
        const items = expenses.filter(e => e.category === cat)
        const sum = items.reduce((s, e) => s + Number(e.amount), 0)
        return { cat, sum, count: items.length }
    }).filter(c => c.count > 0).sort((a, b) => b.sum - a.sum)

    const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']

    const topCategory = catBreakdown.length > 0 ? catBreakdown[0] : null

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">

                    {/* ═══ HERO HEADER ═══ */}
                    <div className="exp-hero">
                        <div className="exp-hero-bg"></div>
                        <div className="exp-hero-particles">
                            <div className="exp-particle exp-p1"></div>
                            <div className="exp-particle exp-p2"></div>
                            <div className="exp-particle exp-p3"></div>
                            <div className="exp-particle exp-p4"></div>
                            <div className="exp-particle exp-p5"></div>
                        </div>
                        <div className="exp-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon">💸</span>
                                    <div className="exp-hero-icon-ring"></div>
                                </div>
                                <div>
                                    <h1 className="exp-hero-title">খরচ ট্র্যাকার</h1>
                                    <p className="exp-hero-sub">আপনার সকল খরচের বিবরণ একনজরে দেখুন</p>
                                </div>
                            </div>
                            <button className="exp-add-btn" onClick={openAdd}>
                                <span className="exp-add-btn-icon">+</span>
                                <span>নতুন খরচ</span>
                                <div className="exp-add-btn-shine"></div>
                            </button>
                        </div>
                    </div>

                    {/* ═══ STAT CARDS ═══ */}
                    <div className="exp-stats-row">
                        <div className="exp-stat-glass exp-stat-total">
                            <div className="exp-stat-glass-bg"></div>
                            <div className="exp-stat-content">
                                <div className="exp-stat-icon-box" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>🔥</div>
                                <div>
                                    <p className="exp-stat-label">মোট খরচ</p>
                                    <p className="exp-stat-value" style={{ color: '#FCA5A5' }}>৳{total.toLocaleString('bn-BD')}</p>
                                </div>
                            </div>
                        </div>
                        <div className="exp-stat-glass">
                            <div className="exp-stat-glass-bg"></div>
                            <div className="exp-stat-content">
                                <div className="exp-stat-icon-box" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>📊</div>
                                <div>
                                    <p className="exp-stat-label">মোট এন্ট্রি</p>
                                    <p className="exp-stat-value" style={{ color: '#60A5FA' }}>{filtered.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="exp-stat-glass">
                            <div className="exp-stat-glass-bg"></div>
                            <div className="exp-stat-content">
                                <div className="exp-stat-icon-box" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>⚡</div>
                                <div>
                                    <p className="exp-stat-label">গড় খরচ</p>
                                    <p className="exp-stat-value" style={{ color: '#FCD34D' }}>৳{filtered.length > 0 ? Math.round(total / filtered.length).toLocaleString('bn-BD') : '০'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="exp-stat-glass">
                            <div className="exp-stat-glass-bg"></div>
                            <div className="exp-stat-content">
                                <div className="exp-stat-icon-box" style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>🏆</div>
                                <div>
                                    <p className="exp-stat-label">সর্বোচ্চ খাত</p>
                                    <p className="exp-stat-value" style={{ color: '#C084FC', fontSize: 16 }}>{topCategory ? `${CAT_ICONS[topCategory.cat]} ${topCategory.cat}` : '—'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══ FILTER BAR ═══ */}
                    <div className="exp-filter-bar">
                        <div className="exp-filter-glass-bg"></div>
                        <div className="exp-filter-content">
                            <div className="exp-filter-group">
                                <label className="exp-filter-label">📅 মাস</label>
                                <select className="exp-filter-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                                    {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </select>
                            </div>
                            <div className="exp-filter-group">
                                <label className="exp-filter-label">📆 সাল</label>
                                <select className="exp-filter-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="exp-filter-group">
                                <label className="exp-filter-label">🏷️ ক্যাটাগরি</label>
                                <select className="exp-filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                                    <option value="">সব ক্যাটাগরি</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ═══ CATEGORY BREAKDOWN ═══ */}
                    {catBreakdown.length > 0 && (
                        <div className="exp-cat-breakdown">
                            {catBreakdown.map(({ cat, sum, count }) => {
                                const colors = CAT_COLORS[cat]
                                const pct = total > 0 ? Math.round((sum / total) * 100) : 0
                                return (
                                    <button
                                        key={cat}
                                        className={`exp-cat-chip ${filterCat === cat ? 'active' : ''}`}
                                        style={{ '--chip-gradient': colors.gradient, '--chip-glow': colors.glow, '--chip-bg': colors.bg, '--chip-text': colors.text }}
                                        onClick={() => setFilterCat(filterCat === cat ? '' : cat)}
                                    >
                                        <span className="exp-cat-chip-icon">{CAT_ICONS[cat]}</span>
                                        <span className="exp-cat-chip-name">{cat}</span>
                                        <span className="exp-cat-chip-pct">{pct}%</span>
                                        <div className="exp-cat-chip-bar">
                                            <div className="exp-cat-chip-fill" style={{ width: `${pct}%`, background: colors.gradient }}></div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* ═══ EXPENSE CARDS ═══ */}
                    {fetching ? (
                        <div className="exp-loading">
                            <div className="exp-loading-ring"></div>
                            <p>লোড হচ্ছে...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="exp-empty">
                            <div className="exp-empty-icon">💸</div>
                            <h3>কোনো খরচ নেই</h3>
                            <p>এই মাসে এখনো কোনো খরচ যোগ করা হয়নি।</p>
                            <button className="exp-add-btn" onClick={openAdd} style={{ marginTop: 16 }}>
                                <span className="exp-add-btn-icon">+</span>
                                <span>প্রথম খরচ যোগ করুন</span>
                                <div className="exp-add-btn-shine"></div>
                            </button>
                        </div>
                    ) : (
                        <div className="exp-cards-grid">
                            {filtered.map((e, idx) => {
                                const colors = CAT_COLORS[e.category] || CAT_COLORS['অন্যান্য']
                                return (
                                    <div
                                        key={e.id}
                                        className={`exp-card ${deleteId === e.id ? 'deleting' : ''}`}
                                        style={{ '--card-gradient': colors.gradient, '--card-glow': colors.glow, '--card-bg': colors.bg, '--card-text': colors.text, animationDelay: `${idx * 0.05}s` }}
                                    >
                                        <div className="exp-card-glow-border"></div>
                                        <div className="exp-card-inner">
                                            <div className="exp-card-top">
                                                <div className="exp-card-cat-icon" style={{ background: colors.gradient, boxShadow: `0 4px 20px ${colors.glow}` }}>
                                                    {CAT_ICONS[e.category] || '📌'}
                                                </div>
                                                <div className="exp-card-cat-info">
                                                    <span className="exp-card-cat-name" style={{ color: colors.text }}>{e.category}</span>
                                                    <span className="exp-card-date">{e.date}</span>
                                                </div>
                                                <div className="exp-card-amount" style={{ color: colors.text }}>
                                                    ৳{Number(e.amount).toLocaleString()}
                                                </div>
                                            </div>
                                            {e.note && (
                                                <div className="exp-card-note">
                                                    <span className="exp-card-note-dot" style={{ background: colors.gradient }}></span>
                                                    {e.note}
                                                </div>
                                            )}
                                            <div className="exp-card-actions">
                                                <button className="exp-card-action-btn exp-edit-btn" onClick={() => openEdit(e)}>
                                                    ✏️ সম্পাদনা
                                                </button>
                                                <button className="exp-card-action-btn exp-delete-btn" onClick={() => handleDelete(e.id)}>
                                                    🗑️ মুছুন
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* ═══ ADD/EDIT MODAL ═══ */}
            <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? '✏️ খরচ সম্পাদনা' : '✨ নতুন খরচ যোগ করুন'}>
                <form onSubmit={handleSave}>
                    {/* Category Picker */}
                    <div className="exp-form-section">
                        <label className="exp-form-label">ক্যাটাগরি নির্বাচন করুন</label>
                        <div className="exp-cat-picker">
                            {CATEGORIES.map(c => {
                                const colors = CAT_COLORS[c]
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        className={`exp-cat-pick-btn ${form.category === c ? 'active' : ''}`}
                                        style={{ '--pick-gradient': colors.gradient, '--pick-glow': colors.glow, '--pick-bg': colors.bg }}
                                        onClick={() => setForm(f => ({ ...f, category: c }))}
                                    >
                                        <span className="exp-cat-pick-icon">{CAT_ICONS[c]}</span>
                                        <span className="exp-cat-pick-name">{c}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="exp-form-section">
                            <label className="exp-form-label">💰 পরিমাণ (৳)</label>
                            <BengaliNumberInput
                                value={form.amount}
                                onChange={val => setForm(f => ({ ...f, amount: val }))}
                                placeholder="০"
                                required
                                min="1"
                                className="exp-form-input"
                            />
                        </div>
                        <div className="exp-form-section">
                            <label className="exp-form-label">📅 তারিখ</label>
                            <input className="exp-form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                        </div>
                    </div>
                    <div className="exp-form-section">
                        <label className="exp-form-label">📝 বিবরণ (ঐচ্ছিক)</label>
                        <input className="exp-form-input" type="text" placeholder="কিসের জন্য খরচ হলো?" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                    </div>
                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => setShowModal(false)}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" disabled={saving}>
                            {saving ? (
                                <><span className="exp-save-spinner"></span> সংরক্ষণ হচ্ছে...</>
                            ) : (
                                <>✅ সংরক্ষণ করুন</>
                            )}
                            <div className="exp-add-btn-shine"></div>
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
