import { useState } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import cityImage from '../../assets/images/city-view.png';
import employerServicesImage from '../../assets/images/image-event-center.png';
import trainingImage from '../../assets/images/image_event_WorkAtJer.jpg';
import careerCenterImage from '../../assets/center-icons/taasuka-logo-color.png';
import employmentLogo from '../../assets/images/employment-logo.png';

const MEDIA_SLIDES = [
    {
        id: 1,
        image: cityImage,
        title: 'שירותי תעסוקה לתושבי ירושלים',
        subtitle: 'מידע עירוני מרוכז על מרכזי קריירה, הכשרות, אירועים ושירותים למעסיקים ברחבי העיר.'
    },
    {
        id: 2,
        image: careerCenterImage,
        eyebrow: 'מרכזי קריירה',
        title: 'ליווי מקצועי קרוב לבית',
        subtitle: 'מרכזי התעסוקה העירוניים מציעים הכוונה, ייעוץ וכלים להשתלבות וקידום בעולם העבודה.'
    },
    {
        id: 3,
        image: employerServicesImage,
        eyebrow: 'שירות למעסיקים',
        title: 'חיבור בין מעסיקים לכוח אדם איכותי',
        subtitle: 'מענים עירוניים לפרסום הזדמנויות, יצירת שותפויות וגיוס עובדים בירושלים.'
    },
    {
        id: 4,
        image: trainingImage,
        eyebrow: 'סדנאות והכשרות',
        title: 'כלים מעשיים להתפתחות מקצועית',
        subtitle: 'סדנאות, קורסים ואירועי תעסוקה המותאמים לצרכים המשתנים של תושבי העיר.'
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
                height: { xs: '455px', md: '350px' },
                p: 0,
                borderRadius: 0,
                direction: 'rtl',
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.05fr) minmax(360px, 0.95fr)' },
                gridTemplateRows: { xs: '190px 1fr', md: '1fr' },
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid var(--color-border)',
                bgcolor: 'var(--color-surface)'
            }}
        >
            <Box sx={{
                minWidth: 0,
                p: { xs: 3, md: 5 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                borderTop: { xs: '4px solid var(--color-accent)', md: 0 },
                borderRight: { xs: 0, md: '4px solid var(--color-accent)' }
            }}>
                {currentSlide.id === 1 ? (
                    <Box
                        component="img"
                        src={employmentLogo}
                        alt="הרשות העירונית לתעסוקה ירושלים"
                        sx={{
                            width: { xs: '118px', md: '142px' },
                            height: { xs: '72px', md: '88px' },
                            objectFit: 'contain',
                            objectPosition: 'right center',
                            mb: { xs: 2, md: 2.5 },
                        }}
                    />
                ) : (
                    <Typography variant="overline" fontWeight={800} sx={{ color: 'var(--color-text-muted)', letterSpacing: 0, mb: 1 }}>
                        {currentSlide.eyebrow}
                    </Typography>
                )}
                <Typography component="h1" sx={{
                    color: 'var(--color-text)',
                    fontSize: { xs: '1.65rem', md: '2.25rem' },
                    lineHeight: 1.25,
                    fontWeight: 800,
                    mb: 2,
                    maxWidth: '650px'
                }}>
                    {currentSlide.title}
                </Typography>
                <Typography sx={{ color: 'var(--color-text-muted)', lineHeight: 1.75, maxWidth: '660px' }}>
                    {currentSlide.subtitle}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                    {MEDIA_SLIDES.map((slide, index) => (
                        <Box
                            component="button"
                            type="button"
                            aria-label={`מעבר לשקופית ${index + 1}`}
                            key={slide.id}
                            onClick={() => setCurrentIndex(index)}
                            sx={{
                                width: index === currentIndex ? '28px' : '10px',
                                height: '6px',
                                p: 0,
                                border: 0,
                                borderRadius: 0,
                                bgcolor: index === currentIndex ? 'var(--color-accent)' : 'var(--color-border)',
                                cursor: 'pointer',
                                transition: 'var(--t)'
                            }}
                        />
                    ))}
                </Box>
            </Box>

            <Box sx={{
                minWidth: 0,
                minHeight: 0,
                backgroundImage: `linear-gradient(rgba(0, 43, 102, 0.08), rgba(0, 43, 102, 0.08)), url(${currentSlide.image})`,
                backgroundSize: currentSlide.id === 2 ? 'contain' : 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                bgcolor: currentSlide.id === 2 ? '#eef1f4' : 'var(--color-brand-dark)',
                order: { xs: -1, md: 0 }
            }} />

            <Button 
                onClick={handleNext} 
                aria-label="השקופית הבאה"
                sx={{ position: 'absolute', bottom: 20, left: 20, minWidth: '40px', width: '40px', height: '40px', borderRadius: 'var(--radius-md)', bgcolor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', '&:hover': { bgcolor: 'var(--color-accent-soft)' }, fontWeight: 'bold' }}
            >
                &gt;
            </Button>
            
            <Button 
                onClick={handlePrev} 
                aria-label="השקופית הקודמת"
                sx={{ position: 'absolute', bottom: 20, left: 68, minWidth: '40px', width: '40px', height: '40px', borderRadius: 'var(--radius-md)', bgcolor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', '&:hover': { bgcolor: 'var(--color-accent-soft)' }, fontWeight: 'bold' }}
            >
                &lt;
            </Button>
        </Paper>
    );
};

export default MediaCarousel;
