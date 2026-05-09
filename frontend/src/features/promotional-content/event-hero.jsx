import React from 'react';
import { Box, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

import jerusalemPhoto from '../../assets/images/Photo-jerusalem.jpg';

/**
 * EventsHero: Full-screen (100vh) hero section with a delicate, elegant typography.
 * Uses Parallax effect so it transitions smoothly into a "header" when scrolling.
 */
const EventsHero = () => {
  return (
    <Box
      sx={{
        height: '100vh', // Takes the FULL screen initially
        width: '100%',
        // Softer gradient for a more elegant, modern look
        backgroundImage: `linear-gradient(to bottom, rgba(0,20,40,0.2), rgba(0,20,40,0.7)), url(${jerusalemPhoto})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed', // Parallax - keeps the image in place while content scrolls over it
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        textAlign: 'center',
        position: 'relative',
        m: 0,
        p: 0,
      }}
    >
      {/* Refined, elegant title (Thinner font weight, slight letter spacing) */}
      <Typography 
        variant="h1" 
        sx={{ 
            fontWeight: 300, // Thinner, more elegant
            fontSize: { xs: '3rem', md: '5.5rem' }, 
            letterSpacing: '0.05em', // Adds breathing room between letters
            mb: 2,
            textShadow: '1px 1px 15px rgba(0,0,0,0.3)'
        }}
      >
        לוח אירועים ומפגשים
      </Typography>
      
      <Typography 
        variant="h5" 
        sx={{ 
            maxWidth: '800px', 
            mb: 4, 
            fontWeight: 300, 
            letterSpacing: '0.02em',
            px: 2,
            opacity: 0.85 
        }}
      >
        כל מה שקורה במנהלת התעסוקה ירושלים
      </Typography>
      
      {/* Scroll indicator */}
      <Box 
        sx={{ 
            position: 'absolute', 
            bottom: 40, 
            animation: 'bounce 2s infinite',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: 0.7
        }}
      >
         <Typography variant="overline" sx={{ mb: 1, letterSpacing: 2 }}>
           גלול מטה
         </Typography>
         <KeyboardArrowDownIcon fontSize="large" sx={{ fontWeight: 100 }} />
      </Box>

      <style>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
      `}</style>
    </Box>
  );
};

export default EventsHero;