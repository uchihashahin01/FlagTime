#!/usr/bin/env node
/**
 * Sync CTFtime data into static JSON snapshots.
 *
 * CTFtime's API sends no Access-Control-Allow-Origin header, so a static
 * GitHub Pages site cannot call it from the browser. Instead of depending on
 * fragile third-party CORS proxies, this script runs in CI (and locally) with
 * a real User-Agent, writes JSON into public/ctftime/, and the app just reads
 * same-origin static files. No proxy, no rate limits, no third party.
 *
 * Output:
 *   public/ctftime/events.json       - all upcoming + recently running events
 *   public/ctftime/event-<id>.json   - individual events looked up on demand
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const API = 'https://ctftime.org/api/v1';
const OUT_DIR = path.join(process.cwd(), 'public', 'ctftime');
const USER_AGENT = 'FlagTime/1.0 (+https://github.com/uchihashahin01/FlagTime)';

// Number of events to request. CTFtime caps this around 100.
const LIST_LIMIT = 100;

async function fetchJson(url, { retries = 3 } = {}) {
    let lastErr;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': USER_AGENT,
                    Accept: 'application/json',
                },
                signal: controller.signal,
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
            }
            return await res.json();
        } catch (err) {
            lastErr = err;
            if (attempt < retries) {
                const backoff = attempt * 2000;
                console.warn(`  attempt ${attempt} failed (${err.message}); retrying in ${backoff}ms`);
                await new Promise((r) => setTimeout(r, backoff));
            }
        } finally {
            clearTimeout(timer);
        }
    }
    throw lastErr;
}

function normalize(raw) {
    return {
        id: `ctftime-${raw.id}`,
        ctftimeId: raw.id,
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
    };
}

async function main() {
    const nowSeconds = Math.floor(Date.now() / 1000);

    // Pull a window that covers running + upcoming events.
    const from = nowSeconds - 60 * 60 * 24 * 7; // 7 days back (catch running events)
    const to = nowSeconds + 60 * 60 * 24 * 120; // 120 days forward

    const listUrl = `${API}/events/?limit=${LIST_LIMIT}&start=${from}&finish=${to}`;
    console.log(`Fetching ${listUrl}`);

    const rows = await fetchJson(listUrl);
    if (!Array.isArray(rows)) {
        throw new Error('CTFtime returned a non-array response for the event list.');
    }

    const events = rows
        .map(normalize)
        .filter((e) => Number.isFinite(Date.parse(e.start)) && Number.isFinite(Date.parse(e.finish)))
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

    await mkdir(OUT_DIR, { recursive: true });

    const payload = {
        generatedAt: new Date().toISOString(),
        source: 'ctftime.org',
        count: events.length,
        events,
    };

    await writeFile(path.join(OUT_DIR, 'events.json'), JSON.stringify(payload, null, 2));
    console.log(`Wrote ${events.length} events to public/ctftime/events.json`);

    // Refresh individual event files that already exist (keeps deep links fresh
    // for events people have saved). New lookups are handled at runtime.
    const eventFilesDir = OUT_DIR;
    if (existsSync(eventFilesDir)) {
        const { readdir } = await import('node:fs/promises');
        const files = await readdir(eventFilesDir);
        const singleFiles = files.filter((f) => /^event-\d+\.json$/.test(f));

        for (const file of singleFiles) {
            const id = file.match(/^event-(\d+)\.json$/)[1];
            try {
                const raw = await fetchJson(`${API}/events/${id}/`, { retries: 2 });
                const normalized = normalize(raw);
                await writeFile(
                    path.join(eventFilesDir, file),
                    JSON.stringify({ generatedAt: new Date().toISOString(), event: normalized }, null, 2),
                );
                console.log(`  refreshed event ${id}`);
                await new Promise((r) => setTimeout(r, 500)); // be polite to CTFtime
            } catch (err) {
                console.warn(`  could not refresh event ${id}: ${err.message}`);
            }
        }
    }
}

main().catch((err) => {
    console.error(`CTFtime sync failed: ${err.message}`);
    process.exit(1);
});
