import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return Response.json([], { status: 400 })

    const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
}

export async function POST(req) {
    const body = await req.json()
    const { user_id, name, icon, type, color } = body
    if (!user_id || !name) return Response.json({ error: 'Missing fields' }, { status: 400 })

    const { data, error } = await supabase
        .from('income_sources')
        .insert({ user_id, name, icon: icon || '💰', type: type || 'recurring', color: color || '#10B981' })
        .select()
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
}
