import './EmptyState.css';

export default function EmptyState({ onAdd }) {
    return (
        <div className="empty-state">
            <div className="empty-visual">
                <div className="empty-icon-stack">
                    <span className="empty-icon e1">🚩</span>
                    <span className="empty-icon e2">⏳</span>
                    <span className="empty-icon e3">🏴‍☠️</span>
                </div>
                <div className="empty-rings">
                    <div className="ring r1" />
                    <div className="ring r2" />
                    <div className="ring r3" />
                </div>
            </div>

            <h2 className="empty-title">No Events Tracked</h2>
            <p className="empty-desc">
                Add your first CTF event or custom deadline to start the countdown.
                Paste a CTFtime URL or create a manual entry.
            </p>

            <button className="empty-cta" onClick={onAdd}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 3V15M3 9H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Add Your First Event
            </button>
        </div>
    );
}
