import React from 'react';

const formatDateBadge = (dateValue) => {
    if (!dateValue) return { day: '-', month: '-' };
    if (dateValue.day && dateValue.month) return dateValue;
    
    try {
        const dateObj = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
        if (isNaN(dateObj)) return { day: '-', month: '-' };
        const day = dateObj.getDate().toString();
        const month = dateObj.toLocaleString('he-IL', { month: 'short' }); 
        return { day, month };
    } catch (error) {
        return { day: '-', month: '-' };
    }
};

export const EventCard = ({ event, isGuest, isExpired, onOpenDetails }) => {
    const displayDate = formatDateBadge(event.date);

    return (
        <div className={`event-card ${isExpired ? 'event-card-expired' : ''}`} onClick={() => onOpenDetails(event)}>
            <div className="event-card-header">
                <div className="event-date-badge">
                    <span className="event-date-day standard-numbers">{displayDate.day}</span>
                    <span className="event-date-mon">{displayDate.month}</span>
                </div>
                <div className="event-card-type">{event.type || 'כללי'}</div>
            </div>

            <div className="event-card-body">
                <h3 className="event-title">{event.title}</h3>

                <div className="event-meta">
                    <div className="event-meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span className="standard-numbers" dir="ltr">{event.time || 'טרם נקבע'}</span>
                    </div>
                    <div className="event-meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span>{event.location || 'מרחב מקוון'}</span>
                    </div>
                    <div className="event-meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                        <span className="standard-numbers">{event.capacity || 'ללא הגבלה'}</span>
                    </div>
                </div>

                <p className="event-desc">{event.description}</p>

                <div className="event-card-actions">
                    <button 
                        className="btn-secondary pill-btn" 
                        onClick={(e) => { e.stopPropagation(); onOpenDetails(event); }}
                    >
                        פרטי אירוע
                    </button>
                    {!isGuest && (
                        <button 
                            className="btn-primary pill-btn" 
                            disabled={isExpired}
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                console.log("Register for", event.id); 
                            }}
                        >
                            הרשמה לאירוע
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};