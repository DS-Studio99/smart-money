import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const [
        { data: expenses },
        { data: profile }
    ] = await Promise.all([
        supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: true }),
        supabase.from('profiles').select('*').eq('id', userId).single()
    ])

    const monthlyIncome = Number(profile?.monthly_income || 0)
    const now = new Date(new Date().getTime() + 6 * 60 * 60 * 1000) // BST time

    // Gather all expenses
    const expList = expenses || []

    // Find start month (earliest expense or current month)
    let startYear = now.getFullYear();
    let startMonth = now.getMonth() + 1;

    if (expList.length > 0) {
        const firstExpDate = new Date(expList[0].date);
        startYear = firstExpDate.getFullYear() || startYear;
        startMonth = (firstExpDate.getMonth() + 1) || startMonth;
    }

    // Generate all months from start to current
    const monthsData = [];
    let currentY = startYear;
    let currentM = startMonth;

    while (currentY < now.getFullYear() || (currentY === now.getFullYear() && currentM <= now.getMonth() + 1)) {
        const mKey = `${currentY}-${String(currentM).padStart(2, '0')}`;
        monthsData.push({
            key: mKey,
            year: currentY,
            month: currentM,
            income: monthlyIncome, // Assuming constant income
            expenses: 0,
            savings: 0
        });

        currentM++;
        if (currentM > 12) {
            currentY++;
            currentM = 1;
        }
    }

    // Map expenses to months
    expList.forEach(e => {
        const mKey = e.date.substring(0, 7);
        const md = monthsData.find(m => m.key === mKey);
        if (md) {
            md.expenses += Number(e.amount);
        }
    });

    // Calculate savings
    let totalAccumulatedSavings = 0;
    let bestMonth = null;
    let worstMonth = null;
    let pastValidMonthsCount = 0;

    const currentActualY = now.getFullYear();
    const currentActualM = now.getMonth() + 1;

    monthsData.forEach(md => {
        md.savings = md.income - md.expenses;

        const isCurrent = md.year === currentActualY && md.month === currentActualM;
        if (!isCurrent) {
            totalAccumulatedSavings += md.savings;
            pastValidMonthsCount++;

            if (!bestMonth || md.savings > bestMonth.savings) bestMonth = { ...md };
            if (!worstMonth || md.savings < worstMonth.savings) worstMonth = { ...md };
        }
    });

    const avgSavings = pastValidMonthsCount > 0 ? Math.round(totalAccumulatedSavings / pastValidMonthsCount) : 0;

    // Fallback if no past months
    if (!bestMonth) bestMonth = { savings: 0, month: currentActualM, year: currentActualY };
    if (!worstMonth) worstMonth = { savings: 0, month: currentActualM, year: currentActualY };

    // Last 6 months trend
    const monthNamesShort = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে']
    const trendData = monthsData.slice(-6).map(md => ({
        name: `${monthNamesShort[md.month - 1]} ${String(md.year).slice(-2)}`,
        savings: md.savings,
        defecit: md.savings < 0 ? Math.abs(md.savings) : 0,
        amount: md.savings // For heatmap
    }));

    const heatmapData = monthsData.slice(-12);

    const currentMonthData = monthsData.find(md => md.year === currentActualY && md.month === currentActualM) || { income: 0, expenses: 0, savings: 0 };

    return NextResponse.json({
        totalAccumulatedSavings,
        bestMonth,
        worstMonth,
        avgSavings,
        trendData,
        monthsData: monthsData.slice().reverse(), // For history table
        heatmapData,
        currentMonthData
    })
}
