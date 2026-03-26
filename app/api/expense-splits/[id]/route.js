import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(req, { params }) {
    const { id } = params
    const { data, error } = await supabase.from('expense_splits').select('*').eq('id', id).single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
}

export async function PUT(req, { params }) {
    const { id } = params
    const body = await req.json()
    const { title, description, total_amount, members, settlements } = body

    const updateData = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (total_amount !== undefined) updateData.total_amount = parseFloat(total_amount)
    if (members !== undefined) updateData.members = members
    if (settlements !== undefined) updateData.settlements = settlements

    const { data, error } = await supabase
        .from('expense_splits')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
}

export async function DELETE(req, { params }) {
    const { id } = params
    const { error } = await supabase.from('expense_splits').delete().eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
}
