import { createAdminClient } from '@/lib/supabase-server'
import { generateAIContent } from '@/lib/ai'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const month = parseInt(searchParams.get('month'))
    const year = parseInt(searchParams.get('year'))

    // AI settings from client
    const aiProvider = searchParams.get('aiProvider') || null
    const aiGeminiKey = searchParams.get('aiGeminiKey') || null
    const aiOpenrouterKey = searchParams.get('aiOpenrouterKey') || null
    const aiModel = searchParams.get('aiModel') || null
    const aiReasoning = searchParams.get('aiReasoning') === '1'

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0)
    const endStr = `${year}-${String(month).padStart(2, '0')}-${endDate.getDate()}`

    const startOfTrend = new Date(year, month - 6, 1)
    const trendStartStr = `${startOfTrend.getFullYear()}-${String(startOfTrend.getMonth() + 1).padStart(2, '0')}-01`

    const [
        { data: expenses },
        { data: budgets },
        { data: goals },
        { data: profile },
        { data: allExpenses }
    ] = await Promise.all([
        supabase.from('expenses').select('*').eq('user_id', userId).gte('date', startDate).lte('date', endStr),
        supabase.from('budgets').select('*').eq('user_id', userId).eq('month', month).eq('year', year),
        supabase.from('goals').select('*').eq('user_id', userId),
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('expenses').select('*').eq('user_id', userId).gte('date', trendStartStr).lte('date', endStr)
    ])

    const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0)
    const totalBudget = (budgets || []).reduce((s, b) => s + Number(b.amount), 0)
    const monthlyIncome = Number(profile?.monthly_income || 0)
    const totalSaving = monthlyIncome - totalExpenses

    const categoryBreakdown = {}
        ; (expenses || []).forEach(e => {
            categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + Number(e.amount)
        })

    const budgetStatus = (budgets || []).map(b => {
        const spent = categoryBreakdown[b.category] || 0
        const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0
        return { category: b.category, budget: Number(b.amount), spent, remaining: Number(b.amount) - spent, pct }
    })

    const overBudget = budgetStatus.filter(b => b.pct >= 100)
    const nearBudget = budgetStatus.filter(b => b.pct >= 75 && b.pct < 100)

    // 1. Trend Analysis
    const trendMap = {}
    for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1)
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        trendMap[mKey] = 0
    }
    ; (allExpenses || []).forEach(e => {
        const mKey = e.date.substring(0, 7)
        if (trendMap[mKey] !== undefined) trendMap[mKey] += Number(e.amount)
    })
    const monthNamesShort = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে']
    const trendData = Object.entries(trendMap).map(([m, val]) => {
        const parts = m.split('-')
        return { name: monthNamesShort[parseInt(parts[1]) - 1], value: val }
    })

    // 2. Future Projections
    const today = new Date(new Date().getTime() + 6 * 60 * 60 * 1000)
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month
    const daysInMonth = new Date(year, month, 0).getDate()
    const daysPassed = isCurrentMonth ? today.getDate() : daysInMonth
    const dailyAvgProjected = daysPassed > 0 ? totalExpenses / daysPassed : 0
    const projectedEnd = isCurrentMonth ? Math.round(totalExpenses + dailyAvgProjected * (daysInMonth - daysPassed)) : totalExpenses

    // 3. Calendar View Data
    const calendarMap = {}
        ; (expenses || []).forEach(e => {
            const d = parseInt(e.date.split('-')[2])
            calendarMap[d] = (calendarMap[d] || 0) + Number(e.amount)
        })
    const calendarData = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, amount: calendarMap[i + 1] || 0 }))

    // 4. Recurring Expenses (Identify repeats in allExpenses)
    const recurMap = {}
        ; (allExpenses || []).forEach(e => {
            if (!e.note) return
            const key = `${e.category}-${e.note.trim()}`
            if (!recurMap[key]) recurMap[key] = { count: 0, amount: Number(e.amount), category: e.category, note: e.note.trim() }
            recurMap[key].count++
        })
    const recurringExpenses = Object.values(recurMap).filter(r => r.count >= 2).slice(0, 4)

    // 5. Category Alerts & Tips
    const categoryAlerts = overBudget.map(b => ({
        type: 'danger', message: `⚠️ ${b.category} খাতে আপনার বাজেট অতিক্রম করেছে! খরচ কমান।`
    })).concat(nearBudget.map(b => ({
        type: 'warning', message: `🟡 ${b.category} খাতে আপনি বাজেটের ${b.pct}% ব্যবহার করেছেন। সতর্ক হোন।`
    })))

    // 6. Goal Impact Analysis
    const activeGoals = (goals || []).filter(g => g.saved_amount < g.target_amount)
    const goalImpact = activeGoals.map(g => {
        const remaining = g.target_amount - g.saved_amount;
        const monthsToGoal = totalSaving > 0 ? Math.ceil(remaining / totalSaving) : -1;
        return { ...g, monthsToGoal }
    }).slice(0, 3)

    // AI Insights
    let aiInsights = 'সেটিংস থেকে AI কনফিগার করলে বিশ্লেষণ পাবেন।'
    try {
        const hasKey = (aiProvider === 'openrouter' && (aiOpenrouterKey || process.env.OPENROUTER_API_KEY)) ||
            (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key') ||
            (aiGeminiKey && aiGeminiKey.length > 20)

        if (hasKey) {
            const prompt = `
আমি ${month}/${year} মাসে:
- মোট আয়: ৳${monthlyIncome.toLocaleString()}
- মোট খরচ: ৳${totalExpenses.toLocaleString()}
- মোট সঞ্চয়: ৳${totalSaving.toLocaleString()}
- বাজেট অতিক্রম: ${overBudget.map(b => b.category).join(', ') || 'নেই'}
- খরচের বিবরণ: ${JSON.stringify(categoryBreakdown)}

৩টি পয়েন্টে বাংলায় সংক্ষিপ্ত আর্থিক বিশ্লেষণ দিন এবং উন্নতির পরামর্শ দিন।`
            aiInsights = await generateAIContent(prompt, {
                provider: aiProvider,
                geminiKey: aiGeminiKey,
                openrouterKey: aiOpenrouterKey,
                model: aiModel,
                enableReasoning: aiReasoning,
            })
        }
    } catch (err) {
        console.error('[api/report] AI error:', err.message)
    }

    return NextResponse.json({
        month, year,
        totalExpenses, totalBudget, totalSaving, monthlyIncome,
        categoryBreakdown,
        budgetStatus,
        overBudget,
        nearBudget,
        expenses: expenses || [],
        goals: goals || [],
        trendData, projectedEnd, calendarData, recurringExpenses, categoryAlerts, goalImpact,
        aiInsights
    })
}
