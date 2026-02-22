import { useState } from 'react';
import DashboardHeader from './components/DashboardHeader';
import EventCard from './components/EventCard';
import AddEventModal from './components/AddEventModal';
import EmptyState from './components/EmptyState';
import { useEvents } from './hooks/useEvents';
import './App.css';

export default function App() {
  const { events, addEvent, removeEvent } = useEvents();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="app">
      <div className="app-container">
        <DashboardHeader eventCount={events.length} />

        {events.length === 0 ? (
          <EmptyState onAdd={() => setModalOpen(true)} />
        ) : (
          <>
            <div className="events-grid">
              {events.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onRemove={removeEvent}
                  style={{ animationDelay: `${index * 0.08}s` }}
                />
              ))}
            </div>

            {/* Floating Add Button */}
            <div className="fab-container">
              <button
                className="fab-button"
                onClick={() => setModalOpen(true)}
                title="Add new event"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
              <span className="fab-label">Add Event</span>
            </div>
          </>
        )}
      </div>

      <AddEventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(event) => {
          addEvent(event);
          setModalOpen(false);
        }}
      />

      {/* Footer */}
      <footer className="app-footer">
        <span>Powered by </span>
        <a href="https://acergion.github.io" target="_blank" rel="noopener noreferrer">ACERGION</a>
      </footer>

      {/* Ambient background particles */}
      <div className="ambient-bg" aria-hidden="true">
        <div className="particle p1" />
        <div className="particle p2" />
        <div className="particle p3" />
      </div>
    </div>
  );
}
