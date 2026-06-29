import { useEffect, useMemo, useState } from 'react';
import { deleteField } from 'firebase/firestore';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { EventCard } from '../components/events/event-card';
import { PageHero } from '../components/layout/PageHero';
import { eventService } from '../services/interfaces/event-services';
import { getCenterIcon, getEventCenterName } from '../utils/centerIcons';
import { getEventLocation, getMapSearchUrl } from '../utils/mapLinks';
import { toSafeDate } from '../utils/eventDates';
import eventsDecoration from '../assets/images/city-view.png';
import employmentLogo from '../assets/center-icons/taasuka-logo-color.png';

import '../design/event-card.css';
import '../design/event-page.css';
import '../design/archived-events-page.css';

const MONTH_OPTIONS = [
    'ינואר',
    'פברואר',
    'מרץ',
    'אפריל',
    'מאי',
    'יוני',
    'יולי',
    'אוגוסט',
    'ספטמבר',
    'אוקטובר',
    'נובמבר',
    'דצמבר',
];

const formatDateKey = (date) => {
    if (!date) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const getEventDate = (event) => toSafeDate(event?.date || event?.startsAt);

const isArchivedEvent = (event) => (
    event?.status === 'archived' ||
    event?.archived === true ||
    event?.isArchived === true ||
    Boolean(event?.archivedAt)
);

const getCreatorName = (event) => (
    event?.creatorName ||
    event?.coordinatorName ||
    event?.createdByEmail ||
    event?.creatorEmail ||
    ''
);

export const ArchivedEventsPage = () => {
    const { isAdmin, isGuest } = useAuth();
    const navigate = useNavigate();
    const [archivedEvents, setArchivedEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [filters, setFilters] = useState({
        month: '',
        year: '',
        center: '',
        date: '',
    });

    useEffect(() => {
        let isActive = true;

        if (!isAdmin) {
            return () => {
                isActive = false;
            };
        }

        const loadArchivedEvents = async () => {
            setIsLoading(true);
            setLoadError('');

            try {
                const events = await eventService.getArchivedEvents();

                if (isActive) {
                    setArchivedEvents(events.filter(isArchivedEvent));
                }
            } catch (error) {
                console.error('Failed to load archived events:', error);

                if (isActive) {
                    setArchivedEvents([]);
                    setLoadError('לא ניתן לטעון את ארכיון האירועים');
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        loadArchivedEvents();

        return () => {
            isActive = false;
        };
    }, [isAdmin]);

    const yearOptions = useMemo(() => {
        const years = archivedEvents
            .map((event) => getEventDate(event)?.getFullYear())
            .filter(Boolean);

        return Array.from(new Set(years)).sort((a, b) => b - a);
    }, [archivedEvents]);

    const centerOptions = useMemo(() => {
        const centers = archivedEvents
            .map((event) => getEventCenterName(event))
            .filter(Boolean);

        return Array.from(new Set(centers)).sort((a, b) => a.localeCompare(b, 'he'));
    }, [archivedEvents]);

    const filteredEvents = useMemo(() => (
        archivedEvents.filter((event) => {
            const eventDate = getEventDate(event);
            const eventDateKey = formatDateKey(eventDate);
            const eventCenter = getEventCenterName(event);

            if (filters.month && eventDate?.getMonth() + 1 !== Number(filters.month)) {
                return false;
            }

            if (filters.year && eventDate?.getFullYear() !== Number(filters.year)) {
                return false;
            }

            if (filters.center && eventCenter !== filters.center) {
                return false;
            }

            if (filters.date && eventDateKey !== filters.date) {
                return false;
            }

            return true;
        })
    ), [archivedEvents, filters]);

    const selectedDate = getEventDate(selectedEvent);
    const selectedCenterName = getEventCenterName(selectedEvent);
    const selectedCenterIcon = getCenterIcon(selectedEvent);
    const selectedLocation = getEventLocation(selectedEvent);
    const selectedMapUrl = getMapSearchUrl(selectedEvent);
    const selectedCreatorName = getCreatorName(selectedEvent);

    const handleFilterChange = (field, value) => {
        setFilters((currentFilters) => ({
            ...currentFilters,
            [field]: value,
        }));
    };

    const resetFilters = () => {
        setFilters({
            month: '',
            year: '',
            center: '',
            date: '',
        });
    };

    const handleRestoreFromArchive = async (event) => {
        if (!isAdmin) {
            alert('רק מנהל יכול לשחזר אירוע מהארכיון.');
            return;
        }

        if (!window.confirm('האם להחזיר את האירוע לאירועים שהסתיימו?')) {
            return;
        }

        const restoredStatus = event.previousStatus && event.previousStatus !== 'archived'
            ? event.previousStatus
            : 'published';

        try {
            await eventService.updateEvent(event.id, {
                status: restoredStatus,
                archivedAt: deleteField(),
                archivedBy: deleteField(),
                previousStatus: deleteField(),
            });

            setArchivedEvents((currentEvents) => (
                currentEvents.filter((currentEvent) => currentEvent.id !== event.id)
            ));

            if (selectedEvent?.id === event.id) {
                setSelectedEvent(null);
            }
        } catch (error) {
            console.error('Failed to restore archived event:', error);
            alert('שגיאה בשחזור האירוע מהארכיון.');
        }
    };

    if (!isAdmin) {
        return <Navigate to="/events" replace />;
    }

    return (
        <div className="events-page-wrapper archived-events-page" dir="rtl">
            <PageHero
                title="ארכיון אירועים"
                subtitle="אירועים שהועברו לארכיון ונשמרים לצפייה וניהול"
                logoSrc={employmentLogo}
                logoAlt="רשות התעסוקה ירושלים"
                decorationSrc={eventsDecoration}
            />

            <div className="events-toolbar archived-events-toolbar" aria-label="סינון ארכיון אירועים">
                <div className="archive-filter-field">
                    <select
                        aria-label="חודש"
                        value={filters.month}
                        onChange={(event) => handleFilterChange('month', event.target.value)}
                    >
                        <option value="">כל החודשים</option>
                        {MONTH_OPTIONS.map((monthName, index) => (
                            <option key={monthName} value={index + 1}>
                                {monthName}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="archive-filter-field">
                    <select
                        aria-label="שנה"
                        value={filters.year}
                        onChange={(event) => handleFilterChange('year', event.target.value)}
                    >
                        <option value="">כל השנים</option>
                        {yearOptions.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="archive-filter-field archive-filter-field-center">
                    <select
                        aria-label="מרכז"
                        value={filters.center}
                        onChange={(event) => handleFilterChange('center', event.target.value)}
                    >
                        <option value="">כל המרכזים</option>
                        {centerOptions.map((center) => (
                            <option key={center} value={center}>
                                {center}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="archive-filter-field">
                    <input
                        type="date"
                        aria-label="בחירת תאריך"
                        title="בחירת תאריך"
                        value={filters.date}
                        onChange={(event) => handleFilterChange('date', event.target.value)}
                    />
                </div>

                <button
                    type="button"
                    className="btn-secondary pill-btn archived-events-reset"
                    onClick={resetFilters}
                >
                    ניקוי סינון
                </button>
            </div>

            <main className="archived-events-content">
                {isLoading ? (
                    <div className="no-results-message">
                        <p>טוען ארכיון אירועים...</p>
                    </div>
                ) : loadError ? (
                    <div className="no-results-message">
                        <p>{loadError}</p>
                    </div>
                ) : filteredEvents.length > 0 ? (
                    <div className="events-grid events-secondary-grid events-grid-compact archived-events-grid">
                        {filteredEvents.map((event, index) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                index={index}
                                isGuest={isGuest}
                                isExpired={true}
                                isCompact={true}
                                hideShare={true}
                                isArchivedView={true}
                                archiveActionLabel="החזרה לאירועים שהסתיימו"
                                onArchiveAction={handleRestoreFromArchive}
                                onOpenDetails={(selectedArchivedEvent) => setSelectedEvent(selectedArchivedEvent)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="no-results-message archived-events-empty">
                        <p>אין אירועים בארכיון להצגה</p>
                    </div>
                )}
            </main>

            {selectedEvent && (
                <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
                    <div className="full-event-modal-content archived-event-modal" onClick={(event) => event.stopPropagation()}>
                        <button className="event-modal-close" onClick={() => setSelectedEvent(null)}>✖</button>

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
                                </h2>
                                <div className="modal-header-actions">
                                    <button
                                        type="button"
                                        className="modal-edit-action"
                                        onClick={() => navigate(`/edit-event/${selectedEvent.id}`)}
                                        aria-label={`עריכת האירוע ${selectedEvent.title}`}
                                        title="עריכת אירוע"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="modal-body-content">
                            <div className="modal-info-grid">
                                <div className="modal-info-item">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                                    <span className="standard-numbers">{selectedDate ? selectedDate.toLocaleDateString('he-IL') : 'טרם נקבע'}</span>
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
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 20V9l6-5 6 5v11M9 12h2v2H9zM13 12h2v2h-2zM9 16h2v2H9zM13 16h2v2h-2z" /></svg>
                                    <span>{selectedCenterName || 'מרכז תעסוקה'}</span>
                                </div>
                            </div>

                            <hr className="modal-divider" />

                            <div className="modal-description">
                                <h3>על האירוע</h3>
                                <p>{selectedEvent.description || 'לא הוזן תיאור לאירוע זה.'}</p>
                            </div>

                            <hr className="modal-divider" />

                            <div className="modal-contact-grid">
                                <div>
                                    <h4>אחראי/ת האירוע</h4>
                                    <p>{selectedCreatorName || 'לא צוין'}</p>
                                    {selectedEvent.coordinatorPhone && (
                                        <p className="standard-numbers" dir="ltr" style={{ textAlign: 'right' }}>{selectedEvent.coordinatorPhone}</p>
                                    )}
                                    {(selectedEvent.creatorEmail || selectedEvent.coordinatorEmail) && (
                                        <p>
                                            <a className="event-creator-email" href={`mailto:${selectedEvent.creatorEmail || selectedEvent.coordinatorEmail}`}>
                                                {selectedEvent.creatorEmail || selectedEvent.coordinatorEmail}
                                            </a>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel pill-btn" onClick={() => setSelectedEvent(null)}>סגירה</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArchivedEventsPage;
