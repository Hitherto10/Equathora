import { supabase } from './supabaseClient';

const PAGE_SIZE = 1000;

export async function getAdminEmailBriefSubscribers() {
    let from = 0;
    let done = false;
    const rows = [];

    while (!done) {
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await supabase
            .from('equathora_briefs_list')
            .select('name,email,created_at')
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            throw new Error(error.message || 'Failed to load email briefs subscribers.');
        }

        const chunk = data || [];
        rows.push(...chunk);

        if (chunk.length < PAGE_SIZE) {
            done = true;
        } else {
            from += PAGE_SIZE;
        }
    }

    return rows.map((row) => ({
        name: String(row.name || '').trim(),
        email: String(row.email || '').trim().toLowerCase(),
        createdAt: row.created_at ? new Date(row.created_at) : null,
    }));
}
