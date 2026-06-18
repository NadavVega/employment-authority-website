import { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Container
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/config';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a28CFE', '#FF5252'];

const AdminDashboardPage = () => {
    const { isAdmin, isCoordinator } = useAuth();
    const [events, setEvents] = useState([]);
    const [employers, setEmployers] = useState([]);

    useEffect(() => {
        const eventsRef = collection(db, 'events');
        const unsubscribeEvents = onSnapshot(eventsRef, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEvents(fetchedEvents);
        });

        const usersRef = collection(db, 'users');
        const unsubscribeEmployers = onSnapshot(usersRef, (snapshot) => {
            const fetchedUsers = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    computedRole: data.role || data.profile?.role || ''
                };
            });
            const fetchedEmployers = fetchedUsers.filter(u => u.computedRole === 'employer');
            setEmployers(fetchedEmployers);
        });

        return () => {
            unsubscribeEvents();
            unsubscribeEmployers();
        };
    }, []);

    if (!isAdmin && !isCoordinator) {
        return <Navigate to="/home" replace />;
    }

    // --- Compute Statistics ---
    const totalEvents = events.length;
    
    let totalRegistrants = 0;
    const statusCounts = {};
    const coordinatorCounts = {};

    events.forEach(event => {
        // Registrants
        totalRegistrants += parseInt(event.registeredCount, 10) || 0;

        // Status
        const status = event.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        // Coordinator/Creator
        const organizer = event.coordinatorName || event.creatorName || event.creatorEmail || 'Unknown';
        coordinatorCounts[organizer] = (coordinatorCounts[organizer] || 0) + 1;
    });

    // Format data for Recharts
    const statusData = Object.keys(statusCounts).map(key => ({
        name: key === 'published' ? 'פעיל' : key === 'pending_approval' ? 'ממתין' : key === 'pending' ? 'ממתין' : key === 'deleted' ? 'נמחק' : key,
        value: statusCounts[key]
    }));

    const coordinatorData = Object.keys(coordinatorCounts).map(key => ({
        name: key,
        Events: coordinatorCounts[key]
    }));

    // Employer Fields
    const employerFieldCounts = {};
    employers.forEach(emp => {
        const field = emp.profile?.field || emp.field || 'לא צוין';
        employerFieldCounts[field] = (employerFieldCounts[field] || 0) + 1;
    });

    const rawEmployerFieldData = Object.keys(employerFieldCounts)
        .map(key => ({ name: key, value: employerFieldCounts[key] }))
        .sort((a, b) => b.value - a.value);

    let employerFieldData = [];
    if (rawEmployerFieldData.length > 6) {
        const top5 = rawEmployerFieldData.slice(0, 5);
        const othersCount = rawEmployerFieldData.slice(5).reduce((sum, item) => sum + item.value, 0);
        employerFieldData = [...top5, { name: 'אחרים', value: othersCount }];
    } else {
        employerFieldData = rawEmployerFieldData;
    }

    return (
        <Container maxWidth="xl" sx={{ pt: 4, pb: 8, direction: 'rtl' }}>
            <Typography variant="h4" fontWeight="800" sx={{ color: 'var(--color-primary-dark)', mb: 4 }}>
                דשבורד מנהלים
            </Typography>

            {/* Summary Cards */}
            <Grid container spacing={4} sx={{ mb: 6 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>סה"כ אירועים</Typography>
                            <Typography variant="h3" component="div">{totalEvents}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#e8f5e9', height: '100%' }}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>סה"כ נרשמים</Typography>
                            <Typography variant="h3" component="div">{totalRegistrants}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#fff3e0', height: '100%' }}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>אירועים ממתינים</Typography>
                            <Typography variant="h3" component="div">{statusCounts['pending_approval'] || statusCounts['pending'] || 0}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#ffebee', height: '100%' }}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>אירועים שנמחקו</Typography>
                            <Typography variant="h3" component="div">{statusCounts['deleted'] || 0}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts Area */}
            <Grid container spacing={4} sx={{ mb: 6 }}>
                {/* Event Status Pie Chart */}
                <Grid item xs={12} md={8} sx={{ minWidth: 0 }}>
                    <Card sx={{ height: 480, p: 3, display: 'flex', flexDirection: 'column', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <Typography variant="h6" fontWeight="700" color="text.secondary" gutterBottom>התפלגות סטטוס אירועים</Typography>
                        <Box sx={{ flexGrow: 1, width: '100%', mt: 2, direction: 'ltr' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip wrapperStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', direction: 'rtl' }} />
                                    <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', direction: 'rtl' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                </Grid>

                {/* Employer Field Pie Chart */}
                <Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
                    <Card sx={{ height: 480, p: 3, display: 'flex', flexDirection: 'column', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <Typography variant="h6" fontWeight="700" color="text.secondary" gutterBottom>מעסיקים לפי תחום (קטגוריה)</Typography>
                        <Box sx={{ flexGrow: 1, width: '100%', mt: 2, direction: 'ltr' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={employerFieldData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {employerFieldData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip wrapperStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', direction: 'rtl' }} />
                                    <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', direction: 'rtl' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                </Grid>

                {/* Coordinator Bar Chart */}
                <Grid item xs={12} md={12} sx={{ minWidth: 0 }}>
                    <Card sx={{ height: 500, p: 3, display: 'flex', flexDirection: 'column', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <Typography variant="h6" fontWeight="700" color="text.secondary" gutterBottom>אירועים לפי מארגן</Typography>
                        <Box sx={{ flexGrow: 1, width: '100%', mt: 2, overflowX: 'auto', overflowY: 'hidden', direction: 'ltr' }}>
                            <Box sx={{ minWidth: 600, width: '100%', height: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={coordinatorData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#0088FE" stopOpacity={0.2} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" tick={{ fontSize: 12, fill: '#666' }} axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666' }} />
                                        <Tooltip cursor={{ fill: '#f5f5f5' }} wrapperStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', direction: 'rtl' }} />
                                        <Bar dataKey="Events" fill="url(#colorEvents)" radius={[6, 6, 0, 0]} name="מספר אירועים" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </Box>
                    </Card>
                </Grid>
            </Grid>

            {/* Raw Data Table */}
            <Typography variant="h5" fontWeight="700" sx={{ mb: 3 }}>
                נתוני אירועים (תצוגת מנהל בלבד)
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table stickyHeader aria-label="events table">
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>כותרת</strong></TableCell>
                            <TableCell><strong>סוג אירוע</strong></TableCell>
                            <TableCell><strong>מארגן</strong></TableCell>
                            <TableCell><strong>אימייל מארגן</strong></TableCell>
                            <TableCell><strong>סטטוס</strong></TableCell>
                            <TableCell><strong>נרשמים / קיבולת</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {events.map((event) => (
                            <TableRow key={event.id} hover>
                                <TableCell>{event.title || 'ללא כותרת'}</TableCell>
                                <TableCell>{event.type || 'לא מוגדר'}</TableCell>
                                <TableCell>{event.coordinatorName || event.creatorName || 'לא ידוע'}</TableCell>
                                <TableCell>{event.creatorEmail || event.coordinatorEmail || 'לא מוגדר'}</TableCell>
                                <TableCell>{event.status || 'לא ידוע'}</TableCell>
                                <TableCell>
                                    {event.registeredCount || 0} / {event.capacity || 'ללא הגבלה'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
};

export default AdminDashboardPage;
