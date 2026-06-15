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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a28CFE'];

const AdminDashboardPage = () => {
    const { isAdmin } = useAuth();
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const eventsRef = collection(db, 'events');
        const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEvents(fetchedEvents);
        });
        return () => unsubscribe();
    }, []);

    if (!isAdmin) {
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
                <Grid item xs={12} lg={6} sx={{ minWidth: 0 }}>
                    <Card sx={{ height: 500, p: 2, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" gutterBottom>התפלגות סטטוס אירועים</Typography>
                        <Box sx={{ flexGrow: 1, width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                            <Box sx={{ minWidth: 400, height: '100%', minHeight: 400 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={true}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={130}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        </Box>
                    </Card>
                </Grid>
                <Grid item xs={12} lg={6} sx={{ minWidth: 0 }}>
                    <Card sx={{ height: 500, p: 2, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" gutterBottom>אירועים לפי מארגן</Typography>
                        <Box sx={{ flexGrow: 1, width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                            <Box sx={{ minWidth: 600, height: '100%', minHeight: 400 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={coordinatorData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" tick={{ fontSize: 12 }} />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="Events" fill="#003b8b" />
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
