import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Container, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/firebase/auth-service';
import { useAuth } from '../context/auth-context';

/**
 * LoginPage Component
 * Serves as the gated entry portal for the application.
 */
const LoginPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated, loading } = useAuth();

    const [loginError, setLoginError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!loading && isAuthenticated) {
            navigate('/home', { replace: true });
        }
    }, [isAuthenticated, loading, navigate]);

    /**
     * Real Firebase demo login.
     */
    const handleDemoLogin = async (role) => {
        setLoginError('');
        setIsLoading(true);

        localStorage.removeItem('DEV_BYPASS');

        const demoUsers = {
            employer: {
                email: 'employer@jerusalem.demo',
                password: 'Demo123!'
            },
            coordinator: {
                email: 'coordinator@jerusalem.demo',
                password: 'Demo123!'
            },
            admin: {
                email: 'admin@jerusalem.demo',
                password: 'Demo123!'
            },
            guest: {
                email: 'guest@jerusalem.demo',
                password: 'Demo123!'
            }
        };

        try {
            const selectedUser = demoUsers[role];

            if (!selectedUser) {
                throw new Error('Unknown demo role');
            }

            await loginUser(selectedUser.email, selectedUser.password);
        } catch (error) {
            console.error('Demo login failed:', error);

            setIsLoading(false);
            setLoginError(
                `ההתחברות נכשלה. קוד שגיאה: ${error.code || error.message}`
            );
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f0f4f8'
            }}
        >
            <Container maxWidth="sm">
                <Paper elevation={6} sx={{ p: 6, borderRadius: 4, textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="700" color="primary" gutterBottom>
                        ברוכים הבאים
                    </Typography>

                    <Typography variant="body1" fontWeight="300" color="textSecondary" sx={{ mb: 4 }}>
                        פורטל רשות התעסוקה ירושלים. אנא התחברו למערכת.
                    </Typography>

                    {loginError && (
                        <Alert severity="error" sx={{ mb: 3, textAlign: 'right' }}>
                            {loginError}
                        </Alert>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button
                            variant="contained"
                            size="large"
                            disabled={isLoading}
                            onClick={() => handleDemoLogin('employer')}
                        >
                            התחבר כמעסיק
                        </Button>

                        <Button
                            variant="outlined"
                            size="large"
                            disabled={isLoading}
                            onClick={() => handleDemoLogin('coordinator')}
                        >
                            התחבר כרכז
                        </Button>

                        <Button
                            variant="contained"
                            color="secondary"
                            size="large"
                            disabled={isLoading}
                            onClick={() => handleDemoLogin('admin')}
                        >
                            התחבר כמנהלת
                        </Button>
                    </Box>

                    <Typography
                        variant="caption"
                        color="textSecondary"
                        display="block"
                        sx={{ mt: 4 }}
                    >
                        Demo login uses real Firebase Authentication users.
                    </Typography>
                </Paper>
            </Container>
        </Box>
    );
};

export default LoginPage;