import { useState } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';

import defaultPicture from '../../assets/images/default-event.jpg';
import { resolveEventImage } from '../../utils/eventImageMap';
import { getCenterIcon } from '../../utils/centerIcons';
import { getEventLocation, getMapSearchUrl } from '../../utils/mapLinks';

const formatEventDate = (dateValue) => {
    const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
    return Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
};

const HeroCarousel = ({ events }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const closestEvents = (events || []).slice(0, 5);

    if (closestEvents.length === 0) {
        return (
            <Box sx={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 0 }}>
                <Typography sx={{ color: 'var(--color-text-muted)' }}>
                    אין אירועים קרובים להצגה.
                </Typography>
            </Box>
        );
    }

    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % closestEvents.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev === 0 ? closestEvents.length - 1 : prev - 1));

    const currentSlide = closestEvents[currentIndex] || closestEvents[0];

    // Same image logic as EventCard:
    // 1. predefined image from event.image
    // 2. uploaded image from event.photoUrl
    // 3. default local picture
    const slideImage = resolveEventImage(currentSlide) || defaultPicture;
    const centerIcon = getCenterIcon(currentSlide.center);
    const location = getEventLocation(currentSlide);
    const mapUrl = getMapSearchUrl(currentSlide);

    return (
        <Paper 
            elevation={0} 
            sx={{ 
                position: 'relative', 
                minHeight: { xs: '380px', sm: '320px' },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(220px, 0.9fr) minmax(0, 1.1fr)' },
                overflow: 'hidden', 
                borderRadius: 0,
                border: '1px solid var(--color-border)',
                borderTop: currentIndex === 0 ? '4px solid var(--color-accent)' : '1px solid var(--color-border)',
                bgcolor: 'var(--color-surface)'
            }}
        >
            <Box sx={{
                minHeight: { xs: '180px', sm: '100%' },
                backgroundImage: `linear-gradient(rgba(0, 43, 102, 0.08), rgba(0, 43, 102, 0.08)), url(${slideImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                order: { xs: -1, sm: 0 }
            }} />

            <Box sx={{ p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', minWidth: 0 }}>
                <Box sx={{
                    width: '64px',
                    height: '48px',
                    mb: 2,
                    border: '1px solid var(--color-border)',
                    bgcolor: 'var(--color-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}>
                    {centerIcon ? (
                        <Box component="img" src={centerIcon} alt={currentSlide.center || 'לוגו המרכז'} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                        <Typography aria-hidden="true" fontWeight={800} sx={{ color: 'var(--color-text-muted)' }}>
                            {currentSlide.center?.trim()?.charAt(0) || 'מ'}
                        </Typography>
                    )}
                </Box>
                <Typography component="h3" sx={{ color: 'var(--color-text)', fontWeight: 800, fontSize: { xs: '1.45rem', md: '1.8rem' }, lineHeight: 1.3, mb: 2 }}>
                    {currentSlide.title}
                </Typography>
                <Typography sx={{ color: 'var(--color-text)', fontWeight: 700, mb: 1 }}>
                    {formatEventDate(currentSlide.date)}
                    {currentSlide.time ? ` | ${currentSlide.time}` : ''}
                </Typography>
                {location && (
                    mapUrl ? (
                        <Typography
                            component="a"
                            href={mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            sx={{ color: 'var(--color-brand)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                        >
                            {location}
                        </Typography>
                    ) : (
                        <Typography sx={{ color: 'var(--color-text-muted)' }}>
                            {location}
                        </Typography>
                    )
                )}
                {currentSlide.center && (
                    <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', mt: 2, borderRight: '3px solid var(--color-accent)', pr: 1 }}>
                        {currentSlide.center}
                    </Typography>
                )}

                <Box sx={{ display: 'flex', mt: 3, gap: 1 }}>
                    {closestEvents.map((event, index) => (
                        <Box
                            component="button"
                            type="button"
                            aria-label={`הצגת האירוע ${event.title}`}
                            key={event.id || index}
                            onClick={() => setCurrentIndex(index)}
                            sx={{
                                width: index === currentIndex ? '26px' : '9px',
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

            <Button 
                onClick={handleNext} 
                aria-label="האירוע הבא"
                sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                    minWidth: '36px',
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    bgcolor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                    '&:hover': { bgcolor: 'var(--color-accent-soft)' },
                    fontWeight: 'bold',
                    zIndex: 10
                }}
            >
                &gt;
            </Button>
            
            <Button 
                onClick={handlePrev} 
                aria-label="האירוע הקודם"
                sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: 60,
                    minWidth: '36px',
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    bgcolor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                    '&:hover': { bgcolor: 'var(--color-accent-soft)' },
                    fontWeight: 'bold',
                    zIndex: 10
                }}
            >
                &lt;
            </Button>

        </Paper>
    );
};

export default HeroCarousel;
