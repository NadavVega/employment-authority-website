import React, { useState } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import promoVideo from '../promotional-content/promotional-video.jsx';
import cityImage from '../../assets/images/city-view.png';       

// You can edit your images and videos here!
const MEDIA_SLIDES = [
    {
        id: 1,
        type: 'image',
        url: cityImage, // This should be the path to your image file or a URL
        title: 'ברוכים הבאים למרכז המידע',
        subtitle: 'הפלטפורמה המרכזית לניהול קשרי מעסיקים, פרסום משרות והכשרות מקצועיות במרחב ירושלים.'
    },
    {
        id: 2,
        type: 'vimeo',
        // Example video URL - replace with your own raw MP4 link
        url: "https://player.vimeo.com/video/1187966141?badge=0&autopause=0&player_id=0&app_id=58479", // This should be the path to your video file or a URL
        title: 'צפו: פעילות הרשות בשטח',
        subtitle: 'הצצה מיוחדת לפעילויות והכשרות שבוצעו בשנה האחרונה ברחבי העיר.'
    },
    {
        id: 3,
        type: 'image',
        url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200',
        title: 'מרחבי למידה חדשניים',
        subtitle: 'כיתות ההדרכה החדשות שלנו מחכות לכם בקמפוס המרכזי.'
    }
];

const MediaCarousel = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % MEDIA_SLIDES.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev === 0 ? MEDIA_SLIDES.length - 1 : prev - 1));

    const currentSlide = MEDIA_SLIDES[currentIndex];

    return (
        <Paper 
            elevation={0} 
            sx={{ 
                flex: 1, // Ensures it shares exactly 50% height with the Articles box above it
                p: 0, 
                borderRadius: 4, 
                direction: 'rtl', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'flex-end', 
                minHeight: 0, 
                overflow: 'hidden', 
                position: 'relative'
            }}
        >
            {/* BACKGROUND MEDIA LAYER */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, overflow: 'hidden' }}>
                {currentSlide.type === 'vimeo' ? (
                    <iframe 
                        src={currentSlide.url}
                        frameBorder="0" 
                        allow="autoplay; fullscreen; picture-in-picture" 
                        // Removed pointerEvents: 'none' and reset sizing to 100% so it can be clicked
                        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} 
                        title={currentSlide.title}
                    ></iframe>
                ) : currentSlide.type === 'video' ? (
                    <video 
                        src={currentSlide.url} 
                        autoPlay loop muted playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <Box sx={{ 
                        width: '100%', height: '100%', 
                        backgroundImage: `url(${currentSlide.url})`, 
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        transition: 'background-image 0.5s ease-in-out'
                    }} />
                )}
            </Box>

            {/* ARROW NAVIGATION */}
            <Button 
                onClick={handleNext} 
                sx={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', minWidth: '36px', height: '36px', borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.7)', color: 'black', '&:hover': { bgcolor: 'white' }, fontWeight: 'bold', fontSize: '1.2rem', zIndex: 10 }}
            >
                &gt;
            </Button>
            
            <Button 
                onClick={handlePrev} 
                sx={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', minWidth: '36px', height: '36px', borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.7)', color: 'black', '&:hover': { bgcolor: 'white' }, fontWeight: 'bold', fontSize: '1.2rem', zIndex: 10 }}
            >
                &lt;
            </Button>

            {/* BOTTOM BANNER (Matches Events Carousel Exactly) */}
            <Box sx={{ 
                bgcolor: 'rgba(0, 59, 139, 0.90)', width: '100%',
                py: 1.5, px: 2, 
                borderBottom: '4px solid #facc15', position: 'relative', zIndex: 5
            }}>
                <Typography variant="subtitle1" fontWeight="700" noWrap sx={{ color: '#ffffff', textShadow: '1px 1px 2px rgba(0,0,0,0.5)', lineHeight: 1.2 }}>
                    {currentSlide.title}
                </Typography>
                <Typography variant="caption" fontWeight="300" noWrap sx={{ display: 'block', mt: 0.5, color: '#ffffff', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                    {currentSlide.subtitle}
                </Typography>
                
                {/* DOT PAGINATION */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, gap: 1 }}>
                    {MEDIA_SLIDES.map((_, index) => (
                        <Box 
                            key={index} onClick={() => setCurrentIndex(index)}
                            sx={{ 
                                width: '8px', height: '8px', borderRadius: '50%', 
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

export default MediaCarousel;