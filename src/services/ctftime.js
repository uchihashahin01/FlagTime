/**
 * CTFtime API Service
 * Dev: uses Vite proxy (/api/ctftime/…)
 * Prod: uses corsproxy.io to bypass CORS on static hosting
 */

const isDev = import.meta.env.DEV;
const REQUEST_TIMEOUT_MS = 12000;

const CTF_LIST_QUERY = 'year=2026&online=-1&format=0&restrictions=-1';

function getCtftimeApiTarget(path) {
    return `https://ctftime.org/api/v1${path}`;
}

function getProdProxyUrls(path) {
    const target = getCtftimeApiTarget(path);

    return [
        `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
        `https://cors.isomorphic-git.org/${target}`,
    ];
}

function getProdTextProxyUrls(targetUrl) {
    return [
        `https://r.jina.ai/http://${targetUrl.replace(/^https?:\/\//i, '')}`,
        `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    ];
}

/**
 * Build the fetch URL for a CTFtime API endpoint.
 * In dev → /api/ctftime/events/{id}/  (Vite proxy)
 * In prod → corsproxy.io wrapping the real CTFtime URL
 */
function buildApiUrl(path) {
    if (isDev) {
        return `/api/ctftime${path}`;
    }
    return getProdProxyUrls(path)[0];
}

async function fetchCtftime(path) {
    const urls = isDev ? [buildApiUrl(path)] : getProdProxyUrls(path);
    let lastError = null;

    for (const url of urls) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const res = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                },
                signal: controller.signal,
            });

            if (!res.ok && (res.status === 403 || res.status === 429 || res.status >= 500) && !isDev) {
                lastError = new Error(`Proxy responded with ${res.status}.`);
                continue;
            }

            return res;
        } catch (err) {
            if (err?.name === 'AbortError') {
                lastError = new Error('CTFtime request timed out. Please try again.');
                continue;
            }
            lastError = err;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    if (lastError?.message?.includes('timed out')) {
        throw lastError;
    }

    throw new Error('Unable to reach CTFtime right now. Proxy service returned 403/429 or is unavailable. Please retry in a moment.');
}

async function fetchTextWithFallback(urls) {
    let lastError = null;

    for (const url of urls) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const res = await fetch(url, {
                headers: {
                    Accept: 'text/plain,text/html,application/json',
                },
                signal: controller.signal,
            });

            if (!res.ok) {
                lastError = new Error(`Source responded with ${res.status}.`);
                continue;
            }

            const text = await res.text();
            if (!text || !text.trim()) {
                lastError = new Error('Source returned an empty response.');
                continue;
            }

            return text;
        } catch (err) {
            if (err?.name === 'AbortError') {
                lastError = new Error('CTFtime request timed out. Please try again.');
                continue;
            }
            lastError = err;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    if (lastError?.message?.includes('timed out')) {
        throw lastError;
    }

    throw new Error('Unable to load CTFtime list data right now. Please retry in a moment.');
}

function parseJinaWrappedJson(text) {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) return null;

    try {
        const slice = text.slice(start, end + 1);
        const parsed = JSON.parse(slice);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function parseRunningRowsFromMarkdown(markdown) {
    const rows = [];
    const rowRegex = /^\|\s*\[([^\]]+)\]\(https?:\/\/ctftime\.org\/event\/(\d+)\)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm;

    for (const match of markdown.matchAll(rowRegex)) {
        const title = match[1].trim();
        const eventId = match[2].trim();
        const dateRange = match[3].trim();
        const format = match[4].trim();
        const location = match[5].trim();

        rows.push({
            id: `ctftime-${eventId}`,
            ctftimeId: Number(eventId),
            title,
            start: '',
            finish: '',
            displayRange: dateRange,
            url: `https://ctftime.org/event/${eventId}/`,
            ctftimeUrl: `https://ctftime.org/event/${eventId}/`,
            logo: null,
            format,
            weight: 0,
            location,
            description: '',
            participants: 0,
            isCtftime: true,
            addedAt: new Date().toISOString(),
        });
    }

    return rows;
}

async function fetchRunningFromListFallback(limitPerGroup) {
    const target = `https://ctftime.org/event/list/?${CTF_LIST_QUERY}&now=true`;
    const urls = isDev ? [target] : getProdTextProxyUrls(target);
    const text = await fetchTextWithFallback(urls);
    return parseRunningRowsFromMarkdown(text).slice(0, limitPerGroup);
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

    let rows = await res.json();

    // r.jina.ai wraps JSON inside markdown-like content; recover raw array when needed.
    if (!Array.isArray(rows)) {
        const asText = typeof rows === 'string' ? rows : JSON.stringify(rows);
        rows = parseJinaWrappedJson(asText);
    }

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

    let running = normalized
        .filter((event) => {
            const start = Date.parse(event.start);
            const finish = Date.parse(event.finish);
            return start <= now && now <= finish;
        })
        .slice(0, limitPerGroup);

    if (running.length === 0) {
        try {
            running = await fetchRunningFromListFallback(limitPerGroup);
        } catch {
            // Keep empty list if fallback fails.
        }
    }

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
