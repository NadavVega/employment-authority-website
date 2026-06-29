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
import { privacyService } from '../../services/interfaces/privacy-service';

const DERIVED_PENDING_APPROVAL_TYPE = 'private_details_coordinator_approval_pending';
const MAX_VISIBLE_NOTIFICATIONS = 8;

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

const getCreatedAtMillis = (createdAt) => {
    const date = createdAt?.toDate?.() || null;

    return date ? date.getTime() : 0;
};

const isDerivedPendingApproval = (notification) => (
    notification?.type === DERIVED_PENDING_APPROVAL_TYPE
);

const getAcknowledgedStorageKey = (email) => (
    `acknowledgedPrivacyNotifications:${String(email || '').trim().toLowerCase()}`
);

const getAcknowledgedNotificationIds = (email) => {
    if (typeof window === 'undefined' || !email) {
        return [];
    }

    try {
        const storedValue = window.localStorage.getItem(getAcknowledgedStorageKey(email));

        return storedValue ? JSON.parse(storedValue) : [];
    } catch (error) {
        console.error('Failed to load acknowledged notifications:', error);
        return [];
    }
};

const saveAcknowledgedNotificationIds = (email, ids) => {
    if (typeof window === 'undefined' || !email) {
        return;
    }

    try {
        window.localStorage.setItem(
            getAcknowledgedStorageKey(email),
            JSON.stringify(Array.from(ids))
        );
    } catch (error) {
        console.error('Failed to save acknowledged notifications:', error);
    }
};

const getDerivedPendingApprovalId = (requestId) => `privacy-request-${requestId}`;

const mapPendingApprovalToNotification = (request, acknowledgedIds) => {
    const requesterNameOrEmail = request.requesterName || request.requesterEmail || '';
    const id = getDerivedPendingApprovalId(request.id);

    return {
        id,
        type: DERIVED_PENDING_APPROVAL_TYPE,
        title: 'בקשת גישה ממתינה לאישור שלך',
        body: `${requesterNameOrEmail} ביקש גישה לפרטי מעסיק המשויך אליך`,
        link: '/privacy-requests',
        isRead: acknowledgedIds.has(id),
        createdAt: request.createdAt,
        requestId: request.id,
    };
};

const NotificationsBell = () => {
    const { currentUser, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [acknowledgedNotificationState, setAcknowledgedNotificationState] = useState(
        () => {
            const initialEmail = currentUser?.email || '';

            return {
                email: initialEmail,
                ids: new Set(getAcknowledgedNotificationIds(initialEmail)),
            };
        }
    );
    const [isUpdating, setIsUpdating] = useState(false);
    const userEmail = currentUser?.email || '';

    useEffect(() => {
        if (!isAuthenticated || !userEmail) {
            return undefined;
        }

        return subscribeToMyNotifications({ email: userEmail }, setNotifications);
    }, [isAuthenticated, userEmail]);

    useEffect(() => {
        if (!isAuthenticated || !userEmail) {
            return undefined;
        }

        return privacyService.subscribeToPendingCoordinatorApprovals(
            { email: userEmail },
            setPendingApprovals
        );
    }, [isAuthenticated, userEmail]);

    const storedAcknowledgedNotificationIds = useMemo(
        () => new Set(getAcknowledgedNotificationIds(userEmail)),
        [userEmail]
    );
    const acknowledgedNotificationIds =
        acknowledgedNotificationState.email === userEmail
            ? acknowledgedNotificationState.ids
            : storedAcknowledgedNotificationIds;

    const visibleNotifications = useMemo(
        () => {
            if (!userEmail) {
                return [];
            }

            const pendingApprovalItems = pendingApprovals.map((request) => (
                mapPendingApprovalToNotification(request, acknowledgedNotificationIds)
            ));

            return [...notifications, ...pendingApprovalItems].sort(
                (first, second) => (
                    getCreatedAtMillis(second.createdAt) - getCreatedAtMillis(first.createdAt)
                )
            );
        },
        [acknowledgedNotificationIds, notifications, pendingApprovals, userEmail]
    );

    const displayedNotifications = useMemo(
        () => visibleNotifications.slice(0, MAX_VISIBLE_NOTIFICATIONS),
        [visibleNotifications]
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

    const acknowledgeDerivedNotification = (notification) => {
        const idsToAcknowledge = [];

        if (isDerivedPendingApproval(notification)) {
            idsToAcknowledge.push(notification.id);
        }

        if (notification?.requestId) {
            idsToAcknowledge.push(getDerivedPendingApprovalId(notification.requestId));
        }

        if (idsToAcknowledge.length === 0) {
            return;
        }

        setAcknowledgedNotificationState((currentState) => {
            const currentIds =
                currentState.email === userEmail
                    ? currentState.ids
                    : new Set(getAcknowledgedNotificationIds(userEmail));
            const nextIds = new Set(currentIds);

            idsToAcknowledge.forEach((id) => nextIds.add(id));
            saveAcknowledgedNotificationIds(userEmail, nextIds);

            return {
                email: userEmail,
                ids: nextIds,
            };
        });
    };

    const handleNotificationClick = async (notification) => {
        if (!notification) {
            return;
        }

        acknowledgeDerivedNotification(notification);

        try {
            if (!notification.isRead && !isDerivedPendingApproval(notification)) {
                setNotifications((currentNotifications) => (
                    currentNotifications.map((currentNotification) => (
                        currentNotification.id === notification.id
                            ? { ...currentNotification, isRead: true }
                            : currentNotification
                    ))
                ));
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
            const derivedNotificationIds = visibleNotifications
                .filter(isDerivedPendingApproval)
                .map((notification) => notification.id);

            if (derivedNotificationIds.length > 0) {
                setAcknowledgedNotificationState((currentState) => {
                    const currentIds =
                        currentState.email === userEmail
                            ? currentState.ids
                            : new Set(getAcknowledgedNotificationIds(userEmail));
                    const nextIds = new Set(currentIds);

                    derivedNotificationIds.forEach((id) => nextIds.add(id));
                    saveAcknowledgedNotificationIds(userEmail, nextIds);

                    return {
                        email: userEmail,
                        ids: nextIds,
                    };
                });
            }

            setNotifications((currentNotifications) => (
                currentNotifications.map((notification) => (
                    notification.isRead
                        ? notification
                        : { ...notification, isRead: true }
                ))
            ));

            await markAllNotificationsRead(
                visibleNotifications.filter(
                    (notification) => !isDerivedPendingApproval(notification)
                )
            );
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
                    <Stack
                        direction="row"
                        gap={2}
                        sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
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
                        {displayedNotifications.map((notification) => {
                            const createdDate = formatNotificationDate(notification.createdAt);

                            return (
                                <ListItemButton
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    sx={{
                                        alignItems: 'flex-start',
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
                                            sx={{ mt: 0.75, flexWrap: 'wrap' }}
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
