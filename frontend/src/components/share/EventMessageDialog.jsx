import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    ButtonBase,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { directoryService } from '../../services/interfaces/directory-service';
import { createEventMessageNotification } from '../../services/interfaces/notification-service';

const DEFAULT_MESSAGE_PLACEHOLDER = 'חשבתי שזה יכול להתאים לך';

const displayRole = (role) => {
    if (role === 'employer') return 'מעסיק';
    if (role === 'coordinator') return 'רכז';
    if (role === 'admin') return 'מנהלת';
    return role || '';
};

const getRecipientName = (recipient) => {
    if (!recipient) return '';

    return recipient.name && recipient.name !== 'לא צוין'
        ? recipient.name
        : recipient.email;
};

const getRecipientInitial = (recipient) => {
    const label = getRecipientName(recipient) || recipient?.email || '?';
    return label.trim().charAt(0).toUpperCase();
};

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase();

const getEventDate = (event) => {
    if (!event?.date) return '';

    const date = event.date?.toDate ? event.date.toDate() : new Date(event.date);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleDateString('he-IL');
};

const getEventLocation = (event) => (
    event?.location ||
    event?.address ||
    event?.center ||
    event?.centerName ||
    ''
);

export const EventMessageDialog = ({
    open,
    event,
    currentUser,
    userRole,
    onClose,
}) => {
    const [recipients, setRecipients] = useState([]);
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState('');
    const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [sendError, setSendError] = useState('');
    const effectiveUserRole =
        userRole ||
        currentUser?.role ||
        currentUser?.profile?.role ||
        '';

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        let isMounted = true;

        const loadRecipients = async () => {
            setIsLoadingRecipients(true);
            setLoadError('');
            setSendError('');
            setSelectedRecipient(null);

            try {
                const permittedRecipients =
                    await directoryService.getPermittedMessageRecipients(currentUser, effectiveUserRole);

                if (isMounted) {
                    setRecipients(permittedRecipients);
                }
            } catch (error) {
                console.error('Failed to load message recipients:', error);

                if (isMounted) {
                    setRecipients([]);
                    setLoadError('לא ניתן לטעון משתמשים לשליחה.');
                }
            } finally {
                if (isMounted) {
                    setIsLoadingRecipients(false);
                }
            }
        };

        loadRecipients();

        return () => {
            isMounted = false;
        };
    }, [currentUser, effectiveUserRole, open]);

    const filteredRecipients = useMemo(() => {
        const searchValue = normalizeSearchValue(searchTerm);

        if (!searchValue) {
            return recipients;
        }

        return recipients.filter((recipient) => [
            recipient.name,
            recipient.email,
            displayRole(recipient.role),
            recipient.role,
            recipient.companyName,
            recipient.centerName,
        ].some((value) => normalizeSearchValue(value).includes(searchValue)));
    }, [recipients, searchTerm]);

    const eventDate = getEventDate(event);
    const eventLocation = getEventLocation(event);
    const eventMeta = [
        eventDate && `${eventDate}${event?.time ? ` · ${event.time}` : ''}`,
        eventLocation,
    ].filter(Boolean);

    const resetDialogState = () => {
        setSelectedRecipient(null);
        setSearchTerm('');
        setMessage('');
        setLoadError('');
        setSendError('');
        setIsSending(false);
    };

    const handleClose = () => {
        resetDialogState();
        onClose();
    };

    const handleSend = async () => {
        if (!selectedRecipient || !event?.id) {
            setSendError('יש לבחור משתמש לפני השליחה.');
            return;
        }

        setIsSending(true);
        setSendError('');

        try {
            await createEventMessageNotification({
                recipient: selectedRecipient,
                sender: currentUser,
                eventId: event.id,
                message,
            });
            handleClose();
        } catch (error) {
            console.error('Failed to send event message:', error);
            setSendError('לא ניתן לשלוח את האירוע בהודעות.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={isSending ? undefined : handleClose}
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            fullWidth
            maxWidth="md"
            slotProps={{
                paper: {
                    sx: {
                        direction: 'rtl',
                        borderRadius: 3,
                        overflow: 'hidden',
                    },
                },
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    px: { xs: 2.5, sm: 3 },
                    pt: 3,
                    pb: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <IconButton
                    aria-label="סגירה"
                    onClick={handleClose}
                    disabled={isSending}
                    sx={{
                        position: 'absolute',
                        top: 14,
                        left: 14,
                    }}
                >
                    <CloseIcon />
                </IconButton>

                <Typography variant="h5" component="h2" sx={{ fontWeight: 800, pl: 6 }}>
                    שליחת אירוע בהודעות
                </Typography>
                {event?.title && (
                    <Typography color="text.secondary" sx={{ mt: 0.5, pl: 6 }}>
                        {event.title}
                    </Typography>
                )}
            </Box>

            <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, py: 2.5 }}>
                <Stack spacing={2.5}>
                    {(loadError || sendError) && (
                        <Alert severity="error">
                            {sendError || loadError}
                        </Alert>
                    )}

                    <Box
                        sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            bgcolor: 'grey.50',
                        }}
                    >
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            {event?.title || 'אירוע'}
                        </Typography>
                        {eventMeta.length > 0 && (
                            <Stack spacing={0.5} sx={{ mt: 1 }}>
                                {eventMeta.map((detail) => (
                                    <Typography key={detail} variant="body2" color="text.secondary">
                                        {detail}
                                    </Typography>
                                ))}
                            </Stack>
                        )}
                    </Box>

                    <TextField
                        label="חיפוש משתמש"
                        value={searchTerm}
                        onChange={(changeEvent) => setSearchTerm(changeEvent.target.value)}
                        fullWidth
                    />

                    <Box
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            minHeight: 220,
                            maxHeight: 360,
                            overflowY: 'auto',
                            bgcolor: 'background.paper',
                            p: 1,
                        }}
                    >
                        {isLoadingRecipients ? (
                            <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 200 }}>
                                <CircularProgress size={28} />
                                <Typography color="text.secondary">
                                    טוען משתמשים...
                                </Typography>
                            </Stack>
                        ) : filteredRecipients.length === 0 ? (
                            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200, textAlign: 'center' }}>
                                <Typography color="text.secondary">
                                    לא נמצאו משתמשים זמינים לשליחה
                                </Typography>
                            </Stack>
                        ) : (
                            <Stack spacing={1}>
                                {filteredRecipients.map((recipient) => {
                                    const isSelected = selectedRecipient?.email === recipient.email;
                                    const detailLine = [
                                        recipient.companyName,
                                        recipient.centerName,
                                    ].filter(Boolean).join(' · ');

                                    return (
                                        <ButtonBase
                                            key={recipient.email}
                                            onClick={() => setSelectedRecipient(recipient)}
                                            sx={{
                                                display: 'block',
                                                width: '100%',
                                                textAlign: 'initial',
                                                border: '1px solid',
                                                borderColor: isSelected ? 'primary.main' : 'divider',
                                                borderRadius: 2,
                                                p: 1.5,
                                                bgcolor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'background.paper',
                                                boxShadow: isSelected ? '0 0 0 2px rgba(25, 118, 210, 0.16)' : 'none',
                                                transition: 'border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    bgcolor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'grey.50',
                                                },
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar
                                                    sx={{
                                                        bgcolor: isSelected ? 'primary.main' : 'grey.200',
                                                        color: isSelected ? 'primary.contrastText' : 'text.primary',
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    {getRecipientInitial(recipient)}
                                                </Avatar>
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Stack
                                                        direction={{ xs: 'column', sm: 'row' }}
                                                        spacing={1}
                                                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                                                        justifyContent="space-between"
                                                    >
                                                        <Typography sx={{ fontWeight: 800 }} noWrap>
                                                            {getRecipientName(recipient)}
                                                        </Typography>
                                                        <Chip
                                                            label={displayRole(recipient.role)}
                                                            size="small"
                                                            color={isSelected ? 'primary' : 'default'}
                                                            sx={{ fontWeight: 700 }}
                                                        />
                                                    </Stack>
                                                    <Typography variant="body2" color="text.secondary" dir="ltr" noWrap>
                                                        {recipient.email}
                                                    </Typography>
                                                    {detailLine && (
                                                        <Typography variant="body2" color="text.secondary" noWrap>
                                                            {detailLine}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Stack>
                                        </ButtonBase>
                                    );
                                })}
                            </Stack>
                        )}
                    </Box>

                    <TextField
                        label="הודעה אישית"
                        placeholder={DEFAULT_MESSAGE_PLACEHOLDER}
                        value={message}
                        onChange={(changeEvent) => setMessage(changeEvent.target.value)}
                        multiline
                        rows={3}
                        fullWidth
                    />
                </Stack>
            </DialogContent>

            <DialogActions
                sx={{
                    px: { xs: 2.5, sm: 3 },
                    py: 2,
                    gap: 1,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Button onClick={handleClose} disabled={isSending}>
                    ביטול
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSend}
                    disabled={!selectedRecipient || isSending}
                    startIcon={isSending ? <CircularProgress color="inherit" size={18} /> : null}
                    sx={{ minWidth: 130 }}
                >
                    {isSending ? 'שולח...' : 'שלח הודעה'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
