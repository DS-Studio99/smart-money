import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('app_settings').select('*')

    // Fallback if table doesn't exist yet
    if (error) {
        return NextResponse.json([
            { key: 'signup_enabled', value: 'true' }
        ])
    }
    return NextResponse.json(data || [])
}

export async function POST(request) {
    const supabase = createAdminClient()
    const body = await request.json()

    const { error } = await supabase.from('app_settings').upsert(
        { key: body.key, value: body.value },
        { onConflict: 'key' }
    )

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
