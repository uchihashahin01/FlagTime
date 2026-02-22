import './DashboardHeader.css';

export default function DashboardHeader({ eventCount }) {
    return (
        <header className="dashboard-header">
            <div className="header-glow" />

            <div className="header-content">
                <div className="header-brand">
                    <div className="header-logo">
                        <span className="logo-flag">🚩</span>
                        <span className="logo-clock">⏱️</span>
                    </div>
                    <div className="header-text">
                        <h1 className="header-title">
                            Flag<span className="title-accent">Time</span>
                        </h1>
                        <p className="header-tagline">CTF Countdown Dashboard</p>
                    </div>
                </div>

                {eventCount > 0 && (
                    <div className="header-stats">
                        <div className="stat-pill">
                            <span className="stat-value">{eventCount}</span>
                            <span className="stat-label">{eventCount === 1 ? 'Event' : 'Events'}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="header-line" />
        </header>
    );
}
