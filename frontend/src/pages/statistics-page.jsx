import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Stack,
    Typography,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Label,
    Line,
    ReferenceDot,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { useAuth } from '../context/auth-context';
import { statisticsService } from '../services/interfaces/statistics-service';

const STATS_COLORS = {
    navy: '#071b3d',
    teal: '#1497a8',
    tealLight: '#18b7bf',
    gold: '#e3aa1a',
    purple: '#9c3bbd',
    orangeRed: '#f24b35',
    softBg: '#f6fbff',
    border: '#071b3d',
    muted: '#637083',
    track: '#e8eef5',
};

const cardSx = {
    borderRadius: { xs: '14px', md: '16px' },
    border: `1px solid ${STATS_COLORS.border}`,
    bgcolor: '#ffffff',
    boxShadow: '0 18px 38px rgba(7, 27, 61, 0.09)',
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
        height: 4,
        background: `linear-gradient(90deg, ${STATS_COLORS.gold}, ${STATS_COLORS.teal})`,
    },
};

const chartCardSx = {
    ...reportCardSx,
    minHeight: { xs: 360, md: 420 },
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

const getCurrentMonthRegistrations = (statistics) => (
    getDonutCard(statistics, 'currentMonthSignedUsers')?.total ||
    statistics?.totals?.registrationsThisMonth ||
    0
);

const getTopCenterRows = (statistics) => {
    const allParticipants = getDonutCard(statistics, 'allParticipants');
    const activeSignedUsers = getDonutCard(statistics, 'activeSignedUsers');
    const createdEvents = getDonutCard(statistics, 'createdEvents');
    const sourceRows = allParticipants?.slices?.length
        ? allParticipants.slices
        : activeSignedUsers?.slices?.length
            ? activeSignedUsers.slices
            : createdEvents?.slices || [];

    return sourceRows.slice(0, 6);
};

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
        series: [{ key: 'signups', name: 'הרשמות', color: STATS_COLORS.teal }],
        data,
    };
};

const normalizeTraffic = (traffic, fallbackTraffic) => {
    if (traffic?.hasData && traffic?.series?.length) {
        return {
            ...traffic,
            series: traffic.series.map((line, index) => ({
                ...line,
                color: index === 0 ? STATS_COLORS.teal : line.color || STATS_COLORS.navy,
            })),
        };
    }

    return fallbackTraffic;
};

const getPeakPoint = (data, key) => {
    const numericRows = data
        .map((item) => ({ ...item, value: Number(item[key] || 0) }))
        .filter((item) => item.value > 0);

    if (!numericRows.length) {
        return null;
    }

    return numericRows.reduce((peak, item) => (item.value > peak.value ? item : peak), numericRows[0]);
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

const StatisticsDecorativeBackground = () => (
    <Box
        aria-hidden="true"
        sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                opacity: 0.32,
                backgroundImage: `radial-gradient(${STATS_COLORS.teal} 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
                maskImage: 'linear-gradient(90deg, transparent 0%, #000 18%, transparent 72%)',
            },
        }}
    >
        <Box sx={{ position: 'absolute', top: 56, left: 46, width: 42, height: 42, border: `2px solid ${STATS_COLORS.gold}`, borderRadius: '50%', opacity: 0.34 }} />
        <Box sx={{ position: 'absolute', top: 170, right: 28, width: 0, height: 0, borderLeft: '18px solid transparent', borderRight: '18px solid transparent', borderBottom: `30px solid ${STATS_COLORS.gold}`, opacity: 0.22 }} />
        <Box sx={{ position: 'absolute', top: 168, right: 35, width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderBottom: `19px solid ${STATS_COLORS.softBg}` }} />
        <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: '13%', width: 1, bgcolor: 'rgba(7, 27, 61, 0.08)' }} />
        <Box sx={{ position: 'absolute', top: 0, bottom: 0, right: '31%', width: 1, bgcolor: 'rgba(7, 27, 61, 0.06)' }} />
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
            <Typography variant="h6" component="h2" fontWeight={900} sx={{ color: STATS_COLORS.navy, lineHeight: 1.2 }}>
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
                boxShadow: '0 12px 24px rgba(7, 27, 61, 0.12)',
                borderRadius: '10px',
                p: 1.25,
            }}
        >
            <Typography variant="body2" fontWeight={900} sx={{ mb: 0.5, color: STATS_COLORS.navy }}>
                {label}
            </Typography>
            {payload.map((entry) => (
                <Typography key={`${entry.dataKey}-${entry.name}`} variant="caption" display="block" sx={{ color: entry.color || STATS_COLORS.teal }}>
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

const CalendarSelectButton = ({ label = 'בחירת חודש' }) => (
    <Button
        variant="outlined"
        size="small"
        startIcon={<CalendarMonthIcon />}
        endIcon={<KeyboardArrowDownIcon />}
        sx={{
            alignSelf: { xs: 'flex-start', sm: 'center' },
            direction: 'rtl',
            color: STATS_COLORS.navy,
            borderColor: STATS_COLORS.navy,
            borderRadius: '999px',
            px: 1.5,
            whiteSpace: 'nowrap',
            bgcolor: '#ffffff',
            '& .MuiButton-startIcon': { ml: 0.75, mr: 0 },
            '& .MuiButton-endIcon': { mr: 0.75, ml: 0 },
            '&:hover': {
                borderColor: STATS_COLORS.teal,
                bgcolor: 'rgba(20, 151, 168, 0.08)',
            },
        }}
    >
        {label}
    </Button>
);

const StatisticsDashboardHeader = ({ year, periodLabel, centerName, isMonthView }) => (
    <Box
        sx={{
            position: 'relative',
            zIndex: 1,
            borderBottom: `1px solid rgba(7, 27, 61, 0.16)`,
            pb: { xs: 2.5, md: 3 },
        }}
    >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="overline" sx={{ color: STATS_COLORS.teal, fontWeight: 900, letterSpacing: 0 }}>
                ניתוח נתוני פעילות
            </Typography>
            <Typography variant="overline" sx={{ color: STATS_COLORS.navy, fontWeight: 800, letterSpacing: 0 }}>
                תקופת דוח: {year}
            </Typography>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ position: 'relative', width: 28, height: 25, flexShrink: 0 }}>
                <Box sx={{ width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderBottom: `24px solid ${STATS_COLORS.gold}` }} />
                <Box sx={{ position: 'absolute', top: 8, left: 8, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: `11px solid ${STATS_COLORS.softBg}` }} />
            </Box>
            <Typography
                variant="h3"
                component="h1"
                sx={{
                    color: STATS_COLORS.navy,
                    fontWeight: 950,
                    fontSize: { xs: '1.85rem', md: '2.65rem' },
                    lineHeight: 1.08,
                }}
            >
                דשבורד סטטיסטיקות אירועים והרשמות
                <Box component="span" sx={{ fontWeight: 500 }}> | {periodLabel}</Box>
            </Typography>
        </Stack>

        <Typography variant="body1" sx={{ mt: 1.5, color: STATS_COLORS.muted, maxWidth: 760 }}>
            {centerName && !isMonthView
                ? `מבט מרוכז על פעילות המרכז: ${centerName}`
                : centerName
                    ? `מבט חודשי על פעילות המרכז: ${centerName}`
                    : 'מבט מרוכז על אירועים, הרשמות, משתתפים ופעילות מרכזים במערכת'}
        </Typography>
    </Box>
);

const StatisticsDonutProgress = ({ label, value, total, color = STATS_COLORS.teal }) => {
    const percentage = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

    return (
        <Box sx={{ textAlign: 'center', minWidth: 82 }}>
            <Box
                sx={{
                    width: 76,
                    height: 76,
                    mx: 'auto',
                    borderRadius: '50%',
                    background: `conic-gradient(${color} ${percentage * 3.6}deg, ${STATS_COLORS.track} 0deg)`,
                    display: 'grid',
                    placeItems: 'center',
                    border: `1px solid ${STATS_COLORS.border}`,
                }}
            >
                <Box
                    sx={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        bgcolor: '#ffffff',
                        display: 'grid',
                        placeItems: 'center',
                        border: '1px solid rgba(7, 27, 61, 0.12)',
                    }}
                >
                    <Typography variant="caption" fontWeight={950} sx={{ color: STATS_COLORS.navy }}>
                        {percentage}%
                    </Typography>
                </Box>
            </Box>
            <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: STATS_COLORS.muted, fontWeight: 800 }}>
                {label}
            </Typography>
        </Box>
    );
};

const StatisticsMetricCard = ({ statistics }) => {
    const activeRegistrations = getActiveRegistrations(statistics);
    const totalParticipants = getTotalParticipants(statistics);
    const currentMonthRegistrations = getCurrentMonthRegistrations(statistics);
    const activeEvents = statistics?.totals?.activeEvents || 0;
    const totalEvents = getTotalCreatedEvents(statistics);

    return (
        <Card sx={{ ...reportCardSx, minHeight: { xs: 350, md: 420 } }}>
            <CardContent sx={{ p: { xs: 2.5, md: 3 }, height: '100%', '&:last-child': { pb: { xs: 2.5, md: 3 } } }}>
                <Stack spacing={2.5} sx={{ height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                        <Box
                            sx={{
                                width: 52,
                                height: 52,
                                borderRadius: '14px',
                                bgcolor: 'rgba(20, 151, 168, 0.12)',
                                color: STATS_COLORS.teal,
                                display: 'grid',
                                placeItems: 'center',
                                border: `1px solid ${STATS_COLORS.border}`,
                            }}
                        >
                            <NetworkCheckIcon />
                        </Box>
                        <Typography variant="overline" sx={{ color: STATS_COLORS.gold, fontWeight: 950, letterSpacing: 0 }}>
                            מדד מרכזי
                        </Typography>
                    </Stack>

                    <Box>
                        <Typography variant="h2" sx={{ color: STATS_COLORS.navy, fontWeight: 950, fontSize: { xs: '3.2rem', md: '4.3rem' }, lineHeight: 0.95 }}>
                            {formatNumber(activeRegistrations)}
                        </Typography>
                        <Typography variant="h6" component="h2" sx={{ color: STATS_COLORS.navy, fontWeight: 900, mt: 1 }}>
                            נרשמים פעילים
                        </Typography>
                        <Typography variant="body2" sx={{ color: STATS_COLORS.muted, mt: 0.75 }}>
                            מבוסס על נתוני האירועים במערכת
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mt: 'auto', flexWrap: 'wrap', rowGap: 2 }}>
                        <StatisticsDonutProgress
                            label="מתוך משתתפים"
                            value={activeRegistrations}
                            total={totalParticipants}
                            color={STATS_COLORS.teal}
                        />
                        <StatisticsDonutProgress
                            label="אירועים פעילים"
                            value={activeEvents}
                            total={totalEvents}
                            color={STATS_COLORS.navy}
                        />
                    </Stack>

                    <Box sx={{ borderTop: '1px solid rgba(7, 27, 61, 0.12)', pt: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                            <Typography variant="body2" sx={{ color: STATS_COLORS.muted, fontWeight: 800 }}>
                                נרשמים החודש
                            </Typography>
                            <Typography variant="body2" sx={{ color: STATS_COLORS.navy, fontWeight: 950 }}>
                                {formatNumber(currentMonthRegistrations)}
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
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
    const peakPoint = hasTrafficData ? getPeakPoint(data, primaryKey) : null;

    return (
        <Card sx={chartCardSx}>
            <CardContent sx={{ p: { xs: 2.5, md: 3 }, height: '100%', '&:last-child': { pb: { xs: 2.5, md: 3 } } }}>
                <DashboardCardHeader
                    title={title}
                    subtitle={subtitle}
                    action={<CalendarSelectButton />}
                />
                <Box sx={{ height: { xs: 260, md: height }, mt: 2.5, direction: 'ltr' }}>
                    {hasTrafficData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 38, right: 8, left: 2, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="trafficTealGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={STATS_COLORS.tealLight} stopOpacity={0.28} />
                                        <stop offset="95%" stopColor={STATS_COLORS.tealLight} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="rgba(7, 27, 61, 0.12)" />
                                <XAxis
                                    dataKey={xAxisKey}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: STATS_COLORS.navy, fontSize: 12, fontWeight: 800 }}
                                    interval={0}
                                />
                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: STATS_COLORS.muted, fontSize: 11 }} width={28} />
                                <Tooltip content={<StatisticsTooltip />} cursor={{ stroke: STATS_COLORS.teal, strokeDasharray: '4 4' }} />
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
                                    stroke={STATS_COLORS.teal}
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: STATS_COLORS.navy, stroke: '#ffffff', strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: STATS_COLORS.gold, stroke: STATS_COLORS.navy, strokeWidth: 2 }}
                                />
                                {peakPoint && (
                                    <ReferenceDot
                                        x={peakPoint[xAxisKey]}
                                        y={peakPoint.value}
                                        r={6}
                                        fill={STATS_COLORS.gold}
                                        stroke={STATS_COLORS.navy}
                                        strokeWidth={2}
                                    >
                                        <Label
                                            value={`שיא פעילות ${formatNumber(peakPoint.value)}`}
                                            position="top"
                                            fill={STATS_COLORS.navy}
                                            fontSize={12}
                                            fontWeight={900}
                                        />
                                    </ReferenceDot>
                                )}
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

const StatisticsEventsByCenterChart = ({ statistics, onMonthSelect, year }) => {
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
        <Card sx={chartCardSx}>
            <CardContent sx={{ p: { xs: 2.5, md: 3 }, height: '100%', '&:last-child': { pb: { xs: 2.5, md: 3 } } }}>
                <DashboardCardHeader
                    title={`אירועים לפי חודשים (${year})`}
                    subtitle="לחיצה על חודש פותחת פירוט פעילות חודשי"
                />
                <Box sx={{ height: { xs: 260, md: 305 }, mt: 2.5, direction: 'ltr' }}>
                    {hasChartData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 18, right: 8, left: 2, bottom: 0 }}
                                barCategoryGap="28%"
                            >
                                <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="rgba(7, 27, 61, 0.1)" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                    tick={<MonthAxisTick chartData={chartData} onMonthSelect={onMonthSelect} />}
                                />
                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: STATS_COLORS.muted, fontSize: 11 }} width={28} />
                                <Tooltip content={<StatisticsTooltip />} cursor={{ fill: 'rgba(20, 151, 168, 0.07)' }} />
                                <Bar dataKey="active" name="אירועים פעילים" fill={STATS_COLORS.teal} radius={[8, 8, 0, 0]} maxBarSize={24}>
                                    {chartData.map((monthData) => (
                                        <Cell
                                            key={`active-${monthData.monthIndex}`}
                                            fill={STATS_COLORS.teal}
                                            cursor="pointer"
                                            onClick={() => handleMonthClick(monthData)}
                                        />
                                    ))}
                                </Bar>
                                <Bar dataKey="finished" name="אירועים שהסתיימו" fill="#b8c1cc" radius={[8, 8, 0, 0]} maxBarSize={24}>
                                    {chartData.map((monthData) => (
                                        <Cell
                                            key={`finished-${monthData.monthIndex}`}
                                            fill="#b8c1cc"
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

const StatisticsOverviewCard = ({ statistics }) => {
    const totalEvents = getTotalCreatedEvents(statistics);
    const totalParticipants = getTotalParticipants(statistics);
    const rows = getTopCenterRows(statistics);
    const maxValue = Math.max(...rows.map((row) => Number(row.value || 0)), 0);

    return (
        <Card sx={{ ...reportCardSx, minHeight: { xs: 420, md: 420 } }}>
            <CardContent sx={{ p: { xs: 2.5, md: 3 }, height: '100%', '&:last-child': { pb: { xs: 2.5, md: 3 } } }}>
                <DashboardCardHeader
                    title="סקירת פעילות"
                    subtitle="אירועים, משתתפים ופילוח מרכזים מתוך נתוני המערכת"
                />
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '0.85fr 1.15fr' },
                        gap: { xs: 2.5, md: 3 },
                        mt: 3,
                        height: { md: 'calc(100% - 78px)' },
                    }}
                >
                    <Stack spacing={2.5} justifyContent="center">
                        <Box>
                            <Typography variant="body2" sx={{ color: STATS_COLORS.muted, fontWeight: 900 }}>
                                סך אירועים שנוצרו
                            </Typography>
                            <Typography variant="h3" sx={{ color: STATS_COLORS.navy, fontWeight: 950, lineHeight: 1 }}>
                                {formatNumber(totalEvents)}
                            </Typography>
                        </Box>
                        <Box sx={{ height: 1, bgcolor: 'rgba(7, 27, 61, 0.14)' }} />
                        <Box>
                            <Typography variant="body2" sx={{ color: STATS_COLORS.muted, fontWeight: 900 }}>
                                סך משתתפים / הרשמות
                            </Typography>
                            <Typography variant="h3" sx={{ color: STATS_COLORS.navy, fontWeight: 950, lineHeight: 1 }}>
                                {formatNumber(totalParticipants)}
                            </Typography>
                        </Box>
                    </Stack>

                    <Box sx={{ borderInlineStart: { md: '1px solid rgba(7, 27, 61, 0.14)' }, ps: { md: 3 } }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <TrendingUpIcon sx={{ color: STATS_COLORS.gold }} />
                            <Typography variant="subtitle1" fontWeight={950} sx={{ color: STATS_COLORS.navy }}>
                                מרכזים מובילים לפי פעילות
                            </Typography>
                        </Stack>

                        {rows.length ? (
                            <Stack spacing={1.4}>
                                {rows.map((row) => {
                                    const percentage = maxValue > 0 ? Math.max(6, (Number(row.value || 0) / maxValue) * 100) : 0;

                                    return (
                                        <Box
                                            key={row.centerName || row.name}
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: { xs: 'minmax(0, 1fr) 48px', sm: '120px minmax(0, 1fr) 52px' },
                                                gap: 1,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Typography variant="caption" noWrap sx={{ color: STATS_COLORS.navy, fontWeight: 900 }}>
                                                {row.centerName || row.name}
                                            </Typography>
                                            <Box sx={{ height: 10, bgcolor: STATS_COLORS.track, borderRadius: '999px', overflow: 'hidden', gridColumn: { xs: '1 / 2', sm: 'auto' } }}>
                                                <Box sx={{ height: '100%', width: `${percentage}%`, bgcolor: row.color || STATS_COLORS.teal, borderRadius: '999px' }} />
                                            </Box>
                                            <Typography variant="caption" sx={{ color: STATS_COLORS.navy, fontWeight: 950, textAlign: 'left' }}>
                                                {formatNumber(row.value)}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        ) : (
                            <ChartEmptyState>אין פילוח מרכזים להצגה</ChartEmptyState>
                        )}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

const MonthStatCard = ({ title, value, subtitle, accent = STATS_COLORS.teal }) => (
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

const MonthDetailsView = ({ monthDetails, onBack, year, centerName }) => {
    const monthlyTraffic = normalizeTraffic(
        monthDetails.traffic,
        {
            hasData: false,
            series: [{ key: 'signups', name: 'הרשמות', color: STATS_COLORS.teal }],
            data: monthDetails.traffic?.data || [],
        }
    );

    return (
        <Stack spacing={3}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
            >
                <Box>
                    <Typography variant="h5" component="h2" fontWeight={950} sx={{ color: STATS_COLORS.navy }}>
                        פירוט פעילות לחודש {monthDetails.monthName} {year}
                    </Typography>
                    {centerName && (
                        <Typography variant="body2" sx={{ color: STATS_COLORS.muted, mt: 0.5 }}>
                            מרכז: {centerName}
                        </Typography>
                    )}
                </Box>
                <Button
                    variant="outlined"
                    onClick={onBack}
                    sx={{
                        alignSelf: { xs: 'flex-start', sm: 'center' },
                        borderColor: STATS_COLORS.navy,
                        color: STATS_COLORS.navy,
                        borderRadius: '999px',
                        px: 2.5,
                        fontWeight: 900,
                        '&:hover': {
                            borderColor: STATS_COLORS.teal,
                            bgcolor: 'rgba(20, 151, 168, 0.08)',
                        },
                    }}
                >
                    חזרה לשנה
                </Button>
            </Stack>

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
                <MonthStatCard title="אירועים פעילים" value={monthDetails.events.active} accent={STATS_COLORS.teal} />
                <MonthStatCard title="אירועים שהסתיימו" value={monthDetails.events.finished} accent="#b8c1cc" />
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

const StatisticsPage = () => {
    const { currentUser, userRole, isAdmin, isCoordinator } = useAuth();
    const [statistics, setStatistics] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
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

    return (
        <Box
            sx={{
                position: 'relative',
                minHeight: '100vh',
                py: { xs: 3, md: 5 },
                bgcolor: STATS_COLORS.softBg,
                background: 'linear-gradient(135deg, #ffffff 0%, #f6fbff 42%, #eaf7fb 100%)',
                overflow: 'hidden',
            }}
        >
            <StatisticsDecorativeBackground />
            <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, direction: 'rtl' }}>
                <Stack spacing={3}>
                    <StatisticsDashboardHeader
                        year={reportYear}
                        periodLabel={periodLabel}
                        centerName={isCoordinator && !isAdmin ? statistics?.centerName : ''}
                        isMonthView={Boolean(visibleMonthDetails)}
                    />

                    {isLoading && (
                        <Card sx={cardSx}>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <CircularProgress size={24} sx={{ color: STATS_COLORS.teal }} />
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
                        <Stack spacing={3}>
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
                                        onBack={() => setSelectedMonth(null)}
                                        year={reportYear}
                                        centerName={isCoordinator && !isAdmin ? statistics?.centerName : ''}
                                    />
                                </Box>
                            ) : (
                                <Box
                                    key="yearly-statistics"
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '1fr',
                                            lg: 'minmax(280px, 0.35fr) minmax(0, 0.65fr)',
                                        },
                                        gap: { xs: 2.5, md: 3 },
                                        animation: 'statisticsViewFade 180ms ease-out',
                                        '@keyframes statisticsViewFade': {
                                            from: { opacity: 0, transform: 'translateY(6px)' },
                                            to: { opacity: 1, transform: 'translateY(0)' },
                                        },
                                    }}
                                >
                                    <StatisticsMetricCard statistics={statistics} />
                                    <StatisticsTrafficChartCard
                                        title={`מגמת תנועת משתמשים (${reportYear})`}
                                        subtitle="הרשמות לפי חודשים מתוך נתוני המערכת"
                                        traffic={yearlyTraffic}
                                    />
                                    <StatisticsEventsByCenterChart
                                        statistics={statistics}
                                        onMonthSelect={setSelectedMonth}
                                        year={reportYear}
                                    />
                                    <StatisticsOverviewCard statistics={statistics} />
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
