import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'flagtime-events';

function loadEvents() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveEvents(events) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function useEvents() {
    const [events, setEvents] = useState(loadEvents);

    useEffect(() => {
        saveEvents(events);
    }, [events]);

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
    const sortedEvents = [...events].sort((a, b) => {
        const now = new Date();
        const aStart = new Date(a.start);
        const aEnd = new Date(a.finish);
        const bStart = new Date(b.start);
        const bEnd = new Date(b.finish);

        const aStatus = now >= aStart && now <= aEnd ? 0 : now < aStart ? 1 : 2;
        const bStatus = now >= bStart && now <= bEnd ? 0 : now < bStart ? 1 : 2;

        if (aStatus !== bStatus) return aStatus - bStatus;
        return aStart - bStart;
    });

    return { events: sortedEvents, addEvent, removeEvent };
}
