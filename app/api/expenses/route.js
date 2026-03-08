import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })

    if (month && year) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const endDate = new Date(year, month, 0)
        const endStr = `${year}-${String(month).padStart(2, '0')}-${endDate.getDate()}`
        query = query.gte('date', startDate).lte('date', endStr)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request) {
    const supabase = createAdminClient()
    try {
        const body = await request.json()
        console.log('[api/expenses] POST body:', body)
        const { data, error } = await supabase.from('expenses').insert(body).select().single()
        if (error) {
            console.error('[api/expenses] Supabase error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
    } catch (err) {
        console.error('[api/expenses] Request error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
