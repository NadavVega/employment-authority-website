import { useState } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import employmentLogo from '../../assets/images/employment-logo.png';
import {
    DEFAULT_PROMOTIONAL_SLIDES,
    getPromotionalAsset,
} from '../promotional-content/promotional-assets';

const MediaCarousel = ({ slides = DEFAULT_PROMOTIONAL_SLIDES }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const validSlides = Array.isArray(slides)
        ? slides.filter((slide) => {
            const asset = getPromotionalAsset(slide?.mediaAssetKey);
            return Boolean(
                slide?.title
                && slide?.description
                && ['image', 'video'].includes(slide?.mediaType)
                && (asset?.mediaUrl || slide?.mediaUrl)
            );
        })
        : [];
    const displaySlides = validSlides.length > 0 ? validSlides : DEFAULT_PROMOTIONAL_SLIDES;
    const safeCurrentIndex = currentIndex % displaySlides.length;

    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % displaySlides.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev === 0 ? displaySlides.length - 1 : prev - 1));

    const currentSlide = displaySlides[safeCurrentIndex] || displaySlides[0];
    const currentAsset = getPromotionalAsset(currentSlide.mediaAssetKey);
    const resolvedMediaUrl = currentAsset?.mediaUrl || currentSlide.mediaUrl;

    return (
        <Paper 
            elevation={0} 
            sx={{ 
                height: { xs: '390px', md: '285px' },
                p: 0,
                borderRadius: 0,
                direction: 'rtl',
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(300px, 0.76fr) minmax(0, 1.24fr)' },
                gridTemplateRows: { xs: '160px 1fr', md: '1fr' },
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid var(--color-border)',
                bgcolor: 'var(--color-surface)'
            }}
        >
            <Box sx={{
                minWidth: 0,
                p: { xs: '88px 2.5rem 2.5rem', md: '98px 2rem 2rem' },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                position: 'relative',
                borderTop: { xs: '4px solid var(--color-accent)', md: 0 },
                borderRight: { xs: 0, md: '4px solid var(--color-accent)' }
            }}>
                <Box
                    component="img"
                    src={employmentLogo}
                    alt="הרשות העירונית לתעסוקה ירושלים"
                    sx={{
                        position: 'absolute',
                        top: { xs: 10, md: 12 },
                        right: { xs: 20, md: 28 },
                        width: { xs: '158px', md: '190px' },
                        height: { xs: '74px', md: '82px' },
                        objectFit: 'contain',
                        objectPosition: 'right center',
                    }}
                />
                <Typography component="h1" sx={{
                    color: 'var(--color-text)',
                    fontSize: { xs: '1.35rem', md: '1.7rem' },
                    lineHeight: 1.25,
                    fontWeight: 800,
                    mb: 1,
                    maxWidth: '650px'
                }}>
                    {currentSlide.title}
                </Typography>
                <Typography sx={{ color: 'var(--color-text-muted)', lineHeight: 1.45, maxWidth: '660px' }}>
                    {currentSlide.description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                    {displaySlides.map((slide, index) => (
                        <Box
                            component="button"
                            type="button"
                            aria-label={`מעבר לשקופית ${index + 1}`}
                            key={slide.id}
                            onClick={() => setCurrentIndex(index)}
                            sx={{
                                width: index === safeCurrentIndex ? '28px' : '10px',
                                height: '6px',
                                p: 0,
                                border: 0,
                                borderRadius: 0,
                                bgcolor: index === safeCurrentIndex ? 'var(--color-accent)' : 'var(--color-border)',
                                cursor: 'pointer',
                                transition: 'var(--t)'
                            }}
                        />
                    ))}
                </Box>
            </Box>

            {currentSlide.mediaType === 'video' ? (
                <Box
                    component="iframe"
                    src={resolvedMediaUrl}
                    title={currentSlide.title}
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    sx={{
                        width: '100%',
                        height: '100%',
                        minWidth: 0,
                        minHeight: 0,
                        border: 0,
                        bgcolor: 'var(--color-brand-dark)',
                        order: { xs: -1, md: 0 },
                    }}
                />
            ) : (
                <Box sx={{
                    minWidth: 0,
                    minHeight: 0,
                    backgroundImage: `linear-gradient(rgba(0, 43, 102, 0.08), rgba(0, 43, 102, 0.08)), url(${resolvedMediaUrl})`,
                    backgroundSize: currentAsset?.fit || 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    bgcolor: currentAsset?.fit === 'contain' ? '#eef1f4' : 'var(--color-brand-dark)',
                    order: { xs: -1, md: 0 }
                }} />
            )}

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
