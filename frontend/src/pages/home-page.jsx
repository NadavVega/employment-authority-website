import React, { useState, useEffect } from 'react';
import { Typography, Box, Paper, Container, Card, CardContent } from '@mui/material';
import { useAuth } from '../context/auth-context';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/config';

import EventCalendar from '../features/calendar/event-calendar'; 
import HeroCarousel from '../features/carousel/hero-carousel';
import MediaCarousel from '../features/carousel/media-carousel'; 

// --- Custom Component for Prettier Window Titles ---
const SectionTitle = ({ title, icon }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, pb: 1.5, borderBottom: '2px solid #e2e8f0', position: 'relative' }}>
        <Box sx={{ color: '#003b8b', display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography variant="h5" fontWeight="700" sx={{ color: '#003b8b', m: 0 }}>
            {title}
        </Typography>
        {/* Accent Gold Underline */}
        <Box sx={{ position: 'absolute', bottom: '-2px', right: 0, width: '40px', height: '2px', bgcolor: '#facc15' }} />
    </Box>
);

const HomePage = () => {
    const { isAuthenticated, currentUser, isGuest } = useAuth();
    const [articles, setArticles] = useState([]);
    const [events, setEvents] = useState([]);

    // Fetch Articles (Aligns with UC8 preparation)
    useEffect(() => {
        const q = query(collection(db, 'articles'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedArticles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setArticles(fetchedArticles);
        });
        return () => unsubscribe();
    }, []);

    // Fetch Published Events (Upcoming)
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
        <Box 
            sx={{ 
                bgcolor: '#f4f7fa', 
                height: { xs: 'auto', lg: '100vh' }, 
                display: 'flex',
                flexDirection: 'column',
                overflow: { xs: 'auto', lg: 'hidden' }, 
                pt: { xs: 2, lg: 3 }, 
                pb: { xs: 2, lg: 3 }
            }}
        >
            <Container maxWidth="xl" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                
                <Box sx={{ mb: 2, textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant="h5" fontWeight="300" sx={{ color: '#003b8b' }}> 
                        {isAuthenticated ? `שלום, ${currentUser?.displayName || 'משתמש'}` : 'לוח בקרה אישי'}
                    </Typography>
                </Box>

                {/* DUAL COLUMN FLEXBOX LAYOUT */}
                <Box 
                    sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', lg: 'row' },
                        gap: 3,
                        direction: 'ltr', 
                        flexGrow: 1,
                        minHeight: 0 
                    }}
                >
                    
                    {/* LEFT COLUMN: Articles (Top), Media Carousel (Bottom) - Equal Sizes */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 3 }}>
                        
                        <Paper elevation={0} sx={{ flex: 1, p: 3, borderRadius: 4, direction: 'rtl', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <SectionTitle 
                                title="כתבות ועדכוני רשת" 
                                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>} 
                            />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                                {articles.length > 0 ? articles.map(article => (
                                    <Card key={article.id} elevation={0} sx={{ borderRight: '4px solid #facc15', bgcolor: '#f8fafc', flexShrink: 0, transition: '0.2s', '&:hover': { bgcolor: '#f1f5f9' } }}> 
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
                        </Paper>

                        {/* EXACT REPLACEMENT: Media Carousel taking the space of the old image box */}
                        <MediaCarousel />

                    </Box>

                    {/* RIGHT COLUMN: Calendar (Tall), Events (Short) */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1.6, gap: 3 }}>
                        
                        <Paper elevation={0} sx={{ flex: 2.5, p: 3, pb: 0, borderRadius: 4, direction: 'rtl', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <SectionTitle 
                                title="לוח אירועים" 
                                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>} 
                            />
                            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                <EventCalendar events={events} isGuest={isGuest} />
                            </Box>
                        </Paper>

                        <Paper elevation={0} sx={{ flex: 1, p: 3, borderRadius: 4, direction: 'rtl', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <SectionTitle 
                                title="אירועים בשבוע הקרוב" 
                                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>} 
                            />
                            <Box sx={{ flexGrow: 1, overflow: 'hidden', borderRadius: 3 }}>
                                <HeroCarousel events={events} />
                            </Box>
                        </Paper>

                    </Box>

                </Box>
            </Container>
        </Box>
    );
};

export default HomePage;