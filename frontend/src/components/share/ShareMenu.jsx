import { useState } from 'react';
import {
    Button,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Snackbar,
} from '@mui/material';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { copyShareLink, openShareTarget } from '../../utils/eventShare';

const stopPropagation = (event) => {
    event.stopPropagation();
};

export const ShareMenu = ({
    title,
    url,
    label,
    ariaLabel = 'שיתוף',
    buttonClassName,
    buttonSx,
}) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [feedback, setFeedback] = useState('');
    const isOpen = Boolean(anchorEl);

    const handleOpen = (event) => {
        stopPropagation(event);
        setAnchorEl(event.currentTarget);
    };

    const handleClose = (event) => {
        event?.stopPropagation();
        setAnchorEl(null);
    };

    const handleShareTarget = (event, target) => {
        stopPropagation(event);
        openShareTarget(target, { title, url });
        setAnchorEl(null);
    };

    const handleCopy = async (event) => {
        stopPropagation(event);
        setAnchorEl(null);

        try {
            await copyShareLink(url);
            setFeedback('הקישור הועתק');
        } catch (error) {
            console.error('Failed to copy share link:', error);
            setFeedback('לא ניתן להעתיק את הקישור');
        }
    };

    const trigger = label ? (
        <Button
            className={buttonClassName}
            type="button"
            onClick={handleOpen}
            startIcon={<ShareOutlinedIcon fontSize="small" />}
            aria-label={ariaLabel}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            sx={buttonSx}
        >
            {label}
        </Button>
    ) : (
        <IconButton
            className={buttonClassName}
            type="button"
            onClick={handleOpen}
            aria-label={ariaLabel}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            size="small"
            sx={buttonSx}
        >
            <ShareOutlinedIcon fontSize="small" />
        </IconButton>
    );

    return (
        <>
            {trigger}
            <Menu
                anchorEl={anchorEl}
                open={isOpen}
                onClose={handleClose}
                onClick={stopPropagation}
                slotProps={{ paper: { sx: { direction: 'rtl', minWidth: 170 } } }}
                sx={{ zIndex: 11000 }}
            >
                <MenuItem onClick={(event) => handleShareTarget(event, 'mail')}>
                    <ListItemIcon><EmailOutlinedIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>דואר</ListItemText>
                </MenuItem>
                <MenuItem onClick={(event) => handleShareTarget(event, 'whatsapp')}>
                    <ListItemIcon><WhatsAppIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>WhatsApp</ListItemText>
                </MenuItem>
                <MenuItem onClick={(event) => handleShareTarget(event, 'outlook')}>
                    <ListItemIcon><AlternateEmailIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Outlook</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleCopy}>
                    <ListItemIcon><ContentCopyOutlinedIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>העתקת קישור</ListItemText>
                </MenuItem>
            </Menu>
            <Snackbar
                open={Boolean(feedback)}
                autoHideDuration={2500}
                onClose={() => setFeedback('')}
                message={feedback}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                sx={{ zIndex: 11000 }}
            />
        </>
    );
};
