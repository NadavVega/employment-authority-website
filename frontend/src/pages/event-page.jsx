// src/pages/event-page.jsx
import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import EventsHero from '../features/promotional-content/event-hero';
import HeroCarousel from '../features/carousel/hero-carousel'; // הקרוסלה היפה שהבאת

export const EventsPage = () => {
  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* שלב 1: תמונת האווירה */}
      <EventsHero />

      {/* שלב 2: הקרוסלה של אירועי השבוע */}
      <Container maxWidth="lg" sx={{ mt: -5, position: 'relative', zIndex: 10, pb: 8 }}>
        <Box sx={{ mb: 6 }}>
            <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
                אירועים קרובים
            </Typography>
            {/* הקרוסלה שנתת לי בקוד - נראית מעולה כחלון שקופץ */}
            <HeroCarousel />
        </Box>

        {/* שלב 3: לוח השנה - נעשה אותו מיד אחרי שתראה שזה עובד */}
        <Box sx={{ mt: 8, textAlign: 'center' }}>
            <Typography variant="h5" color="textSecondary">
                כאן יופיע לוח השנה (Step 3)
            </Typography>
        </Box>
      </Container>
    </Box>
  );
};