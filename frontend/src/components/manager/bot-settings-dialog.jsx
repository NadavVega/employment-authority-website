import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Typography, Box, TextField, IconButton, 
    List, ListItem, ListItemText, ListItemSecondaryAction, 
    Divider, CircularProgress, Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';

const BotSettingsDialog = ({ open, onClose }) => {
    const [config, setConfig] = useState({ sources: [], keywords: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [newKeyword, setNewKeyword] = useState('');
    const [newSource, setNewSource] = useState({ name: '', url: '', selector: 'a' });

    useEffect(() => {
        if (open) {
            fetchConfig();
        }
    }, [open]);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'settings', 'bot_config');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setConfig(docSnap.data());
            } else {
                // Initial default config if none exists
                const defaultConfig = {
                    sources: [
                        { name: 'Ynet Economy', url: 'https://www.ynet.co.il/economy', selector: 'a' },
                        { name: 'Calcalist Career', url: 'https://www.calcalist.co.il/career', selector: 'a' },
                        { name: 'Maariv Business', url: 'https://www.maariv.co.il/news/business', selector: 'a' }
                    ],
                    keywords: ['עבודה', 'שכר', 'משק', 'כלכלה', 'גיוס', 'עובדים', 'תעסוקה', 'מעסיקים']
                };
                setConfig(defaultConfig);
            }
        } catch (error) {
            console.error("Error fetching bot config:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async (updatedConfig) => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'bot_config'), updatedConfig);
            setConfig(updatedConfig);
        } catch (error) {
            console.error("Error saving bot config:", error);
            alert("שגיאה בשמירת הגדרות הבוט.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddKeyword = () => {
        if (!newKeyword.trim() || config.keywords.includes(newKeyword.trim())) return;
        const updatedConfig = { ...config, keywords: [...config.keywords, newKeyword.trim()] };
        handleSaveConfig(updatedConfig);
        setNewKeyword('');
    };

    const handleRemoveKeyword = (keywordToRemove) => {
        const updatedConfig = { ...config, keywords: config.keywords.filter(k => k !== keywordToRemove) };
        handleSaveConfig(updatedConfig);
    };

    const handleAddSource = () => {
        if (!newSource.name.trim() || !newSource.url.trim()) return;
        const updatedConfig = { ...config, sources: [...config.sources, newSource] };
        handleSaveConfig(updatedConfig);
        setNewSource({ name: '', url: '', selector: 'a' });
    };

    const handleRemoveSource = (indexToRemove) => {
        const updatedConfig = { ...config, sources: config.sources.filter((_, i) => i !== indexToRemove) };
        handleSaveConfig(updatedConfig);
    };

    // handleTriggerScan removed since we are using local execution via terminal

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir="rtl">
            <DialogTitle sx={{ fontWeight: 'bold', color: 'var(--color-primary-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>⚙️ ניהול הגדרות בוט</span>
                <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.05)', px: 2, py: 1, borderRadius: 1, color: 'var(--color-text)' }}>
                    להפעלת הסריקה, הרץ בטרמינל: <strong>npm run test:bot</strong> (בתיקיית backend/functions)
                </Typography>
            </DialogTitle>
            
            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        
                        {/* KEYWORDS SECTION */}
                        <Box>
                            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>מילות מפתח</Typography>
                            <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid var(--color-border)', mb: 2, maxHeight: '200px', overflowY: 'auto' }}>
                                {config.keywords.map((keyword, index) => (
                                    <React.Fragment key={index}>
                                        <ListItem>
                                            <ListItemText primary={keyword} />
                                            <ListItemSecondaryAction>
                                                <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveKeyword(keyword)} disabled={saving}>
                                                    <DeleteIcon color="error" />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                        {index < config.keywords.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>הוספת מילת מפתח חדשה</Typography>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                <TextField 
                                    size="small" 
                                    label="מילת מפתח" 
                                    value={newKeyword} 
                                    onChange={(e) => setNewKeyword(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                                />
                                <Button 
                                    variant="contained" 
                                    startIcon={<AddIcon />} 
                                    onClick={handleAddKeyword}
                                    disabled={saving || !newKeyword.trim()}
                                    sx={{ minWidth: '100px' }}
                                >
                                    הוסף
                                </Button>
                            </Box>
                        </Box>

                        <Divider />

                        {/* SOURCES SECTION */}
                        <Box>
                            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>מקורות סריקה</Typography>
                            <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid var(--color-border)', mb: 2 }}>
                                {config.sources.map((source, index) => (
                                    <React.Fragment key={index}>
                                        <ListItem>
                                            <ListItemText 
                                                primary={source.name} 
                                                secondary={
                                                    <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ direction: 'ltr', display: 'inline-block', color: 'var(--color-primary)' }}>
                                                        {source.url}
                                                    </a>
                                                } 
                                            />
                                            <ListItemSecondaryAction>
                                                <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveSource(index)} disabled={saving}>
                                                    <DeleteIcon color="error" />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                        {index < config.sources.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                            
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>הוספת מקור חדש</Typography>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                <TextField 
                                    size="small" 
                                    label="שם המקור" 
                                    value={newSource.name} 
                                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                                />
                                <TextField 
                                    size="small" 
                                    label="קישור (URL)" 
                                    dir="ltr"
                                    fullWidth
                                    value={newSource.url} 
                                    onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddSource()}
                                />
                                <Button 
                                    variant="contained" 
                                    startIcon={<AddIcon />} 
                                    onClick={handleAddSource}
                                    disabled={saving || !newSource.name.trim() || !newSource.url.trim()}
                                    sx={{ minWidth: '100px' }}
                                >
                                    הוסף
                                </Button>
                            </Box>
                        </Box>

                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit" variant="outlined">סגור</Button>
            </DialogActions>
        </Dialog>
    );
};

export default BotSettingsDialog;
