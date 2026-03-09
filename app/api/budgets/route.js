import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { generateAllNotifications } from '@/lib/notificationService'

export async function GET(request) {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request) {
    const supabase = createAdminClient()
    const body = await request.json()
    // Upsert: update if exists for same user+category+month+year
    const { data, error } = await supabase
        .from('budgets')
        .upsert(body, { onConflict: 'user_id,category,month,year' })
        .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Trigger notification check
    if (data?.user_id) {
        generateAllNotifications(data.user_id).catch(err => console.error("Notif Error:", err));
    }

    return NextResponse.json(data)
}
