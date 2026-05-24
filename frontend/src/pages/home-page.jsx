import React from 'react';
import { Typography, Box, Paper, Container, Card, CardContent } from '@mui/material';
import { useAuth } from '../context/auth-context';
import { MOCK_ARTICLES } from '../utils/mock-data';

// Using your existing components
import EventCalendar from '../features/calendar/event-calendar'; 
import HeroCarousel from '../features/carousel/hero-carousel';
import PromotionalVideo from '../features/promotional-content/promotional-video';

/**
 * HomePage Component
 * Implements a clean UI visual hierarchy following the LTR Z-Pattern layout scheme.
 * Restricts typography styles to a maximum of two distinct weights (300 and 700) for a minimalist look.
 */
const HomePage = () => {
    const { isAuthenticated, currentUser, isGuest } = useAuth();

    return (
        <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', pt: 6, pb: 12 }}>
            <Container maxWidth="xl">
                
                {/* Dashboard Main Title - Thinner weight (300) for elegant presentation */}
                <Box sx={{ mb: 6, textAlign: 'right' }}>
                    <Typography variant="h3" fontWeight="300" color="primary">
                        {isAuthenticated ? `שלום, ${currentUser?.displayName || 'משתמש'}` : 'לוח בקרה אישי'}
                    </Typography>
                    <Typography variant="h6" fontWeight="300" color="textSecondary">
                        מבט כולל על הפעילות שלך ברשות התעסוקה
                    </Typography>
                </Box>

                {/* Z-PATTERN GRID SYSTEM (LTR Direction Layout)
                  Row 1: [Top-Left: Articles]  -------------> [Top-Right: Calendar]
                                                                  /
                                                                / (Diagonal Eye Movement)
                                                              /
                  Row 2: [Bottom-Left: Carousel] -----------> [Bottom-Right: Media Player]
                */}
                <Box 
                    sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, 
                        gap: 4,
                        direction: 'ltr' // Forces strict LTR Z-pattern item sequence
                    }}
                >
                    
                    {/* [Z-STEP 1] TOP LEFT: News & Articles Feed */}
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 4, direction: 'rtl', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h5" fontWeight="700" sx={{ mb: 3 }}>כתבות ועדכוני רשת</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, overflowY: 'auto', maxHeight: '450px' }}>
                            {MOCK_ARTICLES.map(article => (
                                <Card key={article.id} variant="outlined" sx={{ borderRight: '4px solid', borderColor: 'secondary.main', '&:hover': { bgcolor: '#f8fafc' } }}>
                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                        <Typography variant="caption" fontWeight="700" color="secondary">
                                            {article.source}
                                        </Typography>
                                        <Typography variant="body1" fontWeight="300" sx={{ mt: 0.5 }}>
                                            {article.title}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    </Paper>

                    {/* [Z-STEP 2] TOP RIGHT: Interactive Calendar View */}
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 4, direction: 'rtl', border: '1px solid #e2e8f0' }}>
                        <Typography variant="h5" fontWeight="700" sx={{ mb: 3 }}>לוח אירועים</Typography>
                        <Box sx={{ minHeight: '450px' }}>
                            {/* Incorporating your actual EventCalendar component */}
                            <EventCalendar isGuest={isGuest} />
                        </Box>
                    </Paper>

                    {/* [Z-STEP 3] BOTTOM LEFT: Upcoming Highlighted Events / Announcements */}
                    <Box sx={{ direction: 'rtl' }}>
                        <Typography variant="h5" fontWeight="700" sx={{ mb: 3 }}>הכרזות ואירועים בולטים</Typography>
                        {/* Using your existing HeroCarousel */}
                        <HeroCarousel />
                    </Box>

                    {/* [Z-STEP 4] BOTTOM RIGHT: Promotional Media Section */}
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 4, direction: 'rtl', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                         <Typography variant="h5" fontWeight="700" sx={{ mb: 3 }}>מנהלת התעסוקה במדיה</Typography>
                         {/* Using your existing PromotionalVideo */}
                         <PromotionalVideo />
                    </Paper>

                </Box>
            </Container>
        </Box>
    );
};

export default HomePage;