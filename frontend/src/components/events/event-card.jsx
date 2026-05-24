import React from 'react';

export const EventCard = ({ event, isGuest, isAdmin }) => {
    return (
        <div className="event-card">
            <div className="event-card-header">
                <div className="event-date-badge">
                    <span className="event-date-day">{event.date?.day}</span>
                    <span className="event-date-mon">{event.date?.month}</span>
                </div>
                <div className="event-card-type">{event.type}</div>
            </div>

            <div className="event-card-body">
                <h3 className="event-title">{event.title}</h3>

                <div className="event-meta">
                    <div className="event-meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>{event.time}</span>
                    </div>
                    <div className="event-meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>{event.location}</span>
                    </div>
                    <div className="event-meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>{event.capacity}</span>
                    </div>
                </div>

                <p className="event-desc">{event.description}</p>

                {!isGuest && (
                    <button className="btn-event">
                        <span>הרשמה לאירוע</span>
                    </button>
                )}
            </div>
        </div>
    );
};