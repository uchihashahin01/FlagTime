import { useState, useEffect, useRef } from 'react';
import './CountdownTimer.css';

function calculateTimeLeft(targetDate) {
    const now = new Date();
    const target = new Date(targetDate);
    const diff = target - now;

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        total: diff,
    };
}

function DigitCell({ value, label }) {
    const prevValue = useRef(value);
    const [flip, setFlip] = useState(false);

    useEffect(() => {
        if (prevValue.current !== value) {
            setFlip(true);
            const t = setTimeout(() => setFlip(false), 300);
            prevValue.current = value;
            return () => clearTimeout(t);
        }
    }, [value]);

    return (
        <div className="digit-group">
            <div className={`digit-cell ${flip ? 'digit-flip' : ''}`}>
                <span className="digit-value">{String(value).padStart(2, '0')}</span>
            </div>
            <span className="digit-label">{label}</span>
        </div>
    );
}

export default function CountdownTimer({ startDate, endDate }) {
    const [timeToStart, setTimeToStart] = useState(calculateTimeLeft(startDate));
    const [timeToEnd, setTimeToEnd] = useState(calculateTimeLeft(endDate));

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeToStart(calculateTimeLeft(startDate));
            setTimeToEnd(calculateTimeLeft(endDate));
        }, 1000);
        return () => clearInterval(interval);
    }, [startDate, endDate]);

    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const isLive = now >= start && now <= end;
    const isEnded = now > end;
    const isUpcoming = now < start;

    const timeLeft = isUpcoming ? timeToStart : timeToEnd;

    return (
        <div className="countdown-timer">
            {isEnded ? (
                <div className="countdown-status ended">
                    <span className="status-icon">🏁</span>
                    <span className="status-text">Event Ended</span>
                </div>
            ) : isLive ? (
                <>
                    <div className="countdown-status live">
                        <span className="live-dot" />
                        <span className="status-text">LIVE NOW — Ends in</span>
                    </div>
                    <div className="digit-row">
                        <DigitCell value={timeLeft.days} label="Days" />
                        <span className="digit-separator">:</span>
                        <DigitCell value={timeLeft.hours} label="Hrs" />
                        <span className="digit-separator">:</span>
                        <DigitCell value={timeLeft.minutes} label="Min" />
                        <span className="digit-separator">:</span>
                        <DigitCell value={timeLeft.seconds} label="Sec" />
                    </div>
                </>
            ) : (
                <>
                    <div className="countdown-status upcoming">
                        <span className="status-icon">⏳</span>
                        <span className="status-text">Starts in</span>
                    </div>
                    <div className="digit-row">
                        <DigitCell value={timeLeft.days} label="Days" />
                        <span className="digit-separator">:</span>
                        <DigitCell value={timeLeft.hours} label="Hrs" />
                        <span className="digit-separator">:</span>
                        <DigitCell value={timeLeft.minutes} label="Min" />
                        <span className="digit-separator">:</span>
                        <DigitCell value={timeLeft.seconds} label="Sec" />
                    </div>
                </>
            )}
        </div>
    );
}
