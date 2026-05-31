import React from 'react';
import { 
    AppBar, Toolbar, Typography, Box, Button, CssBaseline, 
    InputBase, Slide, useScrollTrigger, IconButton
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import DemoRoleSwitcher from '../ui/demo-role-switcher';
import jerusalemLionLogo from '../../assets/images/logo-new2.svg'; 
import jerusalemColorLogo from '../../assets/images/Jerusalem-color-logo.jpeg'; 

function HideOnScroll({ children }) {
    const trigger = useScrollTrigger();
    return (
        <Slide appear={false} direction="down" in={!trigger}>
            {children}
        </Slide>
    );
}

const MainLayout = ({ children }) => {
    const { isAuthenticated, isAdmin } = useAuth();
    const navigate = useNavigate();

    const navBtnStyle = {
        fontWeight: 700,
        fontSize: '16px',
        color: '#ffffff',
        borderRadius: '99px',
        px: 2.5,
        py: 0.8,
        transition: 'all 0.2s ease',
        '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.15)',
            transform: 'translateY(-2px)'
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', direction: 'rtl' }}>
            <CssBaseline />
            
            <HideOnScroll>
                <AppBar position="sticky" elevation={3} sx={{ top: 0, zIndex: 1100 }}>
                    
                    <Box sx={{ 
                        bgcolor: '#1a1a1a', color: 'white', px: { xs: 2, md: 5 }, py: 0.5,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="caption">עיריית ירושלים</Typography>
                            <Typography variant="caption">|</Typography>
                            <Typography variant="caption">רשות התעסוקה</Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, direction: 'ltr' }}>
                            <Box sx={{ bgcolor: 'white', borderRadius: 1, px: 1, display: 'flex', alignItems: 'center', height: '28px', direction: 'rtl' }}>
                                <InputBase placeholder="חיפוש..." sx={{ fontSize: '0.8rem', color: 'black' }} />
                            </Box>
                             
                            {!isAuthenticated ? (
                                <Button variant="contained" color="secondary" size="small" sx={{ fontWeight: 'bold', color: 'black' }} onClick={() => navigate('/')}>
                                    אזור אישי / כניסה
                                </Button>
                            ) : (
                                <Button variant="outlined" color="inherit" size="small">
                                    התנתק
                                </Button>
                            )}
                        </Box>
                    </Box>

                    <Toolbar sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        px: { xs: 2, md: 5 }, bgcolor: 'primary.main', py: 1
                    }}>
                        
                        {/* Links Section & Hamburger Menu (Right Side) */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            
                            <IconButton color="inherit" aria-label="menu" sx={{ ml: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                                <MenuIcon sx={{ fontSize: 28 }} />
                            </IconButton>

                            <Button sx={navBtnStyle} onClick={() => navigate('/home')}>דף הבית</Button>
                            <Button sx={navBtnStyle} onClick={() => navigate('/events')}>אירועים</Button>

                            {isAuthenticated && (
                                <Button sx={navBtnStyle} onClick={() => navigate('/directory')}>אלפון מעסיקים</Button>
                            )}

                            {isAdmin && (
                                <Button sx={{ ...navBtnStyle, bgcolor: 'secondary.main', color: '#000000', '&:hover': { bgcolor: 'secondary.light', transform: 'translateY(-2px)' } }}>
                                    ניהול בוט
                                </Button>
                            )}
                        </Box>

                        {/* Logos Section (Left Side) - Heights adjusted for better visibility */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#ffffff', p: 0.5, px: 1.5, borderRadius: 2 }}>
                            <img 
                                src={jerusalemColorLogo} 
                                alt="Jerusalem Color Logo" 
                                style={{ height: '55px', objectFit: 'contain' }}
                            />
                            <Box sx={{ width: '1px', height: '40px', bgcolor: '#cbd5e1' }} />
                            <img 
                                src={jerusalemLionLogo} 
                                alt="Jerusalem Lion Logo" 
                                style={{ height: '65px', cursor: 'pointer', filter: 'brightness(0)' }} 
                                onClick={() => navigate('/home')}
                                onError={(e) => { e.target.style.display = 'none'; }} 
                            />
                        </Box>

                    </Toolbar>
                </AppBar>
            </HideOnScroll>

            <Box component="main" sx={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
                {children}
            </Box>

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