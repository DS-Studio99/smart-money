import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const supabase = createAdminClient()

    // 1. Try to fetch from auth.admin first (requires SERVICE_ROLE_KEY)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()

    if (users && !authError) {
        // Also fetch profiles to get the names
        const { data: profiles } = await supabase.from('profiles').select('*')

        const combined = users.map(u => {
            const profile = profiles?.find(p => p.id === u.id)
            return {
                id: u.id,
                email: u.email,
                name: profile?.name || '---',
                created_at: u.created_at,
                last_sign_in_at: u.last_sign_in_at
            }
        })
        return NextResponse.json(combined)
    }

    // 2. Fallback to profiles table if anon key is used
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('*')
    if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const fallbackData = profiles.map(p => ({
        id: p.id,
        email: 'Hidden (No Service Key)',
        name: p.name,
        created_at: p.created_at,
        last_sign_in_at: null
    }))

    return NextResponse.json(fallbackData)
}

export async function DELETE(request) {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) {
        // Fallback to delete profile
        await supabase.from('profiles').delete().eq('id', id)
    }

    return NextResponse.json({ success: true })
}
