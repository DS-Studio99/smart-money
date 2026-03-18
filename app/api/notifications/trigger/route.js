import { NextResponse } from 'next/server';
import { runScheduledNotificationsForAllUsers, generateAllNotifications } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';

// This route is called by:
// 1. A cron job (e.g., from Vercel Cron or external scheduler)
// 2. The Service Worker background sync
// 3. After every expense add (for immediate alerts)

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { userId, secret } = body;

        // Security check for cron calls
        const cronSecret = process.env.CRON_SECRET || 'smart-money-cron-2024';
        if (secret && secret !== cronSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (userId) {
            // Single user notification check
            await generateAllNotifications(userId);
            return NextResponse.json({ success: true, message: 'Notifications checked for user' });
        } else {
            // All users (cron job)
            await runScheduledNotificationsForAllUsers();
            return NextResponse.json({ success: true, message: 'Scheduled notifications sent for all users' });
        }
    } catch (e) {
        console.error('[/api/notifications/trigger]', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function GET(request) {
    // Allow GET for easy cron setup
    const secret = new URL(request.url).searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET || 'smart-money-cron-2024';

    if (secret !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await runScheduledNotificationsForAllUsers();
    return NextResponse.json({ success: true, time: new Date().toISOString() });
}
