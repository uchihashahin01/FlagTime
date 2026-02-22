import { useState } from 'react';
import { parseCtftimeUrl, fetchCtftimeEvent } from '../services/ctftime';
import './AddEventModal.css';

export default function AddEventModal({ isOpen, onClose, onAdd }) {
    const [tab, setTab] = useState('ctftime');
    const [ctftimeUrl, setCtftimeUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Manual fields
    const [manualTitle, setManualTitle] = useState('');
    const [manualStart, setManualStart] = useState('');
    const [manualEnd, setManualEnd] = useState('');
    const [manualDescription, setManualDescription] = useState('');

    const resetForm = () => {
        setCtftimeUrl('');
        setManualTitle('');
        setManualStart('');
        setManualEnd('');
        setManualDescription('');
        setError('');
        setLoading(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

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

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">Add Event</h2>
                    <button className="modal-close" onClick={handleClose}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="modal-tabs">
                    <button
                        className={`modal-tab ${tab === 'ctftime' ? 'active' : ''}`}
                        onClick={() => { setTab('ctftime'); setError(''); }}
                    >
                        <span className="tab-icon">🏴</span>
                        CTFtime URL
                    </button>
                    <button
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
