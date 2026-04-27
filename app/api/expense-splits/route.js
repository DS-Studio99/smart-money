import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const supabase = createAdminClient()

// GET: fetch all split groups for a user
export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json([], { status: 400 })

    const { data, error } = await supabase
        .from('expense_splits')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
}

// POST: create a new split group
export async function POST(req) {
    const body = await req.json()
    const { created_by, title, description, total_amount, members } = body
    if (!created_by || !title || !total_amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data, error } = await supabase
        .from('expense_splits')
        .insert({ created_by, title, description, total_amount: parseFloat(total_amount), members: members || [], settlements: [] })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
