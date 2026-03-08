import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function PUT(request, { params }) {
    const supabase = createAdminClient()
    const body = await request.json()
    const { data, error } = await supabase
        .from('expenses')
        .update(body)
        .eq('id', params.id)
        .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(request, { params }) {
    const supabase = createAdminClient()
    const { error } = await supabase.from('expenses').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
