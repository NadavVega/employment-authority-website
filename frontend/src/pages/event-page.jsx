import React, { useState } from 'react';
import { useAuth } from '../context/auth-context';

// Utility Data
import employmentLogo from '../assets/images/employment-logo.png';
import '../design/event-page-design.css'; 
import cityView from '../assets/images/city-view.png';

// TODO: [SRP/DIP] Remove MOCK_EVENTS once Firebase is connected. We will replace this with a custom hook, e.g., const { events, isLoading } = useEvents(); The hook will call eventService.getEvents() to fetch data from Firestore.

const MOCK_EVENTS = [
    {
        id: 'e1',
        title: 'הכשרת Data Analyst – 3 חודשים',
        type: 'הכשרה',
        // TODO: [Adapter Pattern] When fetching from Firestore, the service layer MUST format. the Firestore Timestamp into this exact { day, month } object before passing it to the UI.
        date: { day: '22', month: 'יוני' },
        time: '13:00–09:00',
        location: 'מרכז התעסוקה ירושלים',
        capacity: '25 מקומות',
        description: 'קורס מואץ: Python, SQL, Tableau. בשיתוף חברות ביג-דטה ירושלמיות.'
    },
    {
        id: 'e2',
        title: 'יום קריירה – טכנולוגיה ומשפט',
        type: 'יום קריירה',
        date: { day: '15', month: 'יוני' },
        time: '16:00–09:00',
        location: 'מלחה טק פארק',
        capacity: '200 מקומות',
        description: 'ירידת עבודה לחברות טק ומשרדי עורכי דין מובילים. הכנת קו"ח ועמדות ראיון במקום.'
    },
    {
        id: 'e3',
        title: 'ירידת עבודה – מגזר הבריאות',
        type: 'ירידת עבודה',
        date: { day: '5', month: 'יולי' },
        time: '17:00–10:00',
        location: 'בנייני האומה',
        capacity: '500 מקומות',
        description: 'מפגש עם בתי החולים וקופות החולים המובילים בירושלים.'
    },
    {
        id: 'e4',
        title: 'סדנת הכנה לראיון עבודה',
        type: 'סדנה',
        date: { day: '28', month: 'יוני' },
        time: '20:00–17:00',
        location: 'זום / מקוון',
        capacity: '50 מקומות',
        description: 'כלים מעשיים וסימולציות למעבר ראיונות HR וראיונות מקצועיים בהצלחה.'
    }
];

const FILTER_CATEGORIES = ['הכל', 'יום קריירה', 'הכשרה', 'ירידת עבודה', 'סדנה'];

export const EventsPage = () => {
    // TODO: [RBAC Logic] Extract userRole and currentUser from useAuth() to handle specific permissions.
    const { isGuest } = useAuth();
    const [activeFilter, setActiveFilter] = useState('הכל');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredEvents = MOCK_EVENTS.filter(event => {
        const matchesFilter = activeFilter === 'הכל' || event.type === activeFilter;
        const matchesSearch = event.title.includes(searchQuery) || event.description.includes(searchQuery);
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="events-page-wrapper" dir="rtl">
            
            {/* ===== HEADER / HERO SECTION ===== */}
            <header 
                className="site-hero" 
                style={{ backgroundImage: `url('${cityView}')` }}
            >
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <img src={employmentLogo} alt="רשות התעסוקה ירושלים" className="hero-logo" />
                    <div className="hero-text">
                        <h1 className="hero-title">אירועים ופעילויות</h1>
                        <p className="hero-subtitle">ימי עיון, הכשרות ואירועי תעסוקה בירושלים</p>
                    </div>
                </div>
            </header>

            {/* ===== TOOLBAR (Filters & Search) ===== */}
            <div className="events-toolbar">
                <div className="search-container">
                    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input 
                        type="text" 
                        placeholder="חיפוש אירועים..." 
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-pills">
                    {FILTER_CATEGORIES.map(category => (
                        <button 
                            key={category}
                            className={`filter-pill ${activeFilter === category ? 'active' : ''}`}
                            onClick={() => setActiveFilter(category)}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* ===== EVENTS GRID ===== */}
            <main className="events-grid">
                {filteredEvents.length > 0 ? (
                    filteredEvents.map(event => (
                        <div className="event-card" key={event.id}>
                            
                            <div className="event-card-header">
                                <div className="event-date-badge">
                                    <span className="event-date-day">{event.date.day}</span>
                                    <span className="event-date-mon">{event.date.month}</span>
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
                    ))
                ) : (
                    <div className="no-results-message">
                        <p>לא נמצאו אירועים התואמים לחיפוש שלך.</p>
                    </div>
                )}
            </main>
            
        </div>
    );
};

export default EventsPage;