import React, { useState, useEffect } from 'react';
import { Typography, Box, Paper, Card, CardContent, Divider } from '@mui/material';
import { useAuth } from '../context/auth-context';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../services/firebase/config';

import EventCalendar from '../features/calendar/home-page-calendar'; 
import HeroCarousel from '../features/carousel/hero-carousel';
import MediaCarousel from '../features/carousel/media-carousel';

import '../design/event-page.css'; 
import EmploymentLogo from '../assets/images/employment-logo.png';
import { resolveEventImage } from '../utils/eventImageMap';

const SectionTitle = ({ title, icon }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, pb: 1.5, borderBottom: '2px solid var(--color-border)', position: 'relative' }}>
        <Box sx={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography variant="h5" fontWeight="700" sx={{ color: 'var(--color-primary-dark)', m: 0 }}>
            {title}
        </Typography>
        <Box sx={{ position: 'absolute', bottom: '-2px', right: 0, width: '40px', height: '2px', bgcolor: 'var(--color-gold)' }} />
    </Box>
);

const getEventDate = (dateValue) => {
    return dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
};

const HomePage = () => {
    const { isAuthenticated, currentUser } = useAuth();
    const [articles, setArticles] = useState([]);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const q = query(collection(db, 'events'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const fetchedEvents = snapshot.docs.map(doc => {
                const event = { id: doc.id, ...doc.data() };
                const eventImage = resolveEventImage(event);

                return {
                    ...event,

                    // Useful for components that support a custom image field
                    imageSrc: eventImage,
                    displayImage: eventImage,

                    // Keeps older components working if they still read event.photoUrl
                    photoUrl: eventImage || event.photoUrl || ''
                };
            });

            const upcoming = fetchedEvents
                .filter(e => e.status === 'published' && getEventDate(e.date) >= now)
                .sort((a, b) => getEventDate(a.date) - getEventDate(b.date));

            setEvents(upcoming);
        });

        return () => unsubscribe();
    }, []);

    const eventGalleryPhotos = events
    .map(event => resolveEventImage(event))
    .filter(Boolean);

    const galleryPhotos = eventGalleryPhotos.length > 0
        ? eventGalleryPhotos
        : ['/assets/images/event-placeholder-1.jpg', '/assets/images/event-placeholder-2.jpg'];

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
            
            <header className="site-hero">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <img src={EmploymentLogo} alt="רשות התעסוקה ירושלים" className="hero-logo" />
                    <div className="hero-text">
                        <h1 className="hero-title">מרכז המידע למעסיקים</h1>
                        <p className="hero-subtitle">הרשות העירונית לתעסוקה ירושלים</p>
                    </div>
                </div>
            </header>

            <Box className="modern-layout-wrapper" sx={{ display: 'flex', flexDirection: 'column', px: { xs: 2, lg: 6 }, pt: 4 }}>
                
                <Paper elevation={0} sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', lg: 'row' }, /* Stack on mobile, side-by-side on desktop */
                    direction: 'ltr', 
                    bgcolor: 'transparent',
                    alignItems: 'stretch',
                    gap: 4
                }}>
                    
                    {/* --- LEFT COLUMN (Articles & Carousel) --- */}
                    {/* CSS Magic: 'order: 2' forces this to the BOTTOM on mobile, but 'order: 1' puts it back on the LEFT on desktop */}
                    <Box sx={{ 
                        display: 'flex', flexDirection: 'column', flex: 1, 
                        minWidth: '350px', direction: 'rtl',
                        order: { xs: 2, lg: 1 } 
                    }}>
                        <Box sx={{ mb: 4 }}>
                            <SectionTitle title="אירועים בחודש הקרוב" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>} />
                            <Box sx={{ overflow: 'hidden', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', minHeight: '220px', display: 'flex', flexDirection: 'column' }}>
                                <HeroCarousel events={events} />
                            </Box>
                        </Box>

                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                            <SectionTitle title="כתבות ועדכוני רשת" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1, pr: 1 }}>
                                {articles.length > 0 ? articles.map(article => (
                                    <Card key={article.id} elevation={0} sx={{ borderRight: '4px solid var(--color-gold)', bgcolor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', transition: '0.2s', '&:hover': { transform: 'translateX(-4px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}> 
                                        <CardContent sx={{ p: '16px !important' }}>
                                            <Typography variant="caption" fontWeight="700" sx={{ color: 'var(--color-primary-dark)', display: 'block', mb: 0.5 }}>{article.sourceName}</Typography>
                                            <Typography variant="body1" fontWeight="500" sx={{ color: 'var(--color-text-main)', lineHeight: 1.3, cursor: 'pointer' }} onClick={() => window.open(article.url, '_blank')}>{article.title}</Typography>
                                        </CardContent>
                                    </Card>
                                )) : (
                                    <Typography fontWeight="300" sx={{ color: 'var(--color-text-muted)', textAlign: 'center', mt: 4 }}>אין כתבות זמינות כרגע.</Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    {/* --- RIGHT COLUMN (Calendar) --- */}
                    {/* CSS Magic: 'order: 1' forces this to the TOP on mobile, 'order: 2' puts it back on the RIGHT on desktop */}
                    <Box sx={{ 
                        display: 'flex', flexDirection: 'column', flex: 2.2, 
                        direction: 'rtl', bgcolor: 'var(--color-surface)', 
                        borderRadius: 'var(--radius-lg)', overflow: 'hidden', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid var(--color-border)',
                        order: { xs: 1, lg: 2 } 
                    }}>
                        <EventCalendar events={events} userName={isAuthenticated ? currentUser?.displayName : 'אורח'} />
                    </Box>

                </Paper>

                <Box sx={{ mt: 6, direction: 'rtl' }}>
                    <SectionTitle title="גלריית אירועי תעסוקה" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>} />
                    <Paper elevation={0} sx={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', p: 2, bgcolor: 'var(--color-surface)', height: '800px', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ flexGrow: 1, width: '100%', height: '100%', '& > div': { height: '100%' } }}>
                            <MediaCarousel photos={galleryPhotos} />
                        </Box>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
};

export default HomePage;