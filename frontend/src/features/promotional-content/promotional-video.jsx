import React from 'react';
import { Box, Paper } from '@mui/material';

/**
 * PromotionalVideo - Renders a responsive, full-width Vimeo embed.
 * Follows SRP by isolating the iframe logic and styling from the main layout.
 */
const PromotionalVideo = () => {
    return (
        <Paper 
            elevation={3} 
            sx={{ 
                width: '100%', 
                mb: 6, // Margin bottom to space it from the calendar
                overflow: 'hidden', 
                borderRadius: 2 
            }}
        >
            <Box 
                sx={{ 
                    position: 'relative', 
                    width: '100%', 
                    aspectRatio: '16/9' // Ensures the iframe maintains correct video proportions
                }}
            >
                {/* 
                    Notice the transformation of HTML attributes to React syntax 
                    (e.g., frameborder to frameBorder, style object instead of string).
                */}
                <iframe 
                    src="https://player.vimeo.com/video/1187966141?badge=0&autopause=0&player_id=0&app_id=58479"
                    frameBorder="0" 
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" 
                    referrerPolicy="strict-origin-when-cross-origin" 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
                    title="סרטון תדמית רשות לתעסוקה"
                ></iframe>
            </Box>
        </Paper>
    );
};

export default PromotionalVideo;