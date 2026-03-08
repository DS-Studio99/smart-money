import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request) {
    const supabase = createAdminClient()
    const body = await request.json()
    const { data, error } = await supabase.from('goals').insert(body).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function PUT(request) {
    const supabase = createAdminClient()
    const body = await request.json()
    const { id, ...rest } = body
    const { data, error } = await supabase
        .from('goals').update(rest).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(request) {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
