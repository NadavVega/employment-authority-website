import { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Container, Alert, TextField } from '@mui/material';
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

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!loading && isAuthenticated) {
            navigate('/home', { replace: true });
        }
    }, [isAuthenticated, loading, navigate]);

    const handleLogin = async (event) => {
        event.preventDefault();
        setLoginError('');
        setIsLoading(true);

        localStorage.removeItem('DEV_BYPASS');

        try {
            await loginUser(email.trim(), password);
        } catch (error) {
            console.error('Login failed:', error);
            setLoginError('ההתחברות נכשלה. בדקו שכתובת האימייל והסיסמה נכונות.');
        } finally {
            setIsLoading(false);
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

                    <Box
                        component="form"
                        onSubmit={handleLogin}
                        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                    >
                        <TextField
                            label="אימייל"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            required
                            disabled={isLoading}
                            fullWidth
                        />

                        <TextField
                            label="סיסמה"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            required
                            disabled={isLoading}
                            fullWidth
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={isLoading}
                        >
                            {isLoading ? 'מתחברים...' : 'התחברות'}
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default LoginPage;
