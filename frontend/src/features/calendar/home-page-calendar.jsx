import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { Box, Typography, Button, Tooltip, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import 'react-calendar/dist/Calendar.css';
import { getEventColor } from '../../utils/centerColors';

const EventCalendar = ({ events, userName }) => {
    const navigate = useNavigate();
    const [activeDate, setActiveDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('year');

    const handlePrev = () => {
        setActiveDate(viewMode === 'year'
            ? new Date(activeDate.getFullYear() - 1, activeDate.getMonth(), 1)
            : new Date(activeDate.getFullYear(), activeDate.getMonth() - 1, 1));
    };

    const handleNext = () => {
        setActiveDate(viewMode === 'year'
            ? new Date(activeDate.getFullYear() + 1, activeDate.getMonth(), 1)
            : new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 1));
    };

    const handleToday = () => {
        setActiveDate(new Date());
        setViewMode('month');
    };

    // Returns events for a specific month that are >= today
    const getFutureEventsForMonth = (date) => {
        if (!events || events.length === 0) return [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return events
            .filter(e => {
                const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
                return (
                    eDate >= now &&
                    eDate.getMonth() === date.getMonth() &&
                    eDate.getFullYear() === date.getFullYear()
                );
            })
            .sort((a, b) => {
                const aDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                const bDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                return aDate - bDate;
            });
    };

    const renderTileContent = ({ date, view }) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // ─── YEAR VIEW ───────────────────────────────────────────────
        if (view === 'year') {
            const monthEvents = getFutureEventsForMonth(date);
            const isPast =
                date.getFullYear() < now.getFullYear() ||
                (date.getFullYear() === now.getFullYear() && date.getMonth() < now.getMonth());

            return (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    pt: 1,
                    width: '100%',
                    opacity: isPast ? 0.4 : 1,
                    filter: isPast ? 'grayscale(0.5)' : 'none',
                }}>
                    <Typography variant="body2" fontWeight={800} sx={{ color: 'var(--color-primary-dark)', textAlign: 'center' }}>
                        {monthEvents.length > 0 ? `(${monthEvents.length} אירועים)` : ''}
                    </Typography>

                    <Box sx={{ mt: 1, px: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {monthEvents.length === 0 ? (
                            // Only show "no events" message for current and future months
                            !isPast && (
                                <Typography variant="caption" sx={{
                                    color: 'var(--color-text-muted)',
                                    textAlign: 'center',
                                    display: 'block',
                                    mt: 2
                                }}>
                                    לא נוצרו אירועים לחודש זה כרגע.
                                </Typography>
                            )
                        ) : (
                            monthEvents.slice(0, 3).map((e, i) => {
                                const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
                                return (
                                    <Box key={i} sx={{
                                        bgcolor: getEventColor(e, i),
                                        color: 'white',
                                        borderRadius: '4px',
                                        px: 1,
                                        py: 0.5,
                                        textAlign: 'right',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                            {eDate.getDate()}/{eDate.getMonth() + 1} - {e.title}
                                        </Typography>
                                    </Box>
                                );
                            })
                        )}
                        {monthEvents.length > 3 && (
                            <Typography variant="caption" sx={{
                                textAlign: 'center',
                                fontWeight: 'bold',
                                color: 'var(--color-primary-dark)'
                            }}>...</Typography>
                        )}
                    </Box>
                </Box>
            );
        }

        // ─── MONTH VIEW ──────────────────────────────────────────────
        if (view === 'month') {
            const dayStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
                .toISOString()
                .split('T')[0];

            const dayEvents = (events || []).filter(e => {
                const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
                const eDateStr = new Date(eDate.getTime() - (eDate.getTimezoneOffset() * 60000))
                    .toISOString()
                    .split('T')[0];
                return eDateStr === dayStr;
            });

            if (dayEvents.length === 0) return null;

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
                                        bgcolor: '#ffffff',
                                        color: '#0f172a',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                        borderRadius: '16px',
                                        p: 2.5,
                                        minWidth: '280px',
                                        border: '1px solid #e2e8f0',
                                    }
                                }
                            }}
                            title={
                                <Box sx={{ textAlign: 'right', direction: 'rtl' }}>
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: '#003b8b' }}>
                                        {event.title}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 0.5, color: '#475569' }}>
                                        <strong>שעה: </strong>{event.time}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 2.5, color: '#475569' }}>
                                        <strong>מיקום: </strong>{event.location}
                                    </Typography>
                                    <Button
                                        size="medium"
                                        variant="contained"
                                        sx={{
                                            borderRadius: '99px',
                                            bgcolor: '#003b8b',
                                            color: '#fff',
                                            width: '100%',
                                            fontWeight: 700,
                                            boxShadow: 'none',
                                            '&:hover': { bgcolor: '#002863' }
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/events', { state: { openEventId: event.id } });
                                        }}
                                    >
                                        לכל הפרטים
                                    </Button>
                                </Box>
                            }
                        >
                            <Box sx={{
                                bgcolor: '#ffffff',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                borderRadius: '8px',
                                p: '4px 8px',
                                borderRight: `3px solid ${getEventColor(event, index)}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.1)'
                                }
                            }}>
                                <Typography variant="caption" sx={{
                                    color: getEventColor(event, index),
                                    fontWeight: 700,
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'right'
                                }}>
                                    {event.title}
                                </Typography>
                            </Box>
                        </Tooltip>
                    ))}
                </Box>
            );
        }

        return null;
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>

            {/* ── HEADER ── */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 2,
                py: 1.5,
                flexWrap: 'wrap',
                gap: 1,
                direction: 'rtl',
                bgcolor: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                zIndex: 10,
            }}>
                <Typography variant="h6" fontWeight={700}>שלום, {userName}</Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={700}>
                        {viewMode === 'year'
                            ? activeDate.getFullYear()
                            : activeDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={handlePrev}>&lt;</Button>

                    <Paper elevation={0} sx={{
                        display: 'flex',
                        p: 0.5,
                        bgcolor: '#f8fafc',
                        borderRadius: '99px',
                        border: '1px solid #f1f5f9'
                    }}>
                        <Button
                            onClick={() => setViewMode('month')}
                            sx={{
                                fontWeight: viewMode === 'month' ? '700' : '500',
                                color: viewMode === 'month' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)'
                            }}
                        >חודש</Button>
                        <Button
                            onClick={() => setViewMode('year')}
                            sx={{
                                fontWeight: viewMode === 'year' ? '700' : '500',
                                color: viewMode === 'year' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)'
                            }}
                        >שנה</Button>
                    </Paper>

                    <Button onClick={handleNext}>&gt;</Button>
                </Box>

                <Button onClick={handleToday}>היום</Button>
            </Box>

            {/* ── CALENDAR ── */}
            <Box sx={{
                flexGrow: 1,
                px: 2,
                pb: 3,
                pt: 2,
                display: 'flex',
                flexDirection: 'column',
                '& .react-calendar': { width: '100%', display: 'flex', height: '100%', border: 'none', bgcolor: 'transparent' },
                '& .react-calendar__navigation': { display: 'none !important' },

                // YEAR VIEW — 4-column grid
                '& .react-calendar__year-view__months': {
                    display: 'grid !important',
                    gridTemplateColumns: 'repeat(4, 1fr) !important',
                    gap: '8px',
                    padding: '8px',
                },
                '& .react-calendar__year-view__months__month': {
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    minHeight: '130px',
                    borderRadius: 'var(--radius-md)',
                    padding: '38px',
                    height: '100% !important',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s',
                    margin: '0 !important',
                    flex: 'none !important',
                    maxWidth: '100% !important',
                    '&:hover': { borderColor: 'var(--color-primary)', transform: 'translateY(-2px)' },
                },
                '& .react-calendar__year-view__months__month.react-calendar__tile--now': {
                    background: 'var(--color-surface) !important',
                    border: '2px solid var(--color-primary) !important',
                    color: 'var(--color-primary-dark) !important',
                },
                '& .react-calendar__year-view__months__month.react-calendar__tile--now abbr': {
                    color: 'var(--color-primary-dark) !important',
                },

                // MONTH VIEW — daily squares
                '& .react-calendar__tile': {
                    minHeight: viewMode === 'month' ? '120px' : 'auto',
                    borderRight: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
                },
                '& .react-calendar__tile--now': {
                    background: 'var(--color-primary) !important',
                    color: '#ffffff !important',
                },

                // Remove weekday underline
                '& .react-calendar__month-view__weekdays': { borderBottom: 'none !important' },
                '& .react-calendar__month-view__weekdays__weekday abbr': { textDecoration: 'none' },
            }}>
                <Calendar
                    locale="he-IL"
                    calendarType="hebrew"
                    view={viewMode}
                    activeStartDate={activeDate}
                    onActiveStartDateChange={({ activeStartDate }) => setActiveDate(activeStartDate)}
                    onClickMonth={(value) => { setActiveDate(value); setViewMode('month'); }}
                    tileContent={renderTileContent}
                />
            </Box>
        </Box>
    );
};

export default EventCalendar;
