import React, { useState } from 'react';
import { useAuth } from '../context/auth-context';
import { useNavigate } from 'react-router-dom';
import { EventCard } from '../components/events/event-card';

// firebase
import { useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/config'; // Adjust path if needed

// Utility Data
import employmentLogo from '../assets/images/employment-logo.png';
import '../design/event-page-design.css'; 
import cityView from '../assets/images/city-view.png';

// TODO: [SRP/DIP] Remove MOCK_EVENTS once Firebase is connected. We will replace this with a custom hook, e.g., const { events, isLoading } = useEvents(); The hook will call eventService.getEvents() to fetch data from Firestore.

const FILTER_CATEGORIES = ['הכל', 'יום קריירה', 'הכשרה', 'ירידת עבודה', 'סדנה'];

export const EventsPage = () => {
    // TODO: [RBAC Logic] Extract userRole and currentUser from useAuth() to handle specific permissions.
    const { isGuest, userRole, isAdmin } = useAuth(); // This is a temporary solution until we implement proper RBAC. For now, we will use userRole to determine if the user can see pending events and if they can add events.
    const [activeFilter, setActiveFilter] = useState('הכל');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);

    //navigate hook to redirect after adding an event
    const navigate = useNavigate();
    
    // 1. Create a state to hold the real events from Firebase
    const [realEvents, setRealEvents] = useState([]);

    // 2. THIS IS STEP 3: Fetching, Filtering, and Sorting from Firestore
    useEffect(() => {
        const eventsRef = collection(db, 'events');
        
        // Only get "published" events, and sort them so the closest date is first
        // const q = query(
        //     eventsRef, 
        //     where("status", "==", "published"),
        //     orderBy("date", "asc") 
        // );
        // this is temporary until we implement RBAC and can filter on the client side. For now, we want to see all events in the admin panel, including those pending approval.
        const q = query(eventsRef, orderBy("date", "asc"));

        // onSnapshot listens to the database live. If an Admin approves an event, 
        // it instantly appears on the screen without refreshing!
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRealEvents(fetchedEvents);
        });

        // Cleanup the listener when the page closes
        return () => unsubscribe();
    }, []);

    // 3. Update your filter to look at realEvents instead of MOCK_EVENTS
    const filteredEvents = realEvents.filter(event => {
        const matchesFilter = activeFilter === 'הכל' || event.type === activeFilter;
        const matchesSearch = event.title.includes(searchQuery) || event.description.includes(searchQuery);
        return matchesFilter && matchesSearch;
    });

    const visibleEvents = realEvents.filter((event) => {
    if (isAdmin) return true; // Admins see all
    return event.status === 'published'; // Others only see published
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
                    {(userRole === 'coordinator' || userRole === 'admin') && (
                        <button 
                            className="btn-primary" /* <-- CHANGED from btn-event */
                            style={{ marginRight: 'auto' }} 
                            onClick={() => navigate('/add-event')}
                        >
                            + הוסף אירוע
                        </button>
                    )}
                </div>
            </div>

            {/* ===== EVENTS GRID ===== */}
            <main className="events-grid">
                {visibleEvents.filter(event => {
                    const matchesFilter = activeFilter === 'הכל' || event.type === activeFilter;
                    const matchesSearch = event.title?.includes(searchQuery) || event.description?.includes(searchQuery);
                    return matchesFilter && matchesSearch;
                }).length > 0 ? (
                    visibleEvents
                        .filter(event => {
                            const matchesFilter = activeFilter === 'הכל' || event.type === activeFilter;
                            const matchesSearch = event.title?.includes(searchQuery) || event.description?.includes(searchQuery);
                            return matchesFilter && matchesSearch;
                        })
                        .map(event => (
                            <EventCard
                                key={event.id}
                                event={event}
                                isGuest={isGuest}
                            />
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