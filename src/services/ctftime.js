/**
 * CTFtime data service.
 *
 * CTFtime's API does not send Access-Control-Allow-Origin, so a static
 * GitHub Pages site cannot call it directly from the browser. Rather than
 * depend on unreliable third-party CORS proxies (corsproxy.io now requires a
 * paid key, allorigins is frequently down, cors.isomorphic-git returns 403),
 * the data is snapshotted into same-origin static JSON by
 * `scripts/sync-ctftime.mjs`, which runs in CI on a schedule.
 *
 * Strategy:
 *   1. Read /ctftime/events.json for the list & quick-add suggestions.
 *   2. Read /ctftime/event-<id>.json when a snapshot exists.
 *   3. Fall back to a live fetch through dev proxy / public mirrors only if a
 *      snapshot is missing, so the app never hard-depends on a proxy.
 */

const BASE = import.meta.env.BASE_URL || '/';
const REQUEST_TIMEOUT_MS = 12000;

// A snapshot older than this is treated as stale but still usable.
const SNAPSHOT_TTL_MS = 1000 * 60 * 60 * 12;

function withBase(path) {
    return `${BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function fetchWithTimeout(url, init = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function readSnapshot(relativePath) {
    try {
        const res = await fetchWithTimeout(withBase(relativePath), {
            headers: { Accept: 'application/json' },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

/**
 * Extract event ID from a CTFtime URL.
 * Supports: https://ctftime.org/event/1234
 */
export function parseCtftimeUrl(url) {
    const trimmed = String(url ?? '').trim();

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

function normalizeEvent(raw) {
    // The JSON snapshot already stores normalized records (id = "ctftime-<n>")
    // while API responses use the bare numeric id. Accept both so normalizing
    // twice cannot produce "ctftime-ctftime-<n>" or turn the id into a string.
    const numericId = Number(
        raw.ctftimeId ?? String(raw.id ?? '').replace(/^ctftime-/, ''),
    );

    return {
        id: `ctftime-${numericId}`,
        ctftimeId: numericId,
        title: raw.title,
        start: raw.start,
        finish: raw.finish,
        url: raw.url || '',
        ctftimeUrl: raw.ctftime_url || `https://ctftime.org/event/${raw.id}/`,
        logo: raw.logo || null,
        format: raw.format || 'Unknown',
        weight: raw.weight ?? 0,
        location: raw.location || '',
        description: raw.description || '',
        participants: raw.participants ?? 0,
        isCtftime: true,
        addedAt: new Date().toISOString(),
    };
}

/**
 * Last-resort live lookup for events not present in the snapshot.
 * Only used in dev (Vite proxy) or via r.jina.ai, which is the one mirror that
 * still returns CTFtime JSON reliably.
 */
async function fetchLiveEvent(eventId) {
    const target = `https://ctftime.org/api/v1/events/${eventId}/`;

    const urls = import.meta.env.DEV
        ? [`/api/ctftime/events/${eventId}/`]
        : [
              `https://r.jina.ai/http://ctftime.org/api/v1/events/${eventId}/`,
              `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
          ];

    let timedOut = false;

    for (const url of urls) {
        try {
            const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } });
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error(`Event #${eventId} not found on CTFtime.`);
                }
                continue;
            }

            const text = await res.text();

            // r.jina.ai returns HTTP 200 even when the upstream CTFtime URL is a
            // 404, and flags it in the body. Surface that as "not found" rather
            // than silently failing.
            if (/Target URL returned error 404/i.test(text)) {
                throw new Error(`Event #${eventId} not found on CTFtime.`);
            }

            const parsed = extractJson(text);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.id) {
                return parsed;
            }
            continue;
        } catch (err) {
            // A definitive 404 must not be masked by a later proxy failure or timeout.
            if (err?.message?.includes('not found on CTFtime')) throw err;

            if (err?.name === 'AbortError') {
                timedOut = true;
            }
        }
    }

    if (timedOut) throw new Error('CTFtime request timed out. Please try again.');

    throw new Error(
        `Event #${eventId} isn't in the local CTFtime snapshot yet. It will appear after the next sync, or you can add it manually.`,
    );
}

/**
 * Recover a JSON object/array from a response that may be plain JSON or wrapped
 * in text (r.jina.ai adds "Title:"/"Markdown Content:" preamble).
 */
function extractJson(text) {
    if (!text) return null;

    // Fast path: already JSON.
    try {
        return JSON.parse(text);
    } catch {
        // fall through
    }

    // Object
    const objStart = text.indexOf('{');
    const objEnd = text.lastIndexOf('}');
    if (objStart !== -1 && objEnd > objStart) {
        try {
            return JSON.parse(text.slice(objStart, objEnd + 1));
        } catch {
            // fall through
        }
    }

    // Array
    const arrStart = text.indexOf('[');
    const arrEnd = text.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd > arrStart) {
        try {
            return JSON.parse(text.slice(arrStart, arrEnd + 1));
        } catch {
            // fall through
        }
    }

    return null;
}

/**
 * Fetch a single event. Prefers the bundled snapshot, falls back to a live read.
 */
export async function fetchCtftimeEvent(eventId) {
    const snapshot = await readSnapshot(`ctftime/event-${eventId}.json`);
    if (snapshot?.event) {
        return normalizeEvent(snapshot.event);
    }

    // Fall back to the bulk snapshot (no extra request in the common case).
    const bulk = await readSnapshot('ctftime/events.json');
    if (bulk?.events) {
        const found = bulk.events.find((e) => Number(e.ctftimeId) === Number(eventId));
        if (found) return normalizeEvent(found);
    }

    const live = await fetchLiveEvent(eventId);
    return normalizeEvent(live);
}

/**
 * Quick-add suggestions, derived from the static snapshot.
 * @param {number} limitPerGroup
 */
export async function fetchCtftimeSuggestions(limitPerGroup = 6) {
    const snapshot = await readSnapshot('ctftime/events.json');

    if (!snapshot?.events?.length) {
        throw new Error('CTFtime snapshot is not available yet. Please add the event manually or retry shortly.');
    }

    const now = Date.now();

    const normalized = snapshot.events
        .map(normalizeEvent)
        .filter((event) => {
            const start = Date.parse(event.start);
            const finish = Date.parse(event.finish);
            return Number.isFinite(start) && Number.isFinite(finish) && finish > now;
        })
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

    const running = normalized
        .filter((e) => Date.parse(e.start) <= now && now <= Date.parse(e.finish))
        .slice(0, limitPerGroup);

    const upcoming = normalized
        .filter((e) => Date.parse(e.start) > now)
        .slice(0, limitPerGroup);

    return {
        running,
        upcoming,
        generatedAt: snapshot.generatedAt || null,
        isStale: isStale(snapshot.generatedAt),
    };
}

function isStale(generatedAt) {
    const ts = Date.parse(generatedAt);
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts > SNAPSHOT_TTL_MS;
}
