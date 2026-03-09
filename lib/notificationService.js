import { createAdminClient } from './supabase-server';
import webpush from 'web-push';

// helper to check if a specific notification was already sent recently
async function hasRecentNotification(supabase, userId, titleMatches, timeLimitHours = 24) {
    const cutoff = new Date(Date.now() - timeLimitHours * 60 * 60 * 1000).toISOString();
    for (const match of titleMatches) {
        const { data } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .ilike('title', `%${match}%`)
            .gte('created_at', cutoff)
            .limit(1);
        if (data && data.length > 0) return true;
    }
    return false;
}

export async function generateAllNotifications(userId) {
    const supabase = createAdminClient();
    if (!supabase) return;

    try {
        // Fetch all necessary data
        // Use Bangladesh time (UTC+6)
        const now = new Date(new Date().getTime() + 6 * 60 * 60 * 1000);
        const month = now.getUTCMonth() + 1;
        const year = now.getUTCFullYear();
        const currentDay = now.getUTCDate();
        const daysInMonth = new Date(year, month, 0).getDate();
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;

        const [expRes, budRes, goalRes, loanRes, chalRes] = await Promise.all([
            supabase.from('expenses').select('*').eq('user_id', userId).gte('date', startDate).lte('date', endDate),
            supabase.from('budgets').select('*').eq('user_id', userId).eq('month', month).eq('year', year),
            supabase.from('goals').select('*').eq('user_id', userId),
            supabase.from('loans').select('*').eq('user_id', userId).eq('status', 'active'),
            supabase.from('savings_challenges').select('*').eq('user_id', userId)
        ]);

        const expenses = expRes.data || [];
        const budgets = budRes.data || [];
        const goals = goalRes.data || [];
        const loans = loanRes.data || [];
        const challenges = chalRes.data || [];

        const categorySpent = {};
        let todaySpent = 0;
        const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        expenses.forEach(e => {
            categorySpent[e.category] = (categorySpent[e.category] || 0) + Number(e.amount);
            if (e.date.startsWith(todayStr)) {
                todaySpent += Number(e.amount);
            }
        });

        const newNotifications = [];

        // 1. Budget Alerts
        for (const b of budgets) {
            const spent = categorySpent[b.category] || 0;
            const limit = Number(b.amount);
            if (limit <= 0) continue;
            const pct = (spent / limit) * 100;

            if (pct > 100 && !(await hasRecentNotification(supabase, userId, [`${b.category} বাজেট পার`]))) {
                newNotifications.push({ user_id: userId, title: `🚨 ${b.category} বাজেট পার হয়ে গেছে!`, message: `আপনি ${b.category} খাতে আপনার বাজেটের চেয়ে বেশি খরচ করে ফেলেছেন।`, type: 'danger' });
            } else if (pct >= 90 && !(await hasRecentNotification(supabase, userId, [`${b.category} বাজেটের ৯০%`]))) {
                newNotifications.push({ user_id: userId, title: `⚠️ ${b.category} বাজেটের ৯০% শেষ`, message: `সাবধান! ${b.category} খাতে আপনার বাজেটের প্রায় সব টাকা শেষ।`, type: 'warning' });
            } else if (pct >= 70 && !(await hasRecentNotification(supabase, userId, [`${b.category} বাজেটের ৭০%`]))) {
                newNotifications.push({ user_id: userId, title: `⚡ ${b.category} বাজেটের ৭০% শেষ`, message: `আপনার ${b.category} বাজেটের ৭০% এর বেশি খরচ হয়ে গেছে।`, type: 'info' });
            }
        }

        // 2. Daily Spending Alert
        if (todaySpent > 5000 && !(await hasRecentNotification(supabase, userId, ['অতিরিক্ত খরচ']))) {
            newNotifications.push({ user_id: userId, title: `🔥 আজ অতিরিক্ত খরচ হয়েছে!`, message: `আপনি আজকে ৳${todaySpent.toLocaleString()} খরচ করেছেন যা স্বাভাবিকের চেয়ে অনেক বেশি!`, type: 'danger' });
        }

        // 3. Goal Progress
        for (const g of goals) {
            const pct = (Number(g.saved_amount) / Number(g.target_amount)) * 100;
            if (pct >= 100 && !(await hasRecentNotification(supabase, userId, [`${g.title} সম্পন্ন`], 24 * 30))) {
                newNotifications.push({ user_id: userId, title: `🎉 লক্ষ্য সম্পন্ন: ${g.title}`, message: `অভিনন্দন! আপনি আপনার ${g.title} লক্ষ্যটি সফলভাবে পূরণ করেছেন।`, type: 'success' });
            } else if (pct >= 50 && pct < 100 && !(await hasRecentNotification(supabase, userId, [`${g.title} ৫০%`], 24 * 30))) {
                newNotifications.push({ user_id: userId, title: `🎯 লক্ষ্য অর্ধেক পূরণ!`, message: `দারুণ! ${g.title} লক্ষ্যের ৫০% এর বেশি টাকা আপনি জমিয়ে ফেলেছেন।`, type: 'info' });
            }
        }

        // 4. Loan Reminders
        for (const l of loans) {
            if (!l.due_date) continue;
            const daysLeft = Math.ceil((new Date(l.due_date) - now) / 86400000);
            if (daysLeft === 1 && !(await hasRecentNotification(supabase, userId, ['লোন পরিশোধ']))) {
                newNotifications.push({ user_id: userId, title: `⏳ লোন পরিশোধের রিমাইন্ডার`, message: `আগামীকাল ${l.person_name}-এর সাথের লোন সংক্রান্ত তারিখটি শেষ হচ্ছে।`, type: 'warning' });
            } else if (daysLeft < 0 && !(await hasRecentNotification(supabase, userId, ['দিয়েছে'], 24 * 7))) {
                newNotifications.push({ user_id: userId, title: `⚠️ লোন ওভারডিউ`, message: `${l.person_name}-এর লোন পরিশোধের তারিখ পার হয়ে গেছে!`, type: 'danger' });
            }
        }

        // 11. No-Spend Day (If no expenses today and it's evening)
        if (todaySpent === 0 && now.getHours() >= 20 && !(await hasRecentNotification(supabase, userId, ['নো-স্পেন্ড ডে']))) {
            newNotifications.push({ user_id: userId, title: `🌟 নো-স্পেন্ড ডে এচিভমেন্ট!`, message: `দুর্দান্ত! আজকে আপনি কোনো টাকা খরচ করেননি। এভাবেই সেভ করতে থাকুন!`, type: 'success' });
        }

        // 15. Monthly Financial Report / End of month
        const daysLeftInMonth = daysInMonth - currentDay;
        if (daysLeftInMonth === 1 && !(await hasRecentNotification(supabase, userId, ['মাসের শেষে']))) {
            newNotifications.push({ user_id: userId, title: `📊 মাসের শেষে ফাইন্যান্সিয়াল রিপোর্ট جاهز!`, message: `মাস শেষ হতে আর ১ দিন বাকি। আপনার মাসিক রিপোর্ট পেজে গিয়ে সম্পূর্ণ হিসাব দেখে নিন।`, type: 'info' });
        }

        // 16. AI Money Roast (Fun)
        const totalExp = Object.values(categorySpent).reduce((a, b) => a + b, 0);
        const totalBud = budgets.reduce((a, b) => a + Number(b.amount), 0);
        if (totalExp > totalBud && totalBud > 0 && !(await hasRecentNotification(supabase, userId, ['কীভাবে চলবেন ভাই'], 24 * 5))) {
            newNotifications.push({ user_id: userId, title: `🤡 বাজেট ওভারফ্লো!`, message: `বাজেটের চেয়ে বেশি তো খরচ করেই ফেলেছেন, মাসের বাকি দিনগুলো কি হাওয়া খেয়ে চলবেন? 😂 (AI Roast)`, type: 'warning' });
        }

        // 19. Challenge & Gamification Alerts
        for (const ch of challenges) {
            const pct = (Number(ch.saved_amount) / Number(ch.target_amount)) * 100;
            if (pct >= 100 && ch.status !== 'completed' && !(await hasRecentNotification(supabase, userId, [`চ্যালেঞ্জ সম্পূর্ণ`], 24 * 10))) {
                newNotifications.push({ user_id: userId, title: `🏆 সেভিং চ্যালেঞ্জ সম্পূর্ণ!`, message: `দারুণ! আপনি আপনার "${ch.title}" চ্যালেঞ্জটি সফলভাবে শেষ করেছেন।`, type: 'success' });
            }
        }

        // 7. General Saving Motivation
        if (!(await hasRecentNotification(supabase, userId, ['সেইভিং মোটিভেশন'], 24 * 3))) {
            const tips = [
                'ছোট ছোট সঞ্চয় একসময় বড় সম্পদে পরিণত হয়। আজই কিছু টাকা সেভ করুন!',
                'প্রয়োজন আর শখের মধ্যে পার্থক্য করতে পারলে সঞ্চয় করা অনেক সহজ হয়।',
                'ভবিষ্যতের জন্য আজকের ছোট একটি সেভিংস অনেক বড় নিরাপত্তা দিতে পারে।'
            ];
            const randomTip = tips[Math.floor(Math.random() * tips.length)];
            newNotifications.push({ user_id: userId, title: `💡 সেইভিং মোটিভেশন`, message: randomTip, type: 'info' });
        }

        // Insert new notifications
        if (newNotifications.length > 0) {
            await supabase.from('notifications').insert(newNotifications);

            // Dispatch Web Push Notifications
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

            if (vapidPublicKey && vapidPrivateKey) {
                webpush.setVapidDetails('mailto:contact@smartmoney.com', vapidPublicKey, vapidPrivateKey);

                const { data: subs } = await supabase.from('push_subscriptions').select('keys, endpoint').eq('user_id', userId);

                if (subs && subs.length > 0) {
                    for (const notif of newNotifications) {
                        for (const sub of subs) {
                            try {
                                await webpush.sendNotification({
                                    endpoint: sub.endpoint,
                                    keys: typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys
                                }, JSON.stringify({
                                    title: notif.title,
                                    body: notif.message,
                                    icon: '/samrat-avatar.png'
                                }));
                            } catch (e) {
                                // If gone, remove subscription
                                if (e.statusCode === 410 || e.statusCode === 404) {
                                    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                                } else {
                                    console.error("Push Error:", e);
                                }
                            }
                        }
                    }
                }
            }
        }

    } catch (e) {
        console.error('Error generating notifications:', e);
    }
}
