import { useCallback, useEffect, useRef, useState } from 'react';
import { parseCtftimeUrl, fetchCtftimeEvent, fetchCtftimeSuggestions } from '../services/ctftime';
import './AddEventModal.css';

function formatRange(start, finish) {
    const startDate = new Date(start);
    const finishDate = new Date(finish);

    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(finishDate.getTime())) {
        return '';
    }

    return `${startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })} - ${finishDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })}`;
}

function getSuggestionRange(event) {
    if (event.displayRange) return event.displayRange;
    return formatRange(event.start, event.finish);
}

function QuickAddList({ title, items, emptyMessage, onAdd, loadingEventId }) {
    return (
        <div className="quick-add-group">
            <h4 className="quick-add-title">{title}</h4>
            {items.length === 0 ? (
                <p className="quick-add-empty">{emptyMessage}</p>
            ) : (
                <div className="quick-add-list">
                    {items.map((event) => (
                        <button
                            key={event.id}
                            type="button"
                            className="quick-add-item"
                            onClick={() => onAdd(event)}
                            disabled={loadingEventId === event.ctftimeId}
                            title="Add this event"
                        >
                            <span className="quick-add-item-title">{event.title}</span>
                            <span className="quick-add-item-time">
                                {loadingEventId === event.ctftimeId ? 'Adding event...' : getSuggestionRange(event)}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AddEventModal({ isOpen, onClose, onAdd }) {
    const [tab, setTab] = useState('ctftime');
    const [ctftimeUrl, setCtftimeUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState({ running: [], upcoming: [] });
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [suggestionsError, setSuggestionsError] = useState('');
    const [quickAddLoadingId, setQuickAddLoadingId] = useState(null);

    const modalRef = useRef(null);
    const closeButtonRef = useRef(null);

    // Manual fields
    const [manualTitle, setManualTitle] = useState('');
    const [manualStart, setManualStart] = useState('');
    const [manualEnd, setManualEnd] = useState('');
    const [manualDescription, setManualDescription] = useState('');

    const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

    const resetForm = useCallback(() => {
        setCtftimeUrl('');
        setManualTitle('');
        setManualStart('');
        setManualEnd('');
        setManualDescription('');
        setError('');
        setLoading(false);
        setSuggestionsError('');
        setQuickAddLoadingId(null);
    }, []);

    const handleClose = useCallback(() => {
        resetForm();
        onClose();
    }, [onClose, resetForm]);

    const handleCtftimeSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const eventId = parseCtftimeUrl(ctftimeUrl);
            const event = await fetchCtftimeEvent(eventId);
            onAdd(event);
            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadSuggestions = useCallback(async () => {
        setSuggestionsLoading(true);
        setSuggestionsError('');
        try {
            const data = await fetchCtftimeSuggestions();
            setSuggestions(data);
        } catch (err) {
            setSuggestionsError(err.message || 'Unable to load quick-add suggestions right now.');
        } finally {
            setSuggestionsLoading(false);
        }
    }, []);

    const handleQuickAdd = useCallback(async (event) => {
        if (!event?.ctftimeId) return;

        setError('');
        setSuggestionsError('');
        setQuickAddLoadingId(event.ctftimeId);

        try {
            const fullEvent = await fetchCtftimeEvent(event.ctftimeId);
            onAdd(fullEvent);
            handleClose();
        } catch (err) {
            setSuggestionsError(err.message || 'Unable to add this event right now.');
        } finally {
            setQuickAddLoadingId(null);
        }
    }, [handleClose, onAdd]);

    const handleManualSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!manualTitle.trim()) {
            setError('Please enter an event title.');
            return;
        }
        if (!manualStart || !manualEnd) {
            setError('Please set both start and end dates.');
            return;
        }
        if (new Date(manualEnd) <= new Date(manualStart)) {
            setError('End date must be after start date.');
            return;
        }

        const event = {
            id: `manual-${Date.now()}`,
            title: manualTitle.trim(),
            start: new Date(manualStart).toISOString(),
            finish: new Date(manualEnd).toISOString(),
            url: '',
            ctftimeUrl: '',
            logo: null,
            format: '',
            weight: 0,
            location: '',
            description: manualDescription.trim(),
            participants: 0,
            isCtftime: false,
            addedAt: new Date().toISOString(),
        };

        onAdd(event);
        handleClose();
    };

    useEffect(() => {
        if (!isOpen) return;

        loadSuggestions();
    }, [isOpen, loadSuggestions]);

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleClose();
                return;
            }

            if (e.key !== 'Tab' || !modalRef.current) return;

            const focusable = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, handleClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div
                className="modal-container"
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-event-title"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title" id="add-event-title">Add Event</h2>
                    <button ref={closeButtonRef} type="button" className="modal-close" onClick={handleClose}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="modal-tabs">
                    <button
                        type="button"
                        className={`modal-tab ${tab === 'ctftime' ? 'active' : ''}`}
                        onClick={() => { setTab('ctftime'); setError(''); }}
                    >
                        <span className="tab-icon">🏴</span>
                        CTFtime URL
                    </button>
                    <button
                        type="button"
                        className={`modal-tab ${tab === 'manual' ? 'active' : ''}`}
                        onClick={() => { setTab('manual'); setError(''); }}
                    >
                        <span className="tab-icon">✏️</span>
                        Manual Entry
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="modal-error">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {/* CTFtime Tab */}
                {tab === 'ctftime' && (
                    <form className="modal-form" onSubmit={handleCtftimeSubmit}>
                        <div className="form-group">
                            <label className="form-label">CTFtime Event URL</label>
                            <input
                                type="url"
                                className="form-input"
                                placeholder="https://ctftime.org/event/2575"
                                value={ctftimeUrl}
                                onChange={(e) => setCtftimeUrl(e.target.value)}
                                required
                                autoFocus
                            />
                            <span className="form-hint">Paste the full URL of any CTFtime event page</span>
                        </div>

                        <button
                            type="submit"
                            className="form-submit"
                            disabled={loading || !ctftimeUrl.trim()}
                        >
                            {loading ? (
                                <span className="spinner" />
                            ) : (
                                'Fetch & Add Event'
                            )}
                        </button>

                        <section className="quick-add-section" aria-label="Quick add CTFtime events">
                            <div className="quick-add-header-row">
                                <h3 className="quick-add-heading">Quick Add from CTFtime</h3>
                                <button
                                    type="button"
                                    className="quick-add-refresh"
                                    onClick={loadSuggestions}
                                    disabled={suggestionsLoading}
                                >
                                    Refresh
                                </button>
                            </div>

                            {suggestionsLoading ? (
                                <p className="quick-add-loading">Loading suggestions...</p>
                            ) : suggestionsError ? (
                                <p className="quick-add-error">{suggestionsError}</p>
                            ) : (
                                <>
                                    <QuickAddList
                                        title="Running Now"
                                        items={suggestions.running}
                                        emptyMessage="No running CTF events found right now."
                                        onAdd={handleQuickAdd}
                                        loadingEventId={quickAddLoadingId}
                                    />
                                    <QuickAddList
                                        title="Upcoming"
                                        items={suggestions.upcoming}
                                        emptyMessage="No upcoming CTF events found."
                                        onAdd={handleQuickAdd}
                                        loadingEventId={quickAddLoadingId}
                                    />
                                </>
                            )}
                        </section>
                    </form>
                )}

                {/* Manual Tab */}
                {tab === 'manual' && (
                    <form className="modal-form" onSubmit={handleManualSubmit}>
                        <div className="form-group">
                            <label className="form-label">Event Title</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Team Training Session"
                                value={manualTitle}
                                onChange={(e) => setManualTitle(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Start Date & Time</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={manualStart}
                                    onChange={(e) => setManualStart(e.target.value)}
                                    min={nowLocal}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Date & Time</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={manualEnd}
                                    onChange={(e) => setManualEnd(e.target.value)}
                                    min={manualStart || nowLocal}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description <span className="optional">(optional)</span></label>
                            <textarea
                                className="form-input form-textarea"
                                placeholder="Add any notes about this event…"
                                value={manualDescription}
                                onChange={(e) => setManualDescription(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <button type="submit" className="form-submit">
                            Add Event
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
