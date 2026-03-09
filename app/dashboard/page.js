'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useAISettings } from '@/context/AISettingsContext'
import Sidebar from '@/components/Sidebar'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const CATEGORIES = {
    'বাজার খরচ': { icon: '🍚', color: '#F97316' },
    'বাসা ভাড়া': { icon: '🏠', color: '#8B5CF6' },
    'মাসিক বিল': { icon: '🧾', color: '#14B8A6' },
    'যাতায়াত': { icon: '🚌', color: '#3B82F6' },
    'চিকিৎসা': { icon: '💊', color: '#EF4444' },
    'শিক্ষা': { icon: '📚', color: '#10B981' },
    'পারশনাল খরচ': { icon: '💆', color: '#F43F5E' },
    'মোটরসাইকেল খরচ': { icon: '🏍️', color: '#EAB308' },
    'বিনোদন': { icon: '🎬', color: '#F59E0B' },
    'কেনাকাটা': { icon: '🛍️', color: '#EC4899' },
    'অন্যান্য': { icon: '📌', color: '#94A3B8' },
}

export default function DashboardPage() {
    const { user, profile, loading } = useAuth()
    const { getAIParams } = useAISettings()
    const router = useRouter()
    const [expenses, setExpenses] = useState([])
    const [budgets, setBudgets] = useState([])
    const [goals, setGoals] = useState([])
    const [tip, setTip] = useState('')
    const [tipDate, setTipDate] = useState('')
    const [tipLoading, setTipLoading] = useState(false)
    const [tipSituation, setTipSituation] = useState('normal')
    const [alerts, setAlerts] = useState([])
    const [fetching, setFetching] = useState(true)
    const [hoursLeft, setHoursLeft] = useState(0)
    const [unreadCount, setUnreadCount] = useState(0)

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const fetchData = useCallback(async () => {
        if (!user) return
        setFetching(true)
        const [expRes, budRes, goalRes] = await Promise.all([
            fetch(`/api/expenses?userId=${user.id}&month=${month}&year=${year}`),
            fetch(`/api/budgets?userId=${user.id}&month=${month}&year=${year}`),
            fetch(`/api/goals?userId=${user.id}`),
        ])
        const [expData, budData, goalData, notifData] = await Promise.all([
            expRes.json(), budRes.json(), goalRes.json(),
            fetch(`/api/notifications?userId=${user.id}`).then(r => r.json()).catch(() => [])
        ])
        setExpenses(Array.isArray(expData) ? expData : [])
        setBudgets(Array.isArray(budData) ? budData : [])
        setGoals(Array.isArray(goalData) ? goalData : [])
        setUnreadCount(Array.isArray(notifData) ? notifData.filter(n => !n.is_read).length : 0)

        const totalExp = (Array.isArray(expData) ? expData : []).reduce((s, e) => s + Number(e.amount), 0)
        const totalBud = (Array.isArray(budData) ? budData : []).reduce((s, b) => s + Number(b.amount), 0)
        const catSpent = {}
            ; (Array.isArray(expData) ? expData : []).forEach(e => {
                catSpent[e.category] = (catSpent[e.category] || 0) + Number(e.amount)
            })
        const topCategory = Object.entries(catSpent).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
        const income = Number(profile?.monthly_income || 0)

        const catBreakdown = JSON.stringify(
            Object.entries(catSpent).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount]) => ({ name, amount }))
        )

        const nowDate = new Date()
        const daysInMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).getDate()
        const currentDay = nowDate.getDate()

        setTipLoading(true)
        const tipParams = new URLSearchParams({
            totalExpenses: totalExp, totalBudget: totalBud, totalIncome: income,
            topCategory, catBreakdown, daysInMonth, currentDay,
        })
        const aiParams = getAIParams()
        const tipRes = await fetch(`/api/tips?${tipParams}${aiParams ? '&' + aiParams : ''}`)
        const tipData = await tipRes.json()
        setTip(tipData.tip || ''); setTipDate(tipData.date || ''); setTipSituation(tipData.situation || 'normal')
        setTipLoading(false)

        const alts = []
            ; (Array.isArray(budData) ? budData : []).forEach(b => {
                const spent = catSpent[b.category] || 0
                const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0
                if (pct >= 100) alts.push({ type: 'danger', msg: `⚠️ "${b.category}" বাজেট শেষ হয়েছে! (${Math.round(pct)}% ব্যবহৃত)` })
                else if (pct >= 75) alts.push({ type: 'warn', msg: `⚡ "${b.category}" বাজেটের ${Math.round(pct)}% শেষ হয়েছে।` })
            })
        setAlerts(alts)
        setFetching(false)
    }, [user, month, year, profile])

    useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])
    useEffect(() => { if (user) fetchData() }, [user, fetchData])

    useEffect(() => {
        function calcHours() {
            const now = new Date()
            const bd = new Date(now.getTime() + 6 * 60 * 60 * 1000)
            const midnight = new Date(bd)
            midnight.setUTCHours(0, 0, 0, 0)
            midnight.setUTCDate(midnight.getUTCDate() + 1)
            setHoursLeft(Math.floor((midnight - bd) / 3600000))
        }
        calcHours()
        const t = setInterval(calcHours, 60000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        if (!user) return;
        const initPush = async () => {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    let subscription = await registration.pushManager.getSubscription();
                    if (!subscription) {
                        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                        if (!vapidPublicKey) return;

                        // Helper inside function
                        const urlBase64ToUint8Array = (base64String) => {
                            const padding = '='.repeat((4 - base64String.length % 4) % 4);
                            const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                            const rawData = window.atob(base64);
                            const outputArray = new Uint8Array(rawData.length);
                            for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
                            return outputArray;
                        };

                        subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
                        });

                        await fetch('/api/webpush', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.id, subscription })
                        });
                    }
                } catch (e) {
                    console.error('Push setup failed:', e);
                }
            }
        };
        initPush();
    }, [user])

    async function refreshTip() {
        setTipLoading(true)
        const tipParams = new URLSearchParams({
            totalExpenses, totalBudget, totalIncome: monthlyIncome,
            topCategory: Object.keys(catSpent).sort((a, b) => catSpent[b] - catSpent[a])[0] || '',
            catBreakdown: JSON.stringify(Object.entries(catSpent).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount]) => ({ name, amount }))),
            daysInMonth: new Date(year, month, 0).getDate(),
            currentDay: new Date().getDate(),
        })
        const aiParams = getAIParams()
        const res = await fetch(`/api/tips?force=1&${tipParams.toString()}${aiParams ? '&' + aiParams : ''}`)
        const d = await res.json()
        setTip(d.tip || ''); setTipDate(d.date || ''); setTipSituation(d.situation || 'normal'); setTipLoading(false)
    }

    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)
    const monthlyIncome = Number(profile?.monthly_income || 0)
    const totalSaving = monthlyIncome - totalExpenses
    const savingRate = monthlyIncome > 0 ? Math.round((totalSaving / monthlyIncome) * 100) : 0

    const catSpent = {}
    expenses.forEach(e => { catSpent[e.category] = (catSpent[e.category] || 0) + Number(e.amount) })

    const pieData = Object.entries(catSpent).map(([name, value]) => ({
        name, value, color: CATEGORIES[name]?.color || '#94A3B8'
    }))

    const barData = budgets.map(b => ({
        name: b.category, বাজেট: Number(b.amount), খরচ: catSpent[b.category] || 0,
    }))

    const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']

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
                    {/* ═══ DATE & REFRESH ═══ */}
                    {(() => {
                        const getBengaliDateStr = (date) => {
                            const d = date.getDate(), m = date.getMonth() + 1, y = date.getFullYear();
                            let bYear = y - 593; if (m < 4 || (m === 4 && d < 14)) bYear--;
                            const b = val => String(val).replace(/[0-9]/g, c => '০১২৩৪৫৬৭৮৯'[c]);
                            let bD, bM;
                            if (m === 1) { if (d < 14) { bD = d + 17; bM = "পৌষ" } else { bD = d - 13; bM = "মাঘ" } }
                            else if (m === 2) { if (d < 14) { bD = d + 18; bM = "মাঘ" } else { bD = d - 13; bM = "ফাল্গুন" } }
                            else if (m === 3) { if (d < 15) { bD = d + 15 + (y % 4 === 0 ? 1 : 0); bM = "ফাল্গুন" } else { bD = d - 14; bM = "চৈত্র" } }
                            else if (m === 4) { if (d < 14) { bD = d + 17; bM = "চৈত্র" } else { bD = d - 13; bM = "বৈশাখ" } }
                            else if (m === 5) { if (d < 15) { bD = d + 17; bM = "বৈশাখ" } else { bD = d - 14; bM = "জ্যৈষ্ঠ" } }
                            else if (m === 6) { if (d < 15) { bD = d + 17; bM = "জ্যৈষ্ঠ" } else { bD = d - 14; bM = "আষাঢ়" } }
                            else if (m === 7) { if (d < 16) { bD = d + 16; bM = "আষাঢ়" } else { bD = d - 15; bM = "শ্রাবণ" } }
                            else if (m === 8) { if (d < 16) { bD = d + 16; bM = "শ্রাবণ" } else { bD = d - 15; bM = "ভাদ্র" } }
                            else if (m === 9) { if (d < 16) { bD = d + 16; bM = "ভাদ্র" } else { bD = d - 15; bM = "আশ্বিন" } }
                            else if (m === 10) { if (d < 16) { bD = d + 15; bM = "আশ্বিন" } else { bD = d - 15; bM = "কার্তিক" } }
                            else if (m === 11) { if (d < 16) { bD = d + 16; bM = "কার্তিক" } else { bD = d - 15; bM = "অগ্রহায়ণ" } }
                            else if (m === 12) { if (d < 16) { bD = d + 15; bM = "অগ্রহায়ণ" } else { bD = d - 15; bM = "পৌষ" } }
                            return `${b(bD)} ${bM} ${b(bYear)}`;
                        };

                        return (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24, animation: 'fadeInDown 0.6s ease' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(236, 72, 153, 0.15))', padding: '8px 24px', borderRadius: 30, border: '1px solid rgba(245, 158, 11, 0.3)', boxShadow: '0 0 20px rgba(245, 158, 11, 0.15)', animation: 'pulseGlow 3s infinite alternate' }}>
                                    <style>{`
                                        @keyframes pulseGlow {
                                            0% { box-shadow: 0 0 10px rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.2); }
                                            100% { box-shadow: 0 0 25px rgba(236,72,153,0.3); border-color: rgba(236,72,153,0.4); }
                                        }
                                    `}</style>
                                    <span style={{ fontSize: 15, color: '#FCD34D', fontWeight: 600, textShadow: '0 0 8px rgba(252, 211, 77, 0.3)' }}>
                                        {new Intl.DateTimeFormat('bn-BD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)} / {getBengaliDateStr(now)}
                                    </span>
                                    <button onClick={fetchData} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, transition: 'all 0.3s' }} className="gl-refresh-btn-mini" title="রিফ্রেশ">
                                        🔄
                                    </button>
                                </div>
                            </div>
                        )
                    })()}

                    {/* Alerts */}
                    {alerts.map((a, i) => (
                        <div key={i} className={`gl-alert ${a.type === 'danger' ? 'gl-alert-danger' : 'gl-alert-warn'}`}>
                            <span>{a.msg}</span>
                        </div>
                    ))}

                    {/* ═══ AI TIP ═══ */}
                    <div className={`gl-tip-card gl-tip-${tipSituation}`}>
                        <div className="gl-tip-glow"></div>
                        <div className="gl-tip-inner">
                            <div className="gl-tip-top">
                                <div className="gl-tip-left">
                                    <span className="gl-tip-icon">
                                        {tipSituation === 'exceeded' ? '🚨' : tipSituation === 'critical' ? '🔥' : '💡'}
                                    </span>
                                    <div>
                                        <span className="gl-tip-title">আজকের পরামর্শ</span>
                                        <span className={`gl-tip-pill gl-pill-${tipSituation}`}>
                                            {tipSituation === 'exceeded' ? 'বাজেট শেষ!' : tipSituation === 'critical' ? 'সাবধান!' : tipSituation === 'warning' ? '৭০%+ খরচ' : 'ভালো আছে ✓'}
                                        </span>
                                    </div>
                                </div>
                                <button className="gl-tip-refresh" onClick={refreshTip} disabled={tipLoading}>
                                    {tipLoading ? '⏳' : '🔄'}
                                </button>
                            </div>
                            {tipLoading ? (
                                <div className="tip-shimmer" style={{ marginTop: 10 }}><div className="shimmer-line" /><div className="shimmer-line short" /></div>
                            ) : (
                                <p className="gl-tip-text">{tip}</p>
                            )}
                        </div>
                    </div>

                    {/* ═══ STAT CARDS ═══ */}
                    <div className="exp-stats-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                        {[
                            { icon: '💰', label: 'মোট আয়', value: `৳${monthlyIncome.toLocaleString('bn-BD')}`, color: '#FCD34D', grad: 'linear-gradient(135deg, #F59E0B, #D97706)', sub: `${monthNames[month - 1]} ${year}` },
                            { icon: '💸', label: 'মোট খরচ', value: `৳${totalExpenses.toLocaleString('bn-BD')}`, color: '#FCA5A5', grad: 'linear-gradient(135deg, #EF4444, #DC2626)', sub: totalBudget > 0 ? `বাজেটের ${Math.round((totalExpenses / totalBudget) * 100)}%` : 'বাজেট নির্ধারণ করুন' },
                            { icon: '💎', label: 'মোট সঞ্চয়', value: `৳${Math.abs(totalSaving).toLocaleString('bn-BD')}`, color: totalSaving >= 0 ? '#6EE7B7' : '#FCA5A5', grad: totalSaving >= 0 ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #EF4444, #DC2626)', sub: totalSaving >= 0 ? `সঞ্চয় হার: ${savingRate}%` : '⚠️ ব্যয় বেশি!' },
                            { icon: '📊', label: 'মোট বাজেট', value: `৳${totalBudget.toLocaleString('bn-BD')}`, color: '#60A5FA', grad: 'linear-gradient(135deg, #3B82F6, #2563EB)', sub: `৳${Math.max(0, totalBudget - totalExpenses).toLocaleString()} বাকি` },
                            { icon: '🎯', label: 'সক্রিয় লক্ষ্য', value: `${goals.length} টি`, color: '#C084FC', grad: 'linear-gradient(135deg, #A855F7, #7C3AED)', sub: `${goals.filter(g => g.saved_amount >= g.target_amount).length} টি সম্পন্ন` },
                        ].map((s, i) => (
                            <div key={i} className="exp-stat-glass" style={{ animationDelay: `${i * 0.08}s` }}>
                                <div className="exp-stat-glass-bg"></div>
                                <div className="exp-stat-content">
                                    <div className="exp-stat-icon-box" style={{ background: s.grad }}>{s.icon}</div>
                                    <div>
                                        <p className="exp-stat-label">{s.label}</p>
                                        <p className="exp-stat-value" style={{ color: s.color }}>{s.value}</p>
                                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ═══ CHARTS ═══ */}
                    <div className="gl-two-col mb-6">
                        <div className="gl-glass-card">
                            <div className="gl-glass-card-bg"></div>
                            <div className="gl-glass-card-inner">
                                <div className="gl-section-title">🥧 খরচের বিভাজন</div>
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={100}
                                                dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={false}>
                                                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                            </Pie>
                                            <Tooltip formatter={(v) => `৳${Number(v).toLocaleString('bn-BD')}`} contentStyle={{ background: 'rgba(19,31,51,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#F1F5F9', backdropFilter: 'blur(8px)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <div className="gl-empty-mini"><span>📊</span><p>এখনো কোনো খরচ নেই।</p></div>}
                            </div>
                        </div>

                        <div className="gl-glass-card">
                            <div className="gl-glass-card-bg"></div>
                            <div className="gl-glass-card-inner">
                                <div className="gl-section-title">📊 বাজেট বনাম খরচ</div>
                                {barData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={barData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                            <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                            <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                            <Tooltip formatter={(v) => `৳${Number(v).toLocaleString()}`} contentStyle={{ background: 'rgba(19,31,51,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#F1F5F9' }} />
                                            <Legend />
                                            <Bar dataKey="বাজেট" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="খরচ" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <div className="gl-empty-mini"><span>📊</span><p>বাজেট নির্ধারণ করুন।</p></div>}
                            </div>
                        </div>
                    </div>

                    {/* ═══ RECENT + GOALS ═══ */}
                    <div className="gl-two-col">
                        <div className="gl-glass-card">
                            <div className="gl-glass-card-bg"></div>
                            <div className="gl-glass-card-inner">
                                <div className="gl-section-title">💸 সাম্প্রতিক খরচ</div>
                                {expenses.slice(0, 6).map((e, idx) => (
                                    <div key={e.id} className="gl-list-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                                        <div className="gl-list-left">
                                            <div className="gl-list-icon" style={{ background: `${CATEGORIES[e.category]?.color}22`, boxShadow: `0 0 12px ${CATEGORIES[e.category]?.color}33` }}>
                                                {CATEGORIES[e.category]?.icon || '📌'}
                                            </div>
                                            <div>
                                                <p className="gl-list-name">{e.note || e.category}</p>
                                                <p className="gl-list-sub">{e.category} • {e.date}</p>
                                            </div>
                                        </div>
                                        <span className="gl-list-amount" style={{ color: '#FCA5A5' }}>-৳{Number(e.amount).toLocaleString()}</span>
                                    </div>
                                ))}
                                {expenses.length === 0 && <div className="gl-empty-mini"><span>💸</span><p>কোনো খরচ নেই।</p></div>}
                            </div>
                        </div>

                        <div className="gl-glass-card">
                            <div className="gl-glass-card-bg"></div>
                            <div className="gl-glass-card-inner">
                                <div className="gl-section-title">🎯 লক্ষ্যের অগ্রগতি</div>
                                {goals.slice(0, 4).map((g, idx) => {
                                    const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100)) : 0
                                    const remaining = Math.max(0, Number(g.target_amount) - Number(g.saved_amount))
                                    const barColor = pct >= 100 ? 'safe' : pct >= 50 ? 'blue' : 'purple'
                                    return (
                                        <div key={g.id} className="gl-goal-item" style={{ animationDelay: `${idx * 0.08}s` }}>
                                            <div className="gl-goal-top">
                                                <span className="gl-goal-name">{g.title}</span>
                                                <span className="gl-goal-pct" style={{ color: pct >= 100 ? '#6EE7B7' : '#60A5FA' }}>{pct}%</span>
                                            </div>
                                            <div className="progress-bar-bg">
                                                <div className={`progress-bar-fill ${barColor}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <p className="gl-goal-sub">৳{Number(g.saved_amount).toLocaleString()} / ৳{Number(g.target_amount).toLocaleString()} • বাকি: ৳{remaining.toLocaleString()}</p>
                                        </div>
                                    )
                                })}
                                {goals.length === 0 && <div className="gl-empty-mini"><span>🎯</span><p>কোনো লক্ষ্য নেই।</p></div>}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
