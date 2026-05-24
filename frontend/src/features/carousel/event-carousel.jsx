import React, { useState } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useAuth } from '../../context/auth-context';

/**
 * EventsCarousel displays a modern, sliding interface for upcoming events.
 * It integrates with the AuthContext to determine if the user can register.
 * * @param {Object} props
 * @param {Array} props.events - Array of event objects to display.
 */
export const EventsCarousel = ({ events }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { isGuest } = useAuth(); // Fetch role-based access from context

    // Fallback UI if the events array is empty or undefined
    if (!events || events.length === 0) {
        return (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc' }}>
                <Typography color="textSecondary">No upcoming events at the moment.</Typography>
            </Paper>
        );
    }

    const currentEvent = events[currentIndex];

    // Navigation handlers
    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % events.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev === 0 ? events.length - 1 : prev - 1));

    return (
        <Paper 
            elevation={6} // Adds a deep, modern shadow
            sx={{ 
                position: 'relative', 
                height: '450px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'flex-end',
                overflow: 'hidden',
                borderRadius: 4,
                // Dynamic background image with a modern fallback
                backgroundImage: `url(${currentEvent.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'background-image 0.5s ease-in-out'
            }}
        >
            {/* Navigation Buttons */}
            <Button 
                onClick={handlePrev} 
                sx={{ 
                    position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', 
                    minWidth: '48px', height: '48px', borderRadius: '50%', 
                    bgcolor: 'rgba(255,255,255,0.8)', color: 'black', 
                    '&:hover': { bgcolor: 'white' }, zIndex: 10 
                }}
            >
                &lt;
            </Button>
            <Button 
                onClick={handleNext} 
                sx={{ 
                    position: 'absolute', top: '50%', right: '16px', transform: 'translateY(-50%)', 
                    minWidth: '48px', height: '48px', borderRadius: '50%', 
                    bgcolor: 'rgba(255,255,255,0.8)', color: 'black', 
                    '&:hover': { bgcolor: 'white' }, zIndex: 10 
                }}
            >
                &gt;
            </Button>

            {/* Bottom Content Block - Uses a gradient overlay to ensure text readability */}
            <Box 
                sx={{ 
                    background: 'linear-gradient(to top, rgba(0, 32, 63, 0.95) 0%, rgba(0, 32, 63, 0.7) 70%, transparent 100%)',
                    color: 'white', 
                    pt: 8, pb: 4, px: 4,
                    width: '100%', position: 'relative', zIndex: 5, textAlign: 'right'
                }}
            >
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    {currentEvent.title}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, opacity: 0.9, maxWidth: '80%' }}>
                    {currentEvent.description || currentEvent.subtitle}
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 3, color: '#facc15' }}>
                    Date: {currentEvent.date} | Location: {currentEvent.location || 'Jerusalem'}
                </Typography>

                {/* Role-Based Access Control (RBAC) Logic for the Registration Button */}
                {!isGuest ? (
                    <Button variant="contained" sx={{ bgcolor: '#facc15', color: 'black', fontWeight: 'bold', '&:hover': { bgcolor: '#eab308' } }}>
                        Register Now
                    </Button>
                ) : (
                    <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                        * To register for this event, please <a href="/login" style={{ color: '#60a5fa', textDecoration: 'none' }}>login to your account</a>.
                    </Typography>
                )}
                
                {/* Carousel Pagination Dots */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1 }}>
                    {events.map((_, index) => (
                        <Box 
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            sx={{ 
                                width: '10px', height: '10px', borderRadius: '50%', 
                                bgcolor: index === currentIndex ? '#facc15' : 'rgba(255,255,255,0.4)', 
                                cursor: 'pointer', transition: '0.3s' 
                            }}
                        />
                    ))}
                </Box>
            </Box>
        </Paper>
    );
};