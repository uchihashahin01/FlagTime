/**
 * CTFtime API Service
 * Dev: uses Vite proxy (/api/ctftime/…)
 * Prod: uses corsproxy.io to bypass CORS on static hosting
 */

const isDev = import.meta.env.DEV;

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

/**
 * Extract event ID from a CTFtime URL.
 * Supports: https://ctftime.org/event/1234, https://ctftime.org/event/1234/
 */
export function parseCtftimeUrl(url) {
    const trimmed = url.trim();
    const match = trimmed.match(/ctftime\.org\/event\/(\d+)/i);
    if (!match) {
        throw new Error('Invalid CTFtime URL. Expected format: https://ctftime.org/event/1234');
    }
    return match[1];
}

/**
 * Fetch event details from CTFtime API.
 */
export async function fetchCtftimeEvent(eventId) {
    const url = buildApiUrl(`/events/${eventId}/`);

    const res = await fetch(url, {
        headers: {
            Accept: 'application/json',
        },
    });

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
