import { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context';
import { useNavigate, useLocation } from 'react-router-dom';
import { EventCard } from '../components/events/event-card';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ForwardToInboxOutlinedIcon from '@mui/icons-material/ForwardToInboxOutlined';

import { collection, query, orderBy, onSnapshot, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../services/firebase/config'; 
import { eventService } from '../services/interfaces/event-services'; 

//importing styles
import '../design/event-card.css';
import '../design/event-page.css'; 

import { getCenterIcon, getEventCenterName } from '../utils/centerIcons';
import { getEventColor } from '../utils/centerColors';
import { getEventLocation, getMapSearchUrl } from '../utils/mapLinks';
import { buildEventShareUrl } from '../utils/eventShare';
import { buildGoogleCalendarUrl, buildOutlookCalendarUrl } from '../utils/calendarLinks';
import { isEventCreatedByCurrentCoordinator } from '../utils/eventOwnership';
import { isPastEvent } from '../utils/eventDates';
import { ShareMenu } from '../components/share/ShareMenu';
import { EventMessageDialog } from '../components/share/EventMessageDialog';
import { PageHero } from '../components/layout/PageHero';
import eventsDecoration from '../assets/images/city-view.png';
import employmentLogo from '../assets/center-icons/taasuka-logo-color.png';

const FILTER_CATEGORIES = ['הכל', 'יום קריירה', 'הכשרה', 'ירידת עבודה', 'סדנה'];

export const EventsPage = () => {
    const { currentUser, isGuest, userRole, isAdmin, isCoordinator } = useAuth(); 
    const [activeFilter, setActiveFilter] = useState('הכל');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('cards');
    const [showAllUpcomingEvents, setShowAllUpcomingEvents] = useState(false);
    const [showPastEvents, setShowPastEvents] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // State to hold all events fetched from Firestore
    const [realEvents, setRealEvents] = useState([]);
    const [manuallySelectedEvent, setSelectedEventModal] = useState(null);

    // Registration state
    const [registeredEventIds, setRegisteredEventIds] = useState([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [bitPaymentDetails, setBitPaymentDetails] = useState(null); // Controls the Bit popup
    const [calendarMenuAnchorEl, setCalendarMenuAnchorEl] = useState(null);
    const [isEventMessageDialogOpen, setIsEventMessageDialogOpen] = useState(false);
    const [isParticipantsPanelOpen, setIsParticipantsPanelOpen] = useState(false);
    const [eventParticipants, setEventParticipants] = useState([]);
    const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
    const [participantsError, setParticipantsError] = useState('');

    const requestedEventId =
        new URLSearchParams(location.search).get('eventId') ||
        location.state?.openEventId;
    const routeSelectedEvent = requestedEventId
        ? realEvents.find(event => event.id === requestedEventId) || null
        : null;
    const selectedEvent = manuallySelectedEvent || routeSelectedEvent;

    const closeSelectedEvent = () => {
        setCalendarMenuAnchorEl(null);
        setIsEventMessageDialogOpen(false);
        setIsParticipantsPanelOpen(false);
        setSelectedEventModal(null);

        if (requestedEventId) {
            navigate(location.pathname, { replace: true, state: null });
        }
    };

    const handleSelectedEventEdit = () => {
        if (!selectedEvent?.id) return;
        navigate(`/edit-event/${selectedEvent.id}`);
    };

    const handleCalendarMenuOpen = (event) => {
        event.stopPropagation();
        setCalendarMenuAnchorEl(event.currentTarget);
    };

    const handleCalendarMenuClose = (event) => {
        event?.stopPropagation();
        setCalendarMenuAnchorEl(null);
    };

    const handleCalendarTargetClick = (event, target) => {
        event.stopPropagation();
        const calendarUrl = target === 'google'
            ? buildGoogleCalendarUrl(selectedEvent)
            : buildOutlookCalendarUrl(selectedEvent);

        if (calendarUrl) {
            window.open(calendarUrl, '_blank', 'noopener,noreferrer');
        }

        setCalendarMenuAnchorEl(null);
    };

    const handleEventMessageDialogOpen = (event) => {
        event?.stopPropagation();
        setSelectedEventModal(selectedEvent);
        setIsEventMessageDialogOpen(true);
    };

    const handleEventMessageDialogClose = () => {
        setIsEventMessageDialogOpen(false);
    };

    const canViewEventParticipants = (event) => {
        if (isAdmin || userRole === 'admin') return true;
        if (userRole !== 'coordinator') return false;

        const currentUid = currentUser?.uid || '';
        const creatorUid = String(event?.createdBy || '').trim();

        return Boolean(currentUid && creatorUid && currentUid === creatorUid);
    };

    const handleParticipantsPanelOpen = (event) => {
        event.stopPropagation();
        setEventParticipants([]);
        setParticipantsError('');
        setIsParticipantsPanelOpen(true);
    };

    const handleParticipantsPanelClose = (event) => {
        event?.stopPropagation();
        setIsParticipantsPanelOpen(false);
    };

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
        
        let q;
        if (isAdmin || userRole === 'coordinator') {
            q = query(eventsRef, orderBy("date", "asc"));
        } else {
            q = query(eventsRef, where("status", "==", "published"), orderBy("date", "desc"));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let fetchedEvents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            if (!isAdmin && userRole !== 'coordinator') {
                fetchedEvents.reverse();
            }
            setRealEvents(fetchedEvents);
        });
        return () => unsubscribe();
    }, [isAdmin, userRole]);

    useEffect(() => {
        let isActive = true;

        if (!isParticipantsPanelOpen || !selectedEvent?.id) {
            return () => {
                isActive = false;
            };
        }

        const fetchParticipants = async () => {
            setIsLoadingParticipants(true);
            setParticipantsError('');
            setEventParticipants([]);

            try {
                const registrations = await eventService.getEventRegistrations(selectedEvent.id);

                if (isActive) {
                    setEventParticipants(registrations);
                }
            } catch (error) {
                console.error('Failed to load event participants:', error);

                if (isActive) {
                    setParticipantsError('לא ניתן לטעון משתתפים');
                    setEventParticipants([]);
                }
            } finally {
                if (isActive) {
                    setIsLoadingParticipants(false);
                }
            }
        };

        fetchParticipants();

        return () => {
            isActive = false;
        };
    }, [isParticipantsPanelOpen, selectedEvent?.id]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeEvents = [];
    const pastEvents = [];

    realEvents.forEach(event => {
        // Skip deleted and archived events entirely
        if (event.status === 'deleted' || event.status === 'archived') return;

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

    if (getEventCenterName(event) === 'coordinators-only' && !isAdmin && userRole !== 'coordinator') return false;

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

    const handleArchiveEvent = async (event) => {
        if (!isAdmin) {
            alert('רק מנהל יכול להעביר אירוע לארכיון.');
            return;
        }

        if (!isPastEvent(event)) {
            alert('ניתן להעביר לארכיון רק אירועים שהסתיימו.');
            return;
        }

        if (window.confirm('האם להעביר את האירוע לארכיון?')) {
            try {
                await eventService.updateEvent(event.id, {
                    status: 'archived',
                    archivedAt: serverTimestamp(),
                    archivedBy: currentUser?.uid || currentUser?.email || '',
                    previousStatus: event.status || 'published',
                });

                setRealEvents((currentEvents) => (
                    currentEvents.filter((existingEvent) => existingEvent.id !== event.id)
                ));

                if (selectedEvent?.id === event.id) {
                    closeSelectedEvent();
                }
            } catch (error) {
                console.error('Failed to archive event:', error);
                alert('שגיאה בהעברת האירוע לארכיון.');
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
        closeSelectedEvent();

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

    const selectedCenterIcon = getCenterIcon(selectedEvent);
    const selectedCenterName = getEventCenterName(selectedEvent);
    const selectedLocation = getEventLocation(selectedEvent);
    const selectedMapUrl = getMapSearchUrl(selectedEvent);
    const selectedEventIsCurrentUserOwned = isEventCreatedByCurrentCoordinator(selectedEvent, currentUser);
    const canEditSelectedEvent = isAdmin || selectedEventIsCurrentUserOwned;
    const canViewSelectedEventParticipants = canViewEventParticipants(selectedEvent);
    const selectedEventIsPast = isPastEvent(selectedEvent);
    const selectedCreatorName =
        selectedEvent?.creatorName ||
        selectedEvent?.coordinatorName ||
        (selectedEventIsCurrentUserOwned
            ? currentUser?.displayName || currentUser?.fullName || currentUser?.profile?.fullName
            : '');
    const selectedCreatorEmail =
        selectedEvent?.creatorEmail ||
        selectedEvent?.coordinatorEmail ||
        (selectedEventIsCurrentUserOwned ? currentUser?.email : '');
    const filteredActiveEvents = activeEvents.filter(filterFunction);
    const filteredPastEvents = pastEvents.filter(filterFunction);
    const featuredEvent = filteredActiveEvents[0] || null;
    const secondaryActiveEvents = filteredActiveEvents.slice(1);
    const visibleSecondaryEvents = showAllUpcomingEvents
        ? secondaryActiveEvents
        : secondaryActiveEvents.slice(0, 8);
    const hasHiddenSecondaryEvents = secondaryActiveEvents.length > 8;
    const canViewPastEvents = isAdmin || isCoordinator;

    const formatRegistrationDate = (value) => {
        const registrationDate = value?.toDate ? value.toDate() : new Date(value);

        if (!value || Number.isNaN(registrationDate.getTime())) {
            return '';
        }

        return registrationDate.toLocaleString('he-IL', {
            dateStyle: 'short',
            timeStyle: 'short',
        });
    };

    const renderCenterLogo = (event, className) => {
        const icon = getCenterIcon(event);
        const centerName = getEventCenterName(event);

        return (
            <div className={`${className} event-logo-container`} title={centerName || 'מרכז תעסוקה'}>
                {icon ? (
                    <img src={icon} alt={centerName || 'לוגו המרכז'} />
                ) : (
                    <svg viewBox="0 0 24 24" role="img" aria-label="סמל מרכז תעסוקה">
                        <path d="M4 20h16M6 20V9l6-5 6 5v11M9 12h2v2H9zM13 12h2v2h-2zM9 16h2v2H9zM13 16h2v2h-2z" />
                    </svg>
                )}
            </div>
        );
    };

    const renderEventRows = (events, isExpired = false) => (
        <div className="events-rows">
            {events.map((event) => {
                const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
                const locationText = getEventLocation(event);
                const mapUrl = getMapSearchUrl(event);
                const centerName = getEventCenterName(event);
                const centerColor = getEventColor(event);

                return (
                    <article
                        className={`event-row ${isExpired ? 'event-row-expired' : ''}`}
                        style={{ '--event-center-color': centerColor }}
                        key={event.id}
                        tabIndex={0}
                        role="button"
                        onClick={() => setSelectedEventModal(event)}
                        onKeyDown={(keyboardEvent) => {
                            if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                                keyboardEvent.preventDefault();
                                setSelectedEventModal(event);
                            }
                        }}
                    >
                        {renderCenterLogo(event, 'event-row-logo')}
                        <div className="event-row-main">
                            <h3>{event.title}</h3>
                            <span>{event.type || 'אירוע'}</span>
                        </div>
                        <div className="event-row-meta standard-numbers">
                            <strong>{Number.isNaN(eventDate.getTime()) ? 'טרם נקבע' : eventDate.toLocaleDateString('he-IL')}</strong>
                            <span dir="ltr">{event.time || 'טרם נקבע'}</span>
                        </div>
                        <div className="event-row-meta">
                            <strong>{centerName || 'מרכז תעסוקה'}</strong>
                            {mapUrl ? (
                                <a href={mapUrl} target="_blank" rel="noreferrer" onClick={(clickEvent) => clickEvent.stopPropagation()}>
                                    {locationText}
                                </a>
                            ) : (
                                <span>{locationText || 'מקוון'}</span>
                            )}
                        </div>
                        <div className="event-row-actions">
                            {!isPastEvent(event) && (
                                <ShareMenu
                                    title={event.title}
                                    url={buildEventShareUrl(event.id)}
                                    ariaLabel={`שיתוף האירוע ${event.title}`}
                                    buttonClassName="event-row-share-action"
                                />
                            )}
                            {isExpired && isAdmin && (
                                <button
                                    type="button"
                                    className="event-row-action btn-secondary pill-btn"
                                    onClick={(clickEvent) => {
                                        clickEvent.stopPropagation();
                                        handleArchiveEvent(event);
                                    }}
                                >
                                    העבר לארכיון
                                </button>
                            )}
                            <button
                                type="button"
                                className="event-row-action btn-primary pill-btn"
                                onClick={(clickEvent) => {
                                    clickEvent.stopPropagation();
                                    setSelectedEventModal(event);
                                }}
                            >
                                לפרטים
                            </button>
                        </div>
                    </article>
                );
            })}
        </div>
    );

    return (
        <div className="events-page-wrapper" dir="rtl">

            <PageHero
                title="אירועים ופעילויות"
                subtitle="ימי עיון, הכשרות ואירועי תעסוקה בירושלים"
                logoSrc={employmentLogo}
                logoAlt="רשות התעסוקה ירושלים"
                decorationSrc={eventsDecoration}
            />

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
                        <button className="btn-secondary pill-btn" onClick={() => navigate('/events/archive')}>
                            ארכיון אירועים
                        </button>
                    )}
                    {(userRole === 'coordinator' || userRole === 'admin') && (
                        <button className="btn-primary pill-btn" style={{ marginRight: 'auto' }} onClick={() => navigate('/add-event')}>
                            + הוסף אירוע
                        </button>
                    )}
                </div>
                <div className="events-view-toggle" role="group" aria-label="תצוגת האירועים המשניים">
                    <button
                        type="button"
                        className={viewMode === 'cards' ? 'active' : ''}
                        onClick={() => setViewMode('cards')}
                        aria-label="תצוגת כרטיסים"
                        aria-pressed={viewMode === 'cards'}
                        title="כרטיסים"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={viewMode === 'rows' ? 'active' : ''}
                        onClick={() => setViewMode('rows')}
                        aria-label="תצוגת שורות"
                        aria-pressed={viewMode === 'rows'}
                        title="שורות"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <line x1="8" y1="6" x2="21" y2="6" />
                            <line x1="8" y1="12" x2="21" y2="12" />
                            <line x1="8" y1="18" x2="21" y2="18" />
                            <rect x="3" y="4" width="2" height="2" />
                            <rect x="3" y="10" width="2" height="2" />
                            <rect x="3" y="16" width="2" height="2" />
                        </svg>
                    </button>
                </div>
            </div>

            {featuredEvent ? (
                <main className="events-showcase">
                    <aside className="featured-event-column" aria-label="האירוע הקרוב ביותר">
                        <div className="featured-event-heading">
                            <h2>האירוע הקרוב ביותר</h2>
                        </div>
                        <div className="featured-event-panel">
                            <EventCard
                                event={featuredEvent}
                                index={0}
                                isGuest={isGuest}
                                isFeatured={true}
                                isRegistered={registeredEventIds.includes(featuredEvent.id)}
                                onOpenDetails={(event) => setSelectedEventModal(event)}
                                onApprove={handleApproveEvent}
                            />
                        </div>
                    </aside>

                    <section
                        className={`events-secondary-area ${showAllUpcomingEvents ? 'events-secondary-area-expanded' : ''}`}
                        aria-label="אירועים נוספים"
                    >
                        <div className="events-secondary-heading">
                            <div>
                                <h2>אירועים נוספים</h2>
                                <p>{secondaryActiveEvents.length} אירועים קרובים</p>
                            </div>
                        </div>

                        <div className="events-secondary-scroll">
                            {secondaryActiveEvents.length > 0 ? (
                                viewMode === 'cards' ? (
                                    <div className="events-grid events-secondary-grid">
                                        {visibleSecondaryEvents.map((event, index) => (
                                            <EventCard
                                                key={event.id}
                                                event={event}
                                                index={index + 1}
                                                isGuest={isGuest}
                                                isCompact={true}
                                                isRegistered={registeredEventIds.includes(event.id)}
                                                onOpenDetails={(selectedEvent) => setSelectedEventModal(selectedEvent)}
                                                onApprove={handleApproveEvent}
                                            />
                                        ))}
                                    </div>
                                ) : renderEventRows(visibleSecondaryEvents)
                            ) : (
                                <div className="no-results-message no-secondary-events">
                                    <p>אין אירועים קרובים נוספים.</p>
                                </div>
                            )}

                            {hasHiddenSecondaryEvents && (
                                <div className="events-expand-actions">
                                    <button
                                        type="button"
                                        className="btn-secondary pill-btn events-toggle-btn"
                                        onClick={() => setShowAllUpcomingEvents(prev => !prev)}
                                        aria-expanded={showAllUpcomingEvents}
                                    >
                                        {showAllUpcomingEvents ? 'הצג פחות' : 'הצג את כל האירועים'}
                                    </button>
                                </div>
                            )}

                            {canViewPastEvents && filteredPastEvents.length > 0 && (
                                <div className="past-events-section">
                                    <div className="section-divider section-divider-with-action">
                                        <h2>אירועים שנגמרו</h2>
                                        <hr/>
                                        <button
                                            type="button"
                                            className="btn-secondary pill-btn events-toggle-btn"
                                            onClick={() => setShowPastEvents(prev => !prev)}
                                            aria-expanded={showPastEvents}
                                        >
                                            {showPastEvents ? 'הסתר אירועים שהסתיימו' : 'הצג אירועים שהסתיימו'}
                                        </button>
                                    </div>
                                    {showPastEvents && (
                                        viewMode === 'cards' ? (
                                            <div className="events-grid events-secondary-grid events-grid-compact">
                                                {filteredPastEvents.map((event, index) => (
                                                    <EventCard
                                                        key={event.id}
                                                        event={event}
                                                        index={index}
                                                        isGuest={isGuest}
                                                        isExpired={true}
                                                        isCompact={true}
                                                        onOpenDetails={(selectedEvent) => setSelectedEventModal(selectedEvent)}
                                                        onApprove={handleApproveEvent}
                                                        onArchiveAction={handleArchiveEvent}
                                                        archiveActionLabel="העבר לארכיון"
                                                    />
                                                ))}
                                            </div>
                                        ) : renderEventRows(filteredPastEvents, true)
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                </main>
            ) : (
                <>
                    <div className="no-results-message">
                        <p>לא נמצאו אירועים קרובים.</p>
                    </div>
                    {canViewPastEvents && filteredPastEvents.length > 0 && (
                        <section className="past-events-section past-events-standalone" aria-label="אירועים שנגמרו">
                            <div className="section-divider section-divider-with-action">
                                <h2>אירועים שנגמרו</h2>
                                <hr/>
                                <button
                                    type="button"
                                    className="btn-secondary pill-btn events-toggle-btn"
                                    onClick={() => setShowPastEvents(prev => !prev)}
                                    aria-expanded={showPastEvents}
                                >
                                    {showPastEvents ? 'הסתר אירועים שהסתיימו' : 'הצג אירועים שהסתיימו'}
                                </button>
                            </div>
                            {showPastEvents && (
                                viewMode === 'cards' ? (
                                    <div className="events-grid events-secondary-grid events-grid-compact">
                                        {filteredPastEvents.map((event, index) => (
                                            <EventCard
                                                key={event.id}
                                                event={event}
                                                index={index}
                                                isGuest={isGuest}
                                                isExpired={true}
                                                isCompact={true}
                                                onOpenDetails={(selectedEvent) => setSelectedEventModal(selectedEvent)}
                                                onApprove={handleApproveEvent}
                                                onArchiveAction={handleArchiveEvent}
                                                archiveActionLabel="העבר לארכיון"
                                            />
                                        ))}
                                    </div>
                                ) : renderEventRows(filteredPastEvents, true)
                            )}
                        </section>
                    )}
                </>
            )}

            {/* ===== FULLSCREEN EVENT MODAL ===== */}
            {selectedEvent && (
                <div className="event-modal-overlay" onClick={closeSelectedEvent}>
                    <div className="full-event-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="event-modal-close" onClick={closeSelectedEvent}>✖</button>
                        
                        <div className="modal-header-banner">
                            <div className="modal-header-content">
                                <div className="modal-center-logo event-logo-container" title={selectedCenterName || 'מרכז תעסוקה'}>
                                    {selectedCenterIcon ? (
                                        <img src={selectedCenterIcon} alt={selectedCenterName || 'לוגו המרכז'} />
                                    ) : (
                                        <svg viewBox="0 0 24 24" role="img" aria-label="סמל מרכז תעסוקה">
                                            <path d="M4 20h16M6 20V9l6-5 6 5v11M9 12h2v2H9zM13 12h2v2h-2zM9 16h2v2H9zM13 16h2v2h-2z" />
                                        </svg>
                                    )}
                                </div>
                                <h2>
                                    <span className="event-card-type">{selectedEvent.type || 'אירוע'}</span>
                                    <span className="event-title-separator" aria-hidden="true">|</span>
                                    <span>{selectedEvent.title}</span>
                                    {selectedEvent.paymentMethod && (
                                        <>
                                            <span className="event-title-separator" aria-hidden="true">|</span>
                                            <span className="event-payment-type" style={{ fontSize: '0.9em', fontWeight: 600, color: 'var(--color-primary, #1a56db)' }}>
                                                {selectedEvent.paymentMethod === 'none' 
                                                    ? 'חינם' 
                                                    : selectedEvent.price ? `₪${selectedEvent.price}` : 'בתשלום'}
                                            </span>
                                        </>
                                    )}
                                </h2>
                                <div className="modal-header-actions">
                                    {canViewSelectedEventParticipants && (
                                        <button
                                            type="button"
                                            className="modal-participants-action"
                                            onClick={handleParticipantsPanelOpen}
                                            aria-expanded={isParticipantsPanelOpen}
                                            aria-controls="event-participants-panel"
                                        >
                                            משתתפים
                                        </button>
                                    )}
                                    {canEditSelectedEvent && (
                                        <button
                                            type="button"
                                            className="modal-edit-action"
                                            onClick={handleSelectedEventEdit}
                                            aria-label={`עריכת האירוע ${selectedEvent.title}`}
                                            title="עריכת אירוע"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                            </svg>
                                        </button>
                                    )}
                                    <IconButton
                                        type="button"
                                        className="modal-calendar-action"
                                        onClick={handleCalendarMenuOpen}
                                        aria-label={`הוספת האירוע ${selectedEvent.title} ליומן`}
                                        aria-haspopup="menu"
                                        aria-expanded={Boolean(calendarMenuAnchorEl)}
                                        size="small"
                                        sx={{
                                            flex: '0 0 auto',
                                            color: 'var(--color-brand)',
                                            border: '1px solid var(--color-brand)',
                                            borderRadius: 'var(--radius-md)',
                                            fontFamily: 'inherit',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        <CalendarMonthOutlinedIcon fontSize="small" />
                                    </IconButton>
                                    <Menu
                                        anchorEl={calendarMenuAnchorEl}
                                        open={Boolean(calendarMenuAnchorEl)}
                                        onClose={handleCalendarMenuClose}
                                        onClick={(event) => event.stopPropagation()}
                                        slotProps={{ paper: { sx: { direction: 'rtl', minWidth: 180 } } }}
                                        sx={{ zIndex: 11000 }}
                                    >
                                        <MenuItem onClick={(event) => handleCalendarTargetClick(event, 'google')}>
                                            Google Calendar
                                        </MenuItem>
                                        <MenuItem onClick={(event) => handleCalendarTargetClick(event, 'outlook')}>
                                            Outlook Calendar
                                        </MenuItem>
                                    </Menu>
                                    {!isGuest && currentUser?.email && currentUser?.uid && (
                                        <Tooltip title="שליחה בהודעות">
                                            <IconButton
                                                type="button"
                                                className="modal-message-action"
                                                onClick={(event) => handleEventMessageDialogOpen(event)}
                                                aria-label={`שליחה בהודעות של האירוע ${selectedEvent.title}`}
                                                size="small"
                                                sx={{
                                                    flex: '0 0 auto',
                                                    color: 'var(--color-brand)',
                                                    border: '1px solid var(--color-brand)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontFamily: 'inherit',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                <ForwardToInboxOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {!selectedEventIsPast && (
                                        <ShareMenu
                                            title={selectedEvent.title}
                                            url={buildEventShareUrl(selectedEvent.id)}
                                            ariaLabel={`שיתוף האירוע ${selectedEvent.title}`}
                                            buttonClassName="modal-share-action"
                                            buttonSx={{
                                                flex: '0 0 auto',
                                                color: 'var(--color-brand)',
                                                border: '1px solid var(--color-brand)',
                                                borderRadius: 'var(--radius-md)',
                                                fontFamily: 'inherit',
                                                whiteSpace: 'nowrap',
                                            }}
                                        />
                                    )}
                                    <EventMessageDialog
                                        open={isEventMessageDialogOpen}
                                        event={selectedEvent}
                                        currentUser={currentUser}
                                        userRole={userRole}
                                        onClose={handleEventMessageDialogClose}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-body-content">
                            <div className="modal-info-grid">
                                <div className="modal-info-item">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                                    <span className="standard-numbers">{new Date(selectedEvent.date?.toDate ? selectedEvent.date.toDate() : selectedEvent.date).toLocaleDateString('he-IL')}</span>
                                </div>
                                <div className="modal-info-item">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                                    <span className="standard-numbers" dir="ltr">{selectedEvent.time || 'טרם נקבע'}</span>
                                </div>
                                <div className="modal-info-item">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                                    {selectedMapUrl ? (
                                        <a className="event-address-link" href={selectedMapUrl} target="_blank" rel="noreferrer">
                                            {selectedLocation}
                                        </a>
                                    ) : (
                                        <span>{selectedLocation || 'מקוון'}</span>
                                    )}
                                </div>
                                <div className="modal-info-item">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                    {(!selectedEvent.capacity || selectedEvent.capacity === 'ללא הגבלה') ? (
                                        <span>ללא הגבלה</span>
                                    ) : (
                                        <><span className="standard-numbers">{selectedEvent.capacity}</span> מקומות</>
                                    )}
                                </div>
                            </div>
                            
                            <hr className="modal-divider"/>
                            
                            <div className="modal-description">
                                <h3>על האירוע</h3>
                                <p>{selectedEvent.description}</p>
                            </div>

                            <hr className="modal-divider"/>

                            <div className="modal-contact-grid">
                                <div>
                                    <h4>אחראי/ת האירוע</h4>
                                    {selectedCreatorName && (
                                        <p>{selectedCreatorName}</p>
                                    )}
                                    {selectedEvent.coordinatorPhone && (
                                        <p className="standard-numbers" dir="ltr" style={{textAlign: 'right'}}>{selectedEvent.coordinatorPhone}</p>
                                    )}
                                    {selectedCreatorEmail && (
                                        <p>
                                            <a className="event-creator-email" href={`mailto:${selectedCreatorEmail}`}>
                                                {selectedCreatorEmail}
                                            </a>
                                        </p>
                                    )}
                                </div>
                                
                                {selectedEvent.isAccessible && (
                                    <div>
                                        <h4>פרטי נגישות</h4>
                                        <p>איש קשר: {selectedEvent.accessibilityContactName}</p>
                                        <p className="standard-numbers" dir="ltr" style={{textAlign: 'right'}}>{selectedEvent.accessibilityContactPhone}</p>
                                    </div>
                                )}
                            </div>

                            {/* Payment Section */}
                            {selectedEvent.paymentMethod && selectedEvent.paymentMethod !== 'none' && (
                                <div className="modal-payment-section">
                                    <h4>פרטי תשלום והרשמה</h4>
                                    <p><strong>מחיר:</strong> <span className="standard-numbers">{selectedEvent.price}</span> ₪</p>
                                    {selectedEvent.discountDetails && <p><strong>הנחות:</strong> {selectedEvent.discountDetails}</p>}
                                    <p>
                                        <strong>כיצד לשלם:</strong>{' '}
                                        {selectedEvent.paymentMethod === 'link' && <a href={selectedEvent.paymentDetails} target="_blank" rel="noreferrer">לחץ כאן למעבר לתשלום</a>}
                                        {selectedEvent.paymentMethod === 'bit' && <span className="standard-numbers" dir="ltr">{selectedEvent.paymentDetails}</span>}
                                        {selectedEvent.paymentMethod === 'other' && <span>{selectedEvent.paymentDetails}</span>}
                                    </p>
                                </div>
                            )}

                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel pill-btn" onClick={closeSelectedEvent}>סגירה</button>
                            {/* --- DYNAMIC REGISTRATION BUTTON --- */}
                            {!isGuest && !selectedEvent.isExpired && userRole === 'employer' && (
                                (() => {
                                    const isRegistered = registeredEventIds.includes(selectedEvent.id);
                                    // Parse to integers just to be safe
                                    const isUnlimited = !selectedEvent.capacity || selectedEvent.capacity === 'ללא הגבלה';
                                    const capacity = parseInt(selectedEvent.capacity) || 0;
                                    const registeredCount = parseInt(selectedEvent.registeredCount) || 0;
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
                                            onClick={() => handleRegisterClick(selectedEvent)}
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

            {selectedEvent && isParticipantsPanelOpen && canViewSelectedEventParticipants && (
                <div className="event-participants-modal-overlay" onClick={handleParticipantsPanelClose}>
                    <section
                        id="event-participants-panel"
                        className="event-participants-modal"
                        onClick={(event) => event.stopPropagation()}
                        aria-label="משתתפים באירוע"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="event-participants-header">
                            <div>
                                <h3>משתתפים באירוע</h3>
                                {selectedEvent.title && (
                                    <p>{selectedEvent.title}</p>
                                )}
                            </div>
                            <button
                                type="button"
                                className="event-participants-close"
                                onClick={handleParticipantsPanelClose}
                                aria-label="סגירת משתתפים"
                            >
                                סגור
                            </button>
                        </div>

                        {isLoadingParticipants ? (
                            <p className="event-participants-state">טוען משתתפים...</p>
                        ) : participantsError ? (
                            <p className="event-participants-state event-participants-error">
                                {participantsError}
                            </p>
                        ) : eventParticipants.length === 0 ? (
                            <p className="event-participants-state">אין משתתפים רשומים עדיין</p>
                        ) : (
                            <div className="event-participants-table-wrap">
                                <table className="event-participants-table">
                                    <thead>
                                        <tr>
                                            <th>שם</th>
                                            <th>אימייל</th>
                                            <th>מספר טלפון</th>
                                            <th>תאריך ושעת הרשמה</th>
                                            <th>מרכז</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {eventParticipants.map((participant) => {
                                            const participantName =
                                                participant.name ||
                                                participant.fullName ||
                                                participant.displayName ||
                                                'לא צוין';
                                            const participantPhone =
                                                participant.phone ||
                                                participant.phoneNumber ||
                                                participant.mobile ||
                                                'לא צוין';
                                            const registrationDate = formatRegistrationDate(
                                                participant.registeredAt ||
                                                participant.createdAt ||
                                                participant.signedAt
                                            );
                                            const participantCenter =
                                                participant.centerName ||
                                                participant.center ||
                                                participant.userCenter ||
                                                'לא צוין';

                                            return (
                                                <tr key={participant.id}>
                                                    <td>{participantName}</td>
                                                    <td>
                                                        {participant.email ? (
                                                            <a href={`mailto:${participant.email}`}>
                                                                {participant.email}
                                                            </a>
                                                        ) : (
                                                            'לא צוין'
                                                        )}
                                                    </td>
                                                    <td className="standard-numbers" dir="ltr">
                                                        {participantPhone}
                                                    </td>
                                                    <td className="standard-numbers">
                                                        {registrationDate || 'לא צוין'}
                                                    </td>
                                                    <td>{participantCenter}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
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
