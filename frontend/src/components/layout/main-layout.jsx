import React, { useState } from 'react';
import { 
    AppBar, Toolbar, Typography, Box, Button, CssBaseline, 
    InputBase, Slide, useScrollTrigger, IconButton 
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import DemoRoleSwitcher from '../ui/demo-role-switcher';
import SideNavigation from '../../features/slide-bar/slide-bar-menu'; // Adjust the import path as needed

// Logos
import jerusalemLionLogo from '../../assets/images/logo-new2.svg'; 
import jerusalemColorLogo from '../../assets/images/Jerusalem-color-logo.jpeg'; 

function HideOnScroll({ children }) {
    const trigger = useScrollTrigger();
    return <Slide appear={false} direction="down" in={!trigger}>{children}</Slide>;
}

const MainLayout = ({ children }) => {
    const { isAuthenticated, isAdmin } = useAuth();
    const navigate = useNavigate();

    // State lifted to control the external navigation component
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const navBtnStyle = {
        fontWeight: 700, fontSize: '16px', color: '#ffffff', borderRadius: '99px',
        px: 2.5, py: 0.8, transition: 'all 0.2s ease',
        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)', transform: 'translateY(-2px)' }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', direction: 'rtl' }}>
            <CssBaseline />
            
            {/* ================= HEADER ================= */}
            <HideOnScroll>
                <AppBar position="sticky" elevation={3} sx={{ top: 0, zIndex: 1100 }}>
                    <Toolbar sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        px: { xs: 2, md: 5 }, py: 1,
                        background: 'linear-gradient(90deg, #001a40 0%, #003b8b 100%)',
                        borderBottom: '4px solid #ffbc04' 
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton color="inherit" onClick={() => setIsDrawerOpen(true)} sx={{ ml: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                                <MenuIcon sx={{ fontSize: 28 }} />
                            </IconButton>
                            <Button sx={navBtnStyle} onClick={() => navigate('/home')}>דף הבית</Button>
                            <Button sx={navBtnStyle} onClick={() => navigate('/events')}>אירועים</Button>
                            {isAuthenticated && <Button sx={navBtnStyle} onClick={() => navigate('/directory')}>אלפון מעסיקים</Button>}
                            {/* Admin Only Buttons */}
                            {isAdmin && (
                                <>
                                    <Button sx={navBtnStyle} onClick={() => navigate('/content-management')}>
                                        ניהול תוכן
                                    </Button>
                                </>
                            )}
                        </Box>
              
                        {/* === LOGOS BOX === */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, height: '60px' }}>
                            <Box sx={{ bgcolor: '#ffffff', p: 0.5, borderRadius: 1, display: 'flex', alignItems: 'center', height: '50px' }}>
                                <img src={jerusalemColorLogo} alt="Jerusalem Color Logo" style={{ height: '100%', objectFit: 'contain' }} />
                            </Box>
                            <Box sx={{ width: '2px', height: '40px', bgcolor: 'rgba(255,255,255,0.3)' }} />
                            <img src={jerusalemLionLogo} alt="Jerusalem Lion Logo" style={{ height: '65px', cursor: 'pointer', filter: 'brightness(0) invert(1)' }} onClick={() => navigate('/home')} onError={(e) => { e.target.style.display = 'none'; }} />
                        </Box>
                    </Toolbar>
                </AppBar>
            </HideOnScroll>

            {/* ================= SIDE NAVIGATION COMPONENT ================= */}
            <SideNavigation 
                isOpen={isDrawerOpen} 
                onClose={() => setIsDrawerOpen(false)} 
            />

            {/* ================= MAIN CONTENT ================= */}
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