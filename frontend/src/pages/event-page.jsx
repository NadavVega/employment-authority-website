import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context';
import { useNavigate } from 'react-router-dom';
import { EventCard } from '../components/events/event-card';

import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/config'; 
import { eventService } from '../services/interfaces/event-services'; 

//importing styles
import '../design/event-card.css';
import '../design/event-page.css'; 

// importing images and logos 
import employmentLogo from '../assets/images/employment-logo.png';
import cityView from '../assets/images/city-view.png';

const FILTER_CATEGORIES = ['הכל', 'ממתינים לאישור', 'יום קריירה', 'הכשרה', 'ירידת עבודה', 'סדנה'];

export const EventsPage = () => {
    const { currentUser, isGuest, userRole, isAdmin } = useAuth(); 
    const [activeFilter, setActiveFilter] = useState('הכל');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    
    const [realEvents, setRealEvents] = useState([]);
    const [selectedEventModal, setSelectedEventModal] = useState(null);

    useEffect(() => {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, orderBy("date", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRealEvents(fetchedEvents);
        });
        return () => unsubscribe();
    }, []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeEvents = [];
    const pastEvents = [];

    realEvents.forEach(event => {
        // Skip deleted events entirely
        if (event.status === 'deleted') return;

        // Permissions Check
        if (event.status === 'pending') {
            if (!isAdmin && event.createdBy !== currentUser?.uid) return;
        } else if (event.status !== 'published') {
            return;
        }

        const eventDateValue = event.date?.toDate ? event.date.toDate() : new Date(event.date);
        if (eventDateValue < today) {
            pastEvents.push(event);
        } else {
            activeEvents.push(event);
        }
    });

    const filterFunction = (event) => {
        const isPendingFilter = activeFilter === 'ממתינים לאישור';
        if (isPendingFilter) {
            return event.status === 'pending' && (event.title?.includes(searchQuery) || event.description?.includes(searchQuery));
        }
        
        const matchesFilter = activeFilter === 'הכל' || event.type === activeFilter;
        const matchesSearch = event.title?.includes(searchQuery) || event.description?.includes(searchQuery);
        return matchesFilter && matchesSearch;
    };

    const handleApproveEvent = async (eventId) => {
        try {
            await eventService.updateEvent(eventId, { status: 'published' });
        } catch (error) {
            console.error("Failed to approve:", error);
            alert("שגיאה באישור האירוע.");
        }
    };

    // THIS IS THE MISSING DELETE FUNCTION
    const handleDeleteEvent = async (eventId) => {
        if (window.confirm("האם אתה בטוח שברצונך למחוק אירוע זה?")) {
            try {
                await eventService.updateEvent(eventId, { status: 'deleted' });
            } catch (error) {
                console.error("Failed to delete event:", error);
                alert("שגיאה במחיקת האירוע.");
            }
        }
    };

    // Filter to hide 'ממתינים לאישור' tab from guests or regular employers
    const visibleFilters = FILTER_CATEGORIES.filter(cat => {
        if (cat === 'ממתינים לאישור') return (isAdmin || userRole === 'coordinator');
        return true;
    });

    return (
        <div className="events-page-wrapper" dir="rtl">
            
            <header className="site-hero" style={{ backgroundImage: `url('${cityView}')` }}>
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <img src={employmentLogo} alt="רשות התעסוקה ירושלים" className="hero-logo" />
                    <div className="hero-text">
                        <h1 className="hero-title">אירועים ופעילויות</h1>
                        <p className="hero-subtitle">ימי עיון, הכשרות ואירועי תעסוקה בירושלים</p>
                    </div>
                </div>
            </header>

            <div className="events-toolbar">
                <div className="search-container">
                    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input 
                        type="text" placeholder="חיפוש אירועים..." className="search-input"
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-pills">
                    {visibleFilters.map(category => (
                        <button 
                            key={category} className={`filter-pill ${activeFilter === category ? 'active' : ''}`}
                            onClick={() => setActiveFilter(category)}
                        >
                            {category}
                        </button>
                    ))}
                    {(userRole === 'coordinator' || userRole === 'admin') && (
                        <button className="btn-primary pill-btn" style={{ marginRight: 'auto' }} onClick={() => navigate('/add-event')}>
                            + הוסף אירוע
                        </button>
                    )}
                </div>
            </div>

            {/* ===== ACTIVE EVENTS GRID ===== */}
            <main className="events-grid">
                {activeEvents.filter(filterFunction).length > 0 ? (
                    activeEvents.filter(filterFunction).map(event => (
                        <EventCard 
                            key={event.id} 
                            event={event} 
                            isGuest={isGuest} 
                            onOpenDetails={(e) => setSelectedEventModal(e)} 
                            onApprove={handleApproveEvent}
                            onDelete={handleDeleteEvent} // ADDED HERE JUST IN CASE
                        />
                    ))
                ) : (
                    <div className="no-results-message" style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', marginTop: '40px' }}>
                        <p>לא נמצאו אירועים.</p>
                    </div>
                )}
            </main>

            {/* ===== PAST EVENTS GRID (ADMIN ONLY) ===== */}
            {isAdmin && pastEvents.length > 0 && (
                <div className="past-events-section">
                    <div className="section-divider">
                        <h2>אירועים שנגמרו</h2>
                        <hr/>
                    </div>
                    <main className="events-grid">
                        {pastEvents.filter(filterFunction).map(event => (
                            <EventCard 
                                key={event.id} 
                                event={event} 
                                isGuest={isGuest} 
                                isExpired={true} 
                                onOpenDetails={(e) => setSelectedEventModal(e)}
                                onApprove={handleApproveEvent} 
                                onDelete={handleDeleteEvent} // PROPERLY PASSED HERE
                            />
                        ))}
                    </main>
                </div>
            )}

            {/* ===== FULLSCREEN EVENT MODAL ===== */}
            {selectedEventModal && (
                <div className="event-modal-overlay" onClick={() => setSelectedEventModal(null)}>
                    <div className="full-event-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="event-modal-close" onClick={() => setSelectedEventModal(null)}>✖</button>
                        
                        <div className="modal-header-banner">
                            <span className="event-card-type">{selectedEventModal.type}</span>
                            <h2>{selectedEventModal.title}</h2>
                        </div>
                        
                        <div className="modal-body-content">
                            <div className="modal-info-grid">
                                <div><strong>תאריך:</strong> <span className="standard-numbers">{new Date(selectedEventModal.date?.toDate ? selectedEventModal.date.toDate() : selectedEventModal.date).toLocaleDateString('he-IL')}</span></div>
                                <div><strong>שעות:</strong> <span className="standard-numbers" dir="ltr">{selectedEventModal.time}</span></div>
                                <div><strong>מיקום:</strong> {selectedEventModal.location}</div>
                                <div><strong>משתתפים:</strong> <span className="standard-numbers">{selectedEventModal.capacity}</span> מקומות</div>
                            </div>
                            
                            <hr className="modal-divider"/>
                            
                            <div className="modal-description">
                                <h3>על האירוע</h3>
                                <p>{selectedEventModal.description}</p>
                            </div>

                            <hr className="modal-divider"/>

                            <div className="modal-contact-grid">
                                <div>
                                    <h4>רכז אחראי</h4>
                                    <p className="standard-numbers" dir="ltr" style={{textAlign: 'right'}}>{selectedEventModal.coordinatorPhone}</p>
                                </div>
                                
                                {selectedEventModal.isAccessible && (
                                    <div>
                                        <h4>פרטי נגישות</h4>
                                        <p>איש קשר: {selectedEventModal.accessibilityContactName}</p>
                                        <p className="standard-numbers" dir="ltr" style={{textAlign: 'right'}}>{selectedEventModal.accessibilityContactPhone}</p>
                                    </div>
                                )}
                            </div>

                            {/* Payment Section */}
                            {selectedEventModal.paymentMethod && selectedEventModal.paymentMethod !== 'none' && (
                                <div className="modal-payment-section">
                                    <h4>פרטי תשלום והרשמה</h4>
                                    <p><strong>מחיר:</strong> <span className="standard-numbers">{selectedEventModal.price}</span> ₪</p>
                                    {selectedEventModal.discountDetails && <p><strong>הנחות:</strong> {selectedEventModal.discountDetails}</p>}
                                    <p>
                                        <strong>כיצד לשלם:</strong>{' '}
                                        {selectedEventModal.paymentMethod === 'link' && <a href={selectedEventModal.paymentDetails} target="_blank" rel="noreferrer">לחץ כאן למעבר לתשלום</a>}
                                        {selectedEventModal.paymentMethod === 'bit' && <span className="standard-numbers" dir="ltr">{selectedEventModal.paymentDetails}</span>}
                                        {selectedEventModal.paymentMethod === 'other' && <span>{selectedEventModal.paymentDetails}</span>}
                                    </p>
                                </div>
                            )}

                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel pill-btn" onClick={() => setSelectedEventModal(null)}>סגירה</button>
                            {!isGuest && !selectedEventModal.isExpired && (
                                <button className="btn-primary pill-btn">הרשמה לאירוע</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
export default EventsPage;