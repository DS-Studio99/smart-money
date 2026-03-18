import { createAdminClient } from './supabase-server';
import webpush from 'web-push';

// ═══ Helper: Dedup Check ═══════════════════════════════════
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

// ═══ Helper: Send Web Push ═════════════════════════════════
async function sendWebPush(supabase, userId, notification) {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublicKey || !vapidPrivateKey) return;

    try {
        webpush.setVapidDetails('mailto:contact@smartmoney.com', vapidPublicKey, vapidPrivateKey);
        const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('keys, endpoint')
            .eq('user_id', userId);

        if (!subs || subs.length === 0) return;

        const payload = JSON.stringify({
            title: notification.title,
            body: notification.message,
            icon: '/samrat-avatar.png',
            badge: '/samrat-avatar.png',
            tag: `smart-money-${notification.type}-${Date.now()}`,
            type: notification.type,
            url: notification.url || '/notifications',
            requireInteraction: notification.type === 'danger',
        });

        for (const sub of subs) {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys
                }, payload);
            } catch (e) {
                if (e.statusCode === 410 || e.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                }
            }
        }
    } catch (e) {
        console.error('[Push] Error:', e.message);
    }
}

// ═══ MAIN: Generate All Smart Notifications ════════════════
export async function generateAllNotifications(userId, userSettings = {}) {
    const supabase = createAdminClient();
    if (!supabase) return;

    try {
        // Bangladesh time (UTC+6)
        const now = new Date(new Date().getTime() + 6 * 60 * 60 * 1000);
        const month = now.getUTCMonth() + 1;
        const year = now.getUTCFullYear();
        const currentDay = now.getUTCDate();
        const currentHour = now.getUTCHours();
        const daysInMonth = new Date(year, month, 0).getDate();
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;
        const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

        // ─── Fetch all data ────────────────────────────────
        const [expRes, budRes, goalRes, loanRes, profRes, last7Res, prevMonthRes] = await Promise.all([
            supabase.from('expenses').select('*').eq('user_id', userId).gte('date', startDate).lte('date', endDate),
            supabase.from('budgets').select('*').eq('user_id', userId).eq('month', month).eq('year', year),
            supabase.from('goals').select('*').eq('user_id', userId),
            supabase.from('loans').select('*').eq('user_id', userId).eq('status', 'active'),
            supabase.from('profiles').select('*').eq('id', userId).single(),
            // Last 7 days
            supabase.from('expenses').select('amount, category, date')
                .eq('user_id', userId)
                .gte('date', new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0])
                .lte('date', todayStr),
            // Previous month
            supabase.from('expenses').select('amount, category')
                .eq('user_id', userId)
                .gte('date', `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}-01`)
                .lte('date', `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}-31`),
        ]);

        const expenses = expRes.data || [];
        const budgets = budRes.data || [];
        const goals = goalRes.data || [];
        const loans = loanRes.data || [];
        const profile = profRes.data || {};
        const last7Expenses = last7Res.data || [];
        const prevMonthExpenses = prevMonthRes.data || [];

        const userName = profile.name || 'আপনি';
        const monthlyIncome = Number(profile.monthly_income || 0);

        // ─── Calculations ──────────────────────────────────
        const categorySpent = {};
        const categoryCount = {};
        let todayTotal = 0;
        let todayCount = 0;

        expenses.forEach(e => {
            categorySpent[e.category] = (categorySpent[e.category] || 0) + Number(e.amount);
            categoryCount[e.category] = (categoryCount[e.category] || 0) + 1;
            if (e.date === todayStr) {
                todayTotal += Number(e.amount);
                todayCount++;
            }
        });

        const totalExpenses = Object.values(categorySpent).reduce((a, b) => a + b, 0);
        const totalBudget = budgets.reduce((a, b) => a + Number(b.amount), 0);
        const savings = monthlyIncome - totalExpenses;

        // Last 7 days total
        const last7Total = last7Expenses.reduce((s, e) => s + Number(e.amount), 0);
        // Previous 7 days (ending 7 days ago)
        const prev7Total = prevMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);

        // Daily average this month
        const dailyAvg = currentDay > 0 ? totalExpenses / currentDay : 0;

        // Top spending category
        const topCat = Object.entries(categorySpent).sort((a, b) => b[1] - a[1])[0];
        const topCatPrev = {};
        prevMonthExpenses.forEach(e => {
            topCatPrev[e.category] = (topCatPrev[e.category] || 0) + Number(e.amount);
        });
        const prevTopCatAmount = topCatPrev[topCat?.[0]] || 0;

        const newNotifications = [];

        // ════════════════════════════════════════════════════
        // 1. 💡 SMART BUDGET ALERTS
        // ════════════════════════════════════════════════════
        for (const b of budgets) {
            const spent = categorySpent[b.category] || 0;
            const limit = Number(b.amount);
            if (limit <= 0) continue;
            const pct = (spent / limit) * 100;

            // 🛑 Budget Exceeded
            if (pct > 100 && !(await hasRecentNotification(supabase, userId, [`${b.category} বাজেট পার`]))) {
                newNotifications.push({
                    user_id: userId,
                    title: `🚨 ${b.category} বাজেট পার হয়ে গেছে!`,
                    message: `⚠️ আপনি বাজেট ছাড়িয়ে গেছেন! ${b.category} খাতে বাজেট ছিল ৳${limit.toLocaleString()}, খরচ হয়েছে ৳${spent.toLocaleString()} (${Math.round(pct)}%)।`,
                    type: 'danger', url: '/expenses'
                });
            }
            // ⚠️ 90% used
            else if (pct >= 90 && !(await hasRecentNotification(supabase, userId, [`${b.category} বাজেটের ৯০%`]))) {
                newNotifications.push({
                    user_id: userId,
                    title: `⚠️ ${b.category} বাজেটের ৯০% শেষ!`,
                    message: `🛑 এখনই খরচ বন্ধ করুন! ${b.category} বাজেট প্রায় শেষ। মাত্র ৳${Math.round(limit - spent).toLocaleString()} বাকি আছে।`,
                    type: 'warning', url: '/budget'
                });
            }
            // ⚡ 75% used
            else if (pct >= 75 && !(await hasRecentNotification(supabase, userId, [`${b.category} বাজেটের ৭৫%`]))) {
                newNotifications.push({
                    user_id: userId,
                    title: `⚡ ${b.category} বাজেটের ৭৫% ব্যবহার`,
                    message: `${b.category} খাতে ৳${limit.toLocaleString()} বাজেটের মধ্যে ৳${spent.toLocaleString()} খরচ হয়েছে। ৳${Math.round(limit - spent).toLocaleString()} বাকি আছে।`,
                    type: 'info', url: '/budget'
                });
            }
        }

        // ════════════════════════════════════════════════════
        // 2. 💸 HIGH SPENDING ALERTS
        // ════════════════════════════════════════════════════

        // Today's spending alert (dynamic threshold based on daily avg)
        const spendingThreshold = dailyAvg > 0 ? dailyAvg * 1.5 : 3000;
        if (todayTotal > spendingThreshold && todayTotal > 500 && !(await hasRecentNotification(supabase, userId, ['আজ অতিরিক্ত খরচ']))) {
            newNotifications.push({
                user_id: userId,
                title: `💸 আজ অতিরিক্ত খরচ হয়েছে!`,
                message: `আজ আপনার খরচ স্বাভাবিকের চেয়ে বেশি! আজকের মোট খরচ: ৳${todayTotal.toLocaleString()} (গড়ের ${Math.round((todayTotal / dailyAvg) * 100)}%)।`,
                type: 'warning', url: '/expenses'
            });
        }

        // ════════════════════════════════════════════════════
        // 3. 📅 DAILY REMINDER (User hasn't added expense today)
        // ════════════════════════════════════════════════════
        if (todayCount === 0 && currentHour >= 20 && !(await hasRecentNotification(supabase, userId, ['আজকের খরচ যোগ করা হয়নি']))) {
            newNotifications.push({
                user_id: userId,
                title: `📅 আজকের খরচ এখনো যোগ করা হয়নি`,
                message: `${userName}, আজকের খরচ রেকর্ড করুন! দৈনিক ট্র্যাকিং আপনার অর্থ ব্যবস্থাপনাকে আরো উন্নত করবে।`,
                type: 'reminder', url: '/expenses'
            });
        }

        // Afternoon reminder
        if (todayCount === 0 && currentHour >= 14 && currentHour < 16 && !(await hasRecentNotification(supabase, userId, ['দুপুরের রিমাইন্ডার'], 6))) {
            newNotifications.push({
                user_id: userId,
                title: `☀️ দুপুরের রিমাইন্ডার`,
                message: `এখন পর্যন্ত আজকের কোনো খরচ যোগ করা হয়নি। সন্ধ্যায় ভুলে যাওয়ার আগে এখনই রেকর্ড করুন!`,
                type: 'info', url: '/expenses'
            });
        }

        // ════════════════════════════════════════════════════
        // 4. 🧠 SMART AI LOGIC / BEHAVIOR ANALYSIS
        // ════════════════════════════════════════════════════

        // Weekly comparison: "গত সপ্তাহে বেশি খরচ"
        const prevWeekTotal = prevMonthExpenses.slice(0, 7).reduce((s, e) => s + Number(e.amount), 0);
        const weeklyDiff = last7Total - prevWeekTotal;
        if (weeklyDiff > 1000 && weeklyDiff > 0 && !(await hasRecentNotification(supabase, userId, ['গত সপ্তাহের তুলনায়']))) {
            newNotifications.push({
                user_id: userId,
                title: `📊 গত সপ্তাহের তুলনায় বেশি খরচ`,
                message: `🎯 ${userName}, আপনি গত সপ্তাহে ৳${weeklyDiff.toLocaleString()} বেশি খরচ করেছেন। এই সপ্তাহে সতর্ক থাকুন।`,
                type: 'warning', url: '/expenses'
            });
        }

        // Top category growth
        if (topCat && prevTopCatAmount > 0) {
            const growth = ((topCat[1] - prevTopCatAmount) / prevTopCatAmount) * 100;
            if (growth > 30 && topCat[1] > 1000 && !(await hasRecentNotification(supabase, userId, [`${topCat[0]} খরচ বেড়েছে`]))) {
                newNotifications.push({
                    user_id: userId,
                    title: `📈 ${topCat[0]} খরচ বেড়েছে`,
                    message: `⚠️ এই মাসে ${topCat[0]} খাতে খরচ গত মাসের তুলনায় ${Math.round(growth)}% বেড়েছে! এখন পর্যন্ত ৳${topCat[1].toLocaleString()} খরচ হয়েছে।`,
                    type: 'warning', url: '/expenses'
                });
            }
        }

        // ════════════════════════════════════════════════════
        // 5. 🎯 PERSONALIZED SMART SUGGESTIONS
        // ════════════════════════════════════════════════════
        const suggestions = [
            { cat: 'বাজার খরচ', tip: 'বাসায় রান্না করলে মাসে ৳৩০০০-৫০০০ সেভ সম্ভব!' },
            { cat: 'যাতায়াত', tip: 'পাবলিক ট্রান্সপোর্ট ব্যবহার করলে মাসে ৳১০০০-২০০০ সেভ হতে পারে।' },
            { cat: 'বিনোদন', tip: 'বিনোদন বাজেট ঠিক করলে অযথা খরচ এড়ানো সহজ হয়।' },
            { cat: 'কেনাকাটা', tip: 'প্রয়োজন তালিকা তৈরি করে কেনাকাটায় গেলে ২০-৩০% কম খরচ হয়।' },
        ];

        for (const s of suggestions) {
            if (categorySpent[s.cat] > 2000 && !(await hasRecentNotification(supabase, userId, [`${s.cat} টিপস`], 72))) {
                newNotifications.push({
                    user_id: userId,
                    title: `🧩 ${s.cat} সাশ্রয়ের টিপস`,
                    message: `💡 ${s.tip} এই মাসে ${s.cat} খাতে ৳${categorySpent[s.cat].toLocaleString()} খরচ হয়েছে।`,
                    type: 'info', url: '/expenses'
                });
                break; // Only one suggestion at a time
            }
        }

        // ════════════════════════════════════════════════════
        // 6. 🏆 GOAL & ACHIEVEMENT ALERTS
        // ════════════════════════════════════════════════════
        for (const g of goals) {
            const pct = Number(g.target_amount) > 0 ? (Number(g.saved_amount) / Number(g.target_amount)) * 100 : 0;

            if (pct >= 100 && !(await hasRecentNotification(supabase, userId, [`${g.title} সম্পন্ন`], 24 * 30))) {
                newNotifications.push({
                    user_id: userId,
                    title: `🎉 লক্ষ্য সম্পন্ন: ${g.title}`,
                    message: `অভিনন্দন ${userName}! 🎊 "${g.title}" লক্ষ্যটি সফলভাবে পূরণ করেছেন। পরবর্তী লক্ষ্য ঠিক করুন!`,
                    type: 'success', url: '/goals'
                });
            } else if (pct >= 75 && pct < 100 && !(await hasRecentNotification(supabase, userId, [`${g.title} ৭৫%`], 24 * 7))) {
                newNotifications.push({
                    user_id: userId,
                    title: `🎯 লক্ষ্যের ৭৫% পূরণ!`,
                    message: `দারুণ অগ্রগতি! "${g.title}" লক্ষ্যের ৭৫% সম্পন্ন। মাত্র ৳${Math.round(Number(g.target_amount) - Number(g.saved_amount)).toLocaleString()} বাকি!`,
                    type: 'success', url: '/goals'
                });
            }
        }

        // ════════════════════════════════════════════════════
        // 7. 🤝 LOAN ALERTS
        // ════════════════════════════════════════════════════
        for (const l of loans) {
            if (!l.due_date) continue;
            const daysLeft = Math.ceil((new Date(l.due_date) - now) / 86400000);
            const isTaken = l.type === 'taken';
            const remaining = Number(l.amount) - Number(l.paid_amount);

            if (daysLeft < 0 && !(await hasRecentNotification(supabase, userId, [`${l.person_name} লোন ওভারডিউ`], 24 * 3))) {
                newNotifications.push({
                    user_id: userId,
                    title: `⚠️ লোন ওভারডিউ — ${l.person_name}`,
                    message: `${isTaken ? `${l.person_name}-কে ফেরত দেওয়ার` : `${l.person_name}-এর কাছ থেকে পাওয়ার`} সময়সীমা ${Math.abs(daysLeft)} দিন আগে পার হয়েছে! বাকি: ৳${remaining.toLocaleString()}`,
                    type: 'danger', url: '/loans'
                });
            } else if (daysLeft === 3 && !(await hasRecentNotification(supabase, userId, [`${l.person_name} ৩ দিন`]))) {
                newNotifications.push({
                    user_id: userId,
                    title: `⏳ লোন সময়সীমা — ৩ দিন বাকি`,
                    message: `${isTaken ? `${l.person_name}-কে ৳${remaining.toLocaleString()} ফেরত দিতে হবে।` : `${l.person_name}-এর কাছ থেকে ৳${remaining.toLocaleString()} পাওয়ার কথা।`} ৩ দিন বাকি।`,
                    type: 'warning', url: '/loans'
                });
            } else if (daysLeft === 1 && !(await hasRecentNotification(supabase, userId, [`${l.person_name} আগামীকাল`]))) {
                newNotifications.push({
                    user_id: userId,
                    title: `🚨 কাল লোনের শেষ দিন!`,
                    message: `${isTaken ? `আগামীকাল ${l.person_name}-কে ৳${remaining.toLocaleString()} ফেরত দিতে হবে।` : `আগামীকাল ${l.person_name}-এর কাছ থেকে ৳${remaining.toLocaleString()} পাওয়ার কথা।`}`,
                    type: 'danger', url: '/loans'
                });
            }
        }

        // ════════════════════════════════════════════════════
        // 8. 🔥 BEHAVIOR TRACKING
        // ════════════════════════════════════════════════════

        // Savings rate alert
        if (monthlyIncome > 0) {
            const savingsRate = (savings / monthlyIncome) * 100;
            if (savingsRate < 0 && !(await hasRecentNotification(supabase, userId, ['আয়ের বেশি খরচ']))) {
                newNotifications.push({
                    user_id: userId,
                    title: `🚨 আয়ের বেশি খরচ হচ্ছে!`,
                    message: `এই মাসে আয়ের (৳${monthlyIncome.toLocaleString()}) চেয়ে ৳${Math.abs(savings).toLocaleString()} বেশি খরচ হয়েছে! এখনই নিয়ন্ত্রণ করুন।`,
                    type: 'danger', url: '/budget'
                });
            } else if (savingsRate >= 20 && !(await hasRecentNotification(supabase, userId, ['দারুণ সঞ্চয়'], 72))) {
                newNotifications.push({
                    user_id: userId,
                    title: `💎 দারুণ সঞ্চয় হচ্ছে!`,
                    message: `${userName}, এই মাসে আয়ের ${Math.round(savingsRate)}% সেভ হচ্ছে! ৳${savings.toLocaleString()} সঞ্চয় হয়েছে। এই ধারা বজায় রাখুন! 🌟`,
                    type: 'success', url: '/goals'
                });
            }
        }

        // Month end projection alert
        const daysLeftInMonth = daysInMonth - currentDay;
        if (daysLeftInMonth <= 3 && totalBudget > 0 && !(await hasRecentNotification(supabase, userId, ['মাস শেষে রিপোর্ট']))) {
            const projectedEnd = dailyAvg * daysInMonth;
            newNotifications.push({
                user_id: userId,
                title: `📊 মাস শেষ হতে ${daysLeftInMonth} দিন বাকি`,
                message: `এই মাসে মোট খরচ: ৳${totalExpenses.toLocaleString()}। মাসিক রিপোর্ট পেজে গিয়ে সম্পূর্ণ বিশ্লেষণ দেখুন।`,
                type: 'info', url: '/report'
            });
        }

        // 🌟 No-spend day achievement
        if (todayTotal === 0 && currentHour >= 22 && !(await hasRecentNotification(supabase, userId, ['নো-স্পেন্ড ডে']))) {
            newNotifications.push({
                user_id: userId,
                title: `🌟 নো-স্পেন্ড ডে এচিভমেন্ট!`,
                message: `দুর্দান্ত ${userName}! আজকে কোনো টাকা খরচ করেননি। এই টাকা সেভিং লক্ষ্যে যোগ করুন!`,
                type: 'success', url: '/goals'
            });
        }

        // 💡 Motivation (every 3 days)
        if (!(await hasRecentNotification(supabase, userId, ['স্মার্ট মানি টিপস'], 72))) {
            const tips = [
                'ছোট ছোট সঞ্চয় একসময় বড় সম্পদে পরিণত হয়। আজই কিছু টাকা সেভ করুন! 💪',
                '৫০/৩০/২০ নিয়ম: আয়ের ৫০% প্রয়োজনে, ৩০% শখে, ২০% সঞ্চয়ে ব্যবহার করুন।',
                'মাসিক বাজেট করুন এবং প্রতিটি খরচ ট্র্যাক করুন — সম্পদ তৈরির প্রথম পদক্ষেপ!',
                'ইমার্জেন্সি ফান্ড গড়ুন: ৩-৬ মাসের খরচ আলাদা রাখলে যেকোনো বিপদে টিকে থাকা যায়।',
            ];
            newNotifications.push({
                user_id: userId,
                title: `💡 স্মার্ট মানি টিপস`,
                message: tips[Math.floor(Math.random() * tips.length)],
                type: 'info', url: '/dashboard'
            });
        }

        // ════════════════════════════════════════════════════
        // INSERT & PUSH
        // ════════════════════════════════════════════════════
        if (newNotifications.length > 0) {
            await supabase.from('notifications').insert(newNotifications);

            // Send push notifications for important ones
            const pushWorthy = newNotifications.filter(n =>
                ['danger', 'warning', 'reminder'].includes(n.type)
            );

            for (const notif of pushWorthy) {
                await sendWebPush(supabase, userId, notif);
            }

            // Also send info/success (non-spammy)
            const infoNotifs = newNotifications.filter(n => ['success', 'info'].includes(n.type));
            if (infoNotifs.length > 0) {
                await sendWebPush(supabase, userId, infoNotifs[0]); // Max 1 info push
            }
        }

    } catch (e) {
        console.error('[NotificationService] Error:', e);
    }
}

// ═══ Scheduled Check for All Users ════════════════════════
export async function runScheduledNotificationsForAllUsers() {
    const supabase = createAdminClient();
    if (!supabase) return;

    try {
        const { data: users } = await supabase.from('profiles').select('id, name');
        if (!users) return;

        console.log(`[Scheduler] Running notifications for ${users.length} users`);
        for (const user of users) {
            await generateAllNotifications(user.id);
        }
        console.log('[Scheduler] Done.');
    } catch (e) {
        console.error('[Scheduler] Error:', e.message);
    }
}

// ═══ Send Single Push to User ══════════════════════════════
export async function sendDirectPush(userId, title, body, type = 'info', url = '/notifications') {
    const supabase = createAdminClient();
    await sendWebPush(supabase, userId, { title, message: body, type, url });
}
