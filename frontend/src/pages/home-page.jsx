import { useState, useEffect } from 'react';
import { Typography, Box, Paper, Card, CardContent, CardMedia, Button } from '@mui/material';
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

const HomePage = () => {
    const { isAuthenticated, currentUser, userRole } = useAuth();
    const [articles, setArticles] = useState([]);
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
            
            setArticles(sortedArticles.slice(0, 10)); // Display top 10 latest articles
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
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                            {articles.length > 0 ? articles.map(article => (
                                <Card key={article.id} elevation={0} sx={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border)', borderRight: '3px solid var(--color-accent)', bgcolor: 'var(--color-surface)', borderRadius: 0, transition: 'var(--t)', '&:hover': { boxShadow: 'var(--shadow-sm)', borderColor: 'var(--color-accent)' } }}>
                                    {article.imageUrl && (
                                        <CardMedia
                                            component="img"
                                            height="140"
                                            image={article.imageUrl}
                                            alt={article.title}
                                            sx={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                                            onClick={() => window.open(article.url, '_blank')}
                                        />
                                    )}
                                    <CardContent sx={{ p: '16px !important', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="caption" fontWeight="700" sx={{ color: 'var(--color-primary-dark)', display: 'block', mb: 0.5 }}>{article.sourceName}</Typography>
                                        <Typography variant="body1" fontWeight="500" sx={{ color: 'var(--color-text-main)', lineHeight: 1.5, cursor: 'pointer', mb: article.content ? 1 : 0 }} onClick={() => window.open(article.url, '_blank')}>{article.title}</Typography>
                                        {article.content && (
                                            <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mt: 'auto', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {article.content}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            )) : (
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
