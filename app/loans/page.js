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

export default function LoansPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [loans, setLoans] = useState([])
    const [fetching, setFetching] = useState(true)
    const [showModal, setShowModal] = useState(false)

    // Form state for creating loan
    const [formData, setFormData] = useState({
        type: 'given',
        person_name: '',
        amount: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: ''
    })

    // Action state for partial payment
    const [actionLoan, setActionLoan] = useState(null)
    const [payAmount, setPayAmount] = useState('')

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
            const { error } = await supabase.from('loans').insert({
                user_id: user.id,
                ...formData,
                amount: Number(formData.amount), // Ensure amount is a number
                paid_amount: 0, // Default to 0
                status: 'active' // Default status
            })
            if (error) throw error
            setShowModal(false)
            setFormData({ type: 'given', person_name: '', amount: '', issue_date: new Date().toISOString().split('T')[0], due_date: '' })
            fetchLoans()
        } catch (err) {
            alert('ভুল হয়েছে: ' + err.message)
        }
        setFetching(false)
    }

    async function handlePayment(e) {
        e.preventDefault()
        if (!payAmount || !actionLoan) return

        const newPaidAmount = Number(actionLoan.paid_amount) + Number(payAmount)
        const isCompleted = newPaidAmount >= Number(actionLoan.amount)

        try {
            const { error } = await supabase
                .from('loans')
                .update({
                    paid_amount: newPaidAmount,
                    status: isCompleted ? 'completed' : 'active'
                })
                .eq('id', actionLoan.id)

            if (error) throw error
            setActionLoan(null)
            setPayAmount('')
            fetchLoans()
        } catch (err) {
            alert('আপডেট করা সম্ভব হয়নি: ' + err.message)
        }
    }

    async function handleDelete(id) {
        if (!confirm('আপনি কি নিশ্চিত যে এই লোন এন্ট্রিটি মুছতে চান?')) return
        try {
            // Optimistic UI update
            const oldLoans = [...loans]
            setLoans(prev => prev.filter(l => l.id !== id))

            const { error } = await supabase.from('loans').delete().eq('id', id)

            if (error) {
                setLoans(oldLoans) // Rollback
                throw error
            }
            // Success - fetch just to be safe
            fetchLoans()
        } catch (err) {
            console.error('Delete error:', err)
            alert('ডিলিট করা সম্ভব হয়নি: ' + err.message)
        }
    }

    function calculateDaysLeft(dueDateStr) {
        if (!dueDateStr) return null
        const due = new Date(dueDateStr)
        const now = new Date()
        const diff = due.getTime() - now.getTime()
        const days = Math.ceil(diff / (1000 * 3600 * 24))
        return days
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

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">
                    <div className="gl-hero">
                        <div className="gl-hero-bg"></div>
                        <div className="gl-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon">🤝</span>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title">লোন ম্যানেজমেন্ট</h1>
                                    <p className="exp-hero-sub">ধার দেওয়া বা নেওয়া টাকার সহজ হিসাব</p>
                                </div>
                            </div>
                            <button className="exp-add-btn" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 6px 24px rgba(59,130,246,0.4)' }} onClick={() => setShowModal(true)}>
                                <span className="exp-add-btn-icon">+</span><span>নতুন লোন</span><div className="exp-add-btn-shine"></div>
                            </button>
                        </div>
                    </div>

                    <div className="gl-section-title" style={{ marginTop: '2rem' }}>📌 সক্রিয় লোন</div>
                    <div className="exp-grid">
                        {activeLoans.map(loan => {
                            const pct = Math.min(100, Math.round((loan.paid_amount / loan.amount) * 100)) || 0
                            const daysLeft = calculateDaysLeft(loan.due_date)
                            const isGiven = loan.type === 'given'
                            return (
                                <div key={loan.id} className="gl-glass-card">
                                    <div className="gl-glass-card-inner">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                                            <div>
                                                <h3 style={{ fontSize: 18, fontWeight: 'bold', color: '#F1F5F9' }}>{loan.person_name}</h3>
                                                <span style={{ fontSize: 12, display: 'inline-block', padding: '2px 8px', borderRadius: 12, marginTop: 4, background: isGiven ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: isGiven ? '#60A5FA' : '#FCA5A5' }}>
                                                    {isGiven ? 'আমি ধার দিয়েছি (পাবো)' : 'আমি ধার নিয়েছি (দিব)'}
                                                </span>
                                            </div>
                                            <button onClick={() => handleDelete(loan.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 18 }}>🗑️</button>
                                        </div>

                                        <div style={{ marginBottom: 15 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                                <span style={{ color: '#94A3B8', fontSize: 13 }}>পরিশোধিত: ৳{loan.paid_amount} / ৳{loan.amount}</span>
                                                <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 'bold' }}>{pct}%</span>
                                            </div>
                                            <div className="progress-bar-bg">
                                                <div className={`progress-bar-fill ${pct >= 100 ? 'safe' : 'blue'}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>

                                        {daysLeft !== null && (
                                            <div style={{ padding: '10px 15px', borderRadius: 8, background: daysLeft < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${daysLeft < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontSize: 20 }}>{daysLeft < 0 ? '⚠️' : '⏳'}</span>
                                                <div>
                                                    <p style={{ fontSize: 12, color: '#94A3B8' }}>ফেরত দেওয়ার সময়</p>
                                                    <p style={{ fontSize: 14, color: daysLeft < 0 ? '#FCA5A5' : '#FCD34D', fontWeight: 'bold' }}>
                                                        {daysLeft < 0 ? `${Math.abs(daysLeft)} দিন অতিবাহিত` : `${daysLeft} দিন বাকি`}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setActionLoan(loan)}
                                            style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9', cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            {isGiven ? 'টাকা ফেরত পেলাম' : 'টাকা ফেরত দিলাম'} 📝
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                        {activeLoans.length === 0 && (
                            <div className="exp-empty">
                                <div className="exp-empty-icon">🤝</div>
                                <h3>কোনো সক্রিয় লোন নেই</h3>
                                <p>নতুন একটি এন্ট্রি যোগ করে শুরু করুন!</p>
                            </div>
                        )}
                    </div>

                    {completedLoans.length > 0 && (
                        <>
                            <div className="gl-section-title" style={{ marginTop: '3rem' }}>✅ সম্পন্ন লোন হিস্ট্রি</div>
                            <div className="gl-glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                                {completedLoans.map((loan, idx) => (
                                    <div key={loan.id} style={{ padding: '15px 20px', borderBottom: idx !== completedLoans.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h4 style={{ color: '#F1F5F9', fontSize: 15 }}>{loan.person_name} — <span style={{ color: loan.type === 'given' ? '#60A5FA' : '#FCA5A5' }}>৳{loan.amount}</span></h4>
                                            <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>{loan.type === 'given' ? 'ধার দিয়েছিলাম' : 'ধার নিয়েছিলাম'} • সম্পন্ন হয়েছে</p>
                                        </div>
                                        <button onClick={() => handleDelete(loan.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}>🗑️</button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>

            <Modal open={showModal} onClose={() => setShowModal(false)} title="✨ নতুন লোন এন্ট্রি">
                <form onSubmit={handleAddLoan}>
                    <div className="exp-form-section">
                        <label className="exp-form-label">লোনের ধরণ</label>
                        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} required className="exp-form-input">
                            <option value="given">আমি ধার দিচ্ছি (পাবো)</option>
                            <option value="taken">আমি ধার নিচ্ছি (ফেরত দিব)</option>
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="exp-form-section">
                            <label className="exp-form-label">কার থেকে / কাকে?</label>
                            <input type="text" value={formData.person_name} onChange={e => setFormData({ ...formData, person_name: e.target.value })} required className="exp-form-input" placeholder="নাম লিখুন" />
                        </div>
                        <div className="exp-form-section">
                            <label className="exp-form-label">পরিমাণ (৳)</label>
                            <input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required className="exp-form-input" min="1" placeholder="০" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="exp-form-section">
                            <label className="exp-form-label">দেওয়ার/নেওয়ার তারিখ</label>
                            <input type="date" value={formData.issue_date} onChange={e => setFormData({ ...formData, issue_date: e.target.value })} required className="exp-form-input" />
                        </div>
                        <div className="exp-form-section">
                            <label className="exp-form-label">ফেরত দেওয়ার তারিখ (ঐচ্ছিক)</label>
                            <input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="exp-form-input" />
                        </div>
                    </div>
                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => setShowModal(false)}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 20px rgba(59,130,246,0.4)' }}>
                            সংরক্ষণ করুন <div className="exp-add-btn-shine"></div>
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal for partial payment */}
            <Modal open={!!actionLoan} onClose={() => setActionLoan(null)} title={actionLoan?.type === 'given' ? 'টাকা ফেরত পাওয়া এন্ট্রি' : 'টাকা ফেরত দেওয়া এন্ট্রি'}>
                <form onSubmit={handlePayment}>
                    <div style={{ padding: '15px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 12, marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>মোট লোন:</span>
                            <span style={{ color: '#F1F5F9', fontWeight: 600 }}>৳{actionLoan?.amount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>ইতোমধ্যে পরিশোধিত:</span>
                            <span style={{ color: '#10B981', fontWeight: 600 }}>৳{actionLoan?.paid_amount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: '#94A3B8', fontSize: 13 }}>এখন বাকি আছে:</span>
                            <span style={{ color: '#F59E0B', fontWeight: 800 }}>৳{Number(actionLoan?.amount || 0) - Number(actionLoan?.paid_amount || 0)}</span>
                        </div>
                    </div>
                    <div className="exp-form-section">
                        <label className="exp-form-label">বর্তমান প্রদান/প্রাপ্তি পরিমাণ (৳)</label>
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
                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => setActionLoan(null)}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
                            আপডেট করুন <div className="exp-add-btn-shine"></div>
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
