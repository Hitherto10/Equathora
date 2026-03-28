import { supabase } from './supabaseClient';

const keyForUser = (userId) => `equathora_last_activity_ping_${userId}`;

const todayIso = () => new Date().toISOString().split('T')[0];

// Track one activity event per user per day to power DAU/WAU analytics.
export async function trackDailyActivity() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const today = todayIso();
        const key = keyForUser(userId);
        if (localStorage.getItem(key) === today) return;

        const { error } = await supabase
            .from('user_activity_events')
            .insert({
                user_id: userId,
                event_type: 'app_active',
                event_date: today,
                created_at: new Date().toISOString()
            });

        if (error) {
            // Keep this best-effort: analytics tracking must never block app usage.
            console.warn('Activity tracking failed:', error.message || error);
            return;
        }

        localStorage.setItem(key, today);
    } catch (error) {
        console.warn('Activity tracking error:', error);
    }
}
