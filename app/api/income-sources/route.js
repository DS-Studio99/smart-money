import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const supabase = createAdminClient()

export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json([], { status: 400 })

    const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
}

export async function POST(req) {
    const body = await req.json()
    const { user_id, name, icon, type, color } = body
    if (!user_id || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data, error } = await supabase
        .from('income_sources')
        .insert({ user_id, name, icon: icon || '💰', type: type || 'recurring', color: color || '#10B981' })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
