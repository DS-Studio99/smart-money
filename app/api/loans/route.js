import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request) {
    const supabase = createAdminClient()
    const body = await request.json()
    const { data, error } = await supabase.from('loans').insert(body).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function PUT(request) {
    const supabase = createAdminClient()
    const body = await request.json()
    const { id, ...rest } = body
    const { data, error } = await supabase
        .from('loans').update(rest).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(request) {
    try {
        const supabase = createAdminClient()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const { error } = await supabase.from('loans').delete().match({ id: id })

        if (error) {
            console.error('[api/loans/DELETE] error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, deleted_id: id })
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
