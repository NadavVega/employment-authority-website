import React, { useState, useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import EventsHero from '../features/promotional-content/event-hero'; 
import { EventsCarousel } from '../features/carousel/event-carousel'; 

/**
 * EventsPage: Seamless, modern layout connecting the full-screen hero 
 * directly with the main content. Now handles rich dynamic mock data.
 */
export const EventsPage = () => {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        // Mock data with unique, high-quality images for each carousel slide
        setEvents([
            {
                id: 1,
                title: 'כנס מעסיקים טכנולוגי - הר חוצבים',
                description: 'הצטרפו אלינו למפגש אקסלוסיבי למנהלי פיתוח ו-HR בחברות ההייטק הירושלמיות. בתוכנית: פאנל מומחים ועדכונים על מענקי עידוד תעסוקה.',
                date: '20.06.2026',
                location: 'פארק הייטק הר חוצבים',
                // Tech/Programming related image
                image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000' 
            },
            {
                id: 2,
                title: 'יריד התעסוקה הגדול של ירושלים',
                description: 'ההזדמנות שלכם לגייס את הכישרונות הטובים ביותר בעיר. מאות מחפשי עבודה אקדמאים יגיעו לפגוש אתכם פנים מול פנים.',
                date: '01.07.2026',
                location: 'בנייני האומה, ירושלים',
                // Networking/Crowd related image
                image: 'https://images.unsplash.com/photo-1515169067868-5387ec356754?q=80&w=1000'
            },
            {
                id: 3,
                title: 'סדנת אסטרטגיות שילוב וגיוון',
                description: 'סדנא מעשית למעסיקים בנושא גיוון תעסוקתי, בדגש על שילוב אוכלוסיות יעד ושבירת תקרות זכוכית בארגון שלכם.',
                date: '15.07.2026',
                location: 'זום (מפגש מקוון)',
                // Office/Workshop related image
                image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1000'
            }
        ]);
    }, []);

    return (
        <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', width: '100%' }}>
            
            {/* Full-bleed Parallax Hero section */}
            <EventsHero />

            {/* Seamless content container */}
            <Box 
                sx={{ 
                    width: '100%', 
                    bgcolor: '#F8FAFC', 
                    position: 'relative',
                    zIndex: 2, 
                    pt: 8, 
                    pb: 12
                }}
            >
                <Container maxWidth="lg">
                    
                    <Typography 
                        variant="h4" 
                        color="primary" 
                        fontWeight="300" 
                        textAlign="center"
                        sx={{ mb: 6, letterSpacing: '0.02em' }}
                    >
                        האירועים הבולטים החודש
                    </Typography>

                    {/* The Carousel - Automatically displays the unique images passed in the events array */}
                    <EventsCarousel events={events} />

                    {/* Calendar placeholder */}
                    <Box 
                        sx={{ 
                            textAlign: 'center', 
                            mt: 10,
                            p: 6, 
                            bgcolor: 'white', 
                            borderRadius: 4, 
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}
                    >
                        <Typography variant="h5" color="textSecondary" fontWeight="300">
                            Interactive Calendar (Coming Soon)
                        </Typography>
                    </Box>
                    
                </Container>
            </Box>
        </Box>
    );
};