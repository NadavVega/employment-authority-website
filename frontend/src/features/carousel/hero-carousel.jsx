import React, { useState } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';

// Mock data specifically for the carousel slides
const CAROUSEL_SLIDES = [
    {
        id: 1,
        title: 'אירוע השבוע: כנס מעסיקים - מרכז העיר',
        subtitle: 'הצטרפו אלינו לכנס השנתי הגדול של מעסיקי ירושלים. בתוכנית: נטוורקינג ועדכונים על מענקי תעסוקה.',
        image: 'https://via.placeholder.com/800x400/1565c0/ffffff?text=Employers+Conference'
    },
    {
        id: 2,
        title: 'הכשרות מקצועיות למגזר הטכנולוגי',
        subtitle: 'פותחים מחזור חדש של הכשרות במימון מלא עבור חברות הייטק בהר חוצבים.',
        image: 'https://via.placeholder.com/800x400/2e7d32/ffffff?text=Tech+Training'
    },
    {
        id: 3,
        title: 'עדכון נהלי בטיחות - חורף 2026',
        subtitle: 'כל מה שמעסיקים צריכים לדעת על היערכות לחורף הקרוב במרחבי עבודה משותפים.',
        image: 'https://via.placeholder.com/800x400/d32f2f/ffffff?text=Winter+Safety'
    }
];

/**
 * HeroCarousel - Manages a sliding image gallery for main announcements.
 * Follows SRP by solely handling the state and rendering of the slider.
 */
const HeroCarousel = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Handlers for navigating slides
    const handleNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % CAROUSEL_SLIDES.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prevIndex) => (prevIndex === 0 ? CAROUSEL_SLIDES.length - 1 : prevIndex - 1));
    };

    const handleDotClick = (index) => {
        setCurrentIndex(index);
    };

    const currentSlide = CAROUSEL_SLIDES[currentIndex];

    return (
        <Paper 
            elevation={3} 
            sx={{ 
                position: 'relative', 
                height: '400px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'flex-end',
                overflow: 'hidden',
                borderRadius: 2,
                backgroundImage: `url(${currentSlide.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'background-image 0.5s ease-in-out'
            }}
        >
            {/* Left/Right Navigation Arrows */}
            <Button 
                onClick={handleNext} 
                sx={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', minWidth: '40px', height: '40px', borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.7)', color: 'black', '&:hover': { bgcolor: 'white' }, fontWeight: 'bold', fontSize: '1.2rem', zIndex: 10 }}
            >
                {/* Visual Left Arrow (Navigates Forward in RTL) */}
                &lt;
            </Button>
            
            <Button 
                onClick={handlePrev} 
                sx={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', minWidth: '40px', height: '40px', borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.7)', color: 'black', '&:hover': { bgcolor: 'white' }, fontWeight: 'bold', fontSize: '1.2rem', zIndex: 10 }}
            >
                {/* Visual Right Arrow (Navigates Backward in RTL) */}
                &gt;
            </Button>

            {/* Text Overlay matching the official brand style */}
            <Box 
                sx={{ 
                    bgcolor: 'rgba(0, 51, 102, 0.85)', // Deep blue transparent overlay
                    color: 'white', 
                    p: 3, 
                    width: '100%',
                    borderBottom: '4px solid',
                    borderColor: 'secondary.main',
                    position: 'relative',
                    zIndex: 5
                }}
            >
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {currentSlide.title}
                </Typography>
                <Typography variant="body1">
                    {currentSlide.subtitle}
                </Typography>
                
                {/* Navigation Dots */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 1 }}>
                    {CAROUSEL_SLIDES.map((_, index) => (
                        <Box 
                            key={index}
                            onClick={() => handleDotClick(index)}
                            sx={{ 
                                width: '12px', 
                                height: '12px', 
                                borderRadius: '50%', 
                                bgcolor: index === currentIndex ? 'secondary.main' : 'rgba(255,255,255,0.5)',
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