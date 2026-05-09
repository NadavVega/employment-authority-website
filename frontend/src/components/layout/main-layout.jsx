import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, CssBaseline, Container, InputBase, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import DemoRoleSwitcher from '../ui/demo-role-switcher';
import jerusalemLogo from '../../assets/images/logo-new2.svg'; 

/**
 * MainLayout - Re-architected to resemble the official Jerusalem Municipality portal.
 * Features a richer top navigation area with dedicated spaces for search and a prominent "Personal Area".
 */
const MainLayout = ({ children }) => {
    const { isAuthenticated, isCoordinator, isAdmin } = useAuth();
    const navigate = useNavigate();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <CssBaseline />
            
            {/* Top Utility Bar (Black/Darker Blue in the image) */}
            <AppBar position="static" sx={{ bgcolor: '#1a1a1a', color: 'white' }} elevation={0}>
                <Toolbar variant="dense" sx={{ justifyContent: 'space-between', minHeight: '48px', px: { xs: 2, md: 5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                         <Typography variant="caption">עיריית ירושלים</Typography>
                         <Typography variant="caption">|</Typography>
                         <Typography variant="caption">רשות התעסוקה</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                         {/* Search Bar Placeholder */}
                         <Box sx={{ 
                             bgcolor: 'white', 
                             borderRadius: 1, 
                             px: 1, 
                             display: 'flex', 
                             alignItems: 'center',
                             height: '28px'
                         }}>
                             <InputBase placeholder="חיפוש..." sx={{ fontSize: '0.8rem', color: 'black' }} />
                         </Box>
                         {/* Personal Area / Login Action */}
                         {!isAuthenticated ? (
                            <Button variant="contained" color="secondary" size="small" sx={{ fontWeight: 'bold', color: 'black' }}>
                                אזור אישי / כניסה
                            </Button>
                        ) : (
                            <Button variant="outlined" color="inherit" size="small">
                                התנתק
                            </Button>
                        )}
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Main Navigation Bar */}
            <AppBar position="static" color="primary" elevation={2}>
                <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, md: 5 } }}>
                    
                    {/* 
                        Right Side (Visual Right for the user):
                        Navigation Links. In RTL, the first element in the DOM appears on the right.
                    */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <img 
                            src={jerusalemLogo} 
                            alt="Jerusalem Municipality Logo" 
                            style={{ height: '75px', cursor: 'pointer' }} // Add cursor: 'pointer' for UX
                            onClick={() => navigate('/home')}
                            onError={(e) => { e.target.style.display = 'none'; }} 
                        />
                        
                    </Box>

                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {/* Manager & Coordinator specific tools */}
                        {isAdmin && (
                            <Button color="secondary" sx={{ fontWeight: 'bold' }}>
                                ניהול בוט
                            </Button>
                        )}
                        
                        {/* RBAC Logic */}
                        {isAuthenticated && (
                            <Button color="inherit" sx={{ fontWeight: 'bold' }}>אלפון מעסיקים</Button>
                        )}
                         <Button color="inherit" sx={{ fontWeight: 'bold' }} onClick={() => navigate('/events')}>אירועים</Button>
                        <Button color="inherit" sx={{ fontWeight: 'bold' }} onClick={() => navigate('/home')}>דף הבית</Button>
                    </Box>

                </Toolbar>
            </AppBar>
            <Container component="main" maxWidth={false} sx={{ mt: 4, mb: 4, flex: 1, px: { xs: 2, md: 8 } }}>
                {children}
            </Container>

            <DemoRoleSwitcher />

            <Box component="footer" sx={{ py: 3, textAlign: 'center', bgcolor: 'primary.dark', color: 'white', borderTop: '4px solid', borderColor: 'secondary.main' }}>
                <Typography variant="body2">
                    © {new Date().getFullYear()} עיריית ירושלים - רשות התעסוקה
                </Typography>
            </Box>
        </Box>
    );
};

export default MainLayout;