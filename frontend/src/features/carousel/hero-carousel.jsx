import React, { useState } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';

import defaultPicture from '../../assets/images/default-event.jpg';
import { resolveEventImage } from '../../utils/eventImageMap';

const HeroCarousel = ({ events }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!events || events.length === 0) {
        return (
            <Box sx={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'var(--color-bg)', borderRadius: 'var(--radius-lg)' }}>
                <Typography fontWeight="300" sx={{ color: '#64748b' }}>
                    אין אירועים קרובים להצגה.
                </Typography>
            </Box>
        );
    }

    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % events.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev === 0 ? events.length - 1 : prev - 1));

    const currentSlide = events[currentIndex];

    // Same image logic as EventCard:
    // 1. predefined image from event.image
    // 2. uploaded image from event.photoUrl
    // 3. default local picture
    const slideImage = resolveEventImage(currentSlide) || defaultPicture;

    return (
        <Paper 
            elevation={0} 
            sx={{ 
                position: 'relative', 
                height: '240px',
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'flex-end',
                overflow: 'hidden', 
                borderRadius: 'var(--radius-lg)',
                backgroundImage: `url(${slideImage})`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                transition: 'background-image 0.5s ease-in-out'
            }}
        >
            <Button 
                onClick={handleNext} 
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '10px',
                    transform: 'translateY(-50%)',
                    minWidth: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.7)',
                    color: 'black',
                    '&:hover': { bgcolor: 'white' },
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    zIndex: 10
                }}
            >
                &gt;
            </Button>
            
            <Button 
                onClick={handlePrev} 
                sx={{
                    position: 'absolute',
                    top: '50%',
                    right: '10px',
                    transform: 'translateY(-50%)',
                    minWidth: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.7)',
                    color: 'black',
                    '&:hover': { bgcolor: 'white' },
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    zIndex: 10
                }}
            >
                &lt;
            </Button>

            <Box 
                sx={{ 
                    bgcolor: 'rgba(0, 59, 139, 0.90)',
                    width: '100%',
                    py: 1.5,
                    px: 2,
                    position: 'relative',
                    zIndex: 5
                }}
            >
                <Typography variant="subtitle1" fontWeight="700" noWrap sx={{ color: '#ffffff', textShadow: '1px 1px 2px rgba(0,0,0,0.5)', lineHeight: 1.2 }}>
                    {currentSlide.title}
                </Typography>

                <Typography variant="caption" fontWeight="300" noWrap sx={{ display: 'block', mt: 0.5, color: '#ffffff', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                    {currentSlide.date} | {currentSlide.location}
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, gap: 1 }}>
                    {events.map((_, index) => (
                        <Box 
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            sx={{ 
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%', 
                                bgcolor: index === currentIndex ? 'var(--color-accent)' : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                transition: '0.3s'
                            }}
                        />
                    ))}
                </Box>
            </Box>
        </Paper>
    );
};

export default HeroCarousel;
