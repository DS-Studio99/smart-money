import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const supabase = createAdminClient()

export async function PUT(req, { params }) {
    const { id } = await params
    const body = await req.json()
    const { source_id, amount, date, note } = body

    const { data, error } = await supabase
        .from('income_entries')
        .update({ source_id, amount: parseFloat(amount), date, note })
        .eq('id', id)
        .select('*, income_sources(name, icon, color, type)')
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
}

export async function DELETE(req, { params }) {
    const { id } = await params
    const { error } = await supabase.from('income_entries').delete().eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
}
