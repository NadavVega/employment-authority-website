import React, { useState } from 'react';
import { Box, Container, Typography, Paper, Grid, Card, CardContent, Button, Divider } from '@mui/material';
import { useAuth } from '../context/auth-context';

// Utility Data
import employmentLogo from '../assets/images/employment-logo.png'; 

// Feature Components
import EventCalendar from '../features/calendar/event-calendar';

/**
 * EventsPage Component
 * Reverted to a clean, light interface but enhanced with depth and brand accents 
 * to prevent a "flat white" look.
 * * Visual Hierarchy Implementation:
 * 1. Brand Authority: Significantly enlarged logo establishes trust immediately.
 * 2. Accent Borders: Using primary-colored thick borders to frame the main calendar.
 * 3. Soft Elevation: Custom box-shadows create a 3D layering effect on a light #F8FAFC background.
 * 4. Typography: Strict adherence to 700 (headers) and 300 (subtext) weights.
 */
export const EventsPage = () => {
    const { isGuest } = useAuth();
    
    // Core states managing the dynamic interactive inspection flow
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Static week agenda data structured seamlessly to align with incoming service models
    const weeklyEvents = [
        {
            id: 1,
            title: 'כנס מעסיקים טכנולוגי - הר חוצבים',
            description: 'מפגש אקסקלוסיבי למנהלי פיתוח ו-HR בחברות ההייטק הירושלמיות בנושא מענקי עידוד תעסוקה.',
            date: '20.06.2026',
            time: '10:00 - 13:00',
            location: 'פארק הייטק הר חוצבים, בניין 3',
            organizer: 'רשות התעסוקה ירושלים'
        },
        {
            id: 2,
            title: 'יריד התעסוקה הגדול של ירושלים',
            description: 'הזדמנות של מעסיקים לפגוש מאות מחפשי עבודה אקדמאיים ותושבי העיר פנים אל פנים.',
            date: '22.06.2026',
            time: '16:00 - 20:00',
            location: 'בנייני האומה, אולם ראשי',
            organizer: 'עיריית ירושלים'
        }
    ];

    const handleEventSelect = (event) => {
        setSelectedEvent(event);
    };

    return (
        <Box 
            sx={{ 
                minHeight: '100vh', 
                width: '100%',
                pb: 12,
                pt: 8,
                bgcolor: '#F8FAFC' // Clean off-white background
            }}
        >
            <Container maxWidth="xl">
                
                {/* Header Section - Enlarged Logo & Clean Typography */}
                <Box sx={{ mb: 8, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 4, justifyContent: 'flex-start' }}>
                    
                    {/* Enlarged Primary Actor Logo */}
                    <img
                        src={employmentLogo}
                        alt="רשות התעסוקה ירושלים"
                        style={{ 
                            height: '130px', // Significantly increased size per user request
                            maxWidth: '100%', 
                            objectFit: 'contain' 
                        }}
                    />
                    
                    {/* Title & Subtitle Group */}
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h3" fontWeight="300" color="primary" gutterBottom>
                            מרכז אירועי תעסוקה
                        </Typography>
                        <Typography variant="h6" fontWeight="300" color="textSecondary">
                            ניהול, מעקב ורישום בזמן אמת לכלל הפעילויות והכנסים בירושלים
                        </Typography>
                    </Box>
                </Box>

                {/* Two-Column Utility Grid (LTR Sorting Sequence) */}
                <Grid container spacing={4} sx={{ direction: 'ltr' }}>
                    
                    {/* LEFT COLUMN: The Interactive Main Calendar */}
                    <Grid item xs={12} lg={8}>
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                p: 0, // Padding is handled in inner boxes for color blocking
                                borderRadius: 4, 
                                bgcolor: 'white', 
                                border: '1px solid #e2e8f0',
                                // Structural Accent: Thick brand-colored top border to break the white
                                borderTop: '6px solid',
                                borderTopColor: 'primary.main',
                                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', // Soft floating shadow
                                overflow: 'hidden'
                            }}
                        >
                            <Box sx={{ direction: 'rtl', p: 4, borderBottom: '1px solid #f1f5f9' }}>
                                <Typography variant="h5" fontWeight="700" color="primary">
                                    לוח תאריכים אינטראקטיבי
                                </Typography>
                            </Box>
                            
                            {/* Inner Calendar Container with an off-white background to contrast with the Paper */}
                            <Box sx={{ bgcolor: '#fbfcfd', p: 4, minHeight: '550px' }}>
                                <EventCalendar isGuest={isGuest} />
                            </Box>
                        </Paper>
                    </Grid>

                    {/* RIGHT COLUMN: Weekly Agenda View & Interactive Inspector */}
                    <Grid item xs={12} lg={4} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        
                        {/* Weekly Agenda Summary Block */}
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                p: 4, 
                                borderRadius: 4, 
                                bgcolor: 'white', 
                                border: '1px solid #e2e8f0', 
                                direction: 'rtl',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                            }}
                        >
                            <Typography variant="h5" fontWeight="700" sx={{ mb: 3 }}>
                                אירועי השבוע הקרוב
                            </Typography>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {weeklyEvents.map((event) => (
                                    <Card 
                                        key={event.id} 
                                        variant="outlined" 
                                        onClick={() => handleEventSelect(event)}
                                        sx={{ 
                                            cursor: 'pointer', 
                                            // Dynamic coloring for selected state
                                            borderColor: selectedEvent?.id === event.id ? 'primary.main' : '#e2e8f0',
                                            bgcolor: selectedEvent?.id === event.id ? 'primary.50' : 'white',
                                            '&:hover': { bgcolor: '#f1f5f9', transform: 'translateY(-2px)' },
                                            transition: 'all 0.2s ease-in-out'
                                        }}
                                    >
                                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                            <Typography variant="caption" fontWeight="700" color="secondary">
                                                {event.date} | {event.time}
                                            </Typography>
                                            <Typography variant="body1" fontWeight="300" sx={{ mt: 0.5 }}>
                                                {event.title}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>
                        </Paper>

                        {/* Interactive Event Details Inspector Pane */}
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                p: 4, 
                                borderRadius: 4, 
                                bgcolor: 'white', 
                                border: '1px solid #e2e8f0', 
                                direction: 'rtl', 
                                flexGrow: 1, 
                                minHeight: '250px',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                            }}
                        >
                            <Typography variant="h5" fontWeight="700" sx={{ mb: 2 }}>
                                פרטי אירוע נבחר
                            </Typography>
                            
                            {selectedEvent ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <Typography variant="h6" fontWeight="700" color="primary">
                                        {selectedEvent.title}
                                    </Typography>
                                    <Divider />
                                    
                                    <Box>
                                        <Typography variant="caption" fontWeight="700" color="textSecondary" display="block">מארגן הפעילות:</Typography>
                                        <Typography variant="body2" fontWeight="300">{selectedEvent.organizer}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" fontWeight="700" color="textSecondary" display="block">מיקום האירוע:</Typography>
                                        <Typography variant="body2" fontWeight="300">{selectedEvent.location}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" fontWeight="700" color="textSecondary" display="block">תיאור ופרטים נוספים:</Typography>
                                        <Typography variant="body2" fontWeight="300">{selectedEvent.description}</Typography>
                                    </Box>

                                    {!isGuest && (
                                        <Button variant="contained" color="primary" fullWidth sx={{ mt: 2, fontWeight: '700' }}>
                                            אשר הגעה / הרשם לאירוע
                                        </Button>
                                    )}
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '150px' }}>
                                    <Typography variant="body2" fontWeight="300" color="textSecondary">
                                        בחר אירוע מלוח הזמנים השבועי לצפייה בפרטים המלאים
                                    </Typography>
                                </Box>
                            )}
                        </Paper>

                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default EventsPage;