'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import BengaliNumberInput from '@/components/BengaliNumberInput'

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

function MemberTag({ name, onRemove }) {
    return (
        <div className="split-member-tag">
            <span className="split-member-avatar">{name.charAt(0).toUpperCase()}</span>
            <span>{name}</span>
            {onRemove && <button type="button" className="split-member-remove" onClick={onRemove}>✕</button>}
        </div>
    )
}

export default function ExpenseSplitPage() {
    const { user, profile, loading } = useAuth()
    const router = useRouter()

    const [splits, setSplits] = useState([])
    const [fetching, setFetching] = useState(true)
    const [saving, setSaving] = useState(false)
    const [selectedSplit, setSelectedSplit] = useState(null)
    const [activeView, setActiveView] = useState('list') // 'list' | 'detail'

    // Create/Edit Group Modal
    const [showGroupModal, setShowGroupModal] = useState(false)
    const [editGroup, setEditGroup] = useState(null)
    const [groupForm, setGroupForm] = useState({ title: '', description: '', total_amount: '' })
    const [memberName, setMemberName] = useState('')
    const [memberPaid, setMemberPaid] = useState('')
    const [members, setMembers] = useState([])

    // Settlement Modal
    const [showSettleModal, setShowSettleModal] = useState(false)
    const [settleMember, setSettleMember] = useState(null)
    const [settleAmount, setSettleAmount] = useState('')

    const fetchSplits = useCallback(async () => {
        if (!user) return
        setFetching(true)
        const res = await fetch(`/api/expense-splits?userId=${user.id}`)
        const data = await res.json()
        setSplits(Array.isArray(data) ? data : [])
        setFetching(false)
    }, [user])

    useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])
    useEffect(() => { if (user) fetchSplits() }, [user, fetchSplits])

    // Calculate split details
    function calcSplitDetails(split) {
        const total = Number(split.total_amount)
        const members = split.members || []
        const settlements = split.settlements || []
        const perPerson = members.length > 0 ? total / members.length : 0

        return members.map(m => {
            const paid = Number(m.paid || 0)
            const settledExtra = settlements.filter(s => s.from === m.name).reduce((a, s) => a + Number(s.amount), 0)
            const received = settlements.filter(s => s.to === m.name).reduce((a, s) => a + Number(s.amount), 0)
            const share = perPerson
            const balance = paid + received - settledExtra - share
            return { ...m, share: Math.round(share), balance: Math.round(balance) }
        })
    }

    function openCreateGroup() {
        setEditGroup(null)
        setGroupForm({ title: '', description: '', total_amount: '' })
        setMembers([{ name: profile?.name || 'আমি', paid: '' }])
        setShowGroupModal(true)
    }

    function openEditGroup(split) {
        setEditGroup(split)
        setGroupForm({ title: split.title, description: split.description || '', total_amount: split.total_amount })
        setMembers(split.members || [])
        setShowGroupModal(true)
    }

    function addMember() {
        if (!memberName.trim()) return
        setMembers(m => [...m, { name: memberName.trim(), paid: memberPaid || '0' }])
        setMemberName('')
        setMemberPaid('')
    }

    function removeMember(idx) {
        setMembers(m => m.filter((_, i) => i !== idx))
    }

    function updateMemberPaid(idx, val) {
        setMembers(m => m.map((mem, i) => i === idx ? { ...mem, paid: val } : mem))
    }

    async function handleSaveGroup(ev) {
        ev.preventDefault()
        if (members.length < 2) { alert('কমপক্ষে ২ জন সদস্য যোগ করুন।'); return }
        setSaving(true)
        const payload = {
            title: groupForm.title,
            description: groupForm.description,
            total_amount: groupForm.total_amount,
            members: members.map(m => ({ name: m.name, paid: parseFloat(m.paid) || 0 }))
        }
        if (editGroup) {
            const res = await fetch(`/api/expense-splits/${editGroup.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            const updated = await res.json()
            if (selectedSplit?.id === editGroup.id) setSelectedSplit(updated)
        } else {
            await fetch('/api/expense-splits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, created_by: user.id }) })
        }
        setSaving(false)
        setShowGroupModal(false)
        fetchSplits()
    }

    async function handleDeleteGroup(id) {
        if (!confirm('এই গ্রুপটি মুছে ফেলবেন?')) return
        await fetch(`/api/expense-splits/${id}`, { method: 'DELETE' })
        if (selectedSplit?.id === id) { setSelectedSplit(null); setActiveView('list') }
        fetchSplits()
    }

    function openDetail(split) {
        setSelectedSplit(split)
        setActiveView('detail')
    }

    async function handleSettle() {
        if (!settleMember || !settleAmount) return
        setSaving(true)
        const newSettlement = {
            id: Date.now().toString(),
            from: settleMember.name,
            to: settleMember.owedTo,
            amount: parseFloat(settleAmount),
            date: new Date().toISOString().split('T')[0]
        }
        const updated = { settlements: [...(selectedSplit.settlements || []), newSettlement] }
        const res = await fetch(`/api/expense-splits/${selectedSplit.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
        const data = await res.json()
        setSelectedSplit(data)
        setSaving(false)
        setShowSettleModal(false)
        setSettleAmount('')
        fetchSplits()
    }

    async function deleteSettlement(settlement) {
        const newSettlements = (selectedSplit.settlements || []).filter(s => s.id !== settlement.id)
        const res = await fetch(`/api/expense-splits/${selectedSplit.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settlements: newSettlements }) })
        const data = await res.json()
        setSelectedSplit(data)
        fetchSplits()
    }

    // Who owes whom
    function getOwingPairs(split) {
        const details = calcSplitDetails(split)
        const creditors = details.filter(m => m.balance > 0).sort((a, b) => b.balance - a.balance)
        const debtors = details.filter(m => m.balance < 0).sort((a, b) => a.balance - b.balance)
        const pairs = []
        let ci = 0, di = 0
        let cBal = creditors[0]?.balance || 0
        let dBal = Math.abs(debtors[0]?.balance || 0)
        while (ci < creditors.length && di < debtors.length) {
            const amount = Math.min(cBal, dBal)
            if (amount > 0) {
                pairs.push({ from: debtors[di].name, to: creditors[ci].name, amount: Math.round(amount) })
            }
            cBal -= amount
            dBal -= amount
            if (cBal <= 0) { ci++; cBal = creditors[ci]?.balance || 0 }
            if (dBal <= 0) { di++; dBal = Math.abs(debtors[di]?.balance || 0) }
        }
        return pairs
    }

    const totalSplits = splits.length
    const totalExpenses = splits.reduce((s, sp) => s + Number(sp.total_amount), 0)

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">

                    {/* ═══ HERO ═══ */}
                    <div className="split-hero">
                        <div className="split-hero-bg"></div>
                        <div className="split-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon">🤝</span>
                                    <div className="exp-hero-icon-ring" style={{ borderColor: 'rgba(139,92,246,0.3)' }}></div>
                                </div>
                                <div>
                                    <h1 className="exp-hero-title" style={{ background: 'linear-gradient(135deg, #F1F5F9, #A78BFA, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                        খরচ ভাগাভাগি
                                    </h1>
                                    <p className="exp-hero-sub">বন্ধুদের সাথে খরচ ভাগ করুন ও হিসাব রাখুন</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {activeView === 'detail' && (
                                    <button className="exp-add-btn" style={{ background: 'rgba(255,255,255,0.1)', boxShadow: 'none' }} onClick={() => setActiveView('list')}>
                                        <span className="exp-add-btn-icon">←</span>
                                        <span>ফিরে যান</span>
                                    </button>
                                )}
                                <button className="exp-add-btn" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', boxShadow: '0 6px 24px rgba(139,92,246,0.4)' }} onClick={openCreateGroup}>
                                    <span className="exp-add-btn-icon">+</span>
                                    <span>নতুন গ্রুপ</span>
                                    <div className="exp-add-btn-shine"></div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ═══ STATS ═══ */}
                    <div className="exp-stats-row">
                        <div className="exp-stat-glass">
                            <div className="exp-stat-glass-bg"></div>
                            <div className="exp-stat-content">
                                <div className="exp-stat-icon-box" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>🤝</div>
                                <div>
                                    <p className="exp-stat-label">মোট গ্রুপ</p>
                                    <p className="exp-stat-value" style={{ color: '#C084FC' }}>{totalSplits}টি</p>
                                </div>
                            </div>
                        </div>
                        <div className="exp-stat-glass">
                            <div className="exp-stat-glass-bg"></div>
                            <div className="exp-stat-content">
                                <div className="exp-stat-icon-box" style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}>💸</div>
                                <div>
                                    <p className="exp-stat-label">মোট খরচ</p>
                                    <p className="exp-stat-value" style={{ color: '#F9A8D4' }}>৳{totalExpenses.toLocaleString('bn-BD')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══ LIST VIEW ═══ */}
                    {activeView === 'list' && (
                        <>
                            {fetching ? (
                                <div className="exp-loading"><div className="exp-loading-ring"></div><p>লোড হচ্ছে...</p></div>
                            ) : splits.length === 0 ? (
                                <div className="exp-empty">
                                    <div className="exp-empty-icon">🤝</div>
                                    <h3>কোনো গ্রুপ নেই</h3>
                                    <p>বন্ধুদের সাথে খরচ ভাগ করতে নতুন গ্রুপ তৈরি করুন।</p>
                                    <button className="exp-add-btn" onClick={openCreateGroup} style={{ marginTop: 16, background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
                                        <span className="exp-add-btn-icon">+</span>
                                        <span>গ্রুপ তৈরি করুন</span>
                                        <div className="exp-add-btn-shine"></div>
                                    </button>
                                </div>
                            ) : (
                                <div className="split-groups-grid">
                                    {splits.map((split, idx) => {
                                        const details = calcSplitDetails(split)
                                        const settled = (split.settlements || []).length
                                        const memberCount = (split.members || []).length
                                        const perPerson = memberCount > 0 ? Math.round(Number(split.total_amount) / memberCount) : 0
                                        return (
                                            <div key={split.id} className="split-group-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                                                <div className="split-group-card-bg"></div>
                                                <div className="split-group-top">
                                                    <div className="split-group-icon">🤝</div>
                                                    <div className="split-group-actions">
                                                        <button className="inc-source-edit-btn" onClick={() => openEditGroup(split)}>✏️</button>
                                                        <button className="inc-source-del-btn" onClick={() => handleDeleteGroup(split.id)}>🗑️</button>
                                                    </div>
                                                </div>
                                                <div className="split-group-title">{split.title}</div>
                                                {split.description && <div className="split-group-desc">{split.description}</div>}
                                                <div className="split-group-stats">
                                                    <div className="split-stat-item">
                                                        <span className="split-stat-label">মোট</span>
                                                        <span className="split-stat-val">৳{Number(split.total_amount).toLocaleString('bn-BD')}</span>
                                                    </div>
                                                    <div className="split-stat-item">
                                                        <span className="split-stat-label">জনপ্রতি</span>
                                                        <span className="split-stat-val">৳{perPerson.toLocaleString('bn-BD')}</span>
                                                    </div>
                                                    <div className="split-stat-item">
                                                        <span className="split-stat-label">সদস্য</span>
                                                        <span className="split-stat-val">{memberCount}জন</span>
                                                    </div>
                                                    <div className="split-stat-item">
                                                        <span className="split-stat-label">সেটেলমেন্ট</span>
                                                        <span className="split-stat-val">{settled}টি</span>
                                                    </div>
                                                </div>
                                                <div className="split-members-preview">
                                                    {(split.members || []).slice(0, 4).map((m, i) => (
                                                        <div key={i} className="split-member-avatar-sm" title={m.name}>{m.name.charAt(0).toUpperCase()}</div>
                                                    ))}
                                                    {(split.members || []).length > 4 && <div className="split-member-avatar-sm">+{(split.members || []).length - 4}</div>}
                                                </div>
                                                <button className="split-detail-btn" onClick={() => openDetail(split)}>
                                                    বিস্তারিত দেখুন →
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* ═══ DETAIL VIEW ═══ */}
                    {activeView === 'detail' && selectedSplit && (
                        <div className="split-detail">
                            <div className="split-detail-header">
                                <div>
                                    <h2 className="split-detail-title">{selectedSplit.title}</h2>
                                    {selectedSplit.description && <p className="split-detail-desc">{selectedSplit.description}</p>}
                                    <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                                        <span className="split-info-badge">💸 মোট: ৳{Number(selectedSplit.total_amount).toLocaleString('bn-BD')}</span>
                                        <span className="split-info-badge">👥 {(selectedSplit.members || []).length}জন</span>
                                        <span className="split-info-badge">💰 জনপ্রতি: ৳{Math.round(Number(selectedSplit.total_amount) / Math.max((selectedSplit.members || []).length, 1)).toLocaleString('bn-BD')}</span>
                                    </div>
                                </div>
                                <button className="exp-add-btn" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }} onClick={() => openEditGroup(selectedSplit)}>
                                    ✏️ সম্পাদনা
                                </button>
                            </div>

                            <div className="split-two-col">
                                {/* Members Balance */}
                                <div className="split-section-card">
                                    <div className="split-section-title">👥 সদস্যদের ব্যালেন্স</div>
                                    {calcSplitDetails(selectedSplit).map((m, i) => (
                                        <div key={i} className="split-member-row">
                                            <div className="split-member-left">
                                                <div className="split-member-avatar-lg">{m.name.charAt(0)}</div>
                                                <div>
                                                    <div className="split-member-name">{m.name}</div>
                                                    <div className="split-member-sub">জমা: ৳{m.paid.toLocaleString()} | শেয়ার: ৳{m.share.toLocaleString()}</div>
                                                </div>
                                            </div>
                                            <div className={`split-balance-badge ${m.balance >= 0 ? 'pos' : 'neg'}`}>
                                                {m.balance >= 0 ? `+৳${m.balance.toLocaleString()}` : `-৳${Math.abs(m.balance).toLocaleString()}`}
                                                <div className="split-balance-label">{m.balance >= 0 ? 'পাবে' : 'দেবে'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Who Owes Whom */}
                                <div className="split-section-card">
                                    <div className="split-section-title">💳 কাকে কত দিতে হবে</div>
                                    {getOwingPairs(selectedSplit).length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 14 }}>
                                            ✅ সব হিসাব সমান! কেউ কাউকে দেবে না।
                                        </div>
                                    ) : (
                                        getOwingPairs(selectedSplit).map((pair, i) => (
                                            <div key={i} className="split-owing-row">
                                                <div className="split-owing-from">
                                                    <div className="split-member-avatar-sm">{pair.from.charAt(0)}</div>
                                                    <span>{pair.from}</span>
                                                </div>
                                                <div className="split-owing-arrow">
                                                    <span>→ ৳{pair.amount.toLocaleString('bn-BD')} →</span>
                                                </div>
                                                <div className="split-owing-to">
                                                    <span>{pair.to}</span>
                                                    <div className="split-member-avatar-sm">{pair.to.charAt(0)}</div>
                                                </div>
                                                <button className="split-settle-btn" onClick={() => {
                                                    setSettleMember({ ...pair, owedTo: pair.to })
                                                    setSettleAmount(pair.amount.toString())
                                                    setShowSettleModal(true)
                                                }}>
                                                    সেটেল আপ
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Settlements History */}
                            {(selectedSplit.settlements || []).length > 0 && (
                                <div className="split-section-card" style={{ marginTop: 16 }}>
                                    <div className="split-section-title">📋 সেটেলমেন্ট হিস্ট্রি</div>
                                    {(selectedSplit.settlements || []).map((s, i) => (
                                        <div key={i} className="split-settle-row">
                                            <div className="split-member-avatar-sm">{s.from.charAt(0)}</div>
                                            <div style={{ flex: 1 }}>
                                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.from}</span>
                                                <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>→</span>
                                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.to}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>{s.date}</span>
                                            </div>
                                            <span style={{ color: '#34D399', fontWeight: 700 }}>৳{Number(s.amount).toLocaleString('bn-BD')}</span>
                                            <button className="inc-source-del-btn" onClick={() => deleteSettlement(s)}>🗑️</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* ═══ GROUP MODAL ═══ */}
            <Modal open={showGroupModal} onClose={() => setShowGroupModal(false)} title={editGroup ? '✏️ গ্রুপ সম্পাদনা' : '🤝 নতুন খরচ গ্রুপ'}>
                <form onSubmit={handleSaveGroup}>
                    <div className="exp-form-section">
                        <label className="exp-form-label">📝 গ্রুপের নাম</label>
                        <input className="exp-form-input" type="text" placeholder="যেমন: কক্সবাজার ট্যুর, বন্ধুদের পার্টি" value={groupForm.title} onChange={e => setGroupForm(f => ({ ...f, title: e.target.value }))} required />
                    </div>
                    <div className="exp-form-section">
                        <label className="exp-form-label">📋 বিবরণ (ঐচ্ছিক)</label>
                        <input className="exp-form-input" type="text" placeholder="সংক্ষিপ্ত বিবরণ" value={groupForm.description} onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="exp-form-section">
                        <label className="exp-form-label">💰 মোট খরচ (৳)</label>
                        <BengaliNumberInput value={String(groupForm.total_amount)} onChange={val => setGroupForm(f => ({ ...f, total_amount: val }))} placeholder="০" required min="1" className="exp-form-input" />
                    </div>

                    {/* Members */}
                    <div className="exp-form-section">
                        <label className="exp-form-label">👥 সদস্যরা ({members.length}জন)</label>
                        <div className="split-members-list">
                            {members.map((m, i) => (
                                <div key={i} className="split-member-input-row">
                                    <div className="split-member-avatar-sm">{m.name.charAt(0).toUpperCase()}</div>
                                    <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: 14 }}>{m.name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>জমা: ৳</span>
                                        <input
                                            type="number"
                                            className="exp-form-input"
                                            style={{ width: 90, padding: '6px 8px' }}
                                            placeholder="০"
                                            value={m.paid}
                                            onChange={e => updateMemberPaid(i, e.target.value)}
                                        />
                                    </div>
                                    {members.length > 2 && (
                                        <button type="button" className="inc-source-del-btn" onClick={() => removeMember(i)}>✕</button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="split-add-member-row">
                            <input className="exp-form-input" type="text" placeholder="নতুন সদস্যের নাম" value={memberName} onChange={e => setMemberName(e.target.value)} style={{ flex: 1 }} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addMember())} />
                            <input className="exp-form-input" type="number" placeholder="জমা ৳" value={memberPaid} onChange={e => setMemberPaid(e.target.value)} style={{ width: 90 }} />
                            <button type="button" className="split-add-member-btn" onClick={addMember}>+ যোগ</button>
                        </div>
                    </div>

                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => setShowGroupModal(false)}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }} disabled={saving}>
                            {saving ? <><span className="exp-save-spinner"></span> সংরক্ষণ হচ্ছে...</> : <>✅ সংরক্ষণ করুন</>}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ═══ SETTLE MODAL ═══ */}
            <Modal open={showSettleModal} onClose={() => setShowSettleModal(false)} title="💳 সেটেল আপ">
                {settleMember && (
                    <div style={{ padding: '8px 0' }}>
                        <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: '16px', marginBottom: 20, textAlign: 'center' }}>
                            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                <strong style={{ color: '#C084FC' }}>{settleMember.from}</strong> → <strong style={{ color: '#34D399' }}>{settleMember.to}</strong>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#C084FC', fontFamily: 'Inter' }}>৳{settleMember.amount?.toLocaleString('bn-BD')}</div>
                        </div>
                        <div className="exp-form-section">
                            <label className="exp-form-label">💰 সেটেল করা পরিমাণ (৳)</label>
                            <BengaliNumberInput value={settleAmount} onChange={setSettleAmount} placeholder="০" className="exp-form-input" />
                        </div>
                        <div className="exp-modal-actions">
                            <button className="exp-modal-cancel" onClick={() => setShowSettleModal(false)}>বাতিল</button>
                            <button className="exp-modal-save" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }} onClick={handleSettle} disabled={saving}>
                                {saving ? '⏳...' : '✅ সেটেল করুন'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
