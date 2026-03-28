export async function getAdminAnalytics({ range = 'week', weekOffset = 0 } = {}) {
    const apiBase = import.meta.env.VITE_API_URL || '';
    const params = new URLSearchParams({
        range,
        weekOffset: String(Math.max(0, Number(weekOffset) || 0))
    });

    const response = await fetch(`${apiBase}/api/admin/analytics?${params.toString()}`, {
        method: 'GET'
    });

    if (!response.ok) {
        let details = '';
        try {
            const errBody = await response.json();
            details = errBody?.error || errBody?.message || '';
        } catch {
            // Ignore JSON parse errors for non-JSON error payloads.
        }

        throw new Error(
            details
                ? `Failed to fetch admin analytics (${response.status}): ${details}`
                : `Failed to fetch admin analytics (${response.status})`
        );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        throw new Error(
            'Admin analytics API returned a non-JSON response. Check VITE_API_URL/backend routing for /api/admin/analytics.'
        );
    }

    return response.json();
}
