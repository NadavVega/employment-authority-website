import { useState, useEffect } from 'react';
import { Typography, Box, Paper, Button } from '@mui/material';
import { useAuth } from '../context/auth-context';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../services/firebase/config';

import EventCalendar from '../features/calendar/home-page-calendar';
import HeroCarousel from '../features/carousel/hero-carousel';
import MediaCarousel from '../features/carousel/media-carousel';

import '../design/event-page.css';
import { resolveEventImage } from '../utils/eventImageMap';
import { privacyService } from '../services/interfaces/privacy-service';
import { promotionalContentService } from '../services/interfaces/promotional-content-service';
import { DEFAULT_PROMOTIONAL_SLIDES } from '../features/promotional-content/promotional-assets';

const SectionTitle = ({ title, icon }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, pb: 1.5, borderBottom: '1px solid var(--color-border)' }}>
        <Box sx={{ color: 'var(--color-accent)', display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography variant="h5" fontWeight="700" sx={{ color: 'var(--color-text)', m: 0 }}>
            {title}
        </Typography>
    </Box>
);

const PrivacyRequestsWidget = () => {
    const { currentUser, userRole } = useAuth();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState('');
    const [message, setMessage] = useState('');

    const loadRequests = async () => {
        try {
            setLoading(true);

            const data = await privacyService.getActionablePrivacyRequests(
                currentUser,
                userRole
            );

            setRequests(data);
        } catch (error) {
            console.error('Failed to load privacy requests:', error);
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!currentUser?.email || !userRole) {
            setLoading(false);
            return;
        }

        loadRequests();
    }, [currentUser?.email, userRole]);

    const handleApprove = async (request) => {
        setActionLoadingId(request.id);
        setMessage('');

        try {
            await privacyService.approvePrivacyRequest(request, currentUser);
            setMessage('הבקשה אושרה בהצלחה.');
            await loadRequests();
        } catch (error) {
            console.error('Failed to approve privacy request:', error);
            setMessage(error.message || 'אישור הבקשה נכשל.');
        } finally {
            setActionLoadingId('');
        }
    };

    const handleReject = async (request) => {
        setActionLoadingId(request.id);
        setMessage('');

        try {
            await privacyService.rejectPrivacyRequest(request, currentUser);
            setMessage('הבקשה נדחתה.');
            await loadRequests();
        } catch (error) {
            console.error('Failed to reject privacy request:', error);
            setMessage(error.message || 'דחיית הבקשה נכשלה.');
        } finally {
            setActionLoadingId('');
        }
    };

    if (loading || requests.length === 0) {
        return null;
    }

    return (
        <Paper
            elevation={0}
            sx={{
                mb: 4,
                p: 3,
                borderRadius: 0,
                border: '1px solid var(--color-border)',
                bgcolor: 'var(--color-surface)',
                boxShadow: 'var(--shadow-sm)',
                direction: 'rtl',
            }}
        >
            <Typography
                variant="h5"
                fontWeight="700"
                sx={{ color: 'var(--color-primary-dark)', mb: 2 }}
            >
                בקשות גישה שממתינות לטיפולך
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {requests.map((request) => (
                    <Box
                        key={request.id}
                        sx={{
                            p: 2,
                            borderRadius: 0,
                            border: '1px solid var(--color-border)',
                            bgcolor: '#fff',
                        }}
                    >
                        <Typography fontWeight="700" sx={{ mb: 1 }}>
                            {userRole === 'employer'
                                ? 'רכז מבקש גישה לפרטי הקשר שלך'
                                : 'בקשת גישה למעסיק המשויך אליך'}
                        </Typography>

                        <Typography variant="body2">
                            <strong>מבקש:</strong>{' '}
                            {request.requesterName || request.requesterEmail}
                        </Typography>

                        {request.requesterCenterName && (
                            <Typography variant="body2">
                                <strong>מרכז:</strong> {request.requesterCenterName}
                            </Typography>
                        )}

                        <Typography variant="body2">
                            <strong>אימייל:</strong>{' '}
                            <span dir="ltr">{request.requesterEmail}</span>
                        </Typography>

                        <Typography variant="body2">
                            <strong>מעסיק:</strong>{' '}
                            {request.targetEmployerName || request.targetEmail}
                        </Typography>

                        {request.requiresCoordinatorApproval && (
                            <Typography variant="body2" sx={{ color: '#8a5a00', mt: 1 }}>
                                בקשה זו דורשת אישור מעסיק וגם אישור רכז משויך.
                            </Typography>
                        )}

                        <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                            <Button
                                variant="contained"
                                disabled={actionLoadingId === request.id}
                                onClick={() => handleApprove(request)}
                            >
                                אישור גישה
                            </Button>

                            <Button
                                variant="outlined"
                                color="error"
                                disabled={actionLoadingId === request.id}
                                onClick={() => handleReject(request)}
                            >
                                דחייה
                            </Button>
                        </Box>
                    </Box>
                ))}
            </Box>

            {message && (
                <Typography sx={{ mt: 2, fontWeight: 700 }}>
                    {message}
                </Typography>
            )}
        </Paper>
    );
};

const getEventDate = (dateValue) => {
    return dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
};

const getArticleImageUrl = (article) => (
    article.imageUrl ||
    article.image ||
    article.coverImage ||
    article.thumbnailUrl ||
    article.mediaUrl ||
    article.mediaAssetUrl ||
    ''
);

const getArticleDate = (article) => {
    const value = article.publishedAt || article.createdAt || article.date;
    const date = value?.toDate ? value.toDate() : new Date(value);

    return Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleDateString('he-IL');
};

const HomePage = () => {
    const { isAuthenticated, currentUser, userRole } = useAuth();
    const [articles, setArticles] = useState([]);
    const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
    const [events, setEvents] = useState([]);
    const [promotionalSlides, setPromotionalSlides] = useState(DEFAULT_PROMOTIONAL_SLIDES);

    useEffect(() => {
        const q = query(collection(db, 'events'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const fetchedEvents = snapshot.docs.map(doc => {
                const event = { id: doc.id, ...doc.data() };
                const eventImage = resolveEventImage(event);

                return {
                    ...event,
                    imageSrc: eventImage,
                    displayImage: eventImage,
                    photoUrl: eventImage || event.photoUrl || ''
                };
            });

            const upcoming = fetchedEvents
                .filter(e => e.status === 'published' && getEventDate(e.date) >= now)
                .sort((a, b) => getEventDate(a.date) - getEventDate(b.date));

            setEvents(upcoming);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'articles'), where('status', '==', 'approved'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedArticles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const sortedArticles = fetchedArticles.sort((a, b) => {
                const dateA = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(0);
                const dateB = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(0);
                return dateB - dateA;
            });
            
            const latestArticles = sortedArticles.slice(0, 10);
            setArticles(latestArticles); // Display top 10 latest articles
            setCurrentArticleIndex((prev) => (
                latestArticles.length === 0 ? 0 : Math.min(prev, latestArticles.length - 1)
            ));
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!userRole || userRole === 'guest') {
            return undefined;
        }

        const unsubscribe = promotionalContentService.subscribeToActiveSlides(
            userRole,
            (slides) => setPromotionalSlides(slides.length > 0
                ? slides
                : DEFAULT_PROMOTIONAL_SLIDES),
            (error) => {
                console.error('Failed to load promotional content:', error);
                setPromotionalSlides(DEFAULT_PROMOTIONAL_SLIDES);
            }
        );

        return unsubscribe;
    }, [userRole]);

    const articleCount = articles.length;
    const activeArticle = articleCount > 0 ? articles[currentArticleIndex] || articles[0] : null;
    const activeArticleImage = activeArticle ? getArticleImageUrl(activeArticle) : '';
    const activeArticleDate = activeArticle ? getArticleDate(activeArticle) : '';
    const goToNextArticle = () => {
        if (articleCount > 0) {
            setCurrentArticleIndex((prev) => (prev + 1) % articleCount);
        }
    };
    const goToPreviousArticle = () => {
        if (articleCount > 0) {
            setCurrentArticleIndex((prev) => (prev === 0 ? articleCount - 1 : prev - 1));
        }
    };
    const openArticle = (article) => {
        if (article?.url) {
            window.open(article.url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
            <Box className="modern-layout-wrapper" sx={{ display: 'flex', flexDirection: 'column', px: { xs: 2, md: 4, xl: 6 }, pt: { xs: 2, md: 4 }, maxWidth: '1600px', width: '100%', mx: 'auto' }}>

                <Box component="section" aria-label="שירותי רשות התעסוקה ירושלים" sx={{ mb: { xs: 4, md: 5 } }}>
                    <MediaCarousel slides={promotionalSlides} />
                </Box>

                <PrivacyRequestsWidget />

                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(390px, 0.95fr) minmax(0, 1.55fr)' },
                    gridTemplateAreas: {
                        xs: '"events" "calendar" "articles"',
                        lg: '"calendar events" "calendar articles"'
                    },
                    bgcolor: 'transparent',
                    alignItems: 'stretch',
                    gap: { xs: 4, lg: 5 },
                    direction: 'ltr'
                }}>

                    <Box sx={{
                        gridArea: 'events',
                        minWidth: 0,
                        direction: 'rtl'
                    }}>
                        <SectionTitle title="אירועים קרובים" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>} />
                        <Box sx={{ minHeight: '300px' }}>
                            <HeroCarousel events={events} />
                        </Box>
                    </Box>

                    <Box sx={{
                        gridArea: 'articles',
                        minWidth: 0,
                        direction: 'rtl'
                    }}>
                        <SectionTitle title="כתבות ועדכונים" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>} />
                        <Box>
                            {activeArticle ? (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        position: 'relative',
                                        height: { xs: '380px', sm: '320px' },
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '1fr',
                                            sm: activeArticleImage ? 'minmax(0, 1.18fr) minmax(280px, 0.82fr)' : '1fr'
                                        },
                                        gridTemplateRows: {
                                            xs: activeArticleImage ? '180px minmax(0, 1fr)' : '1fr',
                                            sm: '1fr'
                                        },
                                        overflow: 'hidden',
                                        borderRadius: 0,
                                        border: '1px solid var(--color-border)',
                                        bgcolor: 'var(--color-surface)',
                                        transition: 'var(--t)',
                                        '&:hover': {
                                            boxShadow: 'var(--shadow-sm)',
                                            borderColor: 'var(--color-accent)'
                                        }
                                    }}
                                >
                                    <Box sx={{ p: { xs: 3, md: 3.5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', minWidth: 0, minHeight: 0 }}>
                                        <Typography
                                            variant="caption"
                                            fontWeight="700"
                                            sx={{ color: 'var(--color-primary-dark)', display: 'block', mb: 1.5, flexShrink: 0 }}
                                        >
                                                {[activeArticle.sourceName, activeArticleDate].filter(Boolean).join(' · ')}
                                        </Typography>
                                        <Typography
                                            className="article-carousel-title"
                                            component="h3"
                                            sx={{
                                                color: 'var(--color-text)',
                                                fontWeight: 800,
                                                fontSize: { xs: '1.45rem', md: '1.8rem' },
                                                lineHeight: 1.25,
                                                cursor: activeArticle.url ? 'pointer' : 'default',
                                                mb: activeArticle.content ? 2 : 0,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: '100%',
                                                minHeight: '2.5em',
                                                flexShrink: 0
                                            }}
                                            onClick={() => openArticle(activeArticle)}
                                        >
                                            {activeArticle.title}
                                        </Typography>
                                        {activeArticle.content && (
                                            <Typography
                                                className="article-carousel-summary"
                                                sx={{
                                                    color: 'var(--color-text-muted)',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    lineHeight: 1.55,
                                                    mb: 2,
                                                    maxWidth: '100%',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {activeArticle.content}
                                            </Typography>
                                        )}
                                        {activeArticle.url && (
                                            <Button
                                                variant="contained"
                                                onClick={() => openArticle(activeArticle)}
                                                sx={{
                                                    mt: 2.5,
                                                    bgcolor: 'var(--color-brand)',
                                                    fontWeight: 700,
                                                    flexShrink: 0,
                                                    '&:hover': { bgcolor: 'var(--color-brand-dark)' }
                                                }}
                                            >
                                                לקריאת הכתבה
                                            </Button>
                                        )}
                                        {articleCount > 1 && (
                                            <Box sx={{ display: 'flex', mt: 3, gap: 1 }}>
                                                {articles.map((article, index) => (
                                                    <Box
                                                        component="button"
                                                        type="button"
                                                        key={article.id || index}
                                                        aria-label={`הצגת כתבה ${index + 1}`}
                                                        onClick={() => setCurrentArticleIndex(index)}
                                                        sx={{
                                                            width: index === currentArticleIndex ? '26px' : '9px',
                                                            height: '6px',
                                                            p: 0,
                                                            border: 0,
                                                            borderRadius: 0,
                                                            bgcolor: index === currentArticleIndex ? 'var(--color-accent)' : 'var(--color-border)',
                                                            cursor: 'pointer',
                                                            transition: 'var(--t)',
                                                        }}
                                                    />
                                                ))}
                                            </Box>
                                        )}
                                    </Box>

                                    {activeArticleImage && (
                                        <Box
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`פתיחת הכתבה ${activeArticle.title}`}
                                            onClick={() => openArticle(activeArticle)}
                                            onKeyDown={(keyboardEvent) => {
                                                if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                                                    keyboardEvent.preventDefault();
                                                    openArticle(activeArticle);
                                                }
                                            }}
                                            sx={{
                                                minHeight: { xs: '180px', sm: '100%' },
                                                backgroundImage: `linear-gradient(rgba(0, 43, 102, 0.08), rgba(0, 43, 102, 0.08)), url(${activeArticleImage})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                order: { xs: -1, sm: 0 },
                                                cursor: activeArticle.url ? 'pointer' : 'default',
                                                '&:focus-visible': {
                                                    outline: '3px solid var(--color-accent)',
                                                    outlineOffset: '-3px'
                                                }
                                            }}
                                        />
                                    )}

                                    {articleCount > 1 && (
                                        <>
                                            <Button
                                                onClick={goToNextArticle}
                                                aria-label="הכתבה הבאה"
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
                                                onClick={goToPreviousArticle}
                                                aria-label="הכתבה הקודמת"
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
                                        </>
                                    )}
                                </Paper>
                            ) : (
                                <Paper elevation={0} sx={{ gridColumn: '1 / -1', p: 3, border: '1px solid var(--color-border)', bgcolor: 'var(--color-surface)', borderRadius: 0 }}>
                                    <Typography sx={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>אין כתבות זמינות כרגע.</Typography>
                                </Paper>
                            )}
                        </Box>
                    </Box>

                    <Box sx={{
                        gridArea: 'calendar',
                        minWidth: 0,
                        alignSelf: 'start',
                        direction: 'rtl',
                        bgcolor: 'var(--color-surface)',
                        borderRadius: 0, overflow: 'hidden',
                        boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)'
                    }}>
                        <EventCalendar events={events} userName={isAuthenticated ? currentUser?.displayName : 'אורח'} />
                    </Box>

                </Box>
            </Box>
        </Box>
    );
};

export default HomePage;
