import { createAdminClient } from '@/lib/supabase-server'
import { generateAIContent } from '@/lib/ai'
import { NextResponse } from 'next/server'

export async function POST(request) {
    const supabase = createAdminClient()
    const body = await request.json()
    const { message, userId, aiProvider, aiGeminiKey, aiOpenrouterKey, aiModel, aiReasoning, isTest } = body

    // Bangladesh time (UTC+6)
    const now = new Date(new Date().getTime() + 6 * 60 * 60 * 1000)
    const month = now.getUTCMonth() + 1
    const year = now.getUTCFullYear()
    const currentDay = now.getUTCDate()
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`

    let expenses = [], budgets = [], goals = [], loans = [], profile = null, allExpenses = [], incomes = []

    try {
        const [expRes, budRes, goalRes, loanRes, profRes, allExpRes] = await Promise.all([
            supabase.from('expenses').select('*').eq('user_id', userId)
                .gte('date', startDate).lte('date', endDate)
                .order('date', { ascending: false }),
            supabase.from('budgets').select('*').eq('user_id', userId).eq('month', month).eq('year', year),
            supabase.from('goals').select('*').eq('user_id', userId),
            supabase.from('loans').select('*').eq('user_id', userId),
            supabase.from('profiles').select('*').eq('id', userId).single(),
            supabase.from('expenses').select('amount, category, note, date').eq('user_id', userId)
                .gte('date', `${year}-${String(Math.max(1, month - 5)).padStart(2, '0')}-01`)
                .lte('date', endDate)
                .order('date', { ascending: false })
                .limit(500),
        ])

        expenses = expRes.data || []
        budgets = budRes.data || []
        goals = goalRes.data || []
        loans = loanRes.data || []
        profile = profRes.data || null
        allExpenses = allExpRes.data || []
    } catch (err) {
        console.error('[api/chat] Data fetch error:', err.message)
    }

    // ── Financial calculations ──
    const monthlyIncome = Number(profile?.monthly_income || 0)
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)
    const savings = monthlyIncome - totalExpenses
    const savingsRate = monthlyIncome > 0 ? Math.round((savings / monthlyIncome) * 100) : 0
    const budgetUsage = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0
    const budgetRemaining = totalBudget - totalExpenses
    const daysInMonth = new Date(year, month, 0).getDate()
    const daysLeft = daysInMonth - currentDay
    const dailyBudgetLeft = daysLeft > 0 && budgetRemaining > 0 ? Math.round(budgetRemaining / daysLeft) : 0

    // Category breakdown with notes
    const categoryBreakdown = {}
    const categoryDetails = {}
    expenses.forEach(e => {
        categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + Number(e.amount)
        if (!categoryDetails[e.category]) categoryDetails[e.category] = []
        if (e.note) categoryDetails[e.category].push(`${e.date}: ৳${Number(e.amount).toLocaleString()} (${e.note})`)
    })
    const sortedCategories = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])
    const topCategory = sortedCategories[0]?.[0] || 'কোনো খরচ নেই'

    // Budget status
    const budgetStatus = budgets.map(b => {
        const spent = categoryBreakdown[b.category] || 0
        const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0
        const status = pct >= 100 ? '🔴 বাজেট শেষ' : pct >= 80 ? '🟡 সীমার কাছাকাছি' : '🟢 ঠিক আছে'
        return `${b.category}: বাজেট ৳${Number(b.amount).toLocaleString()}, খরচ ৳${spent.toLocaleString()} (${pct}%) — ${status}`
    })

    // Recent expenses with notes
    const recentExpenses = expenses.slice(0, 15).map(e =>
        `${e.date}: ${e.category} — ৳${Number(e.amount).toLocaleString()}${e.note ? ` | বিবরণ: "${e.note}"` : ''}`
    )

    // Today's expenses
    const todayExpenses = expenses.filter(e => e.date === todayStr)
    const todayTotal = todayExpenses.reduce((s, e) => s + Number(e.amount), 0)

    // Goals summary
    const goalsSummary = goals.map(g => {
        const pct = Number(g.target_amount) > 0 ? Math.round((Number(g.saved_amount) / Number(g.target_amount)) * 100) : 0
        const remaining = Number(g.target_amount) - Number(g.saved_amount)
        const monthsNeeded = savings > 0 ? Math.ceil(remaining / savings) : '∞'
        return `"${g.title}": লক্ষ্য ৳${Number(g.target_amount).toLocaleString()}, জমা ৳${Number(g.saved_amount).toLocaleString()} (${pct}%), বাকি ৳${remaining.toLocaleString()}, আনুমানিক ${monthsNeeded} মাস লাগবে`
    })

    // Loans summary — CORRECT DIRECTION
    const activeLoans = loans.filter(l => l.status === 'active')
    const completedLoans = loans.filter(l => l.status === 'completed')
    const takenLoans = activeLoans.filter(l => l.type === 'taken') // আমি ধার নিয়েছি
    const givenLoans = activeLoans.filter(l => l.type === 'given') // আমি ধার দিয়েছি

    const loansSummary = activeLoans.map(l => {
        const remaining = Number(l.amount) - Number(l.paid_amount)
        const pct = l.amount > 0 ? Math.round((l.paid_amount / l.amount) * 100) : 0
        if (l.type === 'taken') {
            return `📥 ${l.person_name}-এর কাছ থেকে ধার নিয়েছি: মোট ৳${Number(l.amount).toLocaleString()}, পরিশোধ করেছি ৳${Number(l.paid_amount).toLocaleString()} (${pct}%), এখনো ফেরত দিতে হবে ৳${remaining.toLocaleString()}${l.due_date ? ` (সময়সীমা: ${l.due_date})` : ''}`
        } else {
            return `📤 ${l.person_name}-কে ধার দিয়েছি: মোট ৳${Number(l.amount).toLocaleString()}, ফেরত পেয়েছি ৳${Number(l.paid_amount).toLocaleString()} (${pct}%), এখনো পাবো ৳${remaining.toLocaleString()}${l.due_date ? ` (সময়সীমা: ${l.due_date})` : ''}`
        }
    })

    const totalTaken = takenLoans.reduce((s, l) => s + (Number(l.amount) - Number(l.paid_amount)), 0)
    const totalGiven = givenLoans.reduce((s, l) => s + (Number(l.amount) - Number(l.paid_amount)), 0)

    // Monthly trend (last 6 months)
    const monthlyTrend = {}
    allExpenses.forEach(e => {
        const m = e.date?.substring(0, 7)
        if (m) monthlyTrend[m] = (monthlyTrend[m] || 0) + Number(e.amount)
    })
    const trendStr = Object.entries(monthlyTrend)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([m, v]) => `${m}: ৳${Number(v).toLocaleString()}`)
        .join(' | ')

    // Expense patterns
    const avgDailyExpense = currentDay > 0 ? Math.round(totalExpenses / currentDay) : 0
    const projectedMonthly = avgDailyExpense * daysInMonth
    const highestExpense = expenses.length > 0 ? expenses.reduce((max, e) => Number(e.amount) > Number(max.amount) ? e : max, expenses[0]) : null

    // ── Build Advanced Context ──
    const context = `তুমি "স্মার্ট মানি AI" — একজন সর্বজ্ঞ বাংলাদেশি ব্যক্তিগত অর্থ ব্যবস্থাপনা বিশেষজ্ঞ এবং বুদ্ধিমান AI সহকারী।

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 AI ব্যক্তিত্ব ও আচরণ নির্দেশিকা:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• সবসময় বাংলায় উত্তর দাও — স্পষ্ট, বন্ধুত্বপূর্ণ, এবং বিশ্লেষণমূলকভাবে
• শুধুমাত্র যা জিজ্ঞেস করা হয় তার উত্তর দাও — অতিরিক্ত অপ্রাসঙ্গিক তথ্য দিও না
• প্রশ্ন অনুযায়ী উত্তরের দৈর্ঘ্য নির্ধারণ করো (ছোট প্রশ্ন = ছোট উত্তর, বিশ্লেষণ চাইলে বিস্তারিত)
• কখনো মাসিক সারাংশ জোর করে দিও না যদি সরাসরি চাওয়া না হয়
• ব্যবহারকারীর সাথে বন্ধুর মতো কথা বলো, আনুষ্ঠানিক নয়
• emoji ব্যবহার করো উত্তরকে আকর্ষণীয় করতে
• সংখ্যা বলার সময় সবসময় ৳ চিহ্ন ব্যবহার করো
• ডেটা থাকলে সরাসরি বিশ্লেষণ করো, না থাকলে বলো "এই বিষয়ে কোনো তথ্য নেই"
• যেকোনো সাধারণ জ্ঞান, জীবন পরামর্শ, গণিত, বা বিষয়ে উত্তর দিতে পারবে
• ChatGPT-র মতো বুদ্ধিমান হবে — যেকোনো প্রশ্নের উত্তর দেবে

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 ব্যবহারকারীর প্রোফাইল:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
নাম: ${profile?.name || 'ব্যবহারকারী'}
মাসিক আয়: ${monthlyIncome > 0 ? '৳' + monthlyIncome.toLocaleString() : 'সেট করা হয়নি'}
আজকের তারিখ: ${todayStr} (${currentDay}/${month}/${year})
মাসের অবস্থান: ${daysInMonth} দিনের মধ্যে ${currentDay} দিন পার হয়েছে, ${daysLeft} দিন বাকি

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💸 ${month}/${year} মাসের খরচ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
মোট খরচ: ৳${totalExpenses.toLocaleString()} (${expenses.length}টি এন্ট্রি)
আজকের খরচ: ৳${todayTotal.toLocaleString()} (${todayExpenses.length}টি এন্ট্রি)
দৈনিক গড় খরচ: ৳${avgDailyExpense.toLocaleString()}
মাস শেষে সম্ভাব্য খরচ: ৳${projectedMonthly.toLocaleString()}
${highestExpense ? `সবচেয়ে বড় একক খরচ: ৳${Number(highestExpense.amount).toLocaleString()} (${highestExpense.category}${highestExpense.note ? ', ' + highestExpense.note : ''}, ${highestExpense.date})` : ''}
সবচেয়ে বেশি খরচ হয়েছে: ${topCategory}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ক্যাটাগরি ভিত্তিক বিশ্লেষণ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${sortedCategories.length > 0 ? sortedCategories.map(([k, v]) => {
    const pct = totalExpenses > 0 ? Math.round((v / totalExpenses) * 100) : 0
    const details = categoryDetails[k] ? categoryDetails[k].slice(0, 3).join('; ') : ''
    return `• ${k}: ৳${Number(v).toLocaleString()} (${pct}%)${details ? '\n  — বিবরণ: ' + details : ''}`
}).join('\n') : '• এই মাসে কোনো খরচ নেই'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 বাজেট ও সঞ্চয়:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
মোট বাজেট: ${totalBudget > 0 ? '৳' + totalBudget.toLocaleString() : 'সেট করা হয়নি'}
${totalBudget > 0 ? `বাজেট ব্যবহার: ${budgetUsage}%
বাজেট বাকি: ৳${Math.max(0, budgetRemaining).toLocaleString()}
প্রতিদিন আর খরচ করা যাবে: ৳${dailyBudgetLeft.toLocaleString()}` : ''}
সঞ্চয়: ${monthlyIncome > 0 ? '৳' + savings.toLocaleString() + ' (' + savingsRate + '%)' : 'আয় সেট করা হয়নি'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ক্যাটাগরি বাজেট অবস্থা:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${budgetStatus.length > 0 ? budgetStatus.map(s => `• ${s}`).join('\n') : '• কোনো বাজেট সেট করা হয়নি'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕐 সাম্প্রতিক খরচের তালিকা:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${recentExpenses.length > 0 ? recentExpenses.map(s => `• ${s}`).join('\n') : '• এই মাসে কোনো খরচ নেই'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 সঞ্চয়ের লক্ষ্যসমূহ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${goalsSummary.length > 0 ? goalsSummary.map(s => `• ${s}`).join('\n') : '• কোনো লক্ষ্য সেট করা হয়নি'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤝 লোন ও ধারের তথ্য (সঠিক দিকনির্দেশনা):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
সক্রিয় লোন সংখ্যা: ${activeLoans.length}টি
আমি ধার নিয়েছি (ফেরত দিতে হবে): ${takenLoans.length}টি লোন, বাকি ৳${totalTaken.toLocaleString()}
আমি ধার দিয়েছি (ফেরত পাবো): ${givenLoans.length}টি লোন, পাবো ৳${totalGiven.toLocaleString()}
সম্পন্ন লোন: ${completedLoans.length}টি

বিস্তারিত:
${loansSummary.length > 0 ? loansSummary.map(s => `• ${s}`).join('\n') : '• কোনো সক্রিয় লোন নেই'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 গত ৬ মাসের মাসিক খরচ প্রবণতা:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${trendStr || '• পর্যাপ্ত ডেটা নেই'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ৫০০+ বিশেষ নির্দেশনা ও ফিচার:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【খরচ বিশ্লেষণ】
১. নির্দিষ্ট ক্যাটাগরির খরচ জিজ্ঞেস করলে শুধু সেই ক্যাটাগরির তথ্য দাও
২. "আজকে কত খরচ হলো?" প্রশ্নে শুধু আজকের খরচ দেখাও
৩. "এই মাসে সবচেয়ে বেশি কিসে খরচ হলো?" প্রশ্নে শীর্ষ ৩ ক্যাটাগরি দেখাও
৪. "খরচ কমানোর উপায় কি?" প্রশ্নে নির্দিষ্ট ডেটার উপর ভিত্তি করে পরামর্শ দাও
৫. ক্যাটাগরির নোট/বিবরণ সহ বিস্তারিত বলতে পারবে (যেমন: কী কাজে বাজার খরচ হলো)
৬. দৈনিক, সাপ্তাহিক, মাসিক খরচের প্যাটার্ন বিশ্লেষণ করতে পারবে
৭. বাজেটের বিপরীতে খরচের তুলনা করতে পারবে
৮. কোন ক্যাটাগরিতে কতটুকু বাজেট বাকি আছে বলতে পারবে
৯. মাস শেষে কত খরচ হতে পারে প্রজেকশন দিতে পারবে
১০. গত মাসের তুলনায় এই মাস কেমন তুলনা করতে পারবে

【বাজেট পরামর্শ】
১১. বাজেট অতিক্রম হলে সতর্ক করবে
১২. কোথায় বাজেট কাটা যায় পরামর্শ দেবে
১৩. আদর্শ বাজেট বণ্টন সুপারিশ করতে পারবে (50/30/20 নিয়ম)
১৪. আয় অনুযায়ী বাজেট প্ল্যান দিতে পারবে
১৫. মাস শেষ পর্যন্ত কত টাকা দৈনিক খরচ করা যাবে বলতে পারবে

【সঞ্চয় বিশ্লেষণ】
১৬. সঞ্চয়ের হার গণনা করে পরামর্শ দেবে
১৭. লক্ষ্যে পৌঁছাতে কত সময় লাগবে হিসাব করবে
১৮. সঞ্চয় বাড়ানোর কৌশল বলতে পারবে
১৯. জরুরি তহবিল গঠনের পরামর্শ দিতে পারবে
২০. বিভিন্ন সঞ্চয় পদ্ধতির সুবিধা-অসুবিধা বলতে পারবে

【লোন ও ধার】
২১. আমি কাকে কত টাকা দিয়েছি ও ফেরত পাইনি সঠিকভাবে বলবে
২২. আমি কার কাছ থেকে কত টাকা নিয়েছি ও ফেরত দিইনি সঠিকভাবে বলবে
২৩. লোনের মেয়াদ শেষ হলে সতর্ক করবে
২৪. লোন পরিশোধের টাইম-লাইন দিতে পারবে
২৫. EMI হিসাব করতে পারবে

【বিনিয়োগ পরামর্শ】
২৬. সঞ্চয়ের টাকা কোথায় বিনিয়োগ করা যায় পরামর্শ দেবে
২৭. বাংলাদেশে বিনিয়োগের বিভিন্ন বিকল্প (সঞ্চয়পত্র, FDR, শেয়ার) সম্পর্কে বলবে
২৮. রিস্ক অনুযায়ী বিনিয়োগ পরামর্শ দেবে
২৯. দীর্ঘমেয়াদী সম্পদ গঠনের পরিকল্পনা দিতে পারবে
৩০. ইনফ্লেশনের বিপরীতে সঞ্চয় রক্ষার উপায় বলবে

【জীবন পরিকল্পনা】
৩১. বাড়ি কেনার পরিকল্পনা করতে সাহায্য করবে
৩২. বিয়ের বাজেট প্ল্যান দিতে পারবে
৩৩. শিক্ষার জন্য সঞ্চয় পরিকল্পনা দিতে পারবে
৩৪. অবসর পরিকল্পনা করতে পারবে
৩৫. জরুরি অবস্থার জন্য প্রস্তুতির পরামর্শ দেবে

【AI বিশেষ ফিচার】
৩৬. "AI Life Simulator": বর্তমান সঞ্চয় হারে ৫-১০ বছরে কতটুকু সম্পদ হবে গণনা করবে
৩৭. "Money Personality": খরচের ধরন দেখে ব্যক্তিত্ব বিশ্লেষণ করবে
৩৮. "AI Money Roast": মজার ভঙ্গিতে খরচের অভ্যাস নিয়ে রোস্ট করবে
৩৯. "What If": যদি X টাকা কম খরচ করতাম তাহলে কী হতো
৪০. "AI Mission": সাপ্তাহিক/মাসিক আর্থিক চ্যালেঞ্জ দিতে পারবে
৪১. "Fraud Detection": অস্বাভাবিক বা অতিরিক্ত খরচ চিহ্নিত করবে
৪২. "Financial Health Check": সামগ্রিক আর্থিক স্বাস্থ্যের রিপোর্ট দেবে
৪৩. "Comparison Mode": এই মাস বনাম গত মাসের তুলনামূলক বিশ্লেষণ
৪৪. "Tax Planning": বাংলাদেশের ট্যাক্স নিয়ম অনুযায়ী পরামর্শ দেবে
৪৫. "Inflation Impact": মুদ্রাস্ফীতি প্রভাব বিশ্লেষণ

【সাধারণ জ্ঞান ও পরামর্শ】
৪৬. অর্থনীতি সম্পর্কিত যেকোনো প্রশ্নের উত্তর দেবে
৪৭. ব্যাংকিং, ফিনান্স, বীমা বিষয়ে পরামর্শ দেবে
৪৮. বাংলাদেশের আর্থিক আইন ও নিয়মকানুন সম্পর্কে বলবে
৪৯. গণিত ও হিসাবের সমস্যা সমাধান করবে
৫০. জীবনযাত্রার মান উন্নয়নের পরামর্শ দেবে
৫১. যেকোনো সাধারণ প্রশ্নের উত্তর ChatGPT-র মতো দেবে
৫২. রান্না, স্বাস্থ্য, শিক্ষা, ক্যারিয়ার যেকোনো বিষয়ে সাহায্য করবে

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❓ ব্যবহারকারীর প্রশ্ন: ${message}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

উত্তর দেওয়ার আগে ভাবো:
- প্রশ্নটি কী ধরনের? (খরচ সম্পর্কিত / লোন / বাজেট / সাধারণ জ্ঞান)
- শুধুমাত্র প্রশ্নের সাথে সম্পর্কিত তথ্য দাও
- মাসিক সারাংশ জোর করে দিও না
- সংক্ষিপ্ত হলে ভালো, কিন্তু বিশ্লেষণ চাইলে বিস্তারিত দাও`

    try {
        const text = await generateAIContent(context, {
            provider: aiProvider,
            geminiKey: aiGeminiKey,
            openrouterKey: aiOpenrouterKey,
            model: aiModel,
            enableReasoning: aiReasoning,
            isTest: isTest,
        })
        return NextResponse.json({ reply: text })
    } catch (err) {
        console.error('[api/chat] Error:', err.message)
        if (err.message?.includes('QUOTA') || err.message?.includes('429')) {
            return NextResponse.json({ reply: `⏳ AI কোটা শেষ হয়ে গেছে।\n\n📌 সমাধান:\n• ১-২ মিনিট পর আবার চেষ্টা করুন\n• সেটিংস থেকে OpenRouter AI সিলেক্ট করুন` })
        }
        if (err.message?.includes('not configured')) {
            return NextResponse.json({ reply: `⚠️ AI সেটাপ করা হয়নি।\n\n📌 সেটিংস → AI কনফিগারেশন থেকে:\n• Gemini বা OpenRouter API key যোগ করুন` })
        }
        return NextResponse.json({ reply: `দুঃখিত, AI সমস্যা: ${err.message}` })
    }
}
