import { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { resolveEventImage } from '../utils/eventImageMap';
import { getCenterIcon } from '../utils/centerIcons';
import { getEventLocation, getMapSearchUrl } from '../utils/mapLinks';

const FILTER_CATEGORIES = ['הכל', 'יום קריירה', 'הכשרה', 'ירידת עבודה', 'סדנה'];

export const EventsPage = () => {
    const { currentUser, isGuest, userRole, isAdmin, isCoordinator } = useAuth(); 
    const [activeFilter, setActiveFilter] = useState('הכל');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    // State to hold all events fetched from Firestore
    const [realEvents, setRealEvents] = useState([]);
    const [selectedEventModal, setSelectedEventModal] = useState(null);

    // Registration state
    const [registeredEventIds, setRegisteredEventIds] = useState([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [bitPaymentDetails, setBitPaymentDetails] = useState(null); // Controls the Bit popup

    // Listen for calendar redirects and open the modal automatically
    useEffect(() => {
        if (location.state?.openEventId && realEvents.length > 0) {
            const targetEvent = realEvents.find(e => e.id === location.state.openEventId);
            if (targetEvent) {
                setSelectedEventModal(targetEvent);
                // Clear the state so it doesn't re-open on every page refresh
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, realEvents]);

    // Fetch registered event IDs for the current user (if employer)
    useEffect(() => {
        if (currentUser?.uid && userRole === 'employer') {
            const fetchRegistrations = async () => {
                try {
                    const ids = await eventService.getUserRegisteredEventIds(currentUser.uid);
                    setRegisteredEventIds(ids);
                } catch (error) {
                    console.error('Failed to load registered events:', error);
                    setRegisteredEventIds([]);
                }
            };
            fetchRegistrations();
        }
    }, [currentUser, userRole]);

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
        if (event.status === 'pending_approval') {
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

    if (event.center === 'coordinators-only' && !isAdmin && userRole !== 'coordinator') return false;

    // Hide pending events from all other tabs
    if (event.status === 'pending') return false; 

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

    const getCurrentEmployerUid = () => {
        return currentUser?.uid || currentUser?.email || 'demo-employer-uid';
    };

    const buildRegistrationUserData = () => {
        const uid = getCurrentEmployerUid();

        if (currentUser?.isDemo) {
            return {
                uid,
                employerName: currentUser.displayName || 'מעסיק הדגמה',
                displayName: currentUser.displayName || 'מעסיק הדגמה',
                email: currentUser.email || '',
                phone: currentUser.phone || '050-1234567',
                center: currentUser.center || 'מרכז הקריירה באוניברסיטה העברית',
                companyName: currentUser.companyName || currentUser.organization || 'מעסיק הדגמה בע"מ'
            };
        }

        return {
            uid,
            employerName:
                currentUser?.displayName ||
                currentUser?.profile?.fullName ||
                currentUser?.fullName ||
                'ללא שם',

            displayName:
                currentUser?.displayName ||
                currentUser?.profile?.fullName ||
                currentUser?.fullName ||
                'ללא שם',

            email: currentUser?.email || '',
            phone: currentUser?.phone || currentUser?.phoneNumber || '',
            center: currentUser?.center || currentUser?.profile?.center || '',
            companyName:
                currentUser?.companyName ||
                currentUser?.organization ||
                currentUser?.profile?.company ||
                currentUser?.company ||
                ''
        };
    };

const handleRegisterClick = async (event) => {
    if (!currentUser?.uid) {
        alert('יש להתחבר לפני הרשמה לאירוע.');
        return;
    }

    if (userRole !== 'employer') {
        alert('רק משתמש מסוג מעסיק יכול להירשם לאירוע.');
        return;
    }

    setIsRegistering(true);

    try {
        const employerProfile = await eventService.getEmployerRegistrationProfile(currentUser);

        const result = await eventService.registerToEvent(
            event.id,
            employerProfile,
            event.paymentMethod || 'none'
        );

        setRegisteredEventIds(prev => {
            if (prev.includes(event.id)) return prev;
            return [...prev, event.id];
        });

        setRealEvents(prevEvents =>
            prevEvents.map(existingEvent => {
                if (existingEvent.id !== event.id) return existingEvent;

                const currentCount = parseInt(existingEvent.registeredCount, 10) || 0;

                return {
                    ...existingEvent,
                    registeredCount: currentCount + 1,
                    registeredUids: Array.from(new Set([
                        ...(existingEvent.registeredUids || []),
                        employerProfile.uid
                    ]))
                };
            })
        );

        if (event.paymentMethod === 'link') {
            window.open(event.paymentDetails, '_blank');
            alert('נרשמת בהצלחה! הועברת לעמוד התשלום.');
        } else if (event.paymentMethod === 'bit') {
            setBitPaymentDetails(event.paymentDetails);
        } else {
            alert('נרשמת לאירוע בהצלחה!');
        }

        console.log('Signup completed:', result);
        setSelectedEventModal(null);

    } catch (error) {
        console.error('Registration failed:', error);

        if (error.message === 'EVENT_FULL') {
            alert('מצטערים, האירוע כבר מלא.');
        } else if (error.message === 'ALREADY_REGISTERED') {
            alert('אתה כבר רשום לאירוע זה.');
        } else if (error.message === 'EVENT_NOT_AVAILABLE') {
            alert('האירוע אינו זמין להרשמה.');
        } else if (error.message === 'USER_ID_MISSING') {
            alert('חסרים פרטי משתמש להרשמה.');
        } else if (error.code === 'permission-denied') {
            alert('אין הרשאה לבצע הרשמה. יש לבדוק את הרשאות Firestore.');
        } else {
            alert(`שגיאה בהרשמה: ${error.message || 'אנא נסה שוב.'}`);
        }
    } finally {
        setIsRegistering(false);
    }
};

    // Filter to hide 'ממתינים לאישור' tab from guests or regular employers
    const visibleFilters = FILTER_CATEGORIES.filter(cat => {
        if (cat === 'ממתינים לאישור') return (isAdmin || userRole === 'coordinator');
        return true;
    });

    const selectedEventImage = resolveEventImage(selectedEventModal);
    const selectedCenterIcon = getCenterIcon(selectedEventModal?.center);
    const selectedLocation = getEventLocation(selectedEventModal);
    const selectedMapUrl = getMapSearchUrl(selectedEventModal);

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
                    {/* NEW: Archive View Button (Manager Only) */}
                    {isAdmin && (
                        <button className="btn-secondary pill-btn" onClick={() => alert("תצוגת ארכיון תיבנה בקרוב.")}>
                            📦 תצוגת ארכיון
                        </button>
                    )}
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
                    activeEvents.filter(filterFunction).map((event, index) => (
                        <EventCard 
                            key={event.id} 
                            event={event} 
                            index={index}
                            isGuest={isGuest} 
                            isRegistered={registeredEventIds.includes(event.id)}
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
            {(isAdmin || isCoordinator) && pastEvents.length > 0 && (
                <div className="past-events-section">
                    <div className="section-divider">
                        <h2>אירועים שנגמרו</h2>
                        <hr/>
                    </div>
                    <main className="events-grid">
                        {pastEvents.filter(filterFunction).map((event, index) => (
                            <EventCard 
                                key={event.id} 
                                event={event} 
                                index={index}
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
                        
                        <div
                            className="modal-header-banner"
                            style={selectedEventImage ? {
                                backgroundImage: `linear-gradient(rgba(0, 48, 110, 0.72), rgba(0, 48, 110, 0.72)), url(${selectedEventImage})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            } : undefined}
                        >
                            <div className="modal-header-content">
                                <div className="modal-center-logo" title={selectedEventModal.center || 'מרכז תעסוקה'}>
                                    {selectedCenterIcon ? (
                                        <img src={selectedCenterIcon} alt={selectedEventModal.center || 'לוגו המרכז'} />
                                    ) : (
                                        <span aria-hidden="true">{selectedEventModal.center?.trim()?.charAt(0) || 'מ'}</span>
                                    )}
                                </div>
                                <h2>
                                    <span>{selectedEventModal.title}</span>
                                    <span className="event-title-separator" aria-hidden="true">|</span>
                                    <span className="event-card-type">{selectedEventModal.type}</span>
                                </h2>
                            </div>
                        </div>
                        
                        <div className="modal-body-content">
                            <div className="modal-info-grid">
                                <div><strong>תאריך:</strong> <span className="standard-numbers">{new Date(selectedEventModal.date?.toDate ? selectedEventModal.date.toDate() : selectedEventModal.date).toLocaleDateString('he-IL')}</span></div>
                                <div><strong>שעות:</strong> <span className="standard-numbers" dir="ltr">{selectedEventModal.time}</span></div>
                                <div>
                                    <strong>מיקום:</strong>{' '}
                                    {selectedMapUrl ? (
                                        <a className="event-address-link" href={selectedMapUrl} target="_blank" rel="noreferrer">
                                            {selectedLocation}
                                        </a>
                                    ) : (
                                        <span>{selectedLocation || 'מקוון'}</span>
                                    )}
                                </div>
                                <div>
                                    <strong>משתתפים:</strong>{' '}
                                    {(!selectedEventModal.capacity || selectedEventModal.capacity === 'ללא הגבלה') ? (
                                        <span>ללא הגבלה</span>
                                    ) : (
                                        <><span className="standard-numbers">{selectedEventModal.capacity}</span> מקומות</>
                                    )}
                                </div>
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
                            {/* --- DYNAMIC REGISTRATION BUTTON --- */}
                            {!isGuest && !selectedEventModal.isExpired && userRole === 'employer' && (
                                (() => {
                                    const isRegistered = registeredEventIds.includes(selectedEventModal.id);
                                    // Parse to integers just to be safe
                                    const isUnlimited = !selectedEventModal.capacity || selectedEventModal.capacity === 'ללא הגבלה';
                                    const capacity = parseInt(selectedEventModal.capacity) || 0;
                                    const registeredCount = parseInt(selectedEventModal.registeredCount) || 0;
                                    const isFull = !isUnlimited && (registeredCount >= capacity);

                                    if (isRegistered) {
                                        return <button className="btn-primary pill-btn" style={{ backgroundColor: '#10b981', border: 'none', cursor: 'default' }} disabled>רשום לאירוע ✓</button>;
                                    }
                                    if (isFull) {
                                        return <button className="btn-primary pill-btn" style={{ backgroundColor: '#94a3b8', border: 'none', cursor: 'not-allowed' }} disabled>האירוע מלא</button>;
                                    }
                                    return (
                                        <button 
                                            className="btn-primary pill-btn" 
                                            onClick={() => handleRegisterClick(selectedEventModal)}
                                            disabled={isRegistering}
                                        >
                                            {isRegistering ? 'רושם...' : 'הרשמה לאירוע'}
                                        </button>
                                    );
                                })()
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== BIT PAYMENT MODAL ===== */}
            {bitPaymentDetails && (
                <div className="validation-dialog-overlay" onClick={() => setBitPaymentDetails(null)}>
                    <div className="validation-dialog-box" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: '32px' }}>
                        <h3 style={{ color: '#003b8b', marginBottom: '8px' }}>תשלום באמצעות Bit</h3>
                        <p style={{ marginBottom: '24px', color: '#64748b' }}>נרשמת לאירוע בהצלחה! להשלמת התהליך, אנא העבר את התשלום למספר הבא:</p>
                        
                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', fontSize: '24px', fontWeight: 'bold', letterSpacing: '2px', color: '#0f172a', marginBottom: '24px' }}>
                            <span className="standard-numbers" dir="ltr">{bitPaymentDetails}</span>
                        </div>

                        {/* Deep link to open the Bit app on mobile */}
                        <a 
                            href={`https://bitpay.co.il/app/`} 
                            target="_blank" rel="noreferrer"
                            style={{ display: 'block', background: '#00e6aa', color: 'white', padding: '12px', borderRadius: '99px', textDecoration: 'none', fontWeight: 'bold', marginBottom: '12px' }}
                        >
                            פתיחת אפליקציית Bit
                        </a>

                        <button className="btn-cancel pill-btn" onClick={() => setBitPaymentDetails(null)}>סגור</button>
                    </div>
                </div>
            )}

        </div>
    );
};
export default EventsPage;
