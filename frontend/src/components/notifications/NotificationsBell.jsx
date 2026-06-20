import { useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Box,
    Button,
    Divider,
    IconButton,
    List,
    ListItemButton,
    Popover,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/auth-context';
import {
    markAllNotificationsRead,
    markNotificationRead,
    subscribeToMyNotifications,
} from '../../services/interfaces/notification-service';

const formatNotificationDate = (createdAt) => {
    const date = createdAt?.toDate?.() || null;

    if (!date) {
        return '';
    }

    return new Intl.DateTimeFormat('he-IL', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(date);
};

const NotificationsBell = () => {
    const { currentUser, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const userEmail = currentUser?.email || '';

    useEffect(() => {
        if (!isAuthenticated || !userEmail) {
            return undefined;
        }

        return subscribeToMyNotifications({ email: userEmail }, setNotifications);
    }, [isAuthenticated, userEmail]);

    const visibleNotifications = useMemo(
        () => (userEmail ? notifications : []),
        [notifications, userEmail]
    );

    const unreadCount = useMemo(
        () => visibleNotifications.filter((notification) => !notification.isRead).length,
        [visibleNotifications]
    );

    if (!isAuthenticated) {
        return null;
    }

    const isOpen = Boolean(anchorEl);

    const handleOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = async (notification) => {
        if (!notification) {
            return;
        }

        try {
            if (!notification.isRead) {
                await markNotificationRead(notification.id);
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }

        handleClose();

        if (notification.link) {
            navigate(notification.link);
        }
    };

    const handleMarkAllRead = async () => {
        setIsUpdating(true);

        try {
            await markAllNotificationsRead(visibleNotifications);
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <>
            <Tooltip title="הודעות">
                <IconButton
                    color="inherit"
                    aria-label="הודעות"
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                    onClick={handleOpen}
                    sx={{
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.7)',
                        '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.12)',
                            borderColor: '#ffffff',
                        },
                    }}
                >
                    <Badge
                        badgeContent={unreadCount}
                        color="error"
                        max={99}
                        invisible={unreadCount === 0}
                    >
                        <NotificationsNoneOutlinedIcon />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Popover
                open={isOpen}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: {
                            direction: 'rtl',
                            width: { xs: 320, sm: 380 },
                            maxWidth: 'calc(100vw - 24px)',
                            mt: 1,
                        },
                    },
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                        <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                            הודעות
                        </Typography>
                        <Button
                            size="small"
                            onClick={handleMarkAllRead}
                            disabled={unreadCount === 0 || isUpdating}
                        >
                            סמן הכל כנקרא
                        </Button>
                    </Stack>
                </Box>

                <Divider />

                {visibleNotifications.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">אין הודעות חדשות</Typography>
                    </Box>
                ) : (
                    <List disablePadding sx={{ maxHeight: 420, overflowY: 'auto' }}>
                        {visibleNotifications.map((notification) => {
                            const createdDate = formatNotificationDate(notification.createdAt);

                            return (
                                <ListItemButton
                                    key={notification.id}
                                    alignItems="flex-start"
                                    onClick={() => handleNotificationClick(notification)}
                                    sx={{
                                        gap: 1.5,
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: notification.isRead ? 'transparent' : 'rgba(25, 118, 210, 0.08)',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            mt: 0.7,
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            bgcolor: notification.isRead ? 'transparent' : 'primary.main',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography sx={{ fontWeight: notification.isRead ? 500 : 700 }}>
                                            {notification.title || 'הודעה'}
                                        </Typography>
                                        {notification.body && (
                                            <Typography variant="body2" color="text.secondary">
                                                {notification.body}
                                            </Typography>
                                        )}
                                        {notification.message && (
                                            <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                                                {notification.message}
                                            </Typography>
                                        )}
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            useFlexGap
                                            flexWrap="wrap"
                                            sx={{ mt: 0.75 }}
                                        >
                                            {notification.senderName && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {notification.senderName}
                                                </Typography>
                                            )}
                                            {createdDate && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {createdDate}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Box>
                                </ListItemButton>
                            );
                        })}
                    </List>
                )}
            </Popover>
        </>
    );
};

export default NotificationsBell;
