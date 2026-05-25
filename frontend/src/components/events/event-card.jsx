import React from 'react';
import { useAuth } from '../../context/auth-context';
import { useNavigate } from 'react-router-dom';
import '../../design/event-card.css';

// Smart Address Parser: Handles cases where the street number might come before the street name
const formatShortAddress = (address) => {
    if (!address) return 'מקוון';
    
    const parts = address.split(',');
    let shortAddress = parts[0].trim();
    
    // If the first part is ONLY a number (e.g., "1"), grab the street name next to it
    if (/^\d+$/.test(shortAddress) && parts.length > 1) {
        shortAddress = `${parts[1].trim()} ${shortAddress}`;
    }
    
    return shortAddress;
};

export const EventCard = ({ event, isGuest, isExpired, onOpenDetails, onApprove }) => {
    const { currentUser, isAdmin } = useAuth();
    const navigate = useNavigate();

    const isCreator = event.createdBy === currentUser?.uid;
    const canEdit = isAdmin || isCreator;
    const isPending = event.status === 'pending';

    const handleEditClick = (e) => {
        e.stopPropagation();
        navigate(`/edit-event/${event.id}`);
    };

    // Format Date for the bottom bar
    const dateObj = event.date?.toDate ? event.date.toDate() : new Date(event.date);
    const dayMonth = isNaN(dateObj) ? '--' : `${dateObj.getDate().toString().padStart(2, '0')}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Format full date for the hover overlay
    const fullDate = isNaN(dateObj) ? 'טרם נקבע' : dateObj.toLocaleDateString('he-IL');

    const cardImage = event.photoUrl || 'https://via.placeholder.com/300x200?text=No+Image';
    const shortLocation = formatShortAddress(event.location);

    return (
        <div className={`event-card ${isExpired ? 'event-card-expired' : ''}`} onClick={() => onOpenDetails(event)}>
            
            <div className="event-card-image-area" style={{ backgroundImage: `url(${cardImage})` }}>
                <div className="card-badges-container">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {event.paymentMethod === 'none' && <div className="badge-free">חינם</div>}
                        {isPending && !isAdmin && isCreator && <span className="status-badge-pending">מחכה לאישור</span>}
                        {isPending && isAdmin && (
                            <button className="btn-approve pill-btn" onClick={(e) => { e.stopPropagation(); onApprove(event.id); }} style={{ padding: '4px 8px', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                אשר אירוע
                            </button>
                        )}
                    </div>
                    {canEdit && !isExpired && (
                        <button className="edit-pencil-btn-new" onClick={handleEditClick} title="עריכת אירוע">
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                            </svg>
                        </button>
                    )}
                </div>

                {/* Hover Overlay */}
                <div className="event-card-overlay">
                    <div className="overlay-meta-grid">
                        <div className="overlay-meta-item">
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <span dir="ltr" className="standard-numbers">{event.time || 'טרם נקבע'}</span>
                        </div>
                        <div className="overlay-meta-item">
                            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <span className="standard-numbers">{fullDate}</span>
                        </div>
                        <div className="overlay-meta-item">
                            <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            <span>{shortLocation}</span>
                        </div>
                    </div>
                    <div className="overlay-desc">{event.description}</div>
                    <button className="overlay-btn" onClick={(e) => { e.stopPropagation(); onOpenDetails(event); }}>לכל הפרטים &gt;</button>
                </div>
            </div>

            {/* Bottom Info Area */}
            <div className="event-card-bottom">
                <div className="bottom-date-area standard-numbers">
                    <div className="bottom-date-big">{dayMonth}</div>
                </div>
                <div className="bottom-title-area">
                    <h5 className="bottom-title">{event.title}</h5>
                </div>
            </div>
        </div>
    );
};