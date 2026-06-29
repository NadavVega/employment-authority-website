import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { useAuth } from '../context/auth-context';
import { statisticsService } from '../services/interfaces/statistics-service';
import { CENTER_COLORS } from '../utils/centerColors';
import { getCenterIcon, getEventCenterName } from '../utils/centerIcons';
import eventsDecoration from '../assets/images/city-view.png';
import employmentLogo from '../assets/center-icons/taasuka-logo-color.png';

const STATS_COLORS = {
    navy: '#10233f',
    municipalBlue: '#003b8b',
    municipalBlueLight: '#2f6fb6',
    gold: '#e3aa1a',
    border: '#d8dee8',
    muted: '#637083',
    grey: '#98a2b3',
    track: '#edf1f6',
};

const cardSx = {
    borderRadius: '4px',
    border: `1px solid ${STATS_COLORS.border}`,
    bgcolor: '#fbfcfe',
    boxShadow: '0 8px 24px rgba(0, 38, 84, 0.08)',
    overflow: 'hidden',
};

const reportCardSx = {
    ...cardSx,
    position: 'relative',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        left: 0,
        height: 0,
    },
};

const chartCardSx = {
    ...reportCardSx,
    width: '100%',
    height: { xs: 360, md: 300 },
    minHeight: { xs: 360, md: 300 },
};

const CENTER_DISPLAY_ORDER = [
    'מרכז כיוון',
    'מרכז הזדמנות',
    'מרכז פיתוח קריירה לאקדמאים',
    'מרכז ריאן',
    'מרכז ותיקים בעבודה',
    'קעליטה',
    'מרכז הקריירה האוניברסיטה העברית',
    'תוכניות לעולים',
];

const buildCenterCardRows = (statistics) => {
    const cardsByCenter = new Map(
        (statistics?.centerCards || []).map((card) => [
            getEventCenterName(card.centerName) || card.centerName,
            card,
        ])
    );

    return CENTER_DISPLAY_ORDER.map((displayName) => {
        const normalizedName = getEventCenterName(displayName) || displayName;
        const sourceCard = cardsByCenter.get(normalizedName) || {};

        return {
            centerName: displayName,
            activeEvents: sourceCard.activeEvents || 0,
            finishedEvents: sourceCard.finishedEvents || 0,
            registrations: sourceCard.registrations || 0,
            color: sourceCard.color || CENTER_COLORS[normalizedName] || STATS_COLORS.municipalBlue,
            icon: getCenterIcon(displayName),
        };
    });
};

const formatNumber = (value) => Number(value || 0).toLocaleString('he-IL');

const sumValues = (values = []) => values.reduce((sum, value) => sum + Number(value || 0), 0);

const getDonutCard = (statistics, key) => (
    statistics?.donutCards?.find((card) => card.key === key) || null
);

const getTotalCreatedEvents = (statistics) => (
    getDonutCard(statistics, 'createdEvents')?.total ||
    sumValues(Object.values(statistics?.createdEventsByCenter || {}))
);

const getTotalParticipants = (statistics) => (
    getDonutCard(statistics, 'allParticipants')?.total ||
    statistics?.totals?.registrationsThisYear ||
    0
);

const getActiveRegistrations = (statistics) => (
    getDonutCard(statistics, 'activeSignedUsers')?.total ||
    sumValues(Object.values(statistics?.activeSignedUsersByCenter || {}))
);

const buildYearlySignupTraffic = (statistics) => {
    const data = (statistics?.monthlyDetails || []).map((month) => ({
        month: month.month,
        monthName: month.monthName,
        monthIndex: month.monthIndex,
        signups: Number(month.signups || 0),
    }));
    const hasData = data.some((item) => item.signups > 0);

    return {
        hasData,
        series: [{ key: 'signups', name: 'הרשמות', color: STATS_COLORS.municipalBlue }],
        data,
    };
};

const normalizeTraffic = (traffic, fallbackTraffic) => {
    if (traffic?.hasData && traffic?.series?.length) {
        return {
            ...traffic,
            series: traffic.series.map((line, index) => ({
                ...line,
                color: index === 0 ? STATS_COLORS.municipalBlue : line.color || STATS_COLORS.navy,
            })),
        };
    }

    return fallbackTraffic;
};

const ChartEmptyState = ({ children = 'אין נתונים להצגה כרגע' }) => (
    <Box
        sx={{
            minHeight: 180,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: STATS_COLORS.muted,
            direction: 'rtl',
            textAlign: 'center',
        }}
    >
        <Typography variant="body2">{children}</Typography>
    </Box>
);

const DashboardCardHeader = ({ title, subtitle, action }) => (
    <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        justifyContent="space-between"
        sx={{ minWidth: 0 }}
    >
        <Box sx={{ minWidth: 0 }}>
            <Typography
                variant="h6"
                component="h2"
                fontWeight={950}
                sx={{
                    color: STATS_COLORS.navy,
                    lineHeight: 1.2,
                    fontSize: { xs: '1.06rem', md: '1.22rem' },
                    letterSpacing: 0,
                }}
            >
                {title}
            </Typography>
            {subtitle && (
                <Typography
                    variant="body2"
                    sx={{
                        mt: 0.5,
                        color: STATS_COLORS.muted,
                        overflowWrap: 'anywhere',
                    }}
                >
                    {subtitle}
                </Typography>
            )}
        </Box>
        {action}
    </Stack>
);

const StatisticsTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <Box
            sx={{
                direction: 'rtl',
                bgcolor: '#ffffff',
                border: `1px solid ${STATS_COLORS.border}`,
                boxShadow: '0 10px 22px rgba(7, 27, 61, 0.1)',
                borderRadius: '10px',
                p: 1.25,
            }}
        >
            <Typography variant="body2" fontWeight={900} sx={{ mb: 0.5, color: STATS_COLORS.navy }}>
                {label}
            </Typography>
            {payload.map((entry) => (
                <Typography key={`${entry.dataKey}-${entry.name}`} variant="caption" display="block" sx={{ color: entry.color || STATS_COLORS.municipalBlue }}>
                    {entry.name}: {formatNumber(entry.value)}
                </Typography>
            ))}
        </Box>
    );
};

const MonthAxisTick = ({ x, y, payload, chartData, onMonthSelect }) => {
    const monthData = chartData.find((item) => item.month === payload?.value);

    return (
        <text
            x={x}
            y={y + 14}
            textAnchor="middle"
            fill={STATS_COLORS.navy}
            fontSize={12}
            fontWeight={800}
            style={{ cursor: monthData ? 'pointer' : 'default' }}
            onClick={() => {
                if (monthData) {
                    onMonthSelect({
                        monthIndex: monthData.monthIndex,
                        monthName: monthData.monthName || monthData.month,
                    });
                }
            }}
        >
            {payload?.value}
        </text>
    );
};

const ModeButton = ({ active, children, onClick }) => (
    <Button
        className="statistics-mode-toggle"
        variant={active ? 'contained' : 'outlined'}
        onClick={onClick}
        sx={{
            minHeight: 36,
            px: 1.8,
            borderRadius: '4px',
            borderColor: active ? STATS_COLORS.municipalBlue : STATS_COLORS.border,
            bgcolor: active ? STATS_COLORS.municipalBlue : '#ffffff',
            color: active ? '#ffffff' : STATS_COLORS.navy,
            fontWeight: 900,
            boxShadow: 'none',
            '&:hover': {
                borderColor: STATS_COLORS.municipalBlue,
                bgcolor: active ? STATS_COLORS.municipalBlue : '#f3f7fb',
                boxShadow: 'none',
            },
        }}
    >
        {children}
    </Button>
);

const StatisticsModeToggle = ({ activeMode, onModeChange }) => (
    <Stack
        direction="row"
        spacing={0.75}
        sx={{
            alignSelf: { xs: 'flex-start', sm: 'center' },
            p: 0.5,
            border: `1px solid ${STATS_COLORS.border}`,
            borderRadius: '4px',
            bgcolor: '#ffffff',
        }}
    >
        <ModeButton active={activeMode === 'overall'} onClick={() => onModeChange('overall')}>
            מבט כללי
        </ModeButton>
        <ModeButton active={activeMode === 'centers'} onClick={() => onModeChange('centers')}>
            לפי מרכזים
        </ModeButton>
    </Stack>
);

const ContextChip = ({ children, inverse = false }) => (
    <Box
        component="span"
        sx={{
            display: 'inline-flex',
            alignItems: 'center',
            width: 'fit-content',
            px: 1.25,
            py: 0.35,
            borderRadius: '4px',
            borderInlineStart: `3px solid ${STATS_COLORS.gold}`,
            bgcolor: inverse ? 'rgba(255, 255, 255, 0.14)' : '#fbfcfe',
            color: inverse ? '#ffffff' : STATS_COLORS.navy,
            fontSize: '0.8rem',
            fontWeight: 900,
            backdropFilter: inverse ? 'blur(2px)' : 'none',
        }}
    >
        {children}
    </Box>
);

const StatisticsPageHero = ({
    centerName,
    isAdmin,
}) => (
    <Box
        component="header"
        className="statistics-page-hero"
        sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            minHeight: { xs: 132, md: 148 },
            px: { xs: 2.5, sm: 4, md: 6 },
            py: { xs: 3, md: 3.5 },
            bgcolor: STATS_COLORS.navy,
            borderBottom: `3px solid ${STATS_COLORS.municipalBlue}`,
            overflow: 'hidden',
            direction: 'rtl',
        }}
    >
        <Box
            component="img"
            src={eventsDecoration}
            alt=""
            aria-hidden="true"
            sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 65%',
                opacity: 0.66,
            }}
        />
        <Box
            aria-hidden="true"
            sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.18) 0%, rgba(0, 32, 74, 0.92) 100%)',
            }}
        />
        <Box
            component="img"
            src={employmentLogo}
            alt=""
            aria-hidden="true"
            sx={{
                position: 'relative',
                zIndex: 1,
                width: { xs: 74, md: 96 },
                height: { xs: 52, md: 66 },
                objectFit: 'contain',
                flexShrink: 0,
                ml: { xs: 2, md: 3 },
                filter: 'drop-shadow(0 2px 7px rgba(0, 0, 0, 0.3))',
            }}
        />
        <Box sx={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
            <ContextChip inverse>
                {isAdmin ? 'מבט מנהל' : 'מבט רכז'}
            </ContextChip>
            <Typography
                variant="h3"
                component="h1"
                sx={{
                    mt: 1,
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: 950,
                    fontSize: { xs: '1.8rem', md: '2.55rem' },
                    lineHeight: 1.08,
                    letterSpacing: 0,
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.38)',
                }}
            >
                {isAdmin ? 'סטטיסטיקות' : `סטטיסטיקות${centerName ? ` - ${centerName}` : ''}`}
            </Typography>
            <Typography
                variant="body1"
                sx={{
                    mt: 0.5,
                    color: 'rgba(255, 255, 255, 0.86)',
                    lineHeight: 1.65,
                    textShadow: '0 1px 5px rgba(0, 0, 0, 0.42)',
                }}
            >
                תמונת מצב של האירועים, המרכזים וההרשמות
            </Typography>
        </Box>
    </Box>
);

const StatisticsActionBar = ({
    isAdmin,
    centerName,
    activeMode,
    onModeChange,
    centerOptions,
    selectedCenter,
    onCenterSelect,
    isMonthView,
    monthAction,
}) => (
    <Box
        className="statistics-action-bar"
        sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1.5, md: 2.5 },
            flexWrap: 'wrap',
            px: { xs: 2, sm: 3, md: 6 },
            py: { xs: 1.75, md: 2.25 },
            borderBottom: `1px solid ${STATS_COLORS.border}`,
            bgcolor: '#ffffff',
            direction: 'rtl',
        }}
    >
        {isAdmin ? (
            <>
                {!isMonthView && (
                    <StatisticsModeToggle activeMode={activeMode} onModeChange={onModeChange} />
                )}
                <Autocomplete
                    size="small"
                    options={centerOptions}
                    value={selectedCenter}
                    onChange={(_, value) => onCenterSelect(value)}
                    noOptionsText="לא נמצאו מרכזים"
                    clearText="ניקוי"
                    openText="פתיחה"
                    closeText="סגירה"
                    sx={{
                        width: { xs: '100%', sm: 340 },
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '4px',
                            bgcolor: '#ffffff',
                            fontWeight: 800,
                        },
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder="חיפוש מרכז..."
                            aria-label="חיפוש מרכז"
                        />
                    )}
                />
            </>
        ) : (
            <Box
                sx={{
                    minHeight: 38,
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    border: `1px solid ${STATS_COLORS.border}`,
                    borderRadius: '4px',
                    color: STATS_COLORS.navy,
                    bgcolor: '#fbfcfe',
                    fontWeight: 900,
                }}
            >
                מרכז: {centerName || 'לא צוין'}
            </Box>
        )}
        {monthAction && (
            <Box sx={{ mr: { xs: 0, sm: 'auto' } }}>
                {monthAction}
            </Box>
        )}
    </Box>
);

const buildRingGradient = (slices = [], fallbackColor = STATS_COLORS.municipalBlue) => {
    const total = sumValues(slices.map((slice) => slice.value));

    if (!total) {
        return `conic-gradient(${STATS_COLORS.track} 0deg 360deg)`;
    }

    let cursor = 0;
    const stops = slices.map((slice) => {
        const start = cursor;
        const size = (Number(slice.value || 0) / total) * 360;
        cursor += size;
        return `${slice.color || fallbackColor} ${start}deg ${cursor}deg`;
    });

    return `conic-gradient(${stops.join(', ')})`;
};

const StatisticsRing = ({ value, slices, color = STATS_COLORS.municipalBlue }) => (
    <Box
        sx={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: buildRingGradient(slices, color),
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
        }}
    >
        <Box
            sx={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                bgcolor: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                border: `1px solid ${STATS_COLORS.border}`,
            }}
        >
            <Typography variant="subtitle1" fontWeight={950} sx={{ color: STATS_COLORS.navy, lineHeight: 1 }}>
                {formatNumber(value)}
            </Typography>
        </Box>
    </Box>
);

const CenterBreakdown = ({ slices = [] }) => {
    return (
        <Stack direction="row" spacing={0.6} sx={{ mt: 'auto', flexWrap: 'wrap', rowGap: 0.6 }}>
            {slices.slice(0, 5).map((slice) => (
                <Box
                    key={slice.centerName || slice.name}
                    title={slice.centerName || slice.name}
                    sx={{
                        width: 22,
                        height: 5,
                        borderRadius: '999px',
                        bgcolor: slice.color || STATS_COLORS.municipalBlue,
                    }}
                />
            ))}
        </Stack>
    );
};

const StatisticsStatCard = ({ title, value, slices = [], accent = STATS_COLORS.municipalBlue, children }) => (
    <Card className="statistics-stat-card" sx={{ ...reportCardSx, minHeight: 165, height: '100%' }}>
        <CardContent sx={{ p: 2, height: '100%', '&:last-child': { pb: 2 } }}>
            <Stack spacing={1.5} sx={{ height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={950} sx={{ color: STATS_COLORS.navy, lineHeight: 1.25 }}>
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight={950} sx={{ mt: 0.75, color: STATS_COLORS.navy, lineHeight: 1 }}>
                            {formatNumber(value)}
                        </Typography>
                    </Box>
                    <StatisticsRing value={value} slices={slices} color={accent} />
                </Stack>
                {children || <CenterBreakdown slices={slices} />}
            </Stack>
        </CardContent>
    </Card>
);

const MiniTrafficChart = ({ traffic }) => {
    const series = traffic?.series || [];
    const data = traffic?.data || [];
    const primaryKey = series[0]?.key;
    const hasTrafficData = Boolean(
        traffic?.hasData &&
        primaryKey &&
        data.some((item) => Number(item[primaryKey] || 0) > 0)
    );
    const total = hasTrafficData ? sumValues(data.map((item) => item[primaryKey])) : 0;

    return (
        <StatisticsStatCard
            title="תנועת משתמשים השנה"
            value={total}
            slices={[]}
            accent={STATS_COLORS.municipalBlue}
        >
            <Box sx={{ height: 48, mt: 'auto', direction: 'ltr' }}>
                {hasTrafficData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                            <Area
                                type="monotone"
                                dataKey={primaryKey}
                                stroke={STATS_COLORS.municipalBlue}
                                strokeWidth={2}
                                fill={STATS_COLORS.track}
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <Box
                        sx={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            color: STATS_COLORS.muted,
                        }}
                    >
                        <Typography variant="caption" fontWeight={800}>
                            אין נתוני תנועה להצגה
                        </Typography>
                    </Box>
                )}
            </Box>
        </StatisticsStatCard>
    );
};

const StatisticsSummaryGrid = ({ statistics, yearlyTraffic }) => {
    const activeUsersCard = getDonutCard(statistics, 'activeSignedUsers');
    const createdEventsCard = getDonutCard(statistics, 'createdEvents');
    const participantsCard = getDonutCard(statistics, 'allParticipants');

    return (
        <Box
            className="statistics-summary-grid"
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: 'repeat(4, minmax(0, 1fr))',
                },
                gap: { xs: 1.5, md: 2 },
            }}
        >
            <StatisticsStatCard
                title="נרשמים פעילים"
                value={activeUsersCard?.total || getActiveRegistrations(statistics)}
                slices={activeUsersCard?.slices || []}
            />
            <MiniTrafficChart traffic={yearlyTraffic} />
            <StatisticsStatCard
                title="אירועים שנוצרו"
                value={createdEventsCard?.total || getTotalCreatedEvents(statistics)}
                slices={createdEventsCard?.slices || []}
            />
            <StatisticsStatCard
                title="משתתפים בכל הזמנים"
                value={participantsCard?.total || getTotalParticipants(statistics)}
                slices={participantsCard?.slices || []}
            />
        </Box>
    );
};

const StatisticsTrafficChartCard = ({
    title,
    subtitle,
    traffic,
    xAxisKey = 'month',
    height = 300,
}) => {
    const series = traffic?.series || [];
    const data = traffic?.data || [];
    const primarySeries = series[0];
    const primaryKey = primarySeries?.key;
    const hasTrafficData = Boolean(
        traffic?.hasData &&
        primaryKey &&
        data.some((item) => series.some((line) => Number(item[line.key] || 0) > 0))
    );

    return (
        <Card
            className="statistics-main-chart-card"
            sx={{
                ...chartCardSx,
                height: { xs: 360, md: height + 104 },
                minHeight: { xs: 360, md: height + 104 },
            }}
        >
            <CardContent sx={{ p: { xs: 2.5, md: 3 }, height: '100%', '&:last-child': { pb: { xs: 2.5, md: 3 } } }}>
                <DashboardCardHeader
                    title={title}
                    subtitle={subtitle}
                />
                <Box sx={{ height: { xs: 250, md: height }, mt: 2, direction: 'ltr' }}>
                    {hasTrafficData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 34, right: 8, left: 2, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="trafficTealGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={STATS_COLORS.municipalBlueLight} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={STATS_COLORS.municipalBlueLight} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="rgba(99, 112, 131, 0.18)" />
                                <XAxis
                                    dataKey={xAxisKey}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: STATS_COLORS.navy, fontSize: 12, fontWeight: 800 }}
                                    interval={0}
                                />
                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: STATS_COLORS.muted, fontSize: 11 }} width={28} />
                                <Tooltip content={<StatisticsTooltip />} cursor={{ stroke: STATS_COLORS.municipalBlue, strokeDasharray: '4 4' }} />
                                <Area
                                    type="monotone"
                                    dataKey={primaryKey}
                                    name={primarySeries.name}
                                    stroke="none"
                                    fill="url(#trafficTealGradient)"
                                />
                                <Line
                                    type="monotone"
                                    dataKey={primaryKey}
                                    name={primarySeries.name}
                                    stroke={STATS_COLORS.municipalBlue}
                                    strokeWidth={3}
                                    dot={{ r: 3.5, fill: STATS_COLORS.municipalBlue, stroke: '#ffffff', strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: STATS_COLORS.gold, stroke: STATS_COLORS.navy, strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <ChartEmptyState>אין נתוני תנועה להצגה</ChartEmptyState>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

const StatisticsEventsByCenterChart = ({ statistics, onMonthSelect }) => {
    const chartData = statistics?.monthlyEvents || [];
    const hasChartData = chartData.some((item) => item.active || item.finished);

    const handleMonthClick = (monthData) => {
        if (Number.isInteger(monthData?.monthIndex)) {
            onMonthSelect({
                monthIndex: monthData.monthIndex,
                monthName: monthData.monthName || monthData.month,
            });
        }
    };

    return (
        <Card className="statistics-main-chart-card" sx={chartCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 2.25 }, height: '100%', '&:last-child': { pb: { xs: 2, md: 2.25 } } }}>
                <DashboardCardHeader
                    title="אירועים לפי חודשים"
                />
                <Box sx={{ height: { xs: 250, md: 205 }, mt: { xs: 2, md: 1.5 }, direction: 'ltr' }}>
                    {hasChartData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 12, right: 8, left: 2, bottom: 0 }}
                                barCategoryGap="28%"
                            >
                                <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="rgba(99, 112, 131, 0.18)" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                    tick={<MonthAxisTick chartData={chartData} onMonthSelect={onMonthSelect} />}
                                />
                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: STATS_COLORS.muted, fontSize: 11 }} width={28} />
                                <Tooltip content={<StatisticsTooltip />} cursor={{ fill: 'rgba(0, 59, 139, 0.07)' }} />
                                <Bar dataKey="active" name="אירועים פעילים" fill={STATS_COLORS.municipalBlue} radius={[6, 6, 0, 0]} maxBarSize={34}>
                                    {chartData.map((monthData) => (
                                        <Cell
                                            key={`active-${monthData.monthIndex}`}
                                            fill={STATS_COLORS.municipalBlue}
                                            cursor="pointer"
                                            onClick={() => handleMonthClick(monthData)}
                                        />
                                    ))}
                                </Bar>
                                <Bar dataKey="finished" name="אירועים שהסתיימו" fill={STATS_COLORS.grey} radius={[6, 6, 0, 0]} maxBarSize={34}>
                                    {chartData.map((monthData) => (
                                        <Cell
                                            key={`finished-${monthData.monthIndex}`}
                                            fill={STATS_COLORS.grey}
                                            cursor="pointer"
                                            onClick={() => handleMonthClick(monthData)}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <ChartEmptyState />
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

const CenterMetric = ({ label, value }) => (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ color: STATS_COLORS.muted, fontWeight: 800 }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{ color: STATS_COLORS.navy, fontWeight: 950 }}>
            {formatNumber(value)}
        </Typography>
    </Stack>
);

const StatisticsCenterGrid = ({ statistics, selectedCenterName }) => {
    const centerCards = buildCenterCardRows(statistics);
    const visibleCenterCards = selectedCenterName
        ? centerCards.filter((center) => center.centerName === selectedCenterName)
        : centerCards;

    return (
        <Box
            className="statistics-main-chart-card"
            sx={{
                ...chartCardSx,
                height: 'auto',
                minHeight: 0,
                p: { xs: 2, md: 2.25 },
            }}
        >
            <DashboardCardHeader
                title="סטטיסטיקות לפי מרכזים"
                subtitle="תמונת פעילות של שמונת המרכזים"
            />

            <Box
                className="statistics-center-grid"
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, minmax(0, 1fr))',
                        lg: 'repeat(4, minmax(0, 1fr))',
                    },
                    gap: { xs: 1.5, md: 2 },
                    mt: 2,
                }}
            >
                {visibleCenterCards.map((center) => (
                    <Box
                        key={center.centerName}
                        className="statistics-center-card"
                        sx={{
                            ...reportCardSx,
                            minHeight: 190,
                            height: '100%',
                            borderTop: `4px solid ${center.color || STATS_COLORS.municipalBlue}`,
                            p: 2,
                        }}
                    >
                        <Stack spacing={1.5} sx={{ height: '100%' }}>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Box
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        flexShrink: 0,
                                        display: 'grid',
                                        placeItems: 'center',
                                        borderRadius: '4px',
                                        bgcolor: '#ffffff',
                                        border: `1px solid ${STATS_COLORS.border}`,
                                        p: 0.5,
                                    }}
                                >
                                    {center.icon && (
                                        <Box
                                            component="img"
                                            src={center.icon}
                                            alt={center.centerName}
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                            }}
                                        />
                                    )}
                                </Box>
                                <Typography
                                    variant="subtitle1"
                                    component="h2"
                                    sx={{
                                        color: STATS_COLORS.navy,
                                        fontWeight: 950,
                                        lineHeight: 1.25,
                                        fontSize: '0.98rem',
                                    }}
                                >
                                    {center.centerName}
                                </Typography>
                            </Stack>
                            <Stack spacing={1} sx={{ mt: 'auto' }}>
                                <CenterMetric label="אירועים פעילים:" value={center.activeEvents} />
                                <CenterMetric label="אירועים שהסתיימו:" value={center.finishedEvents} />
                                <CenterMetric label="נרשמים:" value={center.registrations} />
                            </Stack>
                        </Stack>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

const MonthStatCard = ({ title, value, subtitle, accent = STATS_COLORS.municipalBlue }) => (
    <Card sx={reportCardSx}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 }, '&:last-child': { pb: { xs: 2.5, md: 3 } } }}>
            <Box sx={{ width: 40, height: 4, bgcolor: accent, borderRadius: '999px', mb: 2 }} />
            <Typography variant="body2" fontWeight={900} sx={{ color: STATS_COLORS.muted }}>
                {title}
            </Typography>
            <Typography variant="h3" fontWeight={950} sx={{ color: STATS_COLORS.navy, lineHeight: 1.05 }}>
                {formatNumber(value)}
            </Typography>
            {subtitle && (
                <Typography variant="body2" sx={{ color: STATS_COLORS.muted, mt: 0.75 }}>
                    {subtitle}
                </Typography>
            )}
        </CardContent>
    </Card>
);

const MonthDetailsView = ({ monthDetails, year }) => {
    const monthlyTraffic = normalizeTraffic(
        monthDetails.traffic,
        {
            hasData: false,
            series: [{ key: 'signups', name: 'הרשמות', color: STATS_COLORS.municipalBlue }],
            data: monthDetails.traffic?.data || [],
        }
    );

    return (
        <Stack spacing={3}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(3, minmax(0, 1fr))',
                    },
                    gap: 2.5,
                }}
            >
                <MonthStatCard title="אירועים פעילים" value={monthDetails.events.active} accent={STATS_COLORS.municipalBlue} />
                <MonthStatCard title="אירועים שהסתיימו" value={monthDetails.events.finished} accent={STATS_COLORS.grey} />
                <MonthStatCard title="נרשמים בחודש" value={monthDetails.signups} subtitle="הרשמות פעילות בלבד" accent={STATS_COLORS.gold} />
            </Box>

            <StatisticsTrafficChartCard
                title={`מגמת תנועת משתמשים (${monthDetails.monthName} ${year})`}
                subtitle="לפי ימים בחודש הנבחר"
                traffic={monthlyTraffic}
                xAxisKey="dayLabel"
                height={330}
            />
        </Stack>
    );
};

const BackToYearButton = ({ onClick }) => (
    <Button
        variant="outlined"
        onClick={onClick}
        sx={{
            alignSelf: { xs: 'flex-start', sm: 'center' },
            borderColor: STATS_COLORS.border,
            color: STATS_COLORS.navy,
            borderRadius: '4px',
            px: 2.25,
            minHeight: 38,
            fontWeight: 900,
            bgcolor: '#ffffff',
            '&:hover': {
                borderColor: STATS_COLORS.municipalBlue,
                bgcolor: 'rgba(0, 59, 139, 0.08)',
            },
        }}
    >
        חזרה לתצוגה שנתית
    </Button>
);

const StatisticsPage = () => {
    const { currentUser, userRole, isAdmin, isCoordinator } = useAuth();
    const [statistics, setStatistics] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [adminViewMode, setAdminViewMode] = useState('overall');
    const [selectedCenterName, setSelectedCenterName] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const reportYear = new Date().getFullYear();

    useEffect(() => {
        let isActive = true;

        const loadStatistics = async () => {
            setIsLoading(true);
            setError('');

            try {
                const result = await statisticsService.getStatistics({
                    currentUser,
                    userRole,
                    isAdmin,
                    isCoordinator,
                });

                if (isActive) {
                    setStatistics(result);
                }
            } catch (loadError) {
                console.error('Failed to load statistics:', loadError);

                if (isActive) {
                    setStatistics(null);
                    setError('לא ניתן לטעון נתונים סטטיסטיים');
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        loadStatistics();

        return () => {
            isActive = false;
        };
    }, [currentUser, userRole, isAdmin, isCoordinator]);

    const yearlyTraffic = useMemo(
        () => normalizeTraffic(statistics?.yearlyTraffic, buildYearlySignupTraffic(statistics)),
        [statistics]
    );
    const centerOptions = useMemo(
        () => buildCenterCardRows(statistics).map((center) => center.centerName),
        [statistics]
    );

    if (!isAdmin && !isCoordinator) {
        return <Navigate to="/home" replace />;
    }

    const hasData = Boolean(
        statistics?.monthlyEvents?.some((item) => item.active || item.finished) ||
        statistics?.donutCards?.some((card) => card.total > 0)
    );
    const selectedMonthDetails = Number.isInteger(selectedMonth?.monthIndex)
        ? statistics?.monthlyDetails?.[selectedMonth.monthIndex]
        : null;
    const visibleMonthDetails = selectedMonthDetails && selectedMonth
        ? {
            ...selectedMonthDetails,
            monthName: selectedMonth.monthName || selectedMonthDetails.monthName,
        }
        : null;
    const periodLabel = visibleMonthDetails
        ? `${visibleMonthDetails.monthName} ${reportYear}`
        : String(reportYear);
    const showCenterView = isAdmin && adminViewMode === 'centers' && !visibleMonthDetails;
    const handleCenterSelect = (centerName) => {
        setSelectedCenterName(centerName || null);

        if (centerName) {
            setAdminViewMode('centers');
        }
    };

    return (
        <Box
            className="statistics-page"
            sx={{
                position: 'relative',
                minHeight: '100vh',
                bgcolor: '#f4f6f9',
            }}
        >
            <StatisticsPageHero
                centerName={isCoordinator && !isAdmin ? statistics?.centerName : ''}
                isAdmin={isAdmin}
            />
            <StatisticsActionBar
                isAdmin={isAdmin}
                centerName={isCoordinator && !isAdmin ? statistics?.centerName : ''}
                activeMode={adminViewMode}
                onModeChange={setAdminViewMode}
                centerOptions={centerOptions}
                selectedCenter={selectedCenterName}
                onCenterSelect={handleCenterSelect}
                isMonthView={Boolean(visibleMonthDetails)}
                monthAction={visibleMonthDetails ? <BackToYearButton onClick={() => setSelectedMonth(null)} /> : null}
            />
            <Container
                maxWidth={false}
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    direction: 'rtl',
                    width: '100%',
                    px: { xs: 2, sm: 3, md: 6 },
                    py: { xs: 2.5, md: 3.5 },
                }}
            >
                <Stack spacing={2}>
                    {visibleMonthDetails && (
                        <Typography
                            variant="h5"
                            component="h2"
                            sx={{
                                color: STATS_COLORS.navy,
                                fontWeight: 950,
                                letterSpacing: 0,
                            }}
                        >
                            סטטיסטיקות לחודש {periodLabel}
                        </Typography>
                    )}

                    {isLoading && (
                        <Card sx={cardSx}>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <CircularProgress size={24} sx={{ color: STATS_COLORS.municipalBlue }} />
                                    <Typography sx={{ color: STATS_COLORS.navy, fontWeight: 800 }}>טוען נתונים...</Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}

                    {!isLoading && error && (
                        <Alert severity="error">{error}</Alert>
                    )}

                    {!isLoading && !error && statistics?.missingCenter && (
                        <Alert severity="warning">לא נמצא מרכז משויך למשתמש</Alert>
                    )}

                    {!isLoading && !error && !statistics?.missingCenter && (
                        <Stack spacing={2}>
                            {!hasData && (
                                <Alert severity="info">אין נתונים להצגה כרגע</Alert>
                            )}

                            {visibleMonthDetails ? (
                                <Box
                                    key={`month-${visibleMonthDetails.monthIndex}`}
                                    sx={{
                                        animation: 'statisticsViewFade 180ms ease-out',
                                        '@keyframes statisticsViewFade': {
                                            from: { opacity: 0, transform: 'translateY(6px)' },
                                            to: { opacity: 1, transform: 'translateY(0)' },
                                        },
                                    }}
                                >
                                    <MonthDetailsView
                                        monthDetails={visibleMonthDetails}
                                        year={reportYear}
                                    />
                                </Box>
                            ) : showCenterView ? (
                                <Box
                                    key="center-statistics"
                                    sx={{
                                        animation: 'statisticsViewFade 180ms ease-out',
                                        '@keyframes statisticsViewFade': {
                                            from: { opacity: 0, transform: 'translateY(6px)' },
                                            to: { opacity: 1, transform: 'translateY(0)' },
                                        },
                                    }}
                                >
                                    <StatisticsCenterGrid
                                        statistics={statistics}
                                        selectedCenterName={selectedCenterName}
                                    />
                                </Box>
                            ) : (
                                <Box
                                    key="yearly-statistics"
                                    className="statistics-dashboard"
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: { xs: 1.5, md: 2 },
                                        animation: 'statisticsViewFade 180ms ease-out',
                                        '@keyframes statisticsViewFade': {
                                            from: { opacity: 0, transform: 'translateY(6px)' },
                                            to: { opacity: 1, transform: 'translateY(0)' },
                                        },
                                    }}
                                >
                                    <StatisticsEventsByCenterChart
                                        statistics={statistics}
                                        onMonthSelect={setSelectedMonth}
                                    />
                                    <StatisticsSummaryGrid statistics={statistics} yearlyTraffic={yearlyTraffic} />
                                </Box>
                            )}
                        </Stack>
                    )}
                </Stack>
            </Container>
        </Box>
    );
};

export default StatisticsPage;
