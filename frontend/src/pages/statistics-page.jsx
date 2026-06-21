import { useEffect, useState } from 'react';
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
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { useAuth } from '../context/auth-context';
import { statisticsService } from '../services/interfaces/statistics-service';

const cardSx = {
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 8px 24px rgba(0, 38, 84, 0.08)',
    border: '1px solid #d8dee8',
    bgcolor: '#ffffff',
};

const mainChartCardSx = {
    ...cardSx,
    height: { xs: 390, md: 430 },
    minHeight: { xs: 390, md: 430 },
    overflow: 'hidden',
};

const donutCardSx = {
    ...cardSx,
    height: 310,
    minHeight: 310,
    overflow: 'hidden',
};

const formatNumber = (value) => Number(value || 0).toLocaleString('he-IL');

const ChartEmptyState = ({ children = 'אין נתונים להצגה כרגע' }) => (
    <Box
        sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-muted)',
            direction: 'rtl',
            textAlign: 'center',
        }}
    >
        <Typography variant="body2">{children}</Typography>
    </Box>
);

const DashboardCardHeader = ({ title, subtitle }) => (
    <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" component="h2" fontWeight={900} sx={{ color: 'var(--color-brand-dark)' }}>
            {title}
        </Typography>
        <Typography
            variant="body2"
            sx={{
                color: 'var(--color-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}
        >
            {subtitle}
        </Typography>
    </Box>
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
                border: '1px solid #d8dee8',
                boxShadow: 'var(--shadow-md)',
                borderRadius: 'var(--radius-md)',
                p: 1.25,
            }}
        >
            <Typography variant="body2" fontWeight={800} sx={{ mb: 0.5 }}>
                {label}
            </Typography>
            {payload.map((entry) => (
                <Typography key={entry.dataKey} variant="caption" display="block" sx={{ color: entry.color }}>
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
            fill="#475569"
            fontSize={12}
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

const MonthlyEventsChart = ({ statistics, onMonthSelect }) => {
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
        <Card sx={mainChartCardSx}>
            <CardContent sx={{ height: '100%', p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <DashboardCardHeader
                    title="אירועים לפי חודשים"
                    subtitle="פעילים מול אירועים שהסתיימו לאורך השנה"
                />
                <Box sx={{ height: { xs: 300, md: 340 }, mt: 2, direction: 'ltr' }}>
                    {hasChartData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 16, right: 8, left: 4, bottom: 0 }}
                                barCategoryGap="24%"
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                    tick={<MonthAxisTick chartData={chartData} onMonthSelect={onMonthSelect} />}
                                />
                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} width={28} />
                                <Tooltip content={<StatisticsTooltip />} cursor={{ fill: 'rgba(0, 59, 139, 0.04)' }} />
                                <Bar dataKey="active" name="אירועים פעילים" fill="var(--color-brand)" radius={[6, 6, 0, 0]} maxBarSize={26}>
                                    {chartData.map((monthData) => (
                                        <Cell
                                            key={`active-${monthData.monthIndex}`}
                                            fill="var(--color-brand)"
                                            cursor="pointer"
                                            onClick={() => handleMonthClick(monthData)}
                                        />
                                    ))}
                                </Bar>
                                <Bar dataKey="finished" name="אירועים שהסתיימו" fill="#8b95a1" radius={[6, 6, 0, 0]} maxBarSize={26}>
                                    {chartData.map((monthData) => (
                                        <Cell
                                            key={`finished-${monthData.monthIndex}`}
                                            fill="#8b95a1"
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

const TrafficLineChartCard = ({ title, subtitle, traffic, xAxisKey = 'month', height = 190, cardHeight = 310 }) => {
    const series = traffic?.series || [];
    const data = traffic?.data || [];
    const trafficCardSx = {
        ...cardSx,
        height: cardHeight,
        minHeight: cardHeight,
        overflow: 'hidden',
    };
    const hasTrafficData = Boolean(
        traffic?.hasData &&
        series.length &&
        data.some((item) => series.some((line) => Number(item[line.key] || 0) > 0))
    );

    return (
        <Card sx={trafficCardSx}>
            <CardContent sx={{ height: '100%', p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <DashboardCardHeader title={title} subtitle={subtitle} />
                <Box sx={{ height, mt: 2, direction: 'ltr' }}>
                    {hasTrafficData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                                <XAxis
                                    dataKey={xAxisKey}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#475569', fontSize: 12 }}
                                />
                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} width={28} />
                                <Tooltip content={<StatisticsTooltip />} />
                                <Legend wrapperStyle={{ direction: 'rtl', fontSize: 12, paddingTop: 8 }} />
                                {series.map((line) => (
                                    <Line
                                        key={line.key}
                                        type="monotone"
                                        dataKey={line.key}
                                        name={line.name}
                                        stroke={line.color}
                                        strokeWidth={2.5}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <ChartEmptyState>אין נתוני תנועה להצגה</ChartEmptyState>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

const MonthStatCard = ({ title, children }) => (
    <Card sx={cardSx}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography variant="h6" component="h2" fontWeight={900} sx={{ color: 'var(--color-brand-dark)', mb: 2 }}>
                {title}
            </Typography>
            {children}
        </CardContent>
    </Card>
);

const MonthDetailsView = ({ monthDetails, onBack }) => (
    <Stack spacing={3}>
        <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
        >
            <Typography variant="h5" component="h2" fontWeight={900} sx={{ color: 'var(--color-brand-dark)' }}>
                סטטיסטיקות לחודש {monthDetails.monthName}
            </Typography>
            <Button variant="outlined" onClick={onBack} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}>
                חזרה לשנה
            </Button>
        </Stack>

        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 2.5,
            }}
        >
            <MonthStatCard title="אירועים בחודש">
                <Stack spacing={1.25}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'var(--color-brand)' }} />
                            <Typography sx={{ color: 'var(--color-muted)' }}>אירועים פעילים</Typography>
                        </Stack>
                        <Typography variant="h5" fontWeight={900} sx={{ color: 'var(--color-brand-dark)' }}>
                            {formatNumber(monthDetails.events.active)}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#8b95a1' }} />
                            <Typography sx={{ color: 'var(--color-muted)' }}>אירועים שהסתיימו</Typography>
                        </Stack>
                        <Typography variant="h5" fontWeight={900} sx={{ color: 'var(--color-brand-dark)' }}>
                            {formatNumber(monthDetails.events.finished)}
                        </Typography>
                    </Box>
                </Stack>
            </MonthStatCard>

            <MonthStatCard title="נרשמים בחודש">
                <Typography variant="h3" fontWeight={900} sx={{ color: 'var(--color-brand-dark)' }}>
                    {formatNumber(monthDetails.signups)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--color-muted)' }}>
                    הרשמות פעילות בלבד
                </Typography>
            </MonthStatCard>
        </Box>

        <TrafficLineChartCard
            title="תנועת משתמשים בחודש"
            subtitle={`לפי ימים בחודש ${monthDetails.monthName}`}
            traffic={monthDetails.traffic}
            xAxisKey="dayLabel"
            height={250}
            cardHeight={370}
        />
    </Stack>
);

const DonutTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) {
        return null;
    }

    const entry = payload[0];

    return (
        <Box
            sx={{
                direction: 'rtl',
                bgcolor: '#ffffff',
                border: '1px solid #d8dee8',
                boxShadow: 'var(--shadow-md)',
                borderRadius: 'var(--radius-md)',
                p: 1,
            }}
        >
            <Typography variant="caption" display="block" fontWeight={800}>
                {entry.name}
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: entry.payload?.color || 'var(--color-brand)' }}>
                {formatNumber(entry.value)}
            </Typography>
        </Box>
    );
};

const DonutCard = ({ title, total, slices }) => {
    const hasData = slices?.some((slice) => slice.value > 0);
    const visibleSlices = slices || [];

    return (
        <Card sx={donutCardSx}>
            <CardContent sx={{ height: '100%', p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Typography variant="h6" component="h2" fontWeight={900} sx={{ color: 'var(--color-brand-dark)' }}>
                    {title}
                </Typography>
                <Box sx={{ position: 'relative', height: 145, mt: 1, direction: 'ltr' }}>
                    {hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={visibleSlices}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={44}
                                    outerRadius={62}
                                    paddingAngle={2}
                                    stroke="#ffffff"
                                    strokeWidth={2}
                                >
                                    {visibleSlices.map((entry) => (
                                        <Cell key={entry.centerName} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<DonutTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <ChartEmptyState />
                    )}
                    {hasData && (
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                direction: 'rtl',
                            }}
                        >
                            <Typography variant="h5" fontWeight={900} sx={{ color: 'var(--color-brand-dark)' }}>
                                {formatNumber(total)}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {hasData && (
                    <Stack spacing={0.75} sx={{ mt: 1, maxHeight: 86, overflow: 'hidden' }}>
                        {visibleSlices.slice(0, 4).map((slice) => (
                            <Box
                                key={slice.centerName}
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    color: 'var(--color-muted)',
                                }}
                            >
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: slice.color }} />
                                <Typography variant="caption" noWrap>{slice.centerName}</Typography>
                                <Typography variant="caption" fontWeight={900}>{formatNumber(slice.value)}</Typography>
                            </Box>
                        ))}
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
};

const StatisticsPage = () => {
    const { currentUser, userRole, isAdmin, isCoordinator } = useAuth();
    const [statistics, setStatistics] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

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

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 }, direction: 'rtl' }}>
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h4" component="h1" fontWeight={800} sx={{ color: 'var(--color-brand-dark)' }}>
                        {isCoordinator && !isAdmin && statistics?.centerName
                            ? `סטטיסטיקות - ${statistics.centerName}`
                            : 'סטטיסטיקות'}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1, color: 'var(--color-muted)' }}>
                        תמונת מצב של האירועים וההרשמות
                    </Typography>
                </Box>

                {isLoading && (
                    <Card sx={cardSx}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <CircularProgress size={24} />
                                <Typography>טוען נתונים...</Typography>
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
                                    animation: 'statisticsViewFade 160ms ease-out',
                                    '@keyframes statisticsViewFade': {
                                        from: { opacity: 0, transform: 'translateY(6px)' },
                                        to: { opacity: 1, transform: 'translateY(0)' },
                                    },
                                }}
                            >
                                <MonthDetailsView
                                    monthDetails={visibleMonthDetails}
                                    onBack={() => setSelectedMonth(null)}
                                />
                            </Box>
                        ) : (
                            <Box
                                key="yearly-statistics"
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 3,
                                    animation: 'statisticsViewFade 160ms ease-out',
                                    '@keyframes statisticsViewFade': {
                                        from: { opacity: 0, transform: 'translateY(6px)' },
                                        to: { opacity: 1, transform: 'translateY(0)' },
                                    },
                                }}
                            >
                                <MonthlyEventsChart
                                    statistics={statistics}
                                    onMonthSelect={setSelectedMonth}
                                />

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '1fr',
                                            sm: 'repeat(2, minmax(0, 1fr))',
                                            lg: 'repeat(4, minmax(0, 1fr))',
                                        },
                                        gap: 2.5,
                                    }}
                                >
                                    {(statistics?.donutCards || []).map((card) => (
                                        card.key === 'currentMonthSignedUsers' ? (
                                            <TrafficLineChartCard
                                                key="yearlyTraffic"
                                                title="תנועת משתמשים השנה"
                                                subtitle="לפי חודשים ומרכזים"
                                                traffic={statistics?.yearlyTraffic}
                                            />
                                        ) : (
                                            <DonutCard
                                                key={card.key}
                                                title={card.title}
                                                total={card.total}
                                                slices={card.slices}
                                            />
                                        )
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </Stack>
                )}
            </Stack>
        </Container>
    );
};

export default StatisticsPage;
