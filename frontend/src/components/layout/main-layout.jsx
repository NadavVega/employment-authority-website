import React from 'react';
import { 
    AppBar, Toolbar, Typography, Box, Button, CssBaseline, 
    InputBase, Slide, useScrollTrigger 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import DemoRoleSwitcher from '../ui/demo-role-switcher';
import jerusalemLogo from '../../assets/images/logo-new2.svg'; 

/**
 * HideOnScroll Component
 * Listens to window scrolling. Hides the navbar when scrolling down, 
 * and reveals it smoothly when scrolling up.
 */
function HideOnScroll({ children }) {
    const trigger = useScrollTrigger();

    return (
        <Slide appear={false} direction="down" in={!trigger}>
            {children}
        </Slide>
    );
}

/**
 * MainLayout
 * Wraps the entire application. Features a smart sticky navigation bar 
 * and full-bleed layout structure for modern pages.
 */
const MainLayout = ({ children }) => {
    const { isAuthenticated, isAdmin } = useAuth();
    const navigate = useNavigate();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <CssBaseline />
            
            {/* The Smart Header Wrapper */}
            <HideOnScroll>
                <AppBar position="sticky" elevation={3} sx={{ top: 0, zIndex: 1100 }}>
                    
                    {/* Top Utility Bar (Dark Mode) */}
                    <Box sx={{ 
                        bgcolor: '#1a1a1a',
                        color: 'white',
                        px: { xs: 2, md: 5 }, 
                        py: 0.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center' 
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="caption">עיריית ירושלים</Typography>
                            <Typography variant="caption">|</Typography>
                            <Typography variant="caption">רשות התעסוקה</Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {/* Search Bar */}
                            <Box sx={{
                                bgcolor: 'white',
                                borderRadius: 1,
                                px: 1,
                                display: 'flex',
                                alignItems: 'center',
                                height: '28px'
                            }}>
                                <InputBase
                                    placeholder="חיפוש..."
                                    sx={{ fontSize: '0.8rem', color: 'black' }}
                                />
                            </Box>
                             
                            {/* Auth Buttons */}
                            {!isAuthenticated ? (
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    size="small"
                                    sx={{ fontWeight: 'bold', color: 'black' }}
                                    onClick={() => navigate('/')}
                                >
                                    אזור אישי / כניסה
                                </Button>
                            ) : (
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    size="small"
                                >
                                    התנתק
                                </Button>
                            )}
                        </Box>
                    </Box>

                    {/* Main Navigation Bar (Primary Color) */}
                    <Toolbar sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: { xs: 2, md: 5 },
                        bgcolor: 'primary.main'
                    }}>
                        
                        {/* Logo Section */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <img 
                                src={jerusalemLogo} 
                                alt="Jerusalem Municipality Logo" 
                                style={{ height: '75px', cursor: 'pointer' }}
                                onClick={() => navigate('/home')}
                                onError={(e) => { e.target.style.display = 'none'; }} 
                            />
                        </Box>

                        {/* Links Section */}
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {isAdmin && (
                                <Button
                                    color="secondary"
                                    sx={{ fontWeight: 'bold' }}
                                >
                                    ניהול בוט
                                </Button>
                            )}

                            {isAuthenticated && (
                                <Button
                                    color="inherit"
                                    sx={{ fontWeight: 'bold' }}
                                    onClick={() => navigate('/directory')}
                                >
                                    אלפון מעסיקים
                                </Button>
                            )}

                            <Button
                                color="inherit"
                                sx={{ fontWeight: 'bold' }}
                                onClick={() => navigate('/events')}
                            >
                                אירועים
                            </Button>

                            <Button
                                color="inherit"
                                sx={{ fontWeight: 'bold' }}
                                onClick={() => navigate('/home')}
                            >
                                דף הבית
                            </Button>
                        </Box>
                    </Toolbar>
                </AppBar>
            </HideOnScroll>

            <Box
                component="main"
                sx={{
                    flex: 1,
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {children}
            </Box>

            <DemoRoleSwitcher />

            <Box
                component="footer"
                sx={{
                    py: 3,
                    textAlign: 'center',
                    bgcolor: 'primary.dark',
                    color: 'white',
                    borderTop: '4px solid',
                    borderColor: 'secondary.main'
                }}
            >
                <Typography variant="body2">
                    © {new Date().getFullYear()} עיריית ירושלים - רשות התעסוקה
                </Typography>
            </Box>
        </Box>
    );
};

export default MainLayout;