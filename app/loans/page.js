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

function LoanCard({ loan, onDelete, onPayment, onViewHistory }) {
    const pct = Math.min(100, loan.amount > 0 ? Math.round((loan.paid_amount / loan.amount) * 100) : 0)
    const remaining = Number(loan.amount) - Number(loan.paid_amount)
    const isGiven = loan.type === 'given'
    const isCompleted = loan.status === 'completed'
    const historyCount = (loan.payment_history || []).length

    function calculateDaysLeft(dueDateStr) {
        if (!dueDateStr) return null
        const due = new Date(dueDateStr)
        const now = new Date()
        return Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24))
    }
    const daysLeft = calculateDaysLeft(loan.due_date)

    return (
        <div className="loan-card" style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isGiven ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 20,
            padding: 0,
            overflow: 'hidden',
            boxShadow: `0 8px 32px ${isGiven ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)'}`,
            transition: 'transform 0.2s, box-shadow 0.2s',
            animation: 'fadeInUp 0.4s ease'
        }}>
            {/* Card Header */}
            <div style={{
                background: isGiven
                    ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.08))'
                    : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))',
                padding: '20px 24px',
                borderBottom: `1px solid ${isGiven ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)'}`
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 50, height: 50,
                            background: isGiven ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                            borderRadius: 14,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22,
                            boxShadow: `0 4px 16px ${isGiven ? 'rgba(59,130,246,0.4)' : 'rgba(239,68,68,0.4)'}`
                        }}>
                            {isGiven ? '🤲' : '🤝'}
                        </div>
                        <div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>{loan.person_name}</h3>
                            <span style={{
                                fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                                background: isGiven ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                                color: isGiven ? '#60A5FA' : '#FCA5A5',
                                border: `1px solid ${isGiven ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)'}`
                            }}>
                                {isGiven ? '📤 ধার দিয়েছি (পাবো)' : '📥 ধার নিয়েছি (দেব)'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => onDelete(loan.id)}
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', cursor: 'pointer', borderRadius: 10, padding: '6px 10px', fontSize: 16, transition: 'all 0.2s' }}
                    >🗑️</button>
                </div>
            </div>

            {/* Card Body */}
            <div style={{ padding: '20px 24px' }}>
                {/* Amount Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ fontSize: 11, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>মোট লোন</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', fontFamily: 'Inter' }}>৳{Number(loan.amount).toLocaleString()}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(16,185,129,0.06)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.15)' }}>
                        <p style={{ fontSize: 11, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>পরিশোধিত</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#10B981', fontFamily: 'Inter' }}>৳{Number(loan.paid_amount).toLocaleString()}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(245,158,11,0.06)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.15)' }}>
                        <p style={{ fontSize: 11, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>বাকি</p>
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
                                : isGiven ? 'linear-gradient(90deg, #3B82F6, #60A5FA)' : 'linear-gradient(90deg, #EF4444, #F87171)'
                        }} />
                    </div>
                </div>

                {/* Dates Info */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                        <span>📅</span> <span>শুরু: {loan.issue_date}</span>
                    </div>
                    {loan.due_date && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                            <span>⏰</span> <span>শেষ: {loan.due_date}</span>
                        </div>
                    )}
                </div>

                {/* Due Date Warning */}
                {daysLeft !== null && !isCompleted && (
                    <div style={{
                        padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                        background: daysLeft < 0 ? 'rgba(239,68,68,0.08)' : daysLeft <= 7 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${daysLeft < 0 ? 'rgba(239,68,68,0.25)' : daysLeft <= 7 ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.06)'}`,
                        display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        <span>{daysLeft < 0 ? '⚠️' : daysLeft <= 7 ? '⏳' : '✅'}</span>
                        <span style={{ fontSize: 13, color: daysLeft < 0 ? '#FCA5A5' : daysLeft <= 7 ? '#FCD34D' : '#94A3B8', fontWeight: 600 }}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)} দিন অতিবাহিত হয়েছে!` : daysLeft === 0 ? 'আজই শেষ দিন!' : `${daysLeft} দিন বাকি আছে`}
                        </span>
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!isCompleted && (
                        <button
                            onClick={() => onPayment(loan)}
                            style={{
                                flex: 1, padding: '10px 14px',
                                background: isGiven ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'linear-gradient(135deg, #10B981, #059669)',
                                border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer',
                                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                                boxShadow: isGiven ? '0 4px 14px rgba(59,130,246,0.3)' : '0 4px 14px rgba(16,185,129,0.3)'
                            }}
                        >
                            {isGiven ? '📥 ফেরত পেলাম' : '📤 ফেরত দিলাম'}
                        </button>
                    )}
                    <button
                        onClick={() => onViewHistory(loan)}
                        style={{
                            padding: '10px 14px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 10, color: '#94A3B8', cursor: 'pointer',
                            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.2s'
                        }}
                    >
                        📜 হিস্ট্রি {historyCount > 0 && <span style={{ background: 'rgba(139,92,246,0.2)', color: '#C084FC', borderRadius: 20, padding: '1px 7px', fontSize: 11 }}>{historyCount}</span>}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function LoansPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [loans, setLoans] = useState([])
    const [fetching, setFetching] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [activeTab, setActiveTab] = useState('active') // 'active' | 'completed'

    const [formData, setFormData] = useState({
        type: 'taken',
        person_name: '',
        amount: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        note: ''
    })

    const [actionLoan, setActionLoan] = useState(null)
    const [payAmount, setPayAmount] = useState('')
    const [payNote, setPayNote] = useState('')

    const [historyLoan, setHistoryLoan] = useState(null)

    useEffect(() => {
        if (!loading && !user) router.push('/')
    }, [user, loading, router])

    useEffect(() => {
        if (user) fetchLoans()
    }, [user])

    async function fetchLoans() {
        if (!user) return
        setFetching(true)
        try {
            const { data, error } = await supabase
                .from('loans')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
            if (error) throw error
            setLoans(data || [])
        } catch (err) {
            console.error('Fetch error:', err)
        }
        setFetching(false)
    }

    async function handleAddLoan(e) {
        e.preventDefault()
        setFetching(true)
        try {
            // Try with payment_history first, fallback without it
            let insertData = {
                user_id: user.id,
                type: formData.type,
                person_name: formData.person_name,
                amount: Number(formData.amount),
                paid_amount: 0,
                issue_date: formData.issue_date,
                due_date: formData.due_date || null,
                status: 'active',
                payment_history: []
            }
            let { error } = await supabase.from('loans').insert(insertData)
            if (error && error.message?.includes('payment_history')) {
                // Column doesn't exist yet, insert without it
                delete insertData.payment_history
                const res2 = await supabase.from('loans').insert(insertData)
                if (res2.error) throw res2.error
            } else if (error) {
                throw error
            }
            setShowModal(false)
            setFormData({ type: 'taken', person_name: '', amount: '', issue_date: new Date().toISOString().split('T')[0], due_date: '', note: '' })
            fetchLoans()
        } catch (err) {
            alert('ভুল হয়েছে: ' + err.message)
        }
        setFetching(false)
    }

    async function handlePayment(e) {
        e.preventDefault()
        if (!payAmount || !actionLoan) return

        const newPaidAmount = Number(actionLoan.paid_amount) + Number(payAmount)
        const isCompleted = newPaidAmount >= Number(actionLoan.amount)

        const newEntry = {
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
            amount: Number(payAmount),
            note: payNote || '',
            running_total: newPaidAmount
        }

        const updatedHistory = [...(actionLoan.payment_history || []), newEntry]

        try {
            // Try updating with payment_history first
            let updateData = {
                paid_amount: newPaidAmount,
                status: isCompleted ? 'completed' : 'active',
                payment_history: updatedHistory
            }
            let { error } = await supabase
                .from('loans')
                .update(updateData)
                .eq('id', actionLoan.id)

            // If column doesn't exist, update without payment_history
            if (error && error.message?.includes('payment_history')) {
                const res2 = await supabase
                    .from('loans')
                    .update({ paid_amount: newPaidAmount, status: isCompleted ? 'completed' : 'active' })
                    .eq('id', actionLoan.id)
                if (res2.error) throw res2.error
                // Store history locally in state so user can still see it this session
                const updatedLoans = loans.map(l =>
                    l.id === actionLoan.id
                        ? { ...l, paid_amount: newPaidAmount, status: isCompleted ? 'completed' : 'active', payment_history: updatedHistory }
                        : l
                )
                setLoans(updatedLoans)
                setActionLoan(null)
                setPayAmount('')
                setPayNote('')
                return
            } else if (error) {
                throw error
            }
            setActionLoan(null)
            setPayAmount('')
            setPayNote('')
            fetchLoans()
        } catch (err) {
            alert('আপডেট করা সম্ভব হয়নি: ' + err.message)
        }
    }

    async function handleDelete(id) {
        if (!confirm('আপনি কি নিশ্চিত যে এই লোন এন্ট্রিটি মুছতে চান?')) return
        try {
            setLoans(prev => prev.filter(l => l.id !== id))
            const { error } = await supabase.from('loans').delete().eq('id', id)
            if (error) {
                fetchLoans()
                throw error
            }
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

    const activeLoans = loans.filter(l => l.status === 'active')
    const completedLoans = loans.filter(l => l.status === 'completed')

    const totalActive = activeLoans.reduce((s, l) => s + Number(l.amount), 0)
    const totalPaid = activeLoans.reduce((s, l) => s + Number(l.paid_amount), 0)
    const totalRemaining = totalActive - totalPaid
    const totalCompleted = completedLoans.reduce((s, l) => s + Number(l.amount), 0)
    const takenLoans = activeLoans.filter(l => l.type === 'taken')
    const givenLoans = activeLoans.filter(l => l.type === 'given')

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">
                    {/* ─── HERO ─── */}
                    <div className="gl-hero">
                        <div className="gl-hero-bg" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.10))' }}></div>
                        <div className="gl-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon">🤝</span>
                                    <div className="exp-hero-icon-ring" style={{ borderColor: 'rgba(59,130,246,0.3)' }}></div>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title" style={{ background: 'linear-gradient(135deg, #F1F5F9, #60A5FA, #C084FC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>লোন ম্যানেজমেন্ট</h1>
                                    <p className="exp-hero-sub">ধার দেওয়া বা নেওয়া টাকার সহজ হিসাব</p>
                                </div>
                            </div>
                            <button className="exp-add-btn" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 6px 24px rgba(59,130,246,0.4)' }} onClick={() => setShowModal(true)}>
                                <span className="exp-add-btn-icon">+</span><span>নতুন লোন</span><div className="exp-add-btn-shine"></div>
                            </button>
                        </div>
                    </div>

                    {/* ─── SUMMARY STATS ─── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
                        {[
                            { icon: '📋', label: 'সক্রিয় লোন', value: activeLoans.length + 'টি', color: '#60A5FA' },
                            { icon: '💸', label: 'মোট ধার নিয়েছি', value: '৳' + takenLoans.reduce((s, l) => s + Number(l.amount), 0).toLocaleString(), color: '#FCA5A5' },
                            { icon: '💰', label: 'মোট ধার দিয়েছি', value: '৳' + givenLoans.reduce((s, l) => s + Number(l.amount), 0).toLocaleString(), color: '#6EE7B7' },
                            { icon: '⏳', label: 'বাকি আছে', value: '৳' + totalRemaining.toLocaleString(), color: '#FCD34D' },
                            { icon: '✅', label: 'সম্পন্ন লোন', value: completedLoans.length + 'টি', color: '#C084FC' },
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
                                background: activeTab === 'active' ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'transparent',
                                color: activeTab === 'active' ? '#fff' : '#64748B',
                                fontSize: 14, fontWeight: 700, transition: 'all 0.3s',
                                boxShadow: activeTab === 'active' ? '0 4px 16px rgba(59,130,246,0.3)' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}
                        >
                            📌 সক্রিয় লোন
                            <span style={{
                                background: activeTab === 'active' ? 'rgba(255,255,255,0.25)' : 'rgba(59,130,246,0.15)',
                                color: activeTab === 'active' ? '#fff' : '#60A5FA',
                                borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 800
                            }}>{activeLoans.length}</span>
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
                            ✅ সম্পন্ন লোন
                            <span style={{
                                background: activeTab === 'completed' ? 'rgba(255,255,255,0.25)' : 'rgba(16,185,129,0.15)',
                                color: activeTab === 'completed' ? '#fff' : '#10B981',
                                borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 800
                            }}>{completedLoans.length}</span>
                        </button>
                    </div>

                    {/* ─── ACTIVE LOANS ─── */}
                    {activeTab === 'active' && (
                        <>
                            {activeLoans.length === 0 ? (
                                <div className="exp-empty">
                                    <div className="exp-empty-icon">🤝</div>
                                    <h3>কোনো সক্রিয় লোন নেই</h3>
                                    <p>নতুন একটি লোন এন্ট্রি যোগ করুন।</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                                    {activeLoans.map(loan => (
                                        <LoanCard
                                            key={loan.id}
                                            loan={loan}
                                            onDelete={handleDelete}
                                            onPayment={setActionLoan}
                                            onViewHistory={setHistoryLoan}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ─── COMPLETED LOANS ─── */}
                    {activeTab === 'completed' && (
                        <>
                            {completedLoans.length === 0 ? (
                                <div className="exp-empty">
                                    <div className="exp-empty-icon">✅</div>
                                    <h3>কোনো সম্পন্ন লোন নেই</h3>
                                    <p>সম্পূর্ণ পরিশোধ হলে লোন এখানে দেখাবে।</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                                    {completedLoans.map(loan => (
                                        <LoanCard
                                            key={loan.id}
                                            loan={loan}
                                            onDelete={handleDelete}
                                            onPayment={setActionLoan}
                                            onViewHistory={setHistoryLoan}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* ─── ADD LOAN MODAL ─── */}
            <Modal open={showModal} onClose={() => setShowModal(false)} title="✨ নতুন লোন এন্ট্রি">
                <form onSubmit={handleAddLoan}>
                    <div className="exp-form-section">
                        <label className="exp-form-label">লোনের ধরণ</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                type="button"
                                onClick={() => setFormData(f => ({ ...f, type: 'taken' }))}
                                style={{
                                    flex: 1, padding: '12px', border: 'none', borderRadius: 12, cursor: 'pointer',
                                    background: formData.type === 'taken' ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'rgba(255,255,255,0.04)',
                                    border: formData.type === 'taken' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                    color: formData.type === 'taken' ? '#fff' : '#94A3B8',
                                    fontWeight: 600, fontSize: 13, transition: 'all 0.2s'
                                }}
                            >📥 আমি ধার নিচ্ছি (ফেরত দেব)</button>
                            <button
                                type="button"
                                onClick={() => setFormData(f => ({ ...f, type: 'given' }))}
                                style={{
                                    flex: 1, padding: '12px', border: 'none', borderRadius: 12, cursor: 'pointer',
                                    background: formData.type === 'given' ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'rgba(255,255,255,0.04)',
                                    border: formData.type === 'given' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                    color: formData.type === 'given' ? '#fff' : '#94A3B8',
                                    fontWeight: 600, fontSize: 13, transition: 'all 0.2s'
                                }}
                            >📤 আমি ধার দিচ্ছি (ফেরত পাবো)</button>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="exp-form-section">
                            <label className="exp-form-label">{formData.type === 'taken' ? 'কার থেকে নিলাম?' : 'কাকে দিলাম?'}</label>
                            <input type="text" value={formData.person_name} onChange={e => setFormData({ ...formData, person_name: e.target.value })} required className="exp-form-input" placeholder="নাম লিখুন" />
                        </div>
                        <div className="exp-form-section">
                            <label className="exp-form-label">পরিমাণ (৳)</label>
                            <input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required className="exp-form-input" min="1" placeholder="০" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="exp-form-section">
                            <label className="exp-form-label">তারিখ</label>
                            <input type="date" value={formData.issue_date} onChange={e => setFormData({ ...formData, issue_date: e.target.value })} required className="exp-form-input" />
                        </div>
                        <div className="exp-form-section">
                            <label className="exp-form-label">ফেরতের তারিখ (ঐচ্ছিক)</label>
                            <input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="exp-form-input" />
                        </div>
                    </div>
                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => setShowModal(false)}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 20px rgba(59,130,246,0.4)' }}>
                            ✅ সংরক্ষণ করুন <div className="exp-add-btn-shine"></div>
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ─── PAYMENT MODAL ─── */}
            <Modal open={!!actionLoan} onClose={() => { setActionLoan(null); setPayAmount(''); setPayNote('') }} title={actionLoan?.type === 'given' ? '📥 টাকা ফেরত পাওয়া' : '📤 টাকা ফেরত দেওয়া'}>
                <form onSubmit={handlePayment}>
                    <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>ব্যক্তি:</span>
                            <span style={{ color: '#F1F5F9', fontWeight: 700 }}>{actionLoan?.person_name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>মোট লোন:</span>
                            <span style={{ color: '#F1F5F9', fontWeight: 700, fontFamily: 'Inter' }}>৳{actionLoan?.amount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>ইতিমধ্যে পরিশোধিত:</span>
                            <span style={{ color: '#10B981', fontWeight: 700, fontFamily: 'Inter' }}>৳{actionLoan?.paid_amount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>এখনো বাকি:</span>
                            <span style={{ color: '#F59E0B', fontWeight: 800, fontFamily: 'Inter', fontSize: 16 }}>৳{Number(actionLoan?.amount || 0) - Number(actionLoan?.paid_amount || 0)}</span>
                        </div>
                    </div>
                    <div className="exp-form-section">
                        <label className="exp-form-label">পরিমাণ (৳)</label>
                        <input
                            type="number"
                            value={payAmount}
                            onChange={e => setPayAmount(e.target.value)}
                            required
                            className="exp-form-input"
                            min="1"
                            max={Number(actionLoan?.amount || 0) - Number(actionLoan?.paid_amount || 0)}
                            placeholder="০"
                            autoFocus
                        />
                    </div>
                    <div className="exp-form-section">
                        <label className="exp-form-label">📝 নোট (ঐচ্ছিক)</label>
                        <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)} className="exp-form-input" placeholder="কিভাবে পরিশোধ হলো?" />
                    </div>
                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => { setActionLoan(null); setPayAmount(''); setPayNote('') }}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
                            ✅ আপডেট করুন <div className="exp-add-btn-shine"></div>
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ─── PAYMENT HISTORY MODAL ─── */}
            <Modal open={!!historyLoan} onClose={() => setHistoryLoan(null)} title={`📜 পেমেন্ট হিস্ট্রি — ${historyLoan?.person_name || ''}`}>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ color: '#94A3B8', fontSize: 13 }}>মোট লোন:</span>
                        <span style={{ color: '#F1F5F9', fontWeight: 700, fontFamily: 'Inter' }}>৳{historyLoan?.amount?.toLocaleString()}</span>
                    </div>
                    {(!historyLoan?.payment_history || historyLoan.payment_history.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748B' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                            <p>এখনো কোনো পেমেন্ট রেকর্ড নেই।</p>
                        </div>
                    ) : (
                        <div style={{ maxHeight: 350, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[...historyLoan.payment_history].reverse().map((h, i) => (
                                <div key={i} style={{
                                    padding: '14px 18px',
                                    background: 'rgba(16,185,129,0.04)',
                                    border: '1px solid rgba(16,185,129,0.12)',
                                    borderRadius: 12,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontSize: 18 }}>💳</span>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: '#10B981', fontFamily: 'Inter' }}>৳{Number(h.amount).toLocaleString()}</span>
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
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94A3B8', fontSize: 13 }}>মোট পরিশোধ করা হয়েছে:</span>
                        <span style={{ color: '#10B981', fontWeight: 800, fontSize: 15, fontFamily: 'Inter' }}>৳{Number(historyLoan?.paid_amount || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ color: '#94A3B8', fontSize: 13 }}>এখনো বাকি:</span>
                        <span style={{ color: '#F59E0B', fontWeight: 800, fontSize: 15, fontFamily: 'Inter' }}>৳{(Number(historyLoan?.amount || 0) - Number(historyLoan?.paid_amount || 0)).toLocaleString()}</span>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
