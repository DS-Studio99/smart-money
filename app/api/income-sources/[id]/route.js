import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function PUT(req, { params }) {
    const { id } = params
    const body = await req.json()
    const { name, icon, type, color, is_active } = body

    const { data, error } = await supabase
        .from('income_sources')
        .update({ name, icon, type, color, is_active })
        .eq('id', id)
        .select()
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
}

export async function DELETE(req, { params }) {
    const { id } = params
    const { error } = await supabase.from('income_sources').delete().eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
}
