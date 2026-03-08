import { createAdminClient } from '@/lib/supabase-server'
import { generateAIContent } from '@/lib/ai'
import { NextResponse } from 'next/server'

export async function POST(request) {
    const supabase = createAdminClient()
    const body = await request.json()
    const { message, userId, aiProvider, aiGeminiKey, aiOpenrouterKey, aiModel, aiReasoning } = body

    // Use Bangladesh time (UTC+6)
    const now = new Date(new Date().getTime() + 6 * 60 * 60 * 1000)
    const month = now.getUTCMonth() + 1
    const year = now.getUTCFullYear()
    const currentDay = now.getUTCDate()
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`

    console.log(`[api/chat] userId: ${userId}, month: ${month}, year: ${year}, startDate: ${startDate}`)

    // Fetch user data — use individual try-catch so one failure doesn't break all
    let expenses = [], budgets = [], goals = [], profile = null, allExpenses = []

    try {
        const [expRes, budRes, goalRes, profRes, allExpRes] = await Promise.all([
            supabase.from('expenses').select('*').eq('user_id', userId)
                .gte('date', startDate).lte('date', endDate)
                .order('date', { ascending: false }),
            supabase.from('budgets').select('*').eq('user_id', userId).eq('month', month).eq('year', year),
            supabase.from('goals').select('*').eq('user_id', userId),
            supabase.from('profiles').select('*').eq('id', userId).single(),
            supabase.from('expenses').select('amount, category, date').eq('user_id', userId)
                .gte('date', `${year}-${String(Math.max(1, month - 2)).padStart(2, '0')}-01`)
                .lte('date', endDate)
                .order('date', { ascending: false })
                .limit(200),
        ])

        expenses = expRes.data || []
        budgets = budRes.data || []
        goals = goalRes.data || []
        profile = profRes.data || null
        allExpenses = allExpRes.data || []

        console.log(`[api/chat] Data fetched — expenses: ${expenses.length}, budgets: ${budgets.length}, goals: ${goals.length}, profile: ${profile?.name || 'null'}, income: ${profile?.monthly_income || 0}`)
    } catch (err) {
        console.error('[api/chat] Data fetch error:', err.message)
    }

    // ── Calculate all financial metrics ──
    const monthlyIncome = Number(profile?.monthly_income || 0)
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)
    const savings = monthlyIncome - totalExpenses
    const savingsRate = monthlyIncome > 0 ? Math.round((savings / monthlyIncome) * 100) : 0
    const budgetUsage = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0
    const budgetRemaining = totalBudget - totalExpenses

    // Category breakdown
    const categoryBreakdown = {}
    expenses.forEach(e => {
        categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + Number(e.amount)
    })
    const sortedCategories = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])
    const topCategory = sortedCategories[0]?.[0] || 'কোনো খরচ নেই'

    // Budget status per category
    const budgetStatus = budgets.map(b => {
        const spent = categoryBreakdown[b.category] || 0
        const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0
        return `${b.category}: বাজেট ৳${Number(b.amount).toLocaleString()}, খরচ ৳${spent.toLocaleString()} (${pct}%)`
    })

    // Recent expenses (last 10)
    const recentExpenses = expenses.slice(0, 10).map(e =>
        `${e.date}: ${e.category} - ৳${Number(e.amount).toLocaleString()}${e.description ? ` (${e.description})` : ''}`
    )

    // Goals summary
    const goalsSummary = goals.map(g => {
        const pct = Number(g.target_amount) > 0 ? Math.round((Number(g.saved_amount) / Number(g.target_amount)) * 100) : 0
        return `${g.title}: লক্ষ্য ৳${Number(g.target_amount).toLocaleString()}, জমা ৳${Number(g.saved_amount).toLocaleString()} (${pct}% সম্পন্ন)`
    })

    // Days progress
    const daysInMonth = new Date(year, month, 0).getDate()
    const daysLeft = daysInMonth - currentDay
    const dailyBudgetLeft = daysLeft > 0 ? Math.round(budgetRemaining / daysLeft) : 0

    // Monthly trend (last 3 months)
    const monthlyTrend = {}
    allExpenses.forEach(e => {
        const m = e.date?.substring(0, 7)
        if (m) monthlyTrend[m] = (monthlyTrend[m] || 0) + Number(e.amount)
    })

    // ── Build comprehensive context ──
    const context = `তুমি একজন বিশেষজ্ঞ বাংলাদেশি Personal Finance AI সহকারী। তোমার নাম "স্মার্ট মানি AI"।
সবসময় বাংলায় উত্তর দাও। বন্ধুত্বপূর্ণ, বিশ্লেষণমূলক এবং কার্যকর পরামর্শ দাও।
তোমার কাছে ব্যবহারকারীর সম্পূর্ণ আর্থিক তথ্য আছে:

══════ প্রোফাইল ══════
👤 নাম: ${profile?.name || 'ব্যবহারকারী'}
💰 মোট আয়: ৳${monthlyIncome > 0 ? monthlyIncome.toLocaleString() : 'সেট করা হয়নি'}
📅 চলতি মাস: ${month}/${year} (${daysInMonth} দিনের মধ্যে ${currentDay} দিন পার, ${daysLeft} দিন বাকি)

══════ মাসিক সারাংশ (${month}/${year}) ══════
💸 মোট খরচ: ৳${totalExpenses.toLocaleString()} (মোট ${expenses.length}টি খরচ)
📊 মোট বাজেট: ৳${totalBudget > 0 ? totalBudget.toLocaleString() : 'সেট করা হয়নি'}
${totalBudget > 0 ? `📉 বাজেট বাকি: ৳${Math.max(0, budgetRemaining).toLocaleString()}
📈 বাজেট ব্যবহার: ${budgetUsage}%
🔢 প্রতিদিন খরচ করা যাবে: ৳${dailyBudgetLeft.toLocaleString()}` : ''}
💵 সঞ্চয়: ৳${savings > 0 ? savings.toLocaleString() : '0'} (সঞ্চয় হার: ${savingsRate}%)
🏆 সবচেয়ে বেশি খরচ: ${topCategory}

══════ ক্যাটাগরি ভিত্তিক খরচ ══════
${sortedCategories.length > 0 ? sortedCategories.map(([k, v]) => `• ${k}: ৳${Number(v).toLocaleString()}`).join('\n') : '• কোনো খরচ রেকর্ড নেই'}

══════ বাজেট অবস্থা ══════
${budgetStatus.length > 0 ? budgetStatus.map(s => `• ${s}`).join('\n') : '• কোনো বাজেট সেট করা হয়নি'}

══════ সাম্প্রতিক খরচ ══════
${recentExpenses.length > 0 ? recentExpenses.map(s => `• ${s}`).join('\n') : '• এই মাসে কোনো খরচ নেই'}

══════ লক্ষ্য ও সঞ্চয় ══════
${goalsSummary.length > 0 ? goalsSummary.map(s => `• ${s}`).join('\n') : '• কোনো লক্ষ্য সেট করা হয়নি'}

══════ মাসিক প্রবণতা (গত ৩ মাস) ══════
${Object.entries(monthlyTrend).length > 0 ? Object.entries(monthlyTrend).map(([m, v]) => `• ${m}: ৳${Number(v).toLocaleString()}`).join('\n') : '• পর্যাপ্ত ডাটা নেই'}

══════════════════════════
ব্যবহারকারীর প্রশ্ন: ${message}
══════════════════════════

নির্দেশনা:
- উপরের সম্পূর্ণ আর্থিক তথ্য ব্যবহার করে বিশ্লেষণমূলক উত্তর দাও
- নির্দিষ্ট টাকার পরিমাণ ও শতাংশ উল্লেখ করো
- যদি ডাটা থাকে তাহলে সেটা সরাসরি বিশ্লেষণ করো
- যদি কোনো ডাটা না থাকে, শুধু তখনই ব্যবহারকারীকে সেটা যোগ করতে বলো
- টাকার পরিমাণ সবসময় ৳ চিহ্ন দিয়ে লিখো
`

    console.log(`[api/chat] Context preview — expenses: ${expenses.length}, totalExp: ${totalExpenses}, budget: ${totalBudget}, income: ${monthlyIncome}`)

    try {
        const text = await generateAIContent(context, {
            provider: aiProvider,
            geminiKey: aiGeminiKey,
            openrouterKey: aiOpenrouterKey,
            model: aiModel,
            enableReasoning: aiReasoning,
        })
        return NextResponse.json({ reply: text })
    } catch (err) {
        console.error('[api/chat] Error:', err.message)

        if (err.message?.includes('QUOTA') || err.message?.includes('429')) {
            return NextResponse.json({
                reply: `⏳ AI কোটা শেষ হয়ে গেছে।\n\n📌 সমাধান:\n• ১-২ মিনিট পর আবার চেষ্টা করুন\n• সেটিংস থেকে OpenRouter AI সিলেক্ট করুন\n• অথবা aistudio.google.com থেকে নতুন API key নিন`
            })
        }

        if (err.message?.includes('not configured')) {
            return NextResponse.json({
                reply: `⚠️ AI সেটাপ করা হয়নি।\n\n📌 সেটিংস → AI কনফিগারেশন থেকে:\n• Gemini বা OpenRouter API key যোগ করুন`
            })
        }

        return NextResponse.json({ reply: `দুঃখিত, AI সমস্যা: ${err.message}` })
    }
}
