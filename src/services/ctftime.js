/**
 * CTFtime API Service
 * Dev: uses Vite proxy (/api/ctftime/…)
 * Prod: uses corsproxy.io to bypass CORS on static hosting
 */

const isDev = import.meta.env.DEV;
const REQUEST_TIMEOUT_MS = 12000;

/**
 * Build the fetch URL for a CTFtime API endpoint.
 * In dev → /api/ctftime/events/{id}/  (Vite proxy)
 * In prod → corsproxy.io wrapping the real CTFtime URL
 */
function buildApiUrl(path) {
    if (isDev) {
        return `/api/ctftime${path}`;
    }
    const target = `https://ctftime.org/api/v1${path}`;
    return `https://corsproxy.io/?url=${encodeURIComponent(target)}`;
}

async function fetchCtftime(path) {
    const url = buildApiUrl(path);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            headers: {
                Accept: 'application/json',
            },
            signal: controller.signal,
        });
        return res;
    } catch (err) {
        if (err?.name === 'AbortError') {
            throw new Error('CTFtime request timed out. Please try again.');
        }
        throw new Error('Unable to reach CTFtime right now. Check your connection and retry.');
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Extract event ID from a CTFtime URL.
 * Supports: https://ctftime.org/event/1234, https://ctftime.org/event/1234/
 */
export function parseCtftimeUrl(url) {
    const trimmed = url.trim();

    if (!trimmed) {
        throw new Error('Please provide a CTFtime event URL.');
    }

    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let parsed;

    try {
        parsed = new URL(normalized);
    } catch {
        throw new Error('Invalid CTFtime URL. Expected format: https://ctftime.org/event/1234');
    }

    if (!parsed.hostname.toLowerCase().endsWith('ctftime.org')) {
        throw new Error('Invalid CTFtime URL. Expected format: https://ctftime.org/event/1234');
    }

    const match = parsed.pathname.match(/\/event\/(\d+)(?:\/|$)/i);
    if (!match) {
        throw new Error('Invalid CTFtime URL. Expected format: https://ctftime.org/event/1234');
    }
    return match[1];
}

/**
 * Fetch event details from CTFtime API.
 */
export async function fetchCtftimeEvent(eventId) {
    const res = await fetchCtftime(`/events/${eventId}/`);

    if (!res.ok) {
        if (res.status === 404) {
            throw new Error(`Event #${eventId} not found on CTFtime.`);
        }
        throw new Error(`CTFtime API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return normalizeEvent(data);
}

/**
 * Fetch quick-add suggestions from CTFtime and split into running/upcoming buckets.
 */
export async function fetchCtftimeSuggestions(limitPerGroup = 6) {
    const res = await fetchCtftime('/events/');

    if (!res.ok) {
        throw new Error(`CTFtime API error: ${res.status} ${res.statusText}`);
    }

    const rows = await res.json();
    if (!Array.isArray(rows)) {
        throw new Error('Unexpected CTFtime response while loading suggestions.');
    }

    const now = Date.now();
    const normalized = rows
        .map(normalizeEvent)
        .filter((event) => {
            const start = Date.parse(event.start);
            const finish = Date.parse(event.finish);
            return Number.isFinite(start) && Number.isFinite(finish) && finish > now;
        })
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

    const running = normalized
        .filter((event) => {
            const start = Date.parse(event.start);
            const finish = Date.parse(event.finish);
            return start <= now && now <= finish;
        })
        .slice(0, limitPerGroup);

    const upcoming = normalized
        .filter((event) => Date.parse(event.start) > now)
        .slice(0, limitPerGroup);

    return { running, upcoming };
}

/**
 * Normalize raw CTFtime API response into our app shape.
 */
function normalizeEvent(raw) {
    return {
        id: `ctftime-${raw.id}`,
        ctftimeId: raw.id,
        title: raw.title,
        start: raw.start,
        finish: raw.finish,
        url: raw.url,
        ctftimeUrl: raw.ctftime_url || `https://ctftime.org/event/${raw.id}/`,
        logo: raw.logo || null,
        format: raw.format || 'Unknown',
        weight: raw.weight || 0,
        location: raw.location || '',
        description: raw.description || '',
        participants: raw.participants || 0,
        isCtftime: true,
        addedAt: new Date().toISOString(),
    };
}
