import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { Box, Typography, Button, Tooltip, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import 'react-calendar/dist/Calendar.css';

const EventCalendar = ({ events, userName }) => {
    const navigate = useNavigate();
    const [activeDate, setActiveDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month'); 

    const handlePrev = () => {
        if (viewMode === 'year') {
            setActiveDate(new Date(activeDate.getFullYear() - 1, activeDate.getMonth(), 1));
        } else {
            setActiveDate(new Date(activeDate.getFullYear(), activeDate.getMonth() - 1, 1));
        }
    };
    
    const handleNext = () => {
        if (viewMode === 'year') {
            setActiveDate(new Date(activeDate.getFullYear() + 1, activeDate.getMonth(), 1));
        } else {
            setActiveDate(new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 1));
        }
    };

    const handleToday = () => {
        setActiveDate(new Date());
        setViewMode('month');
    };

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
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', mt: 0.5, gap: 0.5, px: 0.5 }}>
                        {dayEvents.map((event, index) => (
                            <Tooltip 
                                key={index}
                                interactive 
                                placement="top"
                                arrow
                                slotProps={{
                                    tooltip: {
                                        sx: {
                                            bgcolor: '#ffffff', color: '#0f172a', boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                            borderRadius: '16px', p: 2.5, minWidth: '280px', border: '1px solid #e2e8f0'
                                        }
                                    }
                                }}
                                title={
                                    <Box sx={{ textAlign: 'right', direction: 'rtl' }}>
                                        <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 1.5, color: '#003b8b' }}>{event.title}</Typography>
                                        <Typography variant="body2" sx={{ mb: 0.5, color: '#475569' }}><strong>שעה:</strong> {event.time}</Typography>
                                        <Typography variant="body2" sx={{ mb: 2.5, color: '#475569' }}><strong>מיקום:</strong> {event.location}</Typography>
                                        <Button 
                                            size="medium" 
                                            variant="contained" 
                                            sx={{ borderRadius: '99px', bgcolor: '#003b8b', color: '#fff', width: '100%', fontWeight: '700', boxShadow: 'none', '&:hover': { bgcolor: '#002863' } }}
                                            onClick={(e) => { e.stopPropagation(); navigate('/events', { state: { openEventId: event.id } }); }}
                                        >
                                            לכל הפרטים
                                        </Button>
                                    </Box>
                                }
                            >
                                <Box 
                                    sx={{ 
                                        bgcolor: '#ffffff', 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)', 
                                        borderRadius: '8px', 
                                        p: '4px 8px',
                                        borderRight: '3px solid #facc15',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0,0,0,0.1)' }
                                    }}
                                >
                                    <Typography 
                                        variant="caption" 
                                        sx={{ color: '#003b8b', fontWeight: '700', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}
                                    >
                                        {event.title}
                                    </Typography>
                                </Box>
                            </Tooltip>
                        ))}
                    </Box>
                );
            }
        }
        return null;
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}> {/* Base container is now slightly shaded */}
            
            {/* ELEVATED TOP HEADER ROW */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                p: 3, 
                pb: 4,
                flexWrap: 'wrap', 
                gap: 2, 
                direction: 'rtl',
                bgcolor: '#ffffff', // Pure white to pop out
                boxShadow: '0 10px 30px rgba(0,0,0,0.04)', // The Neumorphic drop shadow
                zIndex: 10,
                position: 'relative'
            }}>
                
                {/* RIGHT: User Greeting */}
                <Box sx={{ minWidth: '150px' }}>
                    <Typography variant="h5" fontWeight="700" sx={{ color: '#000000' }}>
                        שלום, {userName}
                    </Typography>
                </Box>

                {/* CENTER: Month/Year Title stacked ABOVE Toggles */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h5" fontWeight="700" sx={{ color: '#0f172a' }}>
                        {viewMode === 'year' 
                            ? activeDate.getFullYear() 
                            : activeDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button onClick={handlePrev} sx={{ minWidth: '36px', width: '36px', height: '36px', borderRadius: '50%', color: '#64748b', bgcolor: '#f8fafc', '&:hover': { bgcolor: '#e2e8f0' } }}>&lt;</Button>

                        <Paper elevation={0} sx={{ display: 'flex', p: 0.5, bgcolor: '#f8fafc', borderRadius: '99px', border: '1px solid #f1f5f9' }}>
                            {[
                                { label: 'חודש', value: 'month' },
                                { label: 'שנה', value: 'year' }
                            ].map((view) => (
                                <Button 
                                    key={view.value}
                                    onClick={() => setViewMode(view.value)}
                                    sx={{ 
                                        borderRadius: '99px', 
                                        px: 2.5, 
                                        py: 0.5, 
                                        minWidth: 'auto',
                                        textTransform: 'capitalize',
                                        fontWeight: viewMode === view.value ? '700' : '500',
                                        color: viewMode === view.value ? '#003b8b' : '#64748b',
                                        bgcolor: viewMode === view.value ? '#ffffff' : 'transparent',
                                        boxShadow: viewMode === view.value ? '0 2px 8px rgba(0,59,139,0.15)' : 'none',
                                        border: viewMode === view.value ? '1px solid rgba(0,59,139,0.1)' : '1px solid transparent',
                                        '&:hover': { bgcolor: viewMode === view.value ? '#ffffff' : 'rgba(0,0,0,0.02)' }
                                    }}
                                >
                                    {view.label}
                                </Button>
                            ))}
                        </Paper>

                        <Button onClick={handleNext} sx={{ minWidth: '36px', width: '36px', height: '36px', borderRadius: '50%', color: '#64748b', bgcolor: '#f8fafc', '&:hover': { bgcolor: '#e2e8f0' } }}>&gt;</Button>
                    </Box>
                </Box>

                {/* LEFT: Today Button */}
                <Box sx={{ minWidth: '150px', display: 'flex', justifyContent: 'flex-end' }}>
                    <Paper 
                        elevation={0}
                        onClick={handleToday} 
                        sx={{ 
                            cursor: 'pointer', 
                            textAlign: 'center', 
                            p: '6px 16px', 
                            borderRadius: '12px', 
                            bgcolor: '#f8fafc',
                            border: '1px solid #f1f5f9',
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: '#f1f5f9', transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } 
                        }}
                    >
                        <Typography variant="caption" fontWeight="700" sx={{ color: '#64748b', display: 'block', lineHeight: 1, mb: 0.5 }}>היום</Typography>
                        <Typography variant="body2" fontWeight="700" sx={{ color: '#003b8b' }}>
                            {new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
                        </Typography>
                    </Paper>
                </Box>

            </Box>

            {/* THE CALENDAR GRID */}
            <Box sx={{ 
                flexGrow: 1, 
                px: 2, 
                pb: 2,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#f8fafc', // Shaded background below elevated header
                '& .react-calendar': { 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex',
                    flexDirection: 'column',
                    border: 'none', 
                    fontFamily: 'inherit', 
                    bgcolor: 'transparent' 
                },
                '& .react-calendar__viewContainer': { flexGrow: 1, display: 'flex', flexDirection: 'column' },
                '& .react-calendar__month-view': { flexGrow: 1, display: 'flex', flexDirection: 'column' },
                '& .react-calendar__month-view__days': { flexGrow: 1 },
                
                '& .react-calendar__navigation': { display: 'none !important' }, 
                
                /* Weekdays Header */
                '& .react-calendar__month-view__weekdays': { 
                    pb: 1,
                    pt: 2,
                    mb: 1
                },
                '& .react-calendar__month-view__weekdays__weekday': {
                    padding: '8px',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    fontWeight: '700',
                    textDecoration: 'none',
                    border: 'none'
                },
                '& .react-calendar__month-view__weekdays__weekday abbr': { textDecoration: 'none' },
                
                /* The Grid Squares */
                '& .react-calendar__month-view__days': {
                    borderLeft: '1px solid #e2e8f0',
                    borderTop: '1px solid #e2e8f0',
                },
                '& .react-calendar__tile': { 
                    minHeight: viewMode === 'month' ? '120px' : '80px', 
                    padding: '10px 8px', 
                    fontWeight: '600', // Bolder days text
                    fontSize: '1rem', // Crisper days text
                    color: '#0f172a', // Darker color
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'flex-start',
                    alignItems: 'flex-end', 
                    borderRight: '1px solid #e2e8f0',
                    borderBottom: '1px solid #e2e8f0',
                    bgcolor: 'transparent', // Let the container shade show through
                    transition: '0.2s',
                },
                '& .react-calendar__year-view__months__month': {
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: '600'
                },
                '& .react-calendar__month-view__days__day--neighboringMonth': { color: '#cbd5e1', fontWeight: '400' },
                
                /* Highlight "Today" whole square vividly in Blue */
                '& .react-calendar__tile--now': { 
                    background: '#003b8b !important', 
                    color: '#ffffff !important'
                },
                '& .react-calendar__tile--now abbr': { 
                    color: '#ffffff !important'
                },
                
                /* Hover effect */
                '& .react-calendar__tile:hover': { 
                    background: '#ffffff !important', // Hover turns white against the grey background
                    color: '#0f172a !important',
                    boxShadow: 'inset 0 0 0 1px #cbd5e1'
                },
                '& .react-calendar__tile--now:hover': {
                    background: '#002863 !important', 
                    color: '#ffffff !important',
                    boxShadow: 'none'
                }
            }}>
                <Calendar 
                    locale="he-IL" 
                    calendarType="hebrew" 
                    view={viewMode}
                    activeStartDate={activeDate} 
                    onActiveStartDateChange={({ activeStartDate }) => setActiveDate(activeStartDate)}
                    onClickMonth={(value) => {
                        setActiveDate(value);
                        setViewMode('month');
                    }}
                    tileContent={renderTileContent} 
                />
            </Box>
        </Box>
    );
};

export default EventCalendar;