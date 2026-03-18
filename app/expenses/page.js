'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
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

// PDF Generation Function
function generateExpensePDF({ expenses, month, year, filterCat, filterDateFrom, filterDateTo, profile }) {
    const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']
    const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0)
    
    // Category breakdown for PDF
    const catBreakdown = {}
    expenses.forEach(e => {
        catBreakdown[e.category] = (catBreakdown[e.category] || 0) + Number(e.amount)
    })
    const sortedCats = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1])

    const dateRange = filterDateFrom && filterDateTo
        ? `${filterDateFrom} থেকে ${filterDateTo}`
        : `${monthNames[month - 1]} ${year}`

    const catFilter = filterCat ? `ক্যাটাগরি: ${filterCat}` : 'সকল ক্যাটাগরি'

    const pdfHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>খরচ রিপোর্ট - ${dateRange}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap');
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Hind Siliguri', 'Inter', sans-serif; 
    background: #fff; 
    color: #1a1a2e;
    font-size: 13px;
  }
  
  .pdf-container { max-width: 900px; margin: 0 auto; padding: 0; }
  
  /* Header */
  .pdf-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f64f59 100%);
    color: white;
    padding: 40px 50px;
    position: relative;
    overflow: hidden;
  }
  .pdf-header::before {
    content: '';
    position: absolute;
    top: -50%; right: -20%;
    width: 300px; height: 300px;
    background: rgba(255,255,255,0.08);
    border-radius: 50%;
  }
  .pdf-header::after {
    content: '';
    position: absolute;
    bottom: -60%; left: -10%;
    width: 250px; height: 250px;
    background: rgba(255,255,255,0.06);
    border-radius: 50%;
  }
  .pdf-header-top { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; }
  .pdf-brand { display: flex; align-items: center; gap: 12px; }
  .pdf-brand-icon { width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
  .pdf-brand-name { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
  .pdf-brand-sub { font-size: 12px; opacity: 0.8; margin-top: 2px; }
  .pdf-date-badge { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 10px; padding: 8px 16px; font-size: 13px; text-align: right; }
  .pdf-title-section { margin-top: 30px; position: relative; z-index: 1; }
  .pdf-main-title { font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-bottom: 8px; }
  .pdf-subtitle { font-size: 14px; opacity: 0.85; }
  .pdf-filters-tag { display: inline-flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  .pdf-tag { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 20px; padding: 4px 12px; font-size: 11px; }

  /* Summary Cards */
  .pdf-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 30px 50px; background: #f8faff; border-bottom: 2px solid #eef2ff; }
  .pdf-sum-card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #eef2ff; }
  .pdf-sum-icon { font-size: 22px; margin-bottom: 8px; }
  .pdf-sum-label { font-size: 11px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .pdf-sum-value { font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 800; color: #1a1a2e; }
  .pdf-sum-value.red { color: #ef4444; }
  .pdf-sum-value.green { color: #10b981; }
  .pdf-sum-value.blue { color: #3b82f6; }
  .pdf-sum-value.purple { color: #8b5cf6; }

  /* Category Breakdown */
  .pdf-section { padding: 30px 50px; }
  .pdf-section-title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #eef2ff; padding-bottom: 10px; }
  .pdf-cat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .pdf-cat-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #f8faff; border-radius: 12px; border: 1px solid #eef2ff; }
  .pdf-cat-icon-wrap { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .pdf-cat-name { font-size: 13px; font-weight: 600; color: #374151; flex: 1; }
  .pdf-cat-amount { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; color: #1a1a2e; }
  .pdf-cat-pct { font-size: 11px; color: #6b7280; font-family: 'Inter', sans-serif; }
  .pdf-cat-bar-bg { height: 4px; background: #eef2ff; border-radius: 2px; margin-top: 4px; flex-basis: 100%; }
  .pdf-cat-bar { height: 4px; border-radius: 2px; background: linear-gradient(90deg, #667eea, #764ba2); }

  /* Expense Table */
  .pdf-table-section { padding: 0 50px 30px; }
  .pdf-table { width: 100%; border-collapse: collapse; }
  .pdf-table thead tr { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
  .pdf-table thead th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; }
  .pdf-table thead th:last-child { text-align: right; }
  .pdf-table tbody tr { border-bottom: 1px solid #f3f4f6; transition: background 0.2s; }
  .pdf-table tbody tr:nth-child(even) { background: #f8faff; }
  .pdf-table tbody tr:hover { background: #eef2ff; }
  .pdf-table tbody td { padding: 12px 16px; font-size: 13px; color: #374151; vertical-align: middle; }
  .pdf-table tbody td:last-child { text-align: right; font-family: 'Inter', sans-serif; font-weight: 700; color: #ef4444; }
  .pdf-table tfoot tr { background: linear-gradient(135deg, #1e293b, #334155); color: white; }
  .pdf-table tfoot td { padding: 14px 16px; font-size: 14px; font-weight: 700; }
  .pdf-table tfoot td:last-child { text-align: right; font-family: 'Inter', sans-serif; }
  
  .pdf-cat-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #eef2ff; color: #4f46e5; }
  .pdf-serial { color: #9ca3af; font-family: 'Inter', sans-serif; }
  .pdf-note { color: #6b7280; font-style: italic; font-size: 11px; }

  /* Footer */
  .pdf-footer { background: #1e293b; color: #94a3b8; padding: 20px 50px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
  .pdf-footer-brand { font-weight: 600; color: #f1f5f9; }
  .pdf-footer-info { font-size: 11px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .pdf-container { max-width: 100%; }
  }
</style>
</head>
<body>
<div class="pdf-container">
  <!-- Header -->
  <div class="pdf-header">
    <div class="pdf-header-top">
      <div class="pdf-brand">
        <div class="pdf-brand-icon">💸</div>
        <div>
          <div class="pdf-brand-name">Smart Money</div>
          <div class="pdf-brand-sub">ব্যক্তিগত আর্থিক ব্যবস্থাপনা</div>
        </div>
      </div>
      <div class="pdf-date-badge">
        <div>তৈরির তারিখ</div>
        <div style="font-weight:700;margin-top:4px">${new Date().toLocaleDateString('bn-BD')}</div>
      </div>
    </div>
    <div class="pdf-title-section">
      <div class="pdf-main-title">খরচ রিপোর্ট</div>
      <div class="pdf-subtitle">${profile ? profile.name + '-এর ' : ''}খরচের বিস্তারিত প্রতিবেদন</div>
      <div class="pdf-filters-tag">
        <span class="pdf-tag">📅 ${dateRange}</span>
        <span class="pdf-tag">🏷️ ${catFilter}</span>
        <span class="pdf-tag">📊 মোট ${expenses.length}টি এন্ট্রি</span>
      </div>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="pdf-summary">
    <div class="pdf-sum-card">
      <div class="pdf-sum-icon">💸</div>
      <div class="pdf-sum-label">মোট খরচ</div>
      <div class="pdf-sum-value red">৳${totalAmount.toLocaleString('bn-BD')}</div>
    </div>
    <div class="pdf-sum-card">
      <div class="pdf-sum-icon">📊</div>
      <div class="pdf-sum-label">মোট এন্ট্রি</div>
      <div class="pdf-sum-value blue">${expenses.length}টি</div>
    </div>
    <div class="pdf-sum-card">
      <div class="pdf-sum-icon">⚡</div>
      <div class="pdf-sum-label">গড় খরচ</div>
      <div class="pdf-sum-value purple">৳${expenses.length > 0 ? Math.round(totalAmount / expenses.length).toLocaleString('bn-BD') : '০'}</div>
    </div>
    <div class="pdf-sum-card">
      <div class="pdf-sum-icon">🏆</div>
      <div class="pdf-sum-label">সর্বোচ্চ খাত</div>
      <div class="pdf-sum-value green" style="font-size:14px">${sortedCats.length > 0 ? (CAT_ICONS[sortedCats[0][0]] || '') + ' ' + sortedCats[0][0] : '—'}</div>
    </div>
  </div>

  <!-- Category Breakdown -->
  ${sortedCats.length > 0 ? `
  <div class="pdf-section">
    <div class="pdf-section-title">📊 ক্যাটাগরি ভিত্তিক খরচ</div>
    <div class="pdf-cat-grid">
      ${sortedCats.map(([cat, amount]) => {
          const pct = totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0
          return `
        <div class="pdf-cat-item">
          <div class="pdf-cat-icon-wrap" style="background:${CAT_COLORS[cat]?.bg || '#eef2ff'}">${CAT_ICONS[cat] || '📌'}</div>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div class="pdf-cat-name">${cat}</div>
              <div>
                <div class="pdf-cat-amount">৳${Number(amount).toLocaleString('bn-BD')}</div>
                <div class="pdf-cat-pct" style="text-align:right">${pct}%</div>
              </div>
            </div>
            <div class="pdf-cat-bar-bg" style="margin-top:6px"><div class="pdf-cat-bar" style="width:${pct}%"></div></div>
          </div>
        </div>`
      }).join('')}
    </div>
  </div>` : ''}

  <!-- Expense Table -->
  <div class="pdf-table-section">
    <div class="pdf-section-title" style="padding: 0 0 10px; border-bottom: 2px solid #eef2ff; margin-bottom:16px;">📋 খরচের বিস্তারিত তালিকা</div>
    <table class="pdf-table">
      <thead>
        <tr>
          <th>#</th>
          <th>তারিখ</th>
          <th>ক্যাটাগরি</th>
          <th>বিবরণ</th>
          <th>পরিমাণ</th>
        </tr>
      </thead>
      <tbody>
        ${expenses.map((e, i) => `
        <tr>
          <td class="pdf-serial">${i + 1}</td>
          <td>${e.date}</td>
          <td><span class="pdf-cat-badge">${CAT_ICONS[e.category] || '📌'} ${e.category}</span></td>
          <td class="pdf-note">${e.note || '—'}</td>
          <td>৳${Number(e.amount).toLocaleString('bn-BD')}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4">মোট (${expenses.length}টি এন্ট্রি)</td>
          <td>৳${totalAmount.toLocaleString('bn-BD')}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Footer -->
  <div class="pdf-footer">
    <div>
      <div class="pdf-footer-brand">💎 Smart Money</div>
      <div class="pdf-footer-info">ব্যক্তিগত আর্থিক ব্যবস্থাপনা সিস্টেম</div>
    </div>
    <div style="text-align:right">
      <div class="pdf-footer-info">রিপোর্ট তৈরি: ${new Date().toLocaleString('bn-BD')}</div>
      <div class="pdf-footer-info">মেয়াদ: ${dateRange}</div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

    const blob = new Blob([pdfHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (!win) alert('পপআপ ব্লক হয়েছে। অনুগ্রহ করে পপআপ অনুমতি দিন।')
}

export default function ExpensesPage() {
    const { user, profile, loading } = useAuth()
    const router = useRouter()
    const [expenses, setExpenses] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [showPdfModal, setShowPdfModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [filterCat, setFilterCat] = useState('')
    const [fetching, setFetching] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleteId, setDeleteId] = useState(null)
    const now = new Date()
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())
    const [form, setForm] = useState({ category: 'বাজার খরচ', amount: '', note: '', date: now.toISOString().split('T')[0] })

    // PDF filter state
    const [pdfCat, setPdfCat] = useState('')
    const [pdfDateFrom, setPdfDateFrom] = useState('')
    const [pdfDateTo, setPdfDateTo] = useState('')
    const [pdfMonth, setPdfMonth] = useState(now.getMonth() + 1)
    const [pdfYear, setPdfYear] = useState(now.getFullYear())
    const [pdfMode, setPdfMode] = useState('month') // 'month' or 'date'

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

    // ─── TODAY's expenses ───
    const todayStr = now.toISOString().split('T')[0]
    const todayExpenses = expenses.filter(e => e.date === todayStr)
    const todayTotal = todayExpenses.reduce((s, e) => s + Number(e.amount), 0)

    // ─── Last 7 days expenses ───
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
    const last7Expenses = expenses.filter(e => e.date >= sevenDaysAgoStr && e.date <= todayStr)
    const last7Total = last7Expenses.reduce((s, e) => s + Number(e.amount), 0)

    // Category breakdown — uses expenses (not filtered) for correct %
    const grandTotal = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const catBreakdown = CATEGORIES.map(cat => {
        const items = expenses.filter(e => e.category === cat)
        const sum = items.reduce((s, e) => s + Number(e.amount), 0)
        return { cat, sum, count: items.length }
    }).filter(c => c.count > 0).sort((a, b) => b.sum - a.sum)

    const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']
    const topCategory = catBreakdown.length > 0 ? catBreakdown[0] : null

    // PDF generation handler
    async function handleGeneratePdf() {
        let pdfExpenses = []
        if (pdfMode === 'date' && pdfDateFrom && pdfDateTo) {
            // Fetch all expenses in date range
            const res = await fetch(`/api/expenses?userId=${user.id}`)
            const all = await res.json()
            pdfExpenses = (Array.isArray(all) ? all : []).filter(e => e.date >= pdfDateFrom && e.date <= pdfDateTo)
        } else {
            // Use current month/year or selected
            const res = await fetch(`/api/expenses?userId=${user.id}&month=${pdfMonth}&year=${pdfYear}`)
            pdfExpenses = await res.json()
            if (!Array.isArray(pdfExpenses)) pdfExpenses = []
        }
        if (pdfCat) pdfExpenses = pdfExpenses.filter(e => e.category === pdfCat)
        pdfExpenses.sort((a, b) => (a.date < b.date ? 1 : -1))

        generateExpensePDF({
            expenses: pdfExpenses,
            month: pdfMonth,
            year: pdfYear,
            filterCat: pdfCat,
            filterDateFrom: pdfMode === 'date' ? pdfDateFrom : null,
            filterDateTo: pdfMode === 'date' ? pdfDateTo : null,
            profile
        })
        setShowPdfModal(false)
    }

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
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button className="exp-add-btn" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', boxShadow: '0 6px 24px rgba(139,92,246,0.4)' }} onClick={() => setShowPdfModal(true)}>
                                    <span className="exp-add-btn-icon">📄</span>
                                    <span>PDF রিপোর্ট</span>
                                    <div className="exp-add-btn-shine"></div>
                                </button>
                                <button className="exp-add-btn" onClick={openAdd}>
                                    <span className="exp-add-btn-icon">+</span>
                                    <span>নতুন খরচ</span>
                                    <div className="exp-add-btn-shine"></div>
                                </button>
                            </div>
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
                        {/* ─── NEW: Today's Expense Card ─── */}
                        <div className="exp-stat-glass">
                            <div className="exp-stat-glass-bg"></div>
                            <div className="exp-stat-content">
                                <div className="exp-stat-icon-box" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>☀️</div>
                                <div>
                                    <p className="exp-stat-label">আজকের খরচ</p>
                                    <p className="exp-stat-value" style={{ color: '#6EE7B7' }}>৳{todayTotal.toLocaleString('bn-BD')}</p>
                                    <p style={{ fontSize: 11, color: '#6EE7B7', opacity: 0.7 }}>{todayExpenses.length}টি এন্ট্রি</p>
                                </div>
                            </div>
                        </div>
                        {/* ─── NEW: Last 7 Days Card ─── */}
                        <div className="exp-stat-glass">
                            <div className="exp-stat-glass-bg"></div>
                            <div className="exp-stat-content">
                                <div className="exp-stat-icon-box" style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}>📆</div>
                                <div>
                                    <p className="exp-stat-label">৭ দিনের খরচ</p>
                                    <p className="exp-stat-value" style={{ color: '#F9A8D4' }}>৳{last7Total.toLocaleString('bn-BD')}</p>
                                    <p style={{ fontSize: 11, color: '#F9A8D4', opacity: 0.7 }}>{last7Expenses.length}টি এন্ট্রি</p>
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
                                // Use grandTotal (all expenses) for accurate %
                                const pct = grandTotal > 0 ? Math.round((sum / grandTotal) * 100) : 0
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

            {/* ═══ PDF EXPORT MODAL ═══ */}
            <Modal open={showPdfModal} onClose={() => setShowPdfModal(false)} title="📄 PDF রিপোর্ট তৈরি করুন">
                <div style={{ padding: '0 0 8px' }}>
                    {/* Mode Tabs */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                        <button
                            type="button"
                            onClick={() => setPdfMode('month')}
                            style={{
                                flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer',
                                background: pdfMode === 'month' ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)' : 'rgba(255,255,255,0.05)',
                                color: pdfMode === 'month' ? '#fff' : '#94A3B8',
                                fontWeight: 600, fontSize: 13, transition: 'all 0.2s'
                            }}
                        >📅 মাস ও সাল দিয়ে</button>
                        <button
                            type="button"
                            onClick={() => setPdfMode('date')}
                            style={{
                                flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer',
                                background: pdfMode === 'date' ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)' : 'rgba(255,255,255,0.05)',
                                color: pdfMode === 'date' ? '#fff' : '#94A3B8',
                                fontWeight: 600, fontSize: 13, transition: 'all 0.2s'
                            }}
                        >📆 তারিখ রেঞ্জ দিয়ে</button>
                    </div>

                    {pdfMode === 'month' ? (
                        <div className="form-row">
                            <div className="exp-form-section">
                                <label className="exp-form-label">📅 মাস</label>
                                <select className="exp-form-input" value={pdfMonth} onChange={e => setPdfMonth(Number(e.target.value))}>
                                    {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </select>
                            </div>
                            <div className="exp-form-section">
                                <label className="exp-form-label">📆 সাল</label>
                                <select className="exp-form-input" value={pdfYear} onChange={e => setPdfYear(Number(e.target.value))}>
                                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="form-row">
                            <div className="exp-form-section">
                                <label className="exp-form-label">📅 শুরুর তারিখ</label>
                                <input className="exp-form-input" type="date" value={pdfDateFrom} onChange={e => setPdfDateFrom(e.target.value)} />
                            </div>
                            <div className="exp-form-section">
                                <label className="exp-form-label">📅 শেষ তারিখ</label>
                                <input className="exp-form-input" type="date" value={pdfDateTo} onChange={e => setPdfDateTo(e.target.value)} />
                            </div>
                        </div>
                    )}

                    <div className="exp-form-section">
                        <label className="exp-form-label">🏷️ ক্যাটাগরি ফিল্টার (ঐচ্ছিক)</label>
                        <select className="exp-form-input" value={pdfCat} onChange={e => setPdfCat(e.target.value)}>
                            <option value="">সব ক্যাটাগরি</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                        </select>
                    </div>

                    <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#C084FC' }}>
                        💡 PDF টি নতুন উইন্ডোতে খুলবে এবং স্বয়ংক্রিয়ভাবে প্রিন্ট/সেভ ডায়ালগ আসবে
                    </div>

                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => setShowPdfModal(false)}>বাতিল</button>
                        <button
                            type="button"
                            className="exp-modal-save"
                            style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}
                            onClick={handleGeneratePdf}
                        >
                            📄 PDF তৈরি করুন
                            <div className="exp-add-btn-shine"></div>
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
