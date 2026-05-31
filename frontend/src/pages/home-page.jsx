import React, { useState, useEffect } from 'react';
import { Typography, Box, Paper, Container, Card, CardContent, Divider } from '@mui/material';
import { useAuth } from '../context/auth-context';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/config';

import EventCalendar from '../features/calendar/home-page-calendar'; 
import HeroCarousel from '../features/carousel/hero-carousel';
import MediaCarousel from '../features/carousel/media-carousel';

// Importing images and logos 
import EmploymentLogo from '../assets/images/employment-logo.png';
import cityView from '../assets/images/city-view.png';

const SectionTitle = ({ title, icon }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, pb: 1.5, borderBottom: '2px solid #e2e8f0', position: 'relative' }}>
        <Box sx={{ color: '#003b8b', display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography variant="h5" fontWeight="700" sx={{ color: '#003b8b', m: 0 }}>
            {title}
        </Typography>
        <Box sx={{ position: 'absolute', bottom: '-2px', right: 0, width: '40px', height: '2px', bgcolor: '#facc15' }} />
    </Box>
);

const HomePage = () => {
    const { isAuthenticated, currentUser } = useAuth();
    const [articles, setArticles] = useState([]);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const q = query(collection(db, 'articles'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedArticles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setArticles(fetchedArticles);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'events'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const upcoming = fetchedEvents
                .filter(e => e.status === 'published' && new Date(e.date) >= now)
                .sort((a, b) => new Date(a.date) - new Date(b.date));
                
            setEvents(upcoming);
        });
        return () => unsubscribe();
    }, []);

    return (
        <Box sx={{ bgcolor: '#f4f7fa', minHeight: '100vh', display: 'flex', flexDirection: 'column', direction: 'rtl', pb: 6 }}>
            
            {/* =========================================
                DARK ELEGANT HERO BANNER (Matches Events Page)
                ========================================= */}
            <Box 
                sx={{
                    position: 'relative',
                    height: '230px', 
                    backgroundColor: '#001a40', 
                    backgroundImage: `url('${cityView}')`, 
                    backgroundSize: 'cover',
                    backgroundPosition: 'center 70%',
                    borderBottom: '4px solid #facc15', 
                    display: 'flex',
                    alignItems: 'center',
                    mb: 0, // Removed the heavy negative margin that was squeezing the layout
                    direction: 'rtl'
                }}
            >
                {/* Dark Gradient Overlay */}
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, rgb(4, 9, 26) 0%, rgba(0,24,64,0.5) 60%, transparent 100%)', zIndex: 2 }} />
                
                <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 4 }}>
                    
                    <img 
                        src={EmploymentLogo}
                        alt="רשות התעסוקה" 
                        style={{ height: '155px', objectFit: 'contain' }} 
                    />

                    <Box sx={{ textAlign: 'right' }}>
                        <Typography component="h1" sx={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', m: 0, mb: 1, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                            מרכז המידע למעסיקים
                        </Typography>
                        <Typography component="p" sx={{ fontSize: '16px', opacity: 0.9, color: '#ffffff', m: 0, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                            הרשות העירונית לתעסוקה ירושלים
                        </Typography>
                    </Box>

                </Container>
            </Box>

            {/* =========================================
                MAIN CONTENT CONTAINER
                ========================================= */}
            {/* Removed the Container maxWidth to allow the content to stretch further, matching the Event Page's wider borders */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', px: 0, pt: 4 }}>
                
                <Paper 
                    elevation={0} 
                    sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', lg: 'row' },
                        direction: 'ltr', 
                        bgcolor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 0,
                        overflow: 'hidden',
                        boxShadow: '0 10px 40px rgba(0, 24, 64, 0.04)',
                        alignItems: 'stretch',
                        minHeight: '650px' 
                    }}
                >
                    
                    {/* --- LEFT COLUMN: Stacked Components --- */}
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        flex: 1, 
                        minWidth: '350px',
                        borderRight: { xs: 'none', lg: '1px solid #e2e8f0' }, 
                        borderLeft: { xs: 'none', lg: '1px solid #e2e8f0' },
                        borderBottom: { xs: '1px solid #e2e8f0', lg: 'none' },
                        p: 4,
                        direction: 'rtl' 
                    }}>
                        
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '250px' }}>
                            <SectionTitle 
                                title="אירועים בשבוע הקרוב" 
                                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>} 
                            />
                            <Box sx={{ overflow: 'hidden', borderRadius: 3, flexGrow: 1 }}>
                                <HeroCarousel events={events} />
                            </Box>
                        </Box>

                        <Divider sx={{ my: 4, borderColor: '#f1f5f9' }} />

                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '250px' }}>
                            <SectionTitle 
                                title="כתבות ועדכוני רשת" 
                                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>} 
                            />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                                {articles.length > 0 ? articles.map(article => (
                                    <Card key={article.id} elevation={0} sx={{ borderRight: '4px solid #facc15', bgcolor: '#f8fafc', flexShrink: 0, transition: '0.2s', '&:hover': { bgcolor: '#f1f5f9', transform: 'translateX(-4px)' } }}> 
                                        <CardContent sx={{ p: '12px !important' }}>
                                            <Typography variant="caption" fontWeight="700" sx={{ color: '#003b8b', display: 'block', mb: 0.5 }}>
                                                {article.sourceName}
                                            </Typography>
                                            <Typography 
                                                variant="body1" 
                                                fontWeight="300" 
                                                sx={{ color: '#0f172a', lineHeight: 1.3, cursor: 'pointer' }}
                                                onClick={() => window.open(article.url, '_blank')}
                                            >
                                                {article.title}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                )) : (
                                    <Typography fontWeight="300" sx={{ color: '#64748b', textAlign: 'center', mt: 4 }}>אין כתבות זמינות כרגע.</Typography>
                                )}
                            </Box>
                        </Box>

                    </Box>

                    {/* --- RIGHT COLUMN: Dedicated Calendar --- */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 2.2, direction: 'rtl', bgcolor: '#f8fafc' }}>
                        <EventCalendar events={events} userName={isAuthenticated ? currentUser?.displayName : 'אורח'} />
                    </Box>

                </Paper>

                {/* =========================================
                    FULL WIDTH BOTTOM CAROUSEL
                    ========================================= */}
                <Box sx={{ mt: 5, direction: 'rtl' }}>
                    <SectionTitle 
                        title="גלריית אירועי תעסוקה" 
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>} 
                    />
                    <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 10px 40px rgba(0, 24, 64, 0.04)', p: 1, bgcolor: '#ffffff' }}>
                        <MediaCarousel 
                            photos={[
                                '/assets/images/event-placeholder-1.jpg', 
                                '/assets/images/event-placeholder-2.jpg',
                                '/assets/images/event-placeholder-3.jpg',
                                '/assets/images/event-placeholder-4.jpg'
                            ]} 
                        />
                    </Paper>
                </Box>

            </Box>
        </Box>
    );
};

export default HomePage;