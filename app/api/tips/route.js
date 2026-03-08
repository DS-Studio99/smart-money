import { generateAIContent } from '@/lib/ai'
import { NextResponse } from 'next/server'

// In-memory daily cache
let tipCache = { date: null, tip: null }

const staticTips = [
    'বাইরে না খেয়ে বাড়িতে রান্না করলে মাসে ৳২০০০-৳৩০০০ পর্যন্ত সাশ্রয় হতে পারে।',
    'অপ্রয়োজনীয় সাবস্ক্রিপশন বাতিল করুন — প্রতি মাসে চেক করুন কোনটা ব্যবহার করছেন না।',
    '৫০/৩০/২০ নিয়ম মানুন: আয়ের ৫০% প্রয়োজন, ৩০% চাহিদা, ২০% সঞ্চয়ে রাখুন।',
    'বড় কেনাকাটার আগে ২৪ ঘণ্টা অপেক্ষা করুন — অনেক ক্ষেত্রে ইচ্ছা চলে যায়।',
    'প্রতিদিনের ছোট খরচ লিখে রাখুন — সপ্তাহে একবার দেখুন কোথায় বেশি যাচ্ছে।',
    'বাজার করুন তালিকা তৈরি করে — অপ্রয়োজনীয় কেনাকাটা এড়ানো যাবে।',
    'পানীয়ের বোতল কিনুন — বাইরে পানি কিনতে গেলে মাসে ৳৩০০-৳৫০০ অপচয় হয়।',
    'শক্তি সাশ্রয়ী বাল্ব ব্যবহার করুন — বিদ্যুৎ বিল কমবে।',
    'গণপরিবহন ব্যবহার করুন যেখানে সম্ভব — যাতায়াত খরচ অর্ধেক হয়ে যাবে।',
    'প্রতি মাসে একটি নির্দিষ্ট দিনে সঞ্চয় করুন — বেতন পাওয়ার দিনই সঞ্চয় সরিয়ে রাখুন।',
    'লক্ষ্য নির্ধারণ করুন এবং প্রতিদিন সেদিকে এক ধাপ হাঁটুন।',
    'ক্রেডিট কার্ডের পরিবর্তে ডেবিট কার্ড বা নগদ ব্যবহার করুন — অতিরিক্ত খরচ কমবে।',
    'ইমার্জেন্সি ফান্ড তৈরি করুন — কমপক্ষে ৩ মাসের খরচের সমপরিমাণ টাকা আলাদা রাখুন।',
    'অফ-সিজনে কেনাকাটা করুন — পোশাক ও ইলেকট্রনিক্সে ৩০-৫০% ছাড় পাওয়া যায়।',
    'রান্নার মশলা ও তেল একসাথে বেশি কিনুন — ইউনিট প্রতি খরচ কমবে।',
]

function getTodayDate() {
    const now = new Date()
    const bd = new Date(now.getTime() + 6 * 60 * 60 * 1000)
    return bd.toISOString().split('T')[0]
}

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const totalExpenses = parseFloat(searchParams.get('totalExpenses') || '0')
    const totalBudget = parseFloat(searchParams.get('totalBudget') || '0')
    const totalIncome = parseFloat(searchParams.get('totalIncome') || '0')
    const topCategory = searchParams.get('topCategory') || ''
    const force = searchParams.get('force') === '1'
    const daysInMonth = searchParams.get('daysInMonth') || '30'
    const currentDay = searchParams.get('currentDay') || '1'
    const catBreakdown = searchParams.get('catBreakdown') || ''

    // AI settings from client
    const aiProvider = searchParams.get('aiProvider') || null
    const aiGeminiKey = searchParams.get('aiGeminiKey') || null
    const aiOpenrouterKey = searchParams.get('aiOpenrouterKey') || null
    const aiModel = searchParams.get('aiModel') || null
    const aiReasoning = searchParams.get('aiReasoning') === '1'

    const today = getTodayDate()

    if (!force && tipCache.date === today && tipCache.tip) {
        return NextResponse.json({ tip: tipCache.tip, date: today, cached: true, situation: tipCache.situation || 'normal' })
    }

    try {
        const hasKey = (aiProvider === 'openrouter' && (aiOpenrouterKey || process.env.OPENROUTER_API_KEY)) ||
            (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 20) ||
            (aiGeminiKey && aiGeminiKey.length > 20)

        if (hasKey) {
            const savingAmount = totalIncome - totalExpenses
            const savingRate = totalIncome > 0 ? Math.round((savingAmount / totalIncome) * 100) : 0
            const budgetUsage = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0
            const budgetRemaining = totalBudget - totalExpenses
            const daysPassed = parseInt(currentDay)
            const totalDays = parseInt(daysInMonth)
            const daysLeft = totalDays - daysPassed
            const monthProgress = Math.round((daysPassed / totalDays) * 100)

            let catList = ''
            try {
                const cats = JSON.parse(catBreakdown)
                if (Array.isArray(cats) && cats.length > 0) {
                    catList = cats.slice(0, 4).map(c => `  • ${c.name}: ৳${Number(c.amount).toLocaleString()}`).join('\n')
                }
            } catch (_) { }

            let situation = 'normal'
            if (budgetUsage >= 100) situation = 'exceeded'
            else if (budgetUsage >= 85) situation = 'critical'
            else if (budgetUsage >= 70) situation = 'warning'

            let situationContext = ''
            if (situation === 'exceeded') {
                situationContext = `⚠️ সংকটপূর্ণ: বাজেট ইতিমধ্যে ${budgetUsage}% শেষ হয়ে গেছে এবং মাসে এখনো ${daysLeft} দিন বাকি।`
            } else if (situation === 'critical') {
                situationContext = `🔴 সতর্ক অবস্থা: বাজেটের ${budgetUsage}% খরচ হয়ে গেছে, মাত্র ৳${Math.round(budgetRemaining).toLocaleString()} বাকি।`
            } else if (situation === 'warning') {
                situationContext = `🟡 সাবধান: বাজেটের ${budgetUsage}% ব্যবহার হয়েছে। মাসের ${monthProgress}% সময় পেরিয়েছে।`
            } else {
                situationContext = `✅ ভালো অবস্থা: বাজেটের ${budgetUsage}% ব্যবহার হয়েছে, মাসের ${monthProgress}% সময় পেরিয়েছে।`
            }

            const dailyBudgetLeft = daysLeft > 0 ? Math.round(budgetRemaining / daysLeft) : 0

            const prompt = `তুমি একজন বাংলাদেশের বাস্তব জীবনের অর্থ পরামর্শদাতা।

আজকের আর্থিক অবস্থা:
${situationContext}
- মোট আয়: ৳${totalIncome.toLocaleString()}
- মোট খরচ এখন পর্যন্ত: ৳${totalExpenses.toLocaleString()}
- বাজেট সীমা: ৳${totalBudget.toLocaleString()}
- বাকি বাজেট: ৳${Math.max(0, budgetRemaining).toLocaleString()}
- সঞ্চয় হার: ${savingRate}%
- মাসের ${daysPassed} দিন পেরিয়েছে, ${daysLeft} দিন বাকি
- প্রতিদিন সর্বোচ্চ খরচ করা যাবে: ৳${dailyBudgetLeft.toLocaleString()}
${catList ? `\nখরচের বিভাজন:\n${catList}` : ''}
- সবচেয়ে বেশি খরচ: ${topCategory || 'সাধারণ'} খাতে

নিয়ম:
- সর্বোচ্চ ২-৩ বাক্য
- বাংলায় লিখবে, সহজ ভাষায়
- সরাসরি টিপসটি লিখবে — কোনো ভূমিকা নেই`

            const rawTip = await generateAIContent(prompt, {
                provider: aiProvider,
                geminiKey: aiGeminiKey,
                openrouterKey: aiOpenrouterKey,
                model: aiModel,
                enableReasoning: aiReasoning,
            })
            const tip = rawTip.trim()
                .replace(/^(অবশ্যই|নিশ্চয়ই|অবশ্যই,|নিশ্চয়ই,|ঠিক আছে,?)\s*/i, '')
                .trim()
            tipCache = { date: today, tip, situation }
            return NextResponse.json({ tip, date: today, cached: false, situation })
        }
    } catch (err) {
        console.error('[api/tips] AI error:', err.message)
    }

    // Fallback: static tip
    const budgetUsageFallback = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0
    let situationFallback = 'normal'
    if (budgetUsageFallback >= 100) situationFallback = 'exceeded'
    else if (budgetUsageFallback >= 85) situationFallback = 'critical'
    else if (budgetUsageFallback >= 70) situationFallback = 'warning'

    let tip
    if (budgetUsageFallback >= 85) {
        tip = `বাজেট প্রায় শেষ! আজ থেকে বাইরে খাওয়া ও আড্ডার খরচ একদম বন্ধ রাখুন। বাড়ির খাবার খান, রিকশার বদলে পায়ে হাঁটুন — মাসের বাকি দিনগুলো সামলানো যাবে।`
    } else {
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
        tip = staticTips[dayOfYear % staticTips.length]
    }
    tipCache = { date: today, tip, situation: situationFallback }
    return NextResponse.json({ tip, date: today, cached: false, situation: situationFallback })
}
