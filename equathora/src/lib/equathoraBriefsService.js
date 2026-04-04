const DEFAULT_LOCAL_BACKEND = 'http://localhost:5104';

const normalizeBase = (value) => {
    if (!value || typeof value !== 'string') return '';
    return value.trim().replace(/\/$/, '');
};

const buildApiBaseCandidates = () => {
    const explicit = normalizeBase(
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_BACKEND_URL ||
        import.meta.env.VITE_API_BASE_URL
    );

    const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalRuntime = runtimeHost === 'localhost' || runtimeHost === '127.0.0.1';

    const candidates = [];

    if (explicit) {
        candidates.push(explicit);
    }

    if (!explicit || isLocalRuntime) {
        candidates.push('');
    }

    if (isLocalRuntime && !explicit) {
        candidates.push(DEFAULT_LOCAL_BACKEND);
    }

    return [...new Set(candidates)];
};

export async function subscribeToEquathoraBriefs({ full_name, email }) {
    const payload = {
        fullName: String(full_name || '').trim(),
        email: String(email || '').trim().toLowerCase(),
    };

    const failures = [];

    for (const apiBase of buildApiBaseCandidates()) {
        const requestUrl = `${apiBase}/api/briefs/subscribe`;

        try {
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                return;
            }

            let errorMessage = 'Could not save your signup. Please try again.';
            const contentType = response.headers.get('content-type') || '';

            if (contentType.toLowerCase().includes('application/json')) {
                const body = await response.json().catch(() => null);
                errorMessage = body?.error || body?.detail || errorMessage;
            }

            failures.push(`${requestUrl} -> ${response.status}: ${errorMessage}`);
        } catch (error) {
            failures.push(`${requestUrl} -> network error: ${error?.message || 'unknown error'}`);
        }
    }

    throw new Error(failures[0] || 'Could not save your signup. Please try again.');
}
