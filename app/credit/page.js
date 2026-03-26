'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

/* ─── Reusable Modal ─── */
function Modal({ open, onClose, title, children, width = 520 }) {
    if (!open) return null
    return (
        <div className="exp-modal-overlay" onClick={onClose}>
            <div className="exp-modal" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
                <div className="exp-modal-header">
                    <h2>{title}</h2>
                    <button className="exp-modal-close" onClick={onClose}>✕</button>
                </div>
                {children}
            </div>
        </div>
    )
}

/* ─── Shop Card ─── */
function ShopCard({ shop, transactions, onAddPurchase, onAddPayment, onDelete, onViewDetail }) {
    const purchases = transactions.filter(t => t.type === 'purchase')
    const payments = transactions.filter(t => t.type === 'payment')

    const totalCredit = purchases.reduce((s, t) => s + Number(t.credit_amount), 0)
    const totalPaid = payments.reduce((s, t) => s + Number(t.payment_amount), 0)
    const balance = totalCredit - totalPaid
    const totalBought = purchases.reduce((s, t) => s + Number(t.item_price), 0)

    const pct = totalCredit > 0 ? Math.min(100, Math.round((totalPaid / totalCredit) * 100)) : 100
    const isCleared = balance <= 0

    const lastTx = transactions[0]

    return (
        <div style={{
            background: 'rgba(15,23,42,0.65)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isCleared ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: `0 8px 32px ${isCleared ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.08)'}`,
            animation: 'fadeInUp 0.4s ease'
        }}>
            {/* Header */}
            <div style={{
                background: isCleared
                    ? 'linear-gradient(135deg,rgba(16,185,129,0.14),rgba(5,150,105,0.06))'
                    : 'linear-gradient(135deg,rgba(245,158,11,0.14),rgba(217,119,6,0.06))',
                padding: '18px 22px',
                borderBottom: `1px solid ${isCleared ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'}`
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                        <div style={{
                            width: 48, height: 48,
                            background: isCleared ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#F59E0B,#D97706)',
                            borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22,
                            boxShadow: `0 4px 14px ${isCleared ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`
                        }}>🏪</div>
                        <div>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>{shop.shop_name}</h3>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11, color: '#64748B' }}>{purchases.length}টি কেনাকাটা</span>
                                {lastTx && <span style={{ fontSize: 11, color: '#64748B' }}>• সর্বশেষ: {lastTx.transaction_date}</span>}
                                {isCleared && (
                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.25)' }}>✅ পরিষ্কার</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            onClick={() => onViewDetail(shop)}
                            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#A78BFA', cursor: 'pointer', borderRadius: 9, padding: '6px 10px', fontSize: 14, transition: 'all 0.2s' }}
                            title="বিস্তারিত দেখুন"
                        >📜</button>
                        <button
                            onClick={() => onDelete(shop.id)}
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', cursor: 'pointer', borderRadius: 9, padding: '6px 10px', fontSize: 14, transition: 'all 0.2s' }}
                        >🗑️</button>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: '18px 22px' }}>
                {/* Amounts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 11, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ fontSize: 10, color: '#64748B', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.4px' }}>মোট কেনা</p>
                        <p style={{ fontSize: 15, fontWeight: 800, color: '#F1F5F9' }}>৳{totalBought.toLocaleString()}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(16,185,129,0.06)', borderRadius: 11, border: '1px solid rgba(16,185,129,0.14)' }}>
                        <p style={{ fontSize: 10, color: '#64748B', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.4px' }}>পরিশোধ</p>
                        <p style={{ fontSize: 15, fontWeight: 800, color: '#10B981' }}>৳{totalPaid.toLocaleString()}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '10px 8px', background: isCleared ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)', borderRadius: 11, border: `1px solid ${isCleared ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)'}` }}>
                        <p style={{ fontSize: 10, color: '#64748B', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.4px' }}>বাকি</p>
                        <p style={{ fontSize: 15, fontWeight: 800, color: isCleared ? '#10B981' : '#F59E0B' }}>৳{Math.max(0, balance).toLocaleString()}</p>
                    </div>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 11, color: '#64748B' }}>পরিশোধের অগ্রগতি</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? '#10B981' : '#F59E0B' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', width: `${pct}%`, borderRadius: 5, transition: 'width 0.8s ease',
                            background: pct >= 100 ? 'linear-gradient(90deg,#10B981,#059669)' : 'linear-gradient(90deg,#F59E0B,#FCD34D)'
                        }} />
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => onAddPurchase(shop)}
                        style={{
                            flex: 1, padding: '9px 12px',
                            background: 'linear-gradient(135deg,#F59E0B,#D97706)',
                            border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer',
                            fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
                        }}
                    >🛒 কেনাকাটা যোগ</button>
                    {!isCleared && (
                        <button
                            onClick={() => onAddPayment(shop, balance)}
                            style={{
                                flex: 1, padding: '9px 12px',
                                background: 'linear-gradient(135deg,#10B981,#059669)',
                                border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer',
                                fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                            }}
                        >💵 বাকি পরিশোধ</button>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ─── Main Page ─── */
export default function CreditPage() {
    const { user, loading } = useAuth()
    const router = useRouter()

    const [shops, setShops] = useState([])
    const [transactions, setTransactions] = useState([])
    const [fetching, setFetching] = useState(true)

    // Modals
    const [showAddShop, setShowAddShop] = useState(false)
    const [showPurchase, setShowPurchase] = useState(false)  // { shop }
    const [showPayment, setShowPayment] = useState(false)    // { shop, balance }
    const [showDetail, setShowDetail] = useState(false)      // shop

    // Add Shop form
    const [shopName, setShopName] = useState('')

    // Purchase form
    const [purchaseForm, setPurchaseForm] = useState({
        item_description: '',
        item_price: '',
        cash_paid: '',
        transaction_date: new Date().toISOString().split('T')[0],
        note: ''
    })

    // Payment form
    const [paymentForm, setPaymentForm] = useState({ amount: '', transaction_date: new Date().toISOString().split('T')[0], note: '' })

    // Active shop context
    const [activeShop, setActiveShop] = useState(null)
    const [activeBalance, setActiveBalance] = useState(0)

    useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])
    useEffect(() => { if (user) fetchAll() }, [user])

    /* ─── Fetch ─── */
    async function fetchAll() {
        if (!user) return
        setFetching(true)
        try {
            const [{ data: shopData }, { data: txData }] = await Promise.all([
                supabase.from('credit_shops').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
            ])
            setShops(shopData || [])
            setTransactions(txData || [])
        } catch (err) { console.error(err) }
        setFetching(false)
    }

    /* ─── Computed per shop ─── */
    const shopTransactions = useMemo(() => {
        const map = {}
        shops.forEach(s => { map[s.id] = transactions.filter(t => t.shop_id === s.id) })
        return map
    }, [shops, transactions])

    /* ─── Stats ─── */
    const stats = useMemo(() => {
        const purchases = transactions.filter(t => t.type === 'purchase')
        const payments = transactions.filter(t => t.type === 'payment')
        const totalCredit = purchases.reduce((s, t) => s + Number(t.credit_amount), 0)
        const totalPaid = payments.reduce((s, t) => s + Number(t.payment_amount), 0)
        const balance = totalCredit - totalPaid
        const clearedShops = shops.filter(sh => {
            const p = (shopTransactions[sh.id] || []).filter(t => t.type === 'purchase').reduce((s, t) => s + Number(t.credit_amount), 0)
            const py = (shopTransactions[sh.id] || []).filter(t => t.type === 'payment').reduce((s, t) => s + Number(t.payment_amount), 0)
            return p - py <= 0
        })
        return { totalCredit, totalPaid, balance: Math.max(0, balance), shopsCount: shops.length, clearedCount: clearedShops.length }
    }, [shops, transactions, shopTransactions])

    /* ─── Add Shop ─── */
    async function handleAddShop(e) {
        e.preventDefault()
        if (!shopName.trim()) return
        try {
            const { data, error } = await supabase.from('credit_shops').insert({ user_id: user.id, shop_name: shopName.trim() }).select().single()
            if (error) throw error
            setShops(prev => [data, ...prev])
            setShopName('')
            setShowAddShop(false)
        } catch (err) { alert('ভুল হয়েছে: ' + err.message) }
    }

    /* ─── Add Purchase ─── */
    async function handleAddPurchase(e) {
        e.preventDefault()
        const price = Number(purchaseForm.item_price)
        const cash = Number(purchaseForm.cash_paid || 0)
        if (cash > price) { alert('নগদ প্রদান মোট দামের চেয়ে বেশি হতে পারে না।'); return }
        const credit = price - cash
        try {
            const { data, error } = await supabase.from('credit_transactions').insert({
                shop_id: activeShop.id,
                user_id: user.id,
                type: 'purchase',
                item_description: purchaseForm.item_description,
                item_price: price,
                cash_paid: cash,
                credit_amount: credit,
                transaction_date: purchaseForm.transaction_date,
                note: purchaseForm.note || null
            }).select().single()
            if (error) throw error
            setTransactions(prev => [data, ...prev])
            setPurchaseForm({ item_description: '', item_price: '', cash_paid: '', transaction_date: new Date().toISOString().split('T')[0], note: '' })
            setShowPurchase(false)
            setActiveShop(null)
        } catch (err) { alert('ভুল হয়েছে: ' + err.message) }
    }

    /* ─── Add Payment ─── */
    async function handleAddPayment(e) {
        e.preventDefault()
        const amt = Number(paymentForm.amount)
        if (amt > activeBalance) { alert('পরিশোধের পরিমাণ বাকির চেয়ে বেশি হতে পারে না।'); return }
        try {
            const { data, error } = await supabase.from('credit_transactions').insert({
                shop_id: activeShop.id,
                user_id: user.id,
                type: 'payment',
                payment_amount: amt,
                transaction_date: paymentForm.transaction_date,
                note: paymentForm.note || null
            }).select().single()
            if (error) throw error
            setTransactions(prev => [data, ...prev])
            setPaymentForm({ amount: '', transaction_date: new Date().toISOString().split('T')[0], note: '' })
            setShowPayment(false)
            setActiveShop(null)
        } catch (err) { alert('ভুল হয়েছে: ' + err.message) }
    }

    /* ─── Delete Shop ─── */
    async function handleDeleteShop(id) {
        if (!confirm('এই দোকান এবং সমস্ত তথ্য মুছে যাবে। নিশ্চিত?')) return
        try {
            setShops(prev => prev.filter(s => s.id !== id))
            setTransactions(prev => prev.filter(t => t.shop_id !== id))
            const { error } = await supabase.from('credit_shops').delete().eq('id', id)
            if (error) { fetchAll(); throw error }
        } catch (err) { alert('মুছতে পারা যায়নি: ' + err.message) }
    }

    /* ─── Open Purchase modal ─── */
    function openPurchase(shop) {
        setActiveShop(shop)
        setPurchaseForm({ item_description: '', item_price: '', cash_paid: '', transaction_date: new Date().toISOString().split('T')[0], note: '' })
        setShowPurchase(true)
    }

    /* ─── Open Payment modal ─── */
    function openPayment(shop, balance) {
        setActiveShop(shop)
        setActiveBalance(balance)
        setPaymentForm({ amount: '', transaction_date: new Date().toISOString().split('T')[0], note: '' })
        setShowPayment(true)
    }

    /* ─── Credit display ─── */
    const creditAmount = purchaseForm.item_price && !isNaN(Number(purchaseForm.item_price))
        ? Math.max(0, Number(purchaseForm.item_price) - Number(purchaseForm.cash_paid || 0))
        : null

    /* ─── Detail modal transactions ─── */
    const detailTxs = showDetail ? (shopTransactions[showDetail.id] || []) : []

    if (loading || fetching) return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="gl-loading-full"><div className="exp-loading-ring"></div><p>লোড হচ্ছে...</p></div>
            </main>
        </div>
    )

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">

                    {/* ─── HERO ─── */}
                    <div className="gl-hero">
                        <div className="gl-hero-bg" style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.07))' }}></div>
                        <div className="gl-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon">🏪</span>
                                    <div className="exp-hero-icon-ring" style={{ borderColor: 'rgba(245,158,11,0.3)' }}></div>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title" style={{ background: 'linear-gradient(135deg,#F1F5F9,#FCD34D,#FBBF24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>দোকান বাকি ম্যানেজমেন্ট</h1>
                                    <p className="exp-hero-sub">দোকান থেকে বাকি কেনাকাটা ও পরিশোধের সম্পূর্ণ হিসাব</p>
                                </div>
                            </div>
                            <button
                                className="exp-add-btn"
                                style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 6px 24px rgba(245,158,11,0.4)' }}
                                onClick={() => setShowAddShop(true)}
                            >
                                <span className="exp-add-btn-icon">+</span><span>নতুন দোকান</span><div className="exp-add-btn-shine"></div>
                            </button>
                        </div>
                    </div>

                    {/* ─── SUMMARY STATS ─── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(165px,1fr))', gap: 14, marginBottom: 28 }}>
                        {[
                            { icon: '🏪', label: 'মোট দোকান', value: `${stats.shopsCount}টি`, color: '#FCD34D' },
                            { icon: '🛒', label: 'মোট বাকি নিয়েছি', value: `৳${stats.totalCredit.toLocaleString()}`, color: '#FCA5A5' },
                            { icon: '💵', label: 'পরিশোধ করেছি', value: `৳${stats.totalPaid.toLocaleString()}`, color: '#6EE7B7' },
                            { icon: '⏳', label: 'এখনো বাকি', value: `৳${stats.balance.toLocaleString()}`, color: '#FBBF24' },
                            { icon: '✅', label: 'পরিষ্কার দোকান', value: `${stats.clearedCount}টি`, color: '#C084FC' },
                        ].map((s, i) => (
                            <div key={i} className="exp-stat-glass">
                                <div className="exp-stat-glass-bg"></div>
                                <div className="exp-stat-content">
                                    <div className="exp-stat-icon-box" style={{ background: 'rgba(255,255,255,0.07)' }}>{s.icon}</div>
                                    <div>
                                        <p className="exp-stat-label">{s.label}</p>
                                        <p className="exp-stat-value" style={{ color: s.color, fontSize: 16 }}>{s.value}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ─── SHOP GRID ─── */}
                    {shops.length === 0 ? (
                        <div className="exp-empty">
                            <div className="exp-empty-icon">🏪</div>
                            <h3>কোনো দোকান যোগ করা হয়নি</h3>
                            <p>+ নতুন দোকান বাটনে ক্লিক করে শুরু করুন।</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 20 }}>
                            {shops.map(shop => (
                                <ShopCard
                                    key={shop.id}
                                    shop={shop}
                                    transactions={shopTransactions[shop.id] || []}
                                    onAddPurchase={openPurchase}
                                    onAddPayment={openPayment}
                                    onDelete={handleDeleteShop}
                                    onViewDetail={s => setShowDetail(s)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* ─── ADD SHOP MODAL ─── */}
            <Modal open={showAddShop} onClose={() => { setShowAddShop(false); setShopName('') }} title="🏪 নতুন দোকান যোগ করুন">
                <form onSubmit={handleAddShop}>
                    <div className="exp-form-section">
                        <label className="exp-form-label">দোকানের নাম</label>
                        <input
                            type="text"
                            value={shopName}
                            onChange={e => setShopName(e.target.value)}
                            required
                            className="exp-form-input"
                            placeholder="যেমন: রহিম স্টোর, নিউ মেডিকেল"
                            autoFocus
                        />
                    </div>
                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => { setShowAddShop(false); setShopName('') }}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}>
                            ✅ যোগ করুন
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ─── ADD PURCHASE MODAL ─── */}
            <Modal open={showPurchase} onClose={() => { setShowPurchase(false); setActiveShop(null) }} title={`🛒 কেনাকাটা — ${activeShop?.shop_name || ''}`} width={560}>
                <form onSubmit={handleAddPurchase}>
                    {/* Item description */}
                    <div className="exp-form-section">
                        <label className="exp-form-label">🛍️ কী কিনলেন</label>
                        <input
                            type="text"
                            value={purchaseForm.item_description}
                            onChange={e => setPurchaseForm(f => ({ ...f, item_description: e.target.value }))}
                            required
                            className="exp-form-input"
                            placeholder="যেমন: চাল, ডাল, ওষুধ"
                            autoFocus
                        />
                    </div>

                    <div className="form-row">
                        {/* Price */}
                        <div className="exp-form-section">
                            <label className="exp-form-label">💰 মোট দাম (৳)</label>
                            <input
                                type="number"
                                value={purchaseForm.item_price}
                                onChange={e => setPurchaseForm(f => ({ ...f, item_price: e.target.value }))}
                                required
                                className="exp-form-input"
                                min="1"
                                placeholder="০"
                            />
                        </div>
                        {/* Cash Paid */}
                        <div className="exp-form-section">
                            <label className="exp-form-label">💵 নগদ দিলেন (৳)</label>
                            <input
                                type="number"
                                value={purchaseForm.cash_paid}
                                onChange={e => setPurchaseForm(f => ({ ...f, cash_paid: e.target.value }))}
                                className="exp-form-input"
                                min="0"
                                max={purchaseForm.item_price || undefined}
                                placeholder="০ (পুরোটা বাকি থাকলে)"
                            />
                        </div>
                    </div>

                    {/* Auto Credit Preview */}
                    {creditAmount !== null && (
                        <div style={{
                            padding: '14px 18px', borderRadius: 13, marginBottom: 4,
                            background: creditAmount > 0 ? 'rgba(245,158,11,0.07)' : 'rgba(16,185,129,0.07)',
                            border: `1px solid ${creditAmount > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 22 }}>{creditAmount > 0 ? '📌' : '✅'}</span>
                                <div>
                                    <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 2 }}>বাকি হিসাবে জমা হবে</p>
                                    <p style={{ fontSize: 22, fontWeight: 800, color: creditAmount > 0 ? '#F59E0B' : '#10B981', fontFamily: 'Inter' }}>
                                        ৳{creditAmount.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            {creditAmount === 0 && <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>কোনো বাকি নেই</span>}
                        </div>
                    )}

                    <div className="form-row" style={{ marginTop: 8 }}>
                        <div className="exp-form-section">
                            <label className="exp-form-label">📅 তারিখ</label>
                            <input
                                type="date"
                                value={purchaseForm.transaction_date}
                                onChange={e => setPurchaseForm(f => ({ ...f, transaction_date: e.target.value }))}
                                required
                                className="exp-form-input"
                            />
                        </div>
                        <div className="exp-form-section">
                            <label className="exp-form-label">📝 নোট (ঐচ্ছিক)</label>
                            <input
                                type="text"
                                value={purchaseForm.note}
                                onChange={e => setPurchaseForm(f => ({ ...f, note: e.target.value }))}
                                className="exp-form-input"
                                placeholder="অতিরিক্ত তথ্য"
                            />
                        </div>
                    </div>

                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => { setShowPurchase(false); setActiveShop(null) }}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}>
                            ✅ সংরক্ষণ করুন <div className="exp-add-btn-shine"></div>
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ─── PAYMENT MODAL ─── */}
            <Modal open={showPayment} onClose={() => { setShowPayment(false); setActiveShop(null) }} title={`💵 বাকি পরিশোধ — ${activeShop?.shop_name || ''}`}>
                <form onSubmit={handleAddPayment}>
                    {/* Balance Info */}
                    <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 13, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 3 }}>বর্তমান বাকি</p>
                            <p style={{ fontSize: 24, fontWeight: 800, color: '#F59E0B', fontFamily: 'Inter' }}>৳{activeBalance.toLocaleString()}</p>
                        </div>
                        <span style={{ fontSize: 32 }}>⏳</span>
                    </div>

                    <div className="exp-form-section">
                        <label className="exp-form-label">পরিশোধের পরিমাণ (৳)</label>
                        <input
                            type="number"
                            value={paymentForm.amount}
                            onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                            required
                            className="exp-form-input"
                            min="1"
                            max={activeBalance}
                            placeholder="০"
                            autoFocus
                        />
                    </div>

                    <div className="form-row">
                        <div className="exp-form-section">
                            <label className="exp-form-label">📅 তারিখ</label>
                            <input
                                type="date"
                                value={paymentForm.transaction_date}
                                onChange={e => setPaymentForm(f => ({ ...f, transaction_date: e.target.value }))}
                                required
                                className="exp-form-input"
                            />
                        </div>
                        <div className="exp-form-section">
                            <label className="exp-form-label">📝 নোট (ঐচ্ছিক)</label>
                            <input
                                type="text"
                                value={paymentForm.note}
                                onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))}
                                className="exp-form-input"
                                placeholder="নগদ / বিকাশ..."
                            />
                        </div>
                    </div>

                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => { setShowPayment(false); setActiveShop(null) }}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" style={{ background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
                            ✅ পরিশোধ করুন <div className="exp-add-btn-shine"></div>
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ─── DETAIL / HISTORY MODAL ─── */}
            <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={`📜 লেনদেন ইতিহাস — ${showDetail?.shop_name || ''}`} width={600}>
                {showDetail && (() => {
                    const txs = shopTransactions[showDetail.id] || []
                    const purchases = txs.filter(t => t.type === 'purchase')
                    const payments = txs.filter(t => t.type === 'payment')
                    const totalCredit = purchases.reduce((s, t) => s + Number(t.credit_amount), 0)
                    const totalPaid = payments.reduce((s, t) => s + Number(t.payment_amount), 0)
                    const balance = Math.max(0, totalCredit - totalPaid)

                    return (
                        <div>
                            {/* Summary */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                                {[
                                    { label: 'মোট বাকি', value: `৳${totalCredit.toLocaleString()}`, color: '#FCA5A5' },
                                    { label: 'পরিশোধ', value: `৳${totalPaid.toLocaleString()}`, color: '#6EE7B7' },
                                    { label: 'বাকি আছে', value: `৳${balance.toLocaleString()}`, color: '#FBBF24' },
                                ].map((s, i) => (
                                    <div key={i} style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
                                        <p style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>{s.label}</p>
                                        <p style={{ fontSize: 17, fontWeight: 800, color: s.color, fontFamily: 'Inter' }}>{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Transactions list */}
                            {txs.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748B' }}>
                                    <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                                    <p>কোনো লেনদেন নেই।</p>
                                </div>
                            ) : (
                                <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {[...txs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((tx, i) => {
                                        const isPurchase = tx.type === 'purchase'
                                        return (
                                            <div key={i} style={{
                                                padding: '14px 16px',
                                                background: isPurchase ? 'rgba(245,158,11,0.04)' : 'rgba(16,185,129,0.04)',
                                                border: `1px solid ${isPurchase ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.14)'}`,
                                                borderRadius: 12,
                                                display: 'flex', gap: 12, alignItems: 'flex-start'
                                            }}>
                                                <div style={{
                                                    width: 38, height: 38, flexShrink: 0,
                                                    background: isPurchase ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'linear-gradient(135deg,#10B981,#059669)',
                                                    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17
                                                }}>
                                                    {isPurchase ? '🛒' : '💵'}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                                        <div>
                                                            <p style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 2 }}>
                                                                {isPurchase ? (tx.item_description || 'কেনাকাটা') : 'বাকি পরিশোধ'}
                                                            </p>
                                                            <p style={{ fontSize: 11, color: '#64748B' }}>
                                                                📅 {tx.transaction_date}
                                                                {tx.note && <span style={{ marginLeft: 6 }}>• 📝 {tx.note}</span>}
                                                            </p>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            {isPurchase ? (
                                                                <>
                                                                    <p style={{ fontSize: 12, color: '#94A3B8' }}>দাম: <span style={{ color: '#F1F5F9', fontWeight: 700 }}>৳{Number(tx.item_price).toLocaleString()}</span></p>
                                                                    {Number(tx.cash_paid) > 0 && <p style={{ fontSize: 12, color: '#94A3B8' }}>নগদ: <span style={{ color: '#10B981', fontWeight: 600 }}>৳{Number(tx.cash_paid).toLocaleString()}</span></p>}
                                                                    <p style={{ fontSize: 14, fontWeight: 800, color: '#F59E0B', fontFamily: 'Inter' }}>বাকি: ৳{Number(tx.credit_amount).toLocaleString()}</p>
                                                                </>
                                                            ) : (
                                                                <p style={{ fontSize: 16, fontWeight: 800, color: '#10B981', fontFamily: 'Inter' }}>৳{Number(tx.payment_amount).toLocaleString()}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })()}
            </Modal>
        </div>
    )
}
