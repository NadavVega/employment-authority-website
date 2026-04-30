import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { MOCK_EVENTS } from '../../utils/mock-data'; // Ensure the path is correct

/**
 * EventCalendar generates a classic month-view grid using standard CSS Grid.
 * Following SRP: This component solely handles the calendar logic and rendering,
 * separated from the page layout logic.
 * 
 * @param {boolean} isGuest - Passed from AuthContext to enforce RBAC rules (hide registration).
 */
const EventCalendar = ({ isGuest }) => {
    // We define the days of the week for the header row
    const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    
    // Mocking a standard 30-day month
    const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);
    
    /**
     * Checks if a specific day has an associated event.
     * @param {number} day - The day of the month to check.
     * @returns {Object|null} The event object if found, otherwise null.
     */
    const getEventForDay = (day) => {
        if (day === 15) return MOCK_EVENTS[0];
        if (day === 22) return MOCK_EVENTS[1];
        return null;
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)', 
                borderTop: '1px solid #ccc', 
                borderRight: '1px solid #ccc' 
            }}>
                {/* Header Row: Days of the week */}
                {daysOfWeek.map(day => (
                    <Box 
                        key={day} 
                        sx={{ 
                            bgcolor: 'primary.main', 
                            color: 'white', 
                            textAlign: 'center', 
                            py: 1, 
                            borderLeft: '1px solid #ccc', 
                            borderBottom: '1px solid #ccc' 
                        }}
                    >
                        <Typography variant="subtitle2" fontWeight="bold">
                            {day}
                        </Typography>
                    </Box>
                ))}
                
                {/* Calendar Days grid rendering */}
                {daysInMonth.map(day => {
                    const dayEvent = getEventForDay(day);
                    return (
                        <Box 
                            key={day} 
                            sx={{ 
                                height: '110px', 
                                p: 1, 
                                bgcolor: dayEvent ? '#f0f8ff' : 'white', 
                                borderLeft: '1px solid #ccc', 
                                borderBottom: '1px solid #ccc', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                transition: '0.2s', 
                                '&:hover': { bgcolor: '#f5f5f5' } 
                            }}
                        >
                            <Typography variant="body2" color="primary" fontWeight="bold" sx={{ textAlign: 'right' }}>
                                {day}
                            </Typography>
                            
                            {/* Render event details if one exists for this day */}
                            {dayEvent && (
                                <Box sx={{ mt: 1, textAlign: 'center' }}>
                                    <Typography variant="caption" display="block" fontWeight="bold" color="secondary" sx={{ lineHeight: 1.2, mb: 0.5 }}>
                                        {dayEvent.name}
                                    </Typography>
                                    
                                    {/* RBAC Logic: Guests cannot see the registration button */}
                                    {!isGuest && (
                                        <Button size="small" variant="outlined" color="primary" sx={{ fontSize: '0.6rem', p: 0, minWidth: '100%' }}>
                                            הרשמה
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

export default EventCalendar;