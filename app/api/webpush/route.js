import { createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const supabase = createAdminClient();
        const body = await request.json();
        const { userId, subscription } = body;

        if (!userId || !subscription) {
            return NextResponse.json({ error: 'Missing userId or subscription' }, { status: 400 });
        }

        const { data: existing } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('endpoint', subscription.endpoint)
            .maybeSingle();

        if (existing) {
            await supabase.from('push_subscriptions').update({ user_id: userId }).eq('id', existing.id);
        } else {
            await supabase.from('push_subscriptions').insert({
                user_id: userId,
                endpoint: subscription.endpoint,
                keys: JSON.stringify(subscription.keys)
            });
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

        if (vapidPublicKey && vapidPrivateKey) {
            webpush.setVapidDetails(
                'mailto:contact@smartmoney.com',
                vapidPublicKey,
                vapidPrivateKey
            );

            try {
                await webpush.sendNotification(subscription, JSON.stringify({
                    title: '✅ স্মার্ট মানি নোটিফিকেশন চালু হয়েছে',
                    body: 'এখন থেকে আপনি নিয়মিত অ্যালার্ট পাবেন।',
                    icon: '/samrat-avatar.png'
                }));
            } catch (err) {
                console.error("Welcome push error:", err);
            }
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
