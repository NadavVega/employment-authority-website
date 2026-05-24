import React from 'react';

// Helper function to safely parse and format the Firebase date 
// back into the { day, month } structure the UI expects.
const formatDateBadge = (dateValue) => {
    // Fallback if date is missing completely
    if (!dateValue) return { day: '-', month: '-' };
    
    // If it already matches the old mock format (Adapter Pattern implemented)
    if (dateValue.day && dateValue.month) return dateValue;
    
    try {
        // If it's a Firestore Timestamp, convert to Date object. If string, parse it.
        const dateObj = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
        
        // Check for invalid dates
        if (isNaN(dateObj)) return { day: '-', month: '-' };

        const day = dateObj.getDate().toString();
        // Convert the month to a short Hebrew string (e.g., "יוני", "יולי")
        const month = dateObj.toLocaleString('he-IL', { month: 'short' }); 
        
        return { day, month };
    } catch (error) {
        console.error("Error parsing date:", error);
        return { day: '-', month: '-' };
    }
};

export const EventCard = ({ event, isGuest }) => {
    const displayDate = formatDateBadge(event.date);

    return (
        <div className="event-card">

            <div className="event-card-header">
                <div className="event-date-badge">
                    <span className="event-date-day">{displayDate.day}</span>
                    <span className="event-date-mon">{displayDate.month}</span>
                </div>
                <div className="event-card-type">{event.type || 'כללי'}</div>
            </div>

            <div className="event-card-body">
                <h3 className="event-title">{event.title}</h3>

                <div className="event-meta">
                    <div className="event-meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>{event.time || 'טרם נקבע'}</span>
                    </div>
                    <div className="event-meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>{event.location || 'מרחב מקוון'}</span>
                    </div>
                    <div className="event-meta-item">
                        <svg className="meta-icon" viewBox="0 0 24 24">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>{event.capacity || 'ללא הגבלה'}</span>
                    </div>
                </div>

                <p className="event-desc">{event.description}</p>

                {!isGuest && (
                    <button className="btn-primary">
                        <span>הרשמה לאירוע</span>
                    </button>
                )}
            </div>

        </div>
    );
};