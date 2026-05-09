import React from 'react';
import { Typography, Grid, Box, Button, Paper, Stack, Card, CardContent} from '@mui/material';
import { useAuth } from '../context/auth-context';
import { MOCK_ARTICLES } from '../utils/mock-data';
// Assuming EventCalendar is imported or defined here as before
import EventCalendar from '../features/calendar/event-calendar'; 
import HeroCarousel from '../features/carousel/hero-carousel';
import PromotionalVideo from '../features/promotional-content/promotional-video';


/**
 * ImageOverlayCard - A reusable component to mimic the municipality's image-heavy cards.
 * @param {string} title - The main headline.
 * @param {string} subtitle - The secondary text.
 * @param {string} minHeight - CSS height for the card.
 */
const ImageOverlayCard = ({ title, subtitle, minHeight }) => (
    <Paper 
        elevation={2} 
        sx={{ 
            position: 'relative', 
            minHeight: minHeight, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'flex-end',
            overflow: 'hidden',
            borderRadius: 0, // Municipality style uses sharp corners
            bgcolor: '#e0e0e0', // Placeholder for actual image
            backgroundImage: 'url("https://via.placeholder.com/800x400?text=Image+Placeholder")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            cursor: 'pointer',
            '&:hover .overlay': { bgcolor: 'primary.dark' }
        }}
    >
        {/* Text Overlay matching the official site's blue banner at the bottom */}
        <Box 
            className="overlay"
            sx={{ 
                bgcolor: 'primary.main', 
                color: 'white', 
                p: 2, 
                width: '100%',
                transition: 'background-color 0.3s ease',
                borderBottom: '4px solid',
                borderColor: 'secondary.main'
            }}
        >
            <Typography variant="h5" fontWeight="bold" gutterBottom>
                {title}
            </Typography>
            <Typography variant="body2">
                {subtitle}
            </Typography>
        </Box>
    </Paper>
);

/**
 * LandingPage - Assembles the core portal layout.
 * Enforces the visual structure:
 * - Top Right: Narrow News Bot widget.
 * - Top Left: Wide dynamic Hero Carousel.
 * - Bottom: Full-width Event Calendar.
 */
const LandingPage = () => {
    const { isAuthenticated, currentUser, isGuest } = useAuth();

    return (
        <Box sx={{ flexGrow: 1, p: 2 }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="primary">
                    {isAuthenticated ? `${currentUser.displayName}, שלום` : 'ברוכים הבאים למרכז המידע למעסיקים בירושלים'}
                </Typography>
            </Box>

            {/* 
              TOP ROW: Flex container for Side-by-Side layout.
              In RTL, the first child sits on the far Right.
            */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mb: 6 }}>
                
                {/* 
                  1. Right Side (First in DOM): The News Articles Bot.
                  Kept as narrow as possible.
                */}
                <Box sx={{ width: { xs: '100%', md: '280px' }, flexShrink: 0 }}>
                    <Paper elevation={3} sx={{ height: '400px', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa', overflow: 'hidden' }}>
                        <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 1.5, textAlign: 'center' }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                                כתבות ועדכוני רשת
                            </Typography>
                        </Box>
                        
                        <Box sx={{ overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {MOCK_ARTICLES.map(article => (
                                <Card key={article.id} variant="outlined" sx={{ borderRight: '4px solid', borderColor: 'secondary.main', cursor: 'pointer', '&:hover': { bgcolor: '#f0f0f0' } }}>
                                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Typography variant="caption" fontWeight="bold" color="secondary">
                                            {article.source}
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5, lineHeight: 1.2 }}>
                                            {article.title}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    </Paper>
                </Box>

                {/* 
                  2. Left Side (Second in DOM): The Hero Announcements.
                  flexGrow: 1 allows it to dynamically fill all remaining horizontal space.
                */}
                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                    <HeroCarousel />
                </Box>

            </Box>

            {/* MIDDLE ROW: Full-Width Promotional Video */}
            <PromotionalVideo />

            {/* BOTTOM ROW: Calendar */}
            <Box sx={{ mt: 4 }}>
                 <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
                    לוח אירועים
                </Typography>
                <EventCalendar isGuest={isGuest} />
            </Box>
        </Box>
    );
};


export default LandingPage;