import { useState } from 'react';
import Calendar from 'react-calendar';
import { Box, Typography, Button, Tooltip, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import 'react-calendar/dist/Calendar.css';
import { getEventColor } from '../../utils/centerColors';

const EventCalendar = ({ events, userName }) => {
    const navigate = useNavigate();
    const [activeDate, setActiveDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month');

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
            const isCurrentMonth =
                date.getFullYear() === now.getFullYear() &&
                date.getMonth() === now.getMonth();
            const isPast =
                date.getFullYear() < now.getFullYear() ||
                (date.getFullYear() === now.getFullYear() && date.getMonth() < now.getMonth());

            return (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    pt: 0.75,
                    width: '100%',
                    opacity: isPast ? 0.4 : 1,
                    filter: isPast ? 'grayscale(0.5)' : 'none',
                    overflow: 'hidden',
                }}>
                    {isCurrentMonth ? (
                        <Box sx={{ mt: 0.75, px: 0.75, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                            {monthEvents.slice(0, 3).map((event, index) => (
                                <Box key={event.id || index} sx={{ minWidth: 0, borderRight: `3px solid ${getEventColor(event, index)}`, pr: 0.75 }}>
                                    <Typography variant="caption" sx={{
                                        color: 'var(--color-text)',
                                        fontWeight: 600,
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        textAlign: 'right'
                                    }}>
                                        {event.title}
                                    </Typography>
                                </Box>
                            ))}
                            {monthEvents.length > 3 && (
                                <Typography variant="caption" sx={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                    +{monthEvents.length - 3}
                                </Typography>
                            )}
                        </Box>
                    ) : (
                        <Box
                            aria-label={monthEvents.length ? `${monthEvents.length} אירועים` : 'אין אירועים'}
                            sx={{ mt: 1.25, px: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.6 }}
                        >
                            {monthEvents.slice(0, 8).map((event, index) => (
                                <Box
                                    key={event.id || index}
                                    title={event.center || event.title}
                                    sx={{ width: '9px', height: '9px', bgcolor: getEventColor(event, index), borderRadius: '2px' }}
                                />
                            ))}
                            {monthEvents.length > 8 && (
                                <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', lineHeight: 1 }}>
                                    +{monthEvents.length - 8}
                                </Typography>
                            )}
                        </Box>
                    )}
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
                    {dayEvents.map((e, i) => (
                        <Tooltip
                            key={i}
                            interactive
                            placement="top"
                            arrow
                            slotProps={{
                                tooltip: {
                                    sx: {
                                        bgcolor: '#ffffff',
                                        color: '#0f172a',
                                        boxShadow: 'var(--shadow-md)',
                                        borderRadius: 'var(--radius-md)',
                                        p: 2.5,
                                        minWidth: '280px',
                                        border: '1px solid #e2e8f0',
                                    }
                                }
                            }}
                            title={
                                <Box sx={{ textAlign: 'right', direction: 'rtl' }}>
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: 'var(--color-text)' }}>
                                        {e.title}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 0.5, color: 'var(--color-text-muted)' }}>
                                        <strong>שעה: </strong>{e.time}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 2.5, color: 'var(--color-text-muted)' }}>
                                        <strong>מיקום: </strong>{e.location}
                                    </Typography>
                                    <Button
                                        size="medium"
                                        variant="contained"
                                        sx={{
                                            borderRadius: 'var(--radius-md)',
                                            bgcolor: 'var(--color-accent)',
                                            color: 'var(--color-text)',
                                            width: '100%',
                                            fontWeight: 700,
                                            boxShadow: 'none',
                                            '&:hover': { bgcolor: 'var(--color-accent-hover)' }
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/events', { state: { openEventId: e.id } });
                                        }}
                                    >
                                        לכל הפרטים
                                    </Button>
                                </Box>
                            }
                        >
                            <Box sx={{
                                bgcolor: 'var(--color-surface)',
                                borderRadius: 'var(--radius-sm)',
                                p: '3px 5px',
                                border: '1px solid var(--color-border)',
                                borderRight: `3px solid ${getEventColor(e, i)}`,
                                cursor: 'pointer',
                                transition: 'var(--t)',
                                '&:hover': { borderColor: getEventColor(e, i) }
                            }}>
                                <Typography variant="caption" sx={{
                                    color: 'var(--color-text)',
                                    fontWeight: 700,
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'right'
                                }}>
                                    {e.title}
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
        <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: 'var(--color-surface)' }}>

            {/* ── HEADER ── */}
           <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                px: 2.5,
                py: 2,
                gap: 1.5,
                direction: 'rtl',
                bgcolor: 'var(--color-bg)',
                borderBottom: '1px solid var(--color-border)',
                zIndex: 10
            }}>
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ color: 'var(--color-text)' }}>
                        לוח אירועים
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
                        שלום, {userName}
                    </Typography>
                </Box>

                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    <Button onClick={handlePrev} aria-label="התקופה הקודמת" sx={{ minWidth: '32px', p: 0.5 }}>&lt;</Button>
                    <Typography fontWeight={700} sx={{ color: 'var(--color-text)', textAlign: 'center' }}>
                        {viewMode === 'year'
                            ? activeDate.getFullYear()
                            : activeDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
                    </Typography>
                    <Button onClick={handleNext} aria-label="התקופה הבאה" sx={{ minWidth: '32px', p: 0.5 }}>&gt;</Button>
                </Box>

                <Box sx={{ display: 'flex', width: '100%', gap: 1, justifyContent: 'space-between' }}>
                    <Paper
                        elevation={0}
                        sx={{
                            display: 'flex',
                            p: '3px',
                            bgcolor: 'var(--color-surface)',
                            borderRadius: 0,
                            border: '1px solid var(--color-border)',
                            overflow: 'hidden',
                            gap: 0,
                            direction: 'rtl'
                        }}
                    >
                        <Button
                            onClick={() => setViewMode('month')}
                            sx={{
                                minWidth: '68px',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: viewMode === 'month' ? '700' : '500',
                                color: viewMode === 'month'
                                    ? 'var(--color-primary-dark)'
                                    : 'var(--color-text-muted)',
                                bgcolor: viewMode === 'month' ? 'var(--color-accent-soft)' : 'transparent',
                                boxShadow: 'none',
                                '&:hover': {
                                    bgcolor: 'var(--color-accent-soft)',
                                    borderRadius: 'var(--radius-sm)'
                                }
                            }}
                        >
                            חודש
                        </Button>

                        <Button
                            onClick={() => setViewMode('year')}
                            sx={{
                                minWidth: '68px',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: viewMode === 'year' ? '700' : '500',
                                color: viewMode === 'year'
                                    ? 'var(--color-primary-dark)'
                                    : 'var(--color-text-muted)',
                                bgcolor: viewMode === 'year' ? 'var(--color-accent-soft)' : 'transparent',
                                boxShadow: 'none',
                                '&:hover': {
                                    bgcolor: 'var(--color-accent-soft)',
                                    borderRadius: 'var(--radius-sm)'
                                }
                            }}
                        >
                            שנה
                        </Button>
                    </Paper>

                    <Button onClick={handleToday} size="small" sx={{ minWidth: '60px' }}>היום</Button>
                </Box>
            </Box>

            {/* ── CALENDAR ── */}
            <Box sx={{
                px: 1.5,
                pb: 2,
                pt: 1.5,
                display: 'flex',
                flexDirection: 'column',
                '& .react-calendar': { width: '100%', border: 'none', bgcolor: 'transparent' },
                '& .react-calendar__navigation': { display: 'none !important' },

                // YEAR VIEW
                '& .react-calendar__year-view__months': {
                    display: 'grid !important',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr)) !important',
                    gridAutoRows: '112px',
                    gap: '8px',
                    padding: '4px',
                },
                '& .react-calendar__year-view__months__month': {
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    minHeight: '0',
                    borderRadius: 0,
                    padding: '25px 6px 6px',
                    height: '112px !important',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    boxShadow: 'none',
                    transition: 'var(--t)',
                    margin: '0 !important',
                    flex: 'none !important',
                    maxWidth: '100% !important',
                    overflow: 'hidden',
                    '&:hover': { borderColor: 'var(--color-accent)' },
                },
                '& .react-calendar__year-view__months__month.react-calendar__tile--now': {
                    background: 'var(--color-surface) !important',
                    border: '2px solid var(--color-primary) !important',
                    color: 'var(--color-text) !important',
                    transform: 'scale(1.035)',
                    zIndex: 1,
                },
                '& .react-calendar__year-view__months__month.react-calendar__tile--now abbr': {
                    color: 'var(--color-text) !important',
                    fontWeight: '800',
                },

                // MONTH VIEW — daily squares
                '& .react-calendar__tile': {
                    minHeight: viewMode === 'month' ? '64px' : 'auto',
                    padding: viewMode === 'month' ? '7px 2px' : undefined,
                    borderRight: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                },
                '& .react-calendar__tile--now': {
                    background: 'var(--color-accent-soft) !important',
                    color: 'var(--color-text) !important',
                },
                '& .react-calendar__tile--active': {
                    background: 'var(--color-brand-dark) !important',
                    color: 'var(--color-surface) !important',
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
