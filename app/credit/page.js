'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

function Modal({ open, onClose, title, children }) {
    if (!open) return null
    return (
        <div className="exp-modal-overlay" onClick={onClose}>
            <div className="exp-modal" onClick={e => e.stopPropagation()}>
                <div className="exp-modal-header"><h2>{title}</h2><button className="exp-modal-close" onClick={onClose}>✕</button></div>
                {children}
            </div>
        </div>
    )
}

function CreditCard({ credit, onDelete, onPayment, onViewHistory }) {
    const pct = Math.min(100, credit.total_amount > 0 ? Math.round((credit.paid_amount / credit.total_amount) * 100) : 0)
    const remaining = Number(credit.total_amount) - Number(credit.paid_amount)
    const isCompleted = credit.status === 'completed'
    const historyCount = (credit.payment_history || []).length

    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isCompleted ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
            borderRadius: 20,
            padding: 0,
            overflow: 'hidden',
            boxShadow: `0 8px 32px ${isCompleted ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)'}`,
            transition: 'transform 0.2s, box-shadow 0.2s',
            animation: 'fadeInUp 0.4s ease'
        }}>
            {/* Card Header */}
            <div style={{
                background: isCompleted
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))'
                    : 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.08))',
                padding: '20px 24px',
                borderBottom: `1px solid ${isCompleted ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}`
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 50, height: 50,
                            background: isCompleted ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                            borderRadius: 14,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22,
                            boxShadow: `0 4px 16px ${isCompleted ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`
                        }}>
                            🏪
                        </div>
                        <div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>{credit.shop_name}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{
                                    fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                                    background: 'rgba(245,158,11,0.12)',
                                    color: '#FCD34D',
                                    border: '1px solid rgba(245,158,11,0.25)'
                                }}>
                                    🛍️ {credit.item_description}
                                </span>
                                {isCompleted && (
                                    <span style={{
                                        fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                                        background: 'rgba(16,185,129,0.12)',
                                        color: '#6EE7B7',
                                        border: '1px solid rgba(16,185,129,0.25)'
                                    }}>✅ পরিশোধ সম্পন্ন</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => onDelete(credit.id)}
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', cursor: 'pointer', borderRadius: 10, padding: '6px 10px', fontSize: 16, transition: 'all 0.2s' }}
                    >🗑️</button>
                </div>
            </div>

            {/* Card Body */}
            <div style={{ padding: '20px 24px' }}>
                {/* Amount Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ fontSize: 11, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>মোট বাকি</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', fontFamily: 'Inter' }}>৳{Number(credit.total_amount).toLocaleString()}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(16,185,129,0.06)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.15)' }}>
                        <p style={{ fontSize: 11, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>পরিশোধিত</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#10B981', fontFamily: 'Inter' }}>৳{Number(credit.paid_amount).toLocaleString()}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(245,158,11,0.06)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.15)' }}>
                        <p style={{ fontSize: 11, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>বাকি আছে</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#F59E0B', fontFamily: 'Inter' }}>৳{remaining.toLocaleString()}</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: '#64748B' }}>পরিশোধের অগ্রগতি</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 100 ? '#10B981' : '#F1F5F9', fontFamily: 'Inter' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', width: `${pct}%`, borderRadius: 6, transition: 'width 0.8s ease',
                            background: pct >= 100
                                ? 'linear-gradient(90deg, #10B981, #059669)'
                                : 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                        }} />
                    </div>
                </div>

                {/* Date Info */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                        <span>📅</span><span>কেনার তারিখ: {credit.purchase_date}</span>
                    </div>
                    {credit.due_date && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                            <span>⏰</span><span>পরিশোধের তারিখ: {credit.due_date}</span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!isCompleted && (
                        <button
                            onClick={() => onPayment(credit)}
                            style={{
                                flex: 1, padding: '10px 14px',
                                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer',
                                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                                boxShadow: '0 4px 14px rgba(245,158,11,0.35)'
                            }}
                        >
                            💵 বাকি পরিশোধ করুন
                        </button>
                    )}
                    <button
                        onClick={() => onViewHistory(credit)}
                        style={{
                            padding: '10px 14px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 10, color: '#94A3B8', cursor: 'pointer',
                            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.2s'
                        }}
                    >
                        📜 হিস্ট্রি {historyCount > 0 && <span style={{ background: 'rgba(245,158,11,0.2)', color: '#FCD34D', borderRadius: 20, padding: '1px 7px', fontSize: 11 }}>{historyCount}</span>}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function CreditPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [credits, setCredits] = useState([])
    const [fetching, setFetching] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [activeTab, setActiveTab] = useState('active')

    const [formData, setFormData] = useState({
        shop_name: '',
        item_description: '',
        total_amount: '',
        purchase_date: new Date().toISOString().split('T')[0],
        due_date: '',
        note: ''
    })

    const [actionCredit, setActionCredit] = useState(null)
    const [payAmount, setPayAmount] = useState('')
    const [payNote, setPayNote] = useState('')
    const [historyCredit, setHistoryCredit] = useState(null)

    useEffect(() => {
        if (!loading && !user) router.push('/')
    }, [user, loading, router])

    useEffect(() => {
        if (user) fetchCredits()
    }, [user])

    async function fetchCredits() {
        if (!user) return
        setFetching(true)
        try {
            const { data, error } = await supabase
                .from('shop_credits')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
            if (error) throw error
            setCredits(data || [])
        } catch (err) {
            console.error('Fetch error:', err)
        }
        setFetching(false)
    }

    async function handleAddCredit(e) {
        e.preventDefault()
        setFetching(true)
        try {
            const insertData = {
                user_id: user.id,
                shop_name: formData.shop_name,
                item_description: formData.item_description,
                total_amount: Number(formData.total_amount),
                paid_amount: 0,
                purchase_date: formData.purchase_date,
                due_date: formData.due_date || null,
                note: formData.note || '',
                status: 'active',
                payment_history: []
            }
            const { error } = await supabase.from('shop_credits').insert(insertData)
            if (error) throw error
            setShowModal(false)
            setFormData({ shop_name: '', item_description: '', total_amount: '', purchase_date: new Date().toISOString().split('T')[0], due_date: '', note: '' })
            fetchCredits()
        } catch (err) {
            alert('ভুল হয়েছে: ' + err.message)
        }
        setFetching(false)
    }

    async function handlePayment(e) {
        e.preventDefault()
        if (!payAmount || !actionCredit) return

        const newPaidAmount = Number(actionCredit.paid_amount) + Number(payAmount)
        const isCompleted = newPaidAmount >= Number(actionCredit.total_amount)

        const newEntry = {
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
            amount: Number(payAmount),
            note: payNote || '',
            running_total: newPaidAmount
        }

        const updatedHistory = [...(actionCredit.payment_history || []), newEntry]

        try {
            const { error } = await supabase
                .from('shop_credits')
                .update({
                    paid_amount: newPaidAmount,
                    status: isCompleted ? 'completed' : 'active',
                    payment_history: updatedHistory
                })
                .eq('id', actionCredit.id)

            if (error) throw error
            setActionCredit(null)
            setPayAmount('')
            setPayNote('')
            fetchCredits()
        } catch (err) {
            alert('আপডেট করা সম্ভব হয়নি: ' + err.message)
        }
    }

    async function handleDelete(id) {
        if (!confirm('আপনি কি নিশ্চিত যে এই রেকর্ডটি মুছতে চান?')) return
        try {
            setCredits(prev => prev.filter(c => c.id !== id))
            const { error } = await supabase.from('shop_credits').delete().eq('id', id)
            if (error) { fetchCredits(); throw error }
        } catch (err) {
            alert('ডিলিট করা সম্ভব হয়নি: ' + err.message)
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

    const activeCredits = credits.filter(c => c.status === 'active')
    const completedCredits = credits.filter(c => c.status === 'completed')
    const totalDue = activeCredits.reduce((s, c) => s + Number(c.total_amount), 0)
    const totalPaid = activeCredits.reduce((s, c) => s + Number(c.paid_amount), 0)
    const totalRemaining = totalDue - totalPaid

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">
                    {/* ─── HERO ─── */}
                    <div className="gl-hero">
                        <div className="gl-hero-bg" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08))' }}></div>
                        <div className="gl-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon">🏪</span>
                                    <div className="exp-hero-icon-ring" style={{ borderColor: 'rgba(245,158,11,0.3)' }}></div>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title" style={{ background: 'linear-gradient(135deg, #F1F5F9, #FCD34D, #FBBF24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>দোকান বাকি ম্যানেজমেন্ট</h1>
                                    <p className="exp-hero-sub">দোকান থেকে বাকিতে কেনা জিনিসপত্রের হিসাব রাখুন</p>
                                </div>
                            </div>
                            <button
                                className="exp-add-btn"
                                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 6px 24px rgba(245,158,11,0.4)' }}
                                onClick={() => setShowModal(true)}
                            >
                                <span className="exp-add-btn-icon">+</span><span>নতুন বাকি</span><div className="exp-add-btn-shine"></div>
                            </button>
                        </div>
                    </div>

                    {/* ─── SUMMARY STATS ─── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
                        {[
                            { icon: '📋', label: 'সক্রিয় বাকি', value: activeCredits.length + 'টি', color: '#FCD34D' },
                            { icon: '🛒', label: 'মোট বাকি নিয়েছি', value: '৳' + totalDue.toLocaleString(), color: '#FCA5A5' },
                            { icon: '💵', label: 'পরিশোধ করেছি', value: '৳' + totalPaid.toLocaleString(), color: '#6EE7B7' },
                            { icon: '⏳', label: 'এখনো বাকি', value: '৳' + totalRemaining.toLocaleString(), color: '#FBBF24' },
                            { icon: '✅', label: 'সম্পন্ন', value: completedCredits.length + 'টি', color: '#C084FC' },
                        ].map((s, i) => (
                            <div key={i} className="exp-stat-glass">
                                <div className="exp-stat-glass-bg"></div>
                                <div className="exp-stat-content">
                                    <div className="exp-stat-icon-box" style={{ background: 'rgba(255,255,255,0.08)' }}>{s.icon}</div>
                                    <div>
                                        <p className="exp-stat-label">{s.label}</p>
                                        <p className="exp-stat-value" style={{ color: s.color, fontSize: 16 }}>{s.value}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ─── TABS ─── */}
                    <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <button
                            onClick={() => setActiveTab('active')}
                            style={{
                                flex: 1, padding: '12px 20px', border: 'none', borderRadius: 10, cursor: 'pointer',
                                background: activeTab === 'active' ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'transparent',
                                color: activeTab === 'active' ? '#fff' : '#64748B',
                                fontSize: 14, fontWeight: 700, transition: 'all 0.3s',
                                boxShadow: activeTab === 'active' ? '0 4px 16px rgba(245,158,11,0.35)' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}
                        >
                            📌 সক্রিয় বাকি
                            <span style={{
                                background: activeTab === 'active' ? 'rgba(255,255,255,0.25)' : 'rgba(245,158,11,0.15)',
                                color: activeTab === 'active' ? '#fff' : '#FCD34D',
                                borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 800
                            }}>{activeCredits.length}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            style={{
                                flex: 1, padding: '12px 20px', border: 'none', borderRadius: 10, cursor: 'pointer',
                                background: activeTab === 'completed' ? 'linear-gradient(135deg, #10B981, #059669)' : 'transparent',
                                color: activeTab === 'completed' ? '#fff' : '#64748B',
                                fontSize: 14, fontWeight: 700, transition: 'all 0.3s',
                                boxShadow: activeTab === 'completed' ? '0 4px 16px rgba(16,185,129,0.3)' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}
                        >
                            ✅ পরিশোধ সম্পন্ন
                            <span style={{
                                background: activeTab === 'completed' ? 'rgba(255,255,255,0.25)' : 'rgba(16,185,129,0.15)',
                                color: activeTab === 'completed' ? '#fff' : '#10B981',
                                borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 800
                            }}>{completedCredits.length}</span>
                        </button>
                    </div>

                    {/* ─── ACTIVE CREDITS ─── */}
                    {activeTab === 'active' && (
                        <>
                            {activeCredits.length === 0 ? (
                                <div className="exp-empty">
                                    <div className="exp-empty-icon">🛒</div>
                                    <h3>কোনো বাকি নেই</h3>
                                    <p>দোকান থেকে বাকিতে কিছু কিনলে এখানে এড করুন।</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                                    {activeCredits.map(credit => (
                                        <CreditCard
                                            key={credit.id}
                                            credit={credit}
                                            onDelete={handleDelete}
                                            onPayment={setActionCredit}
                                            onViewHistory={setHistoryCredit}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ─── COMPLETED CREDITS ─── */}
                    {activeTab === 'completed' && (
                        <>
                            {completedCredits.length === 0 ? (
                                <div className="exp-empty">
                                    <div className="exp-empty-icon">✅</div>
                                    <h3>কোনো সম্পন্ন রেকর্ড নেই</h3>
                                    <p>সম্পূর্ণ পরিশোধ হলে বাকি এখানে দেখাবে।</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                                    {completedCredits.map(credit => (
                                        <CreditCard
                                            key={credit.id}
                                            credit={credit}
                                            onDelete={handleDelete}
                                            onPayment={setActionCredit}
                                            onViewHistory={setHistoryCredit}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* ─── ADD CREDIT MODAL ─── */}
            <Modal open={showModal} onClose={() => setShowModal(false)} title="🛍️ নতুন দোকান বাকি">
                <form onSubmit={handleAddCredit}>
                    <div className="form-row">
                        <div className="exp-form-section">
                            <label className="exp-form-label">🏪 দোকানের নাম</label>
                            <input
                                type="text"
                                value={formData.shop_name}
                                onChange={e => setFormData({ ...formData, shop_name: e.target.value })}
                                required
                                className="exp-form-input"
                                placeholder="যেমন: রহিম স্টোর"
                            />
                        </div>
                        <div className="exp-form-section">
                            <label className="exp-form-label">🛒 কী কেনা হয়েছে</label>
                            <input
                                type="text"
                                value={formData.item_description}
                                onChange={e => setFormData({ ...formData, item_description: e.target.value })}
                                required
                                className="exp-form-input"
                                placeholder="যেমন: মুদিখানা, ওষুধ"
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="exp-form-section">
                            <label className="exp-form-label">💰 মোট বাকির পরিমাণ (৳)</label>
                            <input
                                type="number"
                                value={formData.total_amount}
                                onChange={e => setFormData({ ...formData, total_amount: e.target.value })}
                                required
                                className="exp-form-input"
                                min="1"
                                placeholder="০"
                            />
                        </div>
                        <div className="exp-form-section">
                            <label className="exp-form-label">📅 কেনার তারিখ</label>
                            <input
                                type="date"
                                value={formData.purchase_date}
                                onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
                                required
                                className="exp-form-input"
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="exp-form-section">
                            <label className="exp-form-label">⏰ পরিশোধের তারিখ (ঐচ্ছিক)</label>
                            <input
                                type="date"
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                className="exp-form-input"
                            />
                        </div>
                        <div className="exp-form-section">
                            <label className="exp-form-label">📝 নোট (ঐচ্ছিক)</label>
                            <input
                                type="text"
                                value={formData.note}
                                onChange={e => setFormData({ ...formData, note: e.target.value })}
                                className="exp-form-input"
                                placeholder="বাড়তি তথ্য"
                            />
                        </div>
                    </div>
                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => setShowModal(false)}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}>
                            ✅ সংরক্ষণ করুন <div className="exp-add-btn-shine"></div>
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ─── PAYMENT MODAL ─── */}
            <Modal open={!!actionCredit} onClose={() => { setActionCredit(null); setPayAmount(''); setPayNote('') }} title="💵 বাকি পরিশোধ করুন">
                <form onSubmit={handlePayment}>
                    <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>দোকান:</span>
                            <span style={{ color: '#F1F5F9', fontWeight: 700 }}>{actionCredit?.shop_name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>পণ্য:</span>
                            <span style={{ color: '#FCD34D', fontWeight: 600 }}>{actionCredit?.item_description}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>মোট বাকি:</span>
                            <span style={{ color: '#F1F5F9', fontWeight: 700, fontFamily: 'Inter' }}>৳{actionCredit?.total_amount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>পরিশোধিত:</span>
                            <span style={{ color: '#10B981', fontWeight: 700, fontFamily: 'Inter' }}>৳{actionCredit?.paid_amount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>এখনো বাকি:</span>
                            <span style={{ color: '#F59E0B', fontWeight: 800, fontFamily: 'Inter', fontSize: 16 }}>৳{Number(actionCredit?.total_amount || 0) - Number(actionCredit?.paid_amount || 0)}</span>
                        </div>
                    </div>
                    <div className="exp-form-section">
                        <label className="exp-form-label">পরিশোধের পরিমাণ (৳)</label>
                        <input
                            type="number"
                            value={payAmount}
                            onChange={e => setPayAmount(e.target.value)}
                            required
                            className="exp-form-input"
                            min="1"
                            max={Number(actionCredit?.total_amount || 0) - Number(actionCredit?.paid_amount || 0)}
                            placeholder="০"
                            autoFocus
                        />
                    </div>
                    <div className="exp-form-section">
                        <label className="exp-form-label">📝 নোট (ঐচ্ছিক)</label>
                        <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)} className="exp-form-input" placeholder="নগদ / মোবাইল ব্যাংকিং" />
                    </div>
                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => { setActionCredit(null); setPayAmount(''); setPayNote('') }}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}>
                            ✅ পরিশোধ করুন <div className="exp-add-btn-shine"></div>
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ─── PAYMENT HISTORY MODAL ─── */}
            <Modal open={!!historyCredit} onClose={() => setHistoryCredit(null)} title={`📜 পরিশোধ ইতিহাস — ${historyCredit?.shop_name || ''}`}>
                <div>
                    {/* Credit Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>দোকান</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#FCD34D' }}>{historyCredit?.shop_name}</p>
                        </div>
                        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>পণ্য</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>{historyCredit?.item_description}</p>
                        </div>
                    </div>

                    {(!historyCredit?.payment_history || historyCredit.payment_history.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748B' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                            <p>এখনো কোনো পরিশোধ রেকর্ড নেই।</p>
                        </div>
                    ) : (
                        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[...historyCredit.payment_history].reverse().map((h, i) => (
                                <div key={i} style={{
                                    padding: '14px 18px',
                                    background: 'rgba(245,158,11,0.04)',
                                    border: '1px solid rgba(245,158,11,0.12)',
                                    borderRadius: 12,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontSize: 18 }}>💵</span>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: '#F59E0B', fontFamily: 'Inter' }}>৳{Number(h.amount).toLocaleString()}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#64748B' }}>
                                            📅 {h.date} {h.time && `⏰ ${h.time}`}
                                            {h.note && <span style={{ marginLeft: 8 }}>• 📝 {h.note}</span>}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: 11, color: '#64748B' }}>মোট পরিশোধ</p>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Inter' }}>৳{Number(h.running_total).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>মোট পরিশোধ হয়েছে:</span>
                            <span style={{ color: '#10B981', fontWeight: 800, fontSize: 15, fontFamily: 'Inter' }}>৳{Number(historyCredit?.paid_amount || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>এখনো বাকি:</span>
                            <span style={{ color: '#F59E0B', fontWeight: 800, fontSize: 15, fontFamily: 'Inter' }}>৳{(Number(historyCredit?.total_amount || 0) - Number(historyCredit?.paid_amount || 0)).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
