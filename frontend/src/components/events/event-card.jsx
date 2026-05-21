import React, { useState } from 'react';

export const EventCard = ({ event, isAdmin }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Helper to format YYYY-MM-DD
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <>
            <div className="event-card" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Header with Logo and Date */}
                <div style={{ backgroundColor: 'var(--color-primary)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="date-pill">{formatDate(event.date)}</div>
                    {event.media?.logoUrl ? (
                        <img src={event.media.logoUrl} alt="לוגו" className="event-logo-header" />
                    ) : <div style={{ width: '50px' }}></div>}
                </div>

                {/* Body */}
                <div className="event-card-body">
                    <h3 className="event-title">{event.title}</h3>
                    <div className="event-meta">
                        <div className="event-meta-item"><span>🕒 {event.time}</span></div>
                        <div className="event-meta-item"><span>📍 {event.location}</span></div>
                    </div>
                    <p className="event-desc">{event.description}</p>
                    
                    <div className="event-card-actions">
                        <button onClick={() => setIsModalOpen(true)} className="btn-secondary">פרטי אירוע</button>
                        {event.status === 'pending_approval' ? (
                            <button className="btn-primary" style={{ backgroundColor: 'var(--color-gold)' }}>בדיקה</button>
                        ) : (
                            <button className="btn-primary">הרשמה</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal for Details */}
            {isModalOpen && (
                <div className="event-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="event-modal-content" onClick={e => e.stopPropagation()} dir="rtl">
                        <button className="event-modal-close" onClick={() => setIsModalOpen(false)}>×</button>
                        <h2>{event.title}</h2>
                        {event.media?.photoUrl && <img src={event.media.photoUrl} style={{width:'100%', borderRadius:'8px'}} />}
                        <p><strong>תיאור:</strong> {event.description}</p>
                        {/* Add other fields here */}
                    </div>
                </div>
            )}
        </>
    );
};