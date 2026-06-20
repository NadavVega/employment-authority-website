import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Autocomplete,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
} from '@mui/material';

import { directoryService } from '../../services/interfaces/directory-service';
import { createEventMessageNotification } from '../../services/interfaces/notification-service';

const DEFAULT_MESSAGE_PLACEHOLDER = 'חשבתי שזה יכול להתאים לך';

const displayRole = (role) => {
    if (role === 'employer') return 'מעסיק';
    if (role === 'coordinator') return 'רכז';
    if (role === 'admin') return 'מנהלת';
    return role || '';
};

const getRecipientLabel = (recipient) => {
    if (!recipient) return '';

    const name = recipient.name && recipient.name !== 'לא צוין'
        ? recipient.name
        : recipient.email;
    const details = [
        recipient.email,
        displayRole(recipient.role),
        recipient.companyName,
    ].filter(Boolean);

    return `${name}${details.length ? ` - ${details.join(' | ')}` : ''}`;
};

export const EventMessageDialog = ({
    open,
    event,
    currentUser,
    userRole,
    onClose,
}) => {
    const [recipients, setRecipients] = useState([]);
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    const [message, setMessage] = useState('');
    const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        let isMounted = true;

        const loadRecipients = async () => {
            setIsLoadingRecipients(true);
            setError('');

            try {
                const permittedRecipients =
                    await directoryService.getPermittedMessageRecipients(currentUser, userRole);

                if (isMounted) {
                    setRecipients(permittedRecipients);
                }
            } catch (loadError) {
                console.error('Failed to load message recipients:', loadError);

                if (isMounted) {
                    setRecipients([]);
                    setError('לא ניתן לטעון משתמשים לשליחה.');
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
    }, [currentUser, open, userRole]);

    const sortedRecipients = useMemo(() => (
        [...recipients].sort((a, b) => getRecipientLabel(a).localeCompare(getRecipientLabel(b), 'he'))
    ), [recipients]);

    const handleClose = () => {
        setSelectedRecipient(null);
        setMessage('');
        setError('');
        setIsSending(false);
        onClose();
    };

    const handleSend = async () => {
        if (!selectedRecipient || !event?.id) {
            setError('יש לבחור משתמש לפני השליחה.');
            return;
        }

        setIsSending(true);
        setError('');

        try {
            await createEventMessageNotification({
                recipient: selectedRecipient,
                sender: currentUser,
                eventId: event.id,
                message,
            });
            handleClose();
        } catch (sendError) {
            console.error('Failed to send event message:', sendError);
            setError('לא ניתן לשלוח את האירוע בהודעות.');
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
            maxWidth="sm"
            slotProps={{
                paper: {
                    sx: { direction: 'rtl' },
                },
            }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>
                שליחת אירוע בהודעות
            </DialogTitle>

            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <Autocomplete
                        options={sortedRecipients}
                        value={selectedRecipient}
                        onChange={(_, value) => setSelectedRecipient(value)}
                        getOptionLabel={getRecipientLabel}
                        isOptionEqualToValue={(option, value) => option.email === value.email}
                        loading={isLoadingRecipients}
                        noOptionsText={isLoadingRecipients ? 'טוען משתמשים...' : 'לא נמצאו משתמשים זמינים'}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="בחר משתמש"
                                required
                            />
                        )}
                    />

                    <TextField
                        label="הודעה"
                        placeholder={DEFAULT_MESSAGE_PLACEHOLDER}
                        value={message}
                        onChange={(changeEvent) => setMessage(changeEvent.target.value)}
                        multiline
                        minRows={3}
                    />
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button onClick={handleClose} disabled={isSending}>
                    ביטול
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSend}
                    disabled={!selectedRecipient || isSending}
                >
                    שלח
                </Button>
            </DialogActions>
        </Dialog>
    );
};
