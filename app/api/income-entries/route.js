import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const sourceId = searchParams.get('sourceId')

    if (!userId) return Response.json([], { status: 400 })

    let query = supabase
        .from('income_entries')
        .select('*, income_sources(name, icon, color, type)')
        .eq('user_id', userId)
        .order('date', { ascending: false })

    if (month) query = query.eq('month', parseInt(month))
    if (year) query = query.eq('year', parseInt(year))
    if (sourceId) query = query.eq('source_id', sourceId)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
}

export async function POST(req) {
    const body = await req.json()
    const { user_id, source_id, amount, date, note } = body
    if (!user_id || !source_id || !amount) return Response.json({ error: 'Missing fields' }, { status: 400 })

    const { data, error } = await supabase
        .from('income_entries')
        .insert({ user_id, source_id, amount: parseFloat(amount), date: date || new Date().toISOString().split('T')[0], note })
        .select('*, income_sources(name, icon, color, type)')
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
}
