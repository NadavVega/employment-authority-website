import React, { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import { Box, Typography, Button, Tooltip, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import 'react-calendar/dist/Calendar.css';

const EventCalendar = ({ events }) => {
    const navigate = useNavigate();
    const [activeDate, setActiveDate] = useState(new Date());
    const scrollContainerRef = useRef(null);

    // Generate dates for the continuous scroll view
    const prevMonthDate = new Date(activeDate.getFullYear(), activeDate.getMonth() - 1, 1);
    const nextMonthDate = new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 1);

    // Scroll to the middle (current) month on initial load
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight / 3;
        }
    }, []);

    // Custom Header Navigation
    const handlePrev = () => setActiveDate(new Date(activeDate.getFullYear(), activeDate.getMonth() - 1, 1));
    const handleNext = () => setActiveDate(new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 1));

    const getEventsForDate = (date) => {
        if (!events || events.length === 0) return [];
        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
        const dateString = adjustedDate.toISOString().split('T')[0];
        
        return events.filter(e => e.date === dateString);
    };

    const renderTileContent = ({ date, view }) => {
        if (view === 'month') {
            const dayEvents = getEventsForDate(date);
            if (dayEvents.length > 0) {
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1, gap: 0.5, width: '100%' }}>
                        {dayEvents.map((event, index) => (
                            <Tooltip 
                                key={index}
                                interactive 
                                placement="top"
                                arrow
                                slotProps={{
                                    tooltip: {
                                        sx: {
                                            bgcolor: '#ffffff', color: '#0f172a', boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                                            borderRadius: '16px', p: 2.5, minWidth: '280px', border: '1px solid #e2e8f0'
                                        }
                                    },
                                    arrow: { sx: { color: '#ffffff' } }
                                }}
                                title={
                                    <Box sx={{ textAlign: 'right', direction: 'rtl' }}>
                                        {/* Image Placeholder Frame */}
                                        <Box sx={{ width: '100%', height: '120px', bgcolor: '#f1f5f9', borderRadius: '12px', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: `url(${event.photoUrl || ''})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid #e2e8f0' }}>
                                            {!event.photoUrl && <Typography variant="caption" fontWeight="700" color="#94a3b8">תמונת אירוע</Typography>}
                                        </Box>
                                        
                                        <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 1.5, color: '#003b8b', lineHeight: 1.2 }}>{event.title}</Typography>
                                        <Typography variant="body2" fontWeight="300" sx={{ display: 'block', mb: 0.5, color: '#475569' }}><strong>שעה:</strong> {event.time}</Typography>
                                        <Typography variant="body2" fontWeight="300" sx={{ display: 'block', mb: 2.5, color: '#475569' }}><strong>מיקום:</strong> {event.location}</Typography>
                                        
                                        <Button 
                                            size="medium" 
                                            variant="contained" 
                                            sx={{ borderRadius: '99px', bgcolor: '#facc15', color: '#000000', width: '100%', fontWeight: '700', boxShadow: 'none', '&:hover': { bgcolor: '#eab308', boxShadow: 'none' } }}
                                            onClick={(e) => { e.stopPropagation(); navigate('/events'); }}
                                        >
                                            לכל הפרטים
                                        </Button>
                                    </Box>
                                }
                            >
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        bgcolor: 'rgba(0, 59, 139, 0.08)', color: '#003b8b', borderRadius: 1, 
                                        px: 1, py: 0.5, fontSize: '0.75rem', width: '95%',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        fontWeight: '700', cursor: 'pointer', display: 'block', borderRight: '3px solid #003b8b'
                                    }}
                                >
                                    {event.title}
                                </Typography>
                            </Tooltip>
                        ))}
                    </Box>
                );
            }
        }
        return null;
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* Custom Decoupled Header - STAYS AT TOP */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pb: 1.5 }}>
                {/* Visual Right Arrow (Back in time) */}
                <Button onClick={handlePrev} sx={{ minWidth: '40px', fontWeight: '700', color: '#003b8b', fontSize: '1.2rem' }}>&lt;</Button>
                <Typography variant="h6" fontWeight="700" sx={{ color: '#003b8b' }}>
                    {activeDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
                </Typography>
                {/* Visual Left Arrow (Forward in time) */}
                <Button onClick={handleNext} sx={{ minWidth: '40px', fontWeight: '700', color: '#003b8b', fontSize: '1.2rem' }}>&gt;</Button>
            </Box>

            {/* Custom Decoupled Weekdays - STAYS AT TOP */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', bgcolor: '#f4f7fa', py: 1.5, borderRadius: 2, borderBottom: '2px solid #003b8b', mb: 1 }}>
                {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map(day => (
                    <Typography key={day} align="center" fontWeight="700" sx={{ color: '#64748b', fontSize: '0.9rem' }}>{day}</Typography>
                ))}
            </Box>

            {/* Scrollable Container with 3 Months vertically stacked */}
            <Box ref={scrollContainerRef} sx={{ 
                flexGrow: 1, overflowY: 'auto', pr: 1,
                // CSS Overrides to clean up react-calendar instances
                '& .react-calendar': { width: '100%', border: 'none', fontFamily: 'inherit', bgcolor: 'transparent' },
                '& .react-calendar__navigation': { display: 'none !important' }, // Hide native headers
                '& .react-calendar__month-view__weekdays': { display: 'none !important' }, // Hide native weekdays
                '& .react-calendar__tile': { 
                    minHeight: '100px', // MAKES THE SQUARES MUCH BIGGER
                    padding: '8px 4px', fontWeight: '300', color: '#0f172a', display: 'flex', flexDirection: 'column', 
                    justifyContent: 'flex-start', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f8fafc'
                },
                '& .react-calendar__month-view__days__day--neighboringMonth': { color: '#cbd5e1', bgcolor: '#fdfdfd' },
                '& .react-calendar__tile--now': { background: 'rgba(250, 204, 21, 0.15)', color: '#000', fontWeight: '700' },
                '& .react-calendar__tile--active': { background: 'transparent', color: 'inherit' },
                '& .react-calendar__tile:hover': { background: '#f8fafc' }
            }}>
                
                {/* Previous Month */}
                <Calendar locale="he-IL" calendarType="hebrew" activeStartDate={prevMonthDate} tileContent={renderTileContent} />
                
                {/* Visual Separator */}
                <Divider sx={{ my: 3, '&::before, &::after': { borderColor: '#e2e8f0' } }}>
                    <Typography variant="caption" fontWeight="700" sx={{ color: '#94a3b8', px: 2 }}>חודש נוכחי</Typography>
                </Divider>

                {/* Current Month */}
                <Calendar locale="he-IL" calendarType="hebrew" activeStartDate={activeDate} tileContent={renderTileContent} />
                
                {/* Visual Separator */}
                <Divider sx={{ my: 3, '&::before, &::after': { borderColor: '#e2e8f0' } }}>
                    <Typography variant="caption" fontWeight="700" sx={{ color: '#94a3b8', px: 2 }}>חודש הבא</Typography>
                </Divider>

                {/* Next Month */}
                <Calendar locale="he-IL" calendarType="hebrew" activeStartDate={nextMonthDate} tileContent={renderTileContent} />
                
            </Box>
        </Box>
    );
};

export default EventCalendar;