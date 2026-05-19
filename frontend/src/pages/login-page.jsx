import React, { useEffect } from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

/**
 * LoginPage Component
 * Serves as the gated entry portal for the application.
 */
const LoginPage = () => {
    const navigate = useNavigate();
    
    // FETCHING 'switchDemoRole' INSTEAD OF 'login' (based on your auth-context.jsx)
    const { switchDemoRole, isAuthenticated } = useAuth();

    /**
     * SOLID Principle: Separation of Concerns
     * Handles navigation safely only when the global state updates.
     */
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/home');
        }
    }, [isAuthenticated, navigate]);

    // Standard simulation login
    const handleMockLogin = (role) => {
        switchDemoRole(role); 
    };

    /* ======================================================================
      CRITICAL SECURITY NOTICE (DEVELOPMENT BYPASS)
      ----------------------------------------------------------------------
      TODO: REMOVE THIS ENTIRE FUNCTION BLOCK BEFORE PRODUCTION DEPLOYMENT.
      ======================================================================
    */
    const handleDevBypass = () => {
        // Development flag: Storing bypass state in local storage to prevent 
        // the global auth listener from kicking the user out.
        localStorage.setItem('DEV_BYPASS', 'true');
        
        // Use your existing demo function to inject the admin state
        switchDemoRole('admin'); 
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f4f8' }}>
            <Container maxWidth="sm">
                <Paper elevation={6} sx={{ p: 6, borderRadius: 4, textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="700" color="primary" gutterBottom>
                        ברוכים הבאים
                    </Typography>
                    <Typography variant="body1" fontWeight="300" color="textSecondary" sx={{ mb: 6 }}>
                        פורטל רשות התעסוקה ירושלים. אנא התחברו למערכת.
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button variant="contained" size="large" onClick={() => handleMockLogin('employer')}>
                            התחבר כמעסיק
                        </Button>
                        <Button variant="outlined" size="large" onClick={() => handleMockLogin('coordinator')}>
                            התחבר כרכז
                        </Button>
                    </Box>

                    {/* DEV BYPASS UI BLOCK */}
                    <Box sx={{ mt: 6, pt: 4, borderTop: '2px dashed #ef4444', bgcolor: '#fef2f2', p: 3, borderRadius: 2 }}>
                        <Typography variant="caption" color="error" display="block" gutterBottom sx={{ fontWeight: 'bold', letterSpacing: '0.05em' }}>
                            [SECURITY WARNING] DEV HARDCODED BYPASS ENVIRONMENT AVAILABLE
                        </Typography>
                        <Button 
                            variant="contained" 
                            color="error" 
                            size="small" 
                            onClick={handleDevBypass}
                            sx={{ fontWeight: 'bold', mt: 1, width: '100%' }}
                        >
                            DANGEROUS BYPASS: ENTER AS ADMIN
                        </Button>
                    </Box>

                </Paper>
            </Container>
        </Box>
    );
};

export default LoginPage;