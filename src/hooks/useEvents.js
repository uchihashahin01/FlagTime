import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'flagtime-events';

function loadEvents() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed.filter((event) => {
            if (!event || typeof event !== 'object') return false;
            if (typeof event.id !== 'string' || !event.id) return false;
            if (typeof event.title !== 'string' || !event.title.trim()) return false;
            if (!Number.isFinite(Date.parse(event.start))) return false;
            if (!Number.isFinite(Date.parse(event.finish))) return false;
            return true;
        });
    } catch {
        return [];
    }
}

function saveEvents(events) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
        // Ignore storage write failures (e.g., private mode/quota exceeded)
    }
}

export function useEvents() {
    const [events, setEvents] = useState(loadEvents);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        saveEvents(events);
    }, [events]);

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, 30000);

        return () => clearInterval(timer);
    }, []);

    const addEvent = useCallback((event) => {
        setEvents((prev) => {
            // Prevent duplicates by ID
            if (prev.some((e) => e.id === event.id)) {
                return prev;
            }
            return [...prev, event];
        });
    }, []);

    const removeEvent = useCallback((id) => {
        setEvents((prev) => prev.filter((e) => e.id !== id));
    }, []);

    // Sort: live first, then upcoming, then ended
    const sortedEvents = useMemo(() => {
        const getStatus = (start, finish) => {
            if (now >= start && now <= finish) return 0;
            if (now < start) return 1;
            return 2;
        };

        return [...events].sort((a, b) => {
            const aStart = Date.parse(a.start);
            const aEnd = Date.parse(a.finish);
            const bStart = Date.parse(b.start);
            const bEnd = Date.parse(b.finish);

            const aStatus = getStatus(aStart, aEnd);
            const bStatus = getStatus(bStart, bEnd);

            if (aStatus !== bStatus) return aStatus - bStatus;
            return aStart - bStart;
        });
    }, [events, now]);

    return { events: sortedEvents, addEvent, removeEvent };
}
