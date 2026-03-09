import { createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { generateAllNotifications } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const supabase = createAdminClient();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Auto trigger generation passively
        generateAllNotifications(userId).catch(console.error);

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50); // Fetch top 50 recent notifications

        if (error) {
            console.error('[api/notifications/GET] error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const supabase = createAdminClient();
        const body = await request.json();
        const { id, is_read, userId } = body;

        let query = supabase.from('notifications').update({ is_read });

        if (id) {
            query = query.eq('id', id);
        } else if (userId) {
            // Mark all as read for user
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query.select();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: data?.length || 0 });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const supabase = createAdminClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');

        let query = supabase.from('notifications').delete();

        if (id) {
            query = query.eq('id', id);
        } else if (userId) {
            // Delete all for user
            query = query.eq('user_id', userId);
        } else {
            return NextResponse.json({ error: 'ID or User ID required' }, { status: 400 });
        }

        const { error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
