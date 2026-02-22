import { useState } from 'react';
import CountdownTimer from './CountdownTimer';
import './EventCard.css';

export default function EventCard({ event, onRemove }) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    const now = new Date();
    const start = new Date(event.start);
    const end = new Date(event.finish);
    const isLive = now >= start && now <= end;
    const isEnded = now > end;

    const statusClass = isLive ? 'live' : isEnded ? 'ended' : 'upcoming';

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleDelete = () => {
        if (confirmDelete) {
            onRemove(event.id);
        } else {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
        }
    };

    return (
        <div className={`event-card ${statusClass}`}>
            <div className={`status-strip ${statusClass}`} />

            <div className="event-card-content">
                {/* Header */}
                <div className="event-header">
                    <div className="event-title-row">
                        {event.logo && (
                            <img
                                src={event.logo}
                                alt=""
                                className="event-logo"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        )}
                        <div className="event-title-info">
                            <h3 className="event-title">{event.title}</h3>
                            <div className="event-meta">
                                <span className="event-date">{formatDate(event.start)} — {formatDate(event.finish)}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        className={`delete-btn ${confirmDelete ? 'confirm' : ''}`}
                        onClick={handleDelete}
                        title={confirmDelete ? 'Click again to confirm' : 'Remove event'}
                    >
                        {confirmDelete ? (
                            <span className="delete-confirm-text">Confirm?</span>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Badges */}
                <div className="event-badges">
                    {event.isCtftime && (
                        <a
                            href={event.ctftimeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="badge badge-ctftime"
                        >
                            🏴 CTFtime
                        </a>
                    )}
                    {event.format && event.format !== 'Unknown' && (
                        <span className="badge badge-format">{event.format}</span>
                    )}
                    {event.weight > 0 && (
                        <span className="badge badge-weight">⚖ {event.weight.toFixed(1)}</span>
                    )}
                    {isLive && <span className="badge badge-live">● LIVE</span>}
                    {!event.isCtftime && (
                        <span className="badge badge-custom">✏ Custom</span>
                    )}
                </div>

                {/* Countdown */}
                <CountdownTimer startDate={event.start} endDate={event.finish} />
            </div>
        </div>
    );
}
