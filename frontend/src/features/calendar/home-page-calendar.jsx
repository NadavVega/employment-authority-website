import { useState } from 'react';
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

    const openEventDetails = (eventId) => {
        if (eventId) {
            navigate(`/events?eventId=${encodeURIComponent(eventId)}`);
        }
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
                                            bgcolor: 'var(--color-primary)',
                                            color: '#ffffff',
                                            width: '100%',
                                            fontWeight: 700,
                                            boxShadow: 'none',
                                            '&:hover': { bgcolor: 'var(--color-primary-dark)' },
                                            '&:focus-visible': {
                                                outline: '3px solid rgba(0, 59, 139, 0.3)',
                                                outlineOffset: '2px'
                                            }
                                        }}
                                        onClick={(clickEvent) => {
                                            clickEvent.stopPropagation();
                                            openEventDetails(e.id);
                                        }}
                                    >
                                        לכל הפרטים
                                    </Button>
                                </Box>
                            }
                        >
                            <Box
                                role="button"
                                tabIndex={0}
                                aria-label={`פתיחת פרטי האירוע ${e.title}`}
                                onClick={(clickEvent) => {
                                    clickEvent.stopPropagation();
                                    openEventDetails(e.id);
                                }}
                                onKeyDown={(keyboardEvent) => {
                                    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                                        keyboardEvent.preventDefault();
                                        keyboardEvent.stopPropagation();
                                        openEventDetails(e.id);
                                    }
                                }}
                                sx={{
                                    bgcolor: 'var(--color-surface)',
                                    borderRadius: 'var(--radius-sm)',
                                    p: '3px 5px',
                                    border: '1px solid var(--color-border)',
                                    borderRight: `3px solid ${getEventColor(e, i)}`,
                                    cursor: 'pointer',
                                    transition: 'var(--t)',
                                    '&:hover': { borderColor: getEventColor(e, i) },
                                    '&:focus-visible': {
                                        outline: '2px solid var(--color-brand)',
                                        outlineOffset: '1px'
                                    }
                                }}
                            >
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
                display: 'grid',
                flexDirection: 'column',
                alignItems: 'center',
                px: { xs: 1.25, sm: 2 },
                py: 1.5,
                gap: 1,
                direction: 'rtl',
                bgcolor: 'var(--color-bg)',
                borderBottom: '1px solid var(--color-border)',
                zIndex: 10
            }}>
                <Box sx={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: { xs: 'minmax(72px, 1fr) auto minmax(64px, 1fr)', sm: '1fr auto 1fr' },
                    alignItems: 'center',
                    columnGap: { xs: 0.5, sm: 1.25 }
                }}>
                    <Typography variant="h6" fontWeight={800} sx={{ color: 'var(--color-text)', textAlign: 'right', whiteSpace: 'nowrap', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                        לוח אירועים
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'ltr', minWidth: { xs: '132px', sm: '190px' } }}>
                        <Button onClick={handlePrev} aria-label="התקופה הקודמת" sx={{ minWidth: '30px', width: '30px', height: '30px', p: 0, color: 'var(--color-text)' }}>&lt;</Button>
                        <Typography fontWeight={800} sx={{ color: 'var(--color-text)', textAlign: 'center', flex: 1, whiteSpace: 'nowrap', fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                            {viewMode === 'year'
                                ? activeDate.getFullYear()
                                : activeDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
                        </Typography>
                        <Button onClick={handleNext} aria-label="התקופה הבאה" sx={{ minWidth: '30px', width: '30px', height: '30px', p: 0, color: 'var(--color-text)' }}>&gt;</Button>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'var(--color-text)', minWidth: 0, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                        שלום, {userName}
                    </Typography>
                </Box>

                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    width: '100%',
                    alignItems: 'center',
                    direction: 'ltr'
                }}>
                    <Paper
                        elevation={0}
                        sx={{
                            gridColumn: 2,
                            display: 'flex',
                            p: '2px',
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
                                minWidth: '58px',
                                px: 1.25,
                                py: 0.25,
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: viewMode === 'month' ? '700' : '500',
                                color: 'var(--color-text)',
                                bgcolor: viewMode === 'month'
                                    ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                                    : 'transparent',
                                boxShadow: 'none',
                                '&:hover': {
                                    bgcolor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                                    borderRadius: 'var(--radius-sm)'
                                }
                            }}
                        >
                            חודש
                        </Button>

                        <Button
                            onClick={() => setViewMode('year')}
                            sx={{
                                minWidth: '58px',
                                px: 1.25,
                                py: 0.25,
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: viewMode === 'year' ? '700' : '500',
                                color: 'var(--color-text)',
                                bgcolor: viewMode === 'year'
                                    ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                                    : 'transparent',
                                boxShadow: 'none',
                                '&:hover': {
                                    bgcolor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                                    borderRadius: 'var(--radius-sm)'
                                }
                            }}
                        >
                            שנה
                        </Button>
                    </Paper>

                    <Button
                        onClick={handleToday}
                        size="small"
                        sx={{
                            gridColumn: 1,
                            gridRow: 1,
                            justifySelf: 'start',
                            minWidth: '52px',
                            py: 0.25,
                            color: 'var(--color-text)'
                        }}
                    >
                        היום
                    </Button>
                </Box>
            </Box>

            {/* ── CALENDAR ── */}
            <Box sx={{
                px: { xs: 1, sm: 1.75 },
                pb: 2,
                pt: 1.5,
                display: 'flex',
                flexDirection: 'column',
                '& .react-calendar': { width: '100%', border: 'none', bgcolor: 'transparent' },
                '& .react-calendar__navigation': { display: 'none !important' },

                // YEAR VIEW
                '& .react-calendar__year-view__months': {
                    display: 'grid !important',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) !important',
                    gridTemplateRows: 'repeat(3, 136px) !important',
                    gridAutoRows: '136px !important',
                    gap: '6px',
                    padding: '3px',
                    height: '426px',
                    minHeight: '426px',
                    maxHeight: '426px',
                    overflow: 'visible',
                },
                '& .react-calendar__year-view__months__month': {
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    borderRadius: 0,
                    padding: '25px 4px 4px',
                    height: '136px !important',
                    minHeight: '136px !important',
                    maxHeight: '136px !important',
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
                    transform: 'none',
                    zIndex: 1,
                },
                '& .react-calendar__year-view__months__month.react-calendar__tile--now abbr': {
                    color: 'var(--color-text) !important',
                    fontWeight: '800',
                },

                // MONTH VIEW — daily squares
                '& .react-calendar__tile': {
                    minHeight: viewMode === 'month' ? '72px' : 'auto',
                    padding: viewMode === 'month' ? '9px 3px' : undefined,
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
