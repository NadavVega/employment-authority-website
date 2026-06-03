import React, { useState } from 'react';
import { 
    Box, Drawer, List, ListItem, ListItemButton, 
    ListItemText, Collapse, IconButton, Typography 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useNavigate, useLocation } from 'react-router-dom';

const SideNavigation = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Local state for the dropdown menus
    const [openMenus, setOpenMenus] = useState({ home: false, events: false, directory: false });

    const handleMenuToggle = (menu) => {
        setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
    };

    const handleNavigation = (path) => {
        navigate(path);
        onClose(); // Close drawer after navigating
    };

    // Dynamic Styling based on Active Route
    const getDrawerItemStyle = (path, isSubItem = false) => {
        const isActive = location.pathname === path;

        return {
            borderRadius: '8px', 
            mb: 0.5,
            py: 1.2,
            pl: isSubItem ? 4 : 2,
            pr: 2,
            color: isActive ? '#003b8b' : '#ffffff',
            bgcolor: isActive ? '#ffffff' : 'transparent',
            boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s ease',
            '&:hover': { 
                bgcolor: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                color: isActive ? '#003b8b' : '#ffffff'
            },
            '& .MuiTypography-root': {
                fontWeight: isActive ? 700 : 500,
                fontSize: isSubItem ? '15px' : '16px'
            }
        };
    };

    return (
        <Drawer
            anchor="right" 
            open={isOpen}
            onClose={onClose}
            sx={{
                zIndex: 1200,
                '& .MuiDrawer-paper': {
                    width: { xs: '85vw', sm: 320 },
                    maxWidth: 320,
                    boxSizing: 'border-box',
                    bgcolor: 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    direction: 'rtl',
                    right: 0,
                    left: 'auto'
                }
            }}
        >
            <Box sx={{ 
                width: '100%', 
                height: '100%', 
                bgcolor: '#003b8b', 
                color: 'white',
                borderTopLeftRadius: '24px', 
                borderBottomLeftRadius: '24px',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                p: 2
            }}>
                
                {/* Close Button Header */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                    <IconButton onClick={onClose} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                <List sx={{ pt: 0, flexGrow: 1 }}>
                    
                    {/* Home Group */}
                    <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
                        <ListItemButton onClick={() => handleMenuToggle('home')} sx={getDrawerItemStyle('/home-group')}>
                            <ListItemText disableTypography primary={<Typography>דף הבית</Typography>} />
                            {openMenus.home ? <ExpandLess /> : <ExpandMore />}
                        </ListItemButton>
                        <Collapse in={openMenus.home} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding sx={{ mt: 1 }}>
                                <ListItemButton onClick={() => handleNavigation('/home')} sx={getDrawerItemStyle('/home', true)}>
                                    <ListItemText disableTypography primary={<Typography>יומן</Typography>} />
                                </ListItemButton>
                                <ListItemButton onClick={() => handleNavigation('/home/this-week')} sx={getDrawerItemStyle('/home/this-week', true)}>
                                    <ListItemText disableTypography primary={<Typography>אירועי השבוע</Typography>} />
                                </ListItemButton>
                                <ListItemButton onClick={() => handleNavigation('/home/articles')} sx={getDrawerItemStyle('/home/articles', true)}>
                                    <ListItemText disableTypography primary={<Typography>כתבות</Typography>} />
                                </ListItemButton>
                                <ListItemButton onClick={() => handleNavigation('/home/about')} sx={getDrawerItemStyle('/home/about', true)}>
                                    <ListItemText disableTypography primary={<Typography>קצת עלינו</Typography>} />
                                </ListItemButton>
                            </List>
                        </Collapse>
                    </ListItem>

                    {/* Events Group */}
                    <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
                        <ListItemButton onClick={() => handleMenuToggle('events')} sx={getDrawerItemStyle('/events-group')}>
                            <ListItemText disableTypography primary={<Typography>אירועים</Typography>} />
                            {openMenus.events ? <ExpandLess /> : <ExpandMore />}
                        </ListItemButton>
                        <Collapse in={openMenus.events} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding sx={{ mt: 1 }}>
                                <ListItemButton onClick={() => handleNavigation('/events')} sx={getDrawerItemStyle('/events', true)}>
                                    <ListItemText disableTypography primary={<Typography>הרשמה לאירוע</Typography>} />
                                </ListItemButton>
                                <ListItemButton onClick={() => handleNavigation('/add-event')} sx={getDrawerItemStyle('/add-event', true)}>
                                    <ListItemText disableTypography primary={<Typography>הוספת אירוע</Typography>} />
                                </ListItemButton>
                                <ListItemButton onClick={() => handleNavigation('/edit-event')} sx={getDrawerItemStyle('/edit-event', true)}>
                                    <ListItemText disableTypography primary={<Typography>עריכת אירוע</Typography>} />
                                </ListItemButton>
                            </List>
                        </Collapse>
                    </ListItem>

                    {/* Directory Group */}
                    <ListItem disablePadding sx={{ display: 'block', mb: 2 }}>
                        <ListItemButton onClick={() => handleMenuToggle('directory')} sx={getDrawerItemStyle('/directory-group')}>
                            <ListItemText disableTypography primary={<Typography>אלפון מעסיקים</Typography>} />
                            {openMenus.directory ? <ExpandLess /> : <ExpandMore />}
                        </ListItemButton>
                        <Collapse in={openMenus.directory} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding sx={{ mt: 1 }}>
                                <ListItemButton onClick={() => handleNavigation('/directory/coordinators')} sx={getDrawerItemStyle('/directory/coordinators', true)}>
                                    <ListItemText disableTypography primary={<Typography>רכזים</Typography>} />
                                </ListItemButton>
                                <ListItemButton onClick={() => handleNavigation('/directory/employers')} sx={getDrawerItemStyle('/directory/employers', true)}>
                                    <ListItemText disableTypography primary={<Typography>מעסיקים</Typography>} />
                                </ListItemButton>
                            </List>
                        </Collapse>
                    </ListItem>

                    {/* Static Links */}
                    <ListItem disablePadding sx={{ mb: 1 }}>
                        <ListItemButton onClick={() => handleNavigation('/accessibility')} sx={getDrawerItemStyle('/accessibility')}>
                            <ListItemText disableTypography primary={<Typography>נגישות האתר</Typography>} />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton onClick={() => window.open('https://www.jerusalem.muni.il/', '_blank')} sx={getDrawerItemStyle('/municipality')}>
                            <ListItemText disableTypography primary={<Typography>לאתר העירייה</Typography>} />
                        </ListItemButton>
                    </ListItem>

                </List>

                {/* Disconnect Button stuck to bottom */}
                <Box sx={{ mt: 'auto', pt: 2 }}>
                    <ListItemButton 
                        onClick={() => { console.log('disconnect'); onClose(); }} 
                        sx={{ ...getDrawerItemStyle('/disconnect'), color: '#fca5a5', '&:hover': { bgcolor: 'rgba(252, 165, 165, 0.1)' } }}
                    >
                        <ListItemText disableTypography primary={<Typography>התנתקות</Typography>} />
                    </ListItemButton>
                </Box>

            </Box>
        </Drawer>
    );
};

export default SideNavigation;
