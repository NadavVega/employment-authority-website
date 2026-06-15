import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    Button,
    CssBaseline,
    Slide,
    useScrollTrigger
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { logoutUser } from '../../services/firebase/auth-service';

// Logos
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
        borderRadius: 'var(--radius-sm)',
        px: 2.5,
        py: 0.8,
        transition: 'all 0.2s ease',
        '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.15)'
        }
    };

    const handleLogout = async () => {
        try {
            localStorage.removeItem('DEV_BYPASS');
            await logoutUser();
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                direction: 'rtl'
            }}
        >
            <CssBaseline />

            {/* ================= HEADER ================= */}
            <HideOnScroll>
                <AppBar position="sticky" elevation={3} sx={{ top: 0, zIndex: 1100 }}>
                    <Toolbar
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            px: { xs: 2, md: 5 },
                            py: 1,
                            background: 'linear-gradient(90deg, #001a40 0%, #003b8b 100%)',
                            borderBottom: '4px solid var(--color-brand)'
                        }}
                    >
                        {/* Navigation buttons */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button sx={navBtnStyle} onClick={() => navigate('/home')}>
                                דף הבית
                            </Button>

                            <Button sx={navBtnStyle} onClick={() => navigate('/events')}>
                                אירועים
                            </Button>

                            {isAuthenticated && (
                                <Button sx={navBtnStyle} onClick={() => navigate('/directory')}>
                                    אלפון מעסיקים
                                </Button>
                            )}

                            {isAdmin && (
                                <Button sx={navBtnStyle} onClick={() => navigate('/content-management')}>
                                    ניהול תוכן
                                </Button>
                            )}
                        </Box>

                        {/* === LOGOS BOX === */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, height: '60px' }}>
                            {isAuthenticated && (
                                <Button
                                    onClick={handleLogout}
                                    sx={{
                                        order: 1,
                                        color: '#ffffff',
                                        border: '1px solid rgba(255, 255, 255, 0.7)',
                                        borderRadius: 'var(--radius-sm)',
                                        px: 2,
                                        '&:hover': {
                                            bgcolor: 'rgba(255, 255, 255, 0.12)',
                                            borderColor: '#ffffff'
                                        },
                                        '&:focus-visible': {
                                            outline: '2px solid #ffffff',
                                            outlineOffset: '2px'
                                        }
                                    }}
                                >
                                    התנתקות
                                </Button>
                            )}

                            <Box
                                sx={{
                                    bgcolor: '#ffffff',
                                    p: 0.5,
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    height: '50px'
                                }}
                            >
                                <img
                                    src={jerusalemColorLogo}
                                    alt="Jerusalem Color Logo"
                                    style={{
                                        height: '100%',
                                        objectFit: 'contain'
                                    }}
                                />
                            </Box>

                            <Box
                                sx={{
                                    width: '2px',
                                    height: '40px',
                                    bgcolor: 'rgba(255,255,255,0.3)'
                                }}
                            />

                            <img
                                src={jerusalemLionLogo}
                                alt="Jerusalem Lion Logo"
                                style={{
                                    height: '65px',
                                    cursor: 'pointer',
                                    filter: 'brightness(0) invert(1)'
                                }}
                                onClick={() => navigate('/home')}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </Box>
                    </Toolbar>
                </AppBar>
            </HideOnScroll>

            {/* ================= MAIN CONTENT ================= */}
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

            <Box
                component="footer"
                sx={{
                    py: 3,
                    textAlign: 'center',
                    bgcolor: 'primary.dark',
                    color: 'white',
                    borderTop: '4px solid',
                    borderColor: 'primary.main'
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
