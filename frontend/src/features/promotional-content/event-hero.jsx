// src/features/promotional-content/EventsHero.jsx
import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import jerusalemPhoto from '../../assets/images/Photo-jerusalem.jpg';

const EventsHero = () => {
  return (
    <Box
      sx={{
        height: '60vh', // תופס 60% מגובה המסך
        width: '100%',
        backgroundImage: `url(${jerusalemPhoto})`, // תמונת אווירה איכותית
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed', // יוצר אפקט שהתמונה נשארת והדף עולה עליה (Parallax)
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        '&::before': { // שכבת הצללה כדי שהטקסט יהיה קריא
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          bgcolor: 'rgba(0, 32, 63, 0.4)',
          zIndex: 1,
        },
      }}
    >
      <Box sx={{ zIndex: 2, textAlign: 'center', color: 'white' }}>
        <Typography variant="h2" fontWeight="bold" sx={{ textShadow: '2px 2px 10px rgba(0,0,0,0.5)' }}>
          לוח אירועים ומפגשים
        </Typography>
        <Typography variant="h5" sx={{ mt: 2, opacity: 0.9 }}>
          כל מה שקורה במנהלת התעסוקה ירושלים
        </Typography>
      </Box>
    </Box>
  );
};

export default EventsHero;