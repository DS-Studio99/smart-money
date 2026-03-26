import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function PUT(req, { params }) {
    const { id } = params
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
    const { id } = params
    const { error } = await supabase.from('income_entries').delete().eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
}
