import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const supabase = createAdminClient()

export async function PUT(req, { params }) {
    const { id } = await params
    const body = await req.json()
    const { name, icon, type, color, is_active } = body

    const { data, error } = await supabase
        .from('income_sources')
        .update({ name, icon, type, color, is_active })
        .eq('id', id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(req, { params }) {
    const { id } = await params
    const { error } = await supabase.from('income_sources').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
