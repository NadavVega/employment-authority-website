import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import { promotionalContentService } from '../../services/interfaces/promotional-content-service';
import {
    DEFAULT_PROMOTIONAL_SLIDES,
    getPromotionalAsset,
    PROMOTIONAL_ASSETS,
} from './promotional-assets';

const AUDIENCE_OPTIONS = [
    { value: 'all', label: 'כל המשתמשים' },
    { value: 'admin', label: 'מנהלים' },
    { value: 'coordinator', label: 'רכזים' },
    { value: 'employer', label: 'מעסיקים' },
];

const getFirestoreErrorMessage = (error, fallbackMessage) => {
    const errorCode = typeof error?.code === 'string' ? error.code : '';
    const errorMessage = typeof error?.message === 'string' ? error.message : '';

    if (errorCode && errorMessage) {
        return `${errorCode}: ${errorMessage}`;
    }

    return errorMessage || errorCode || fallbackMessage;
};

const createDraftSlide = (order) => {
    const asset = PROMOTIONAL_ASSETS[0];

    return {
        id: `new-${Date.now()}`,
        title: '',
        description: '',
        mediaType: asset.mediaType,
        mediaUrl: asset.mediaUrl,
        mediaAssetKey: asset.key,
        order,
        isActive: true,
        audience: 'all',
    };
};

const createDefaultDraftSlides = () => (
    DEFAULT_PROMOTIONAL_SLIDES.map((slide) => ({
        ...slide,
        id: `new-${slide.id}`,
    }))
);

const SlidePreview = ({ slide }) => {
    const asset = getPromotionalAsset(slide.mediaAssetKey);
    const resolvedMediaUrl = asset?.mediaUrl || slide.mediaUrl;

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '0.9fr 1.1fr' },
                minHeight: 190,
                border: '1px solid var(--color-border)',
                bgcolor: 'var(--color-surface)',
                overflow: 'hidden',
            }}
        >
            <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography fontWeight={800} sx={{ color: 'var(--color-text)', mb: 1 }}>
                    {slide.title || 'כותרת השקופית'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--color-text-muted)' }}>
                    {slide.description || 'תיאור קצר של התוכן שיוצג בקרוסלה.'}
                </Typography>
            </Box>

            {slide.mediaType === 'video' ? (
                <Box
                    component="iframe"
                    src={resolvedMediaUrl}
                    title={slide.title || 'תצוגה מקדימה של סרטון תדמית'}
                    allow="autoplay; fullscreen; picture-in-picture"
                    sx={{ width: '100%', height: '100%', minHeight: 190, border: 0 }}
                />
            ) : (
                <Box
                    component="img"
                    src={resolvedMediaUrl}
                    alt=""
                    sx={{
                        width: '100%',
                        height: '100%',
                        minHeight: 190,
                        objectFit: asset?.fit || 'cover',
                        bgcolor: asset?.fit === 'contain' ? '#eef1f4' : 'var(--color-brand-dark)',
                    }}
                />
            )}
        </Box>
    );
};

const PromotionalContentManager = ({ currentUser }) => {
    const [slides, setSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState('');
    const [message, setMessage] = useState(null);

    useEffect(() => {
        let isCancelled = false;

        const loadSlides = async () => {
            try {
                const storedSlides = await promotionalContentService.getAllSlides();
                if (!isCancelled) {
                    setSlides(
                        storedSlides.length > 0
                            ? storedSlides
                            : createDefaultDraftSlides()
                    );
                }
            } catch (error) {
                console.error('Failed to load promotional content:', error);
                if (!isCancelled) {
                    setMessage({
                        severity: 'error',
                        text: getFirestoreErrorMessage(error, 'טעינת תוכן הקרוסלה נכשלה.'),
                    });
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        };

        loadSlides();

        return () => {
            isCancelled = true;
        };
    }, []);

    const updateSlide = (slideId, changes) => {
        setSlides((currentSlides) => currentSlides.map((slide) => (
            slide.id === slideId ? { ...slide, ...changes } : slide
        )));
    };

    const handleAssetChange = (slideId, assetKey) => {
        const asset = getPromotionalAsset(assetKey);
        if (!asset) return;

        updateSlide(slideId, {
            mediaAssetKey: asset.key,
            mediaType: asset.mediaType,
            mediaUrl: asset.mediaUrl,
        });
    };

    const handleAdd = () => {
        const nextOrder = slides.reduce(
            (highestOrder, slide) => Math.max(highestOrder, Number(slide.order) || 0),
            0
        ) + 1;
        setSlides((currentSlides) => [...currentSlides, createDraftSlide(nextOrder)]);
    };

    const handleSave = async (slide) => {
        if (!slide.title.trim() || !slide.description.trim()) {
            setMessage({ severity: 'warning', text: 'יש למלא כותרת ותיאור קצר.' });
            return;
        }

        const selectedAsset = getPromotionalAsset(slide.mediaAssetKey);
        if (!selectedAsset && !slide.mediaUrl) {
            setMessage({ severity: 'warning', text: 'יש לבחור נכס מדיה תקין.' });
            return;
        }

        if (!currentUser?.email) {
            setMessage({ severity: 'error', text: 'יש להתחבר עם משתמש מנהל מאומת כדי לשמור.' });
            return;
        }

        setSavingId(slide.id);
        setMessage(null);

        try {
            const savedId = await promotionalContentService.saveSlide(slide);
            setSlides((currentSlides) => currentSlides.map((currentSlide) => (
                currentSlide.id === slide.id
                    ? { ...currentSlide, id: savedId }
                    : currentSlide
            )));
            setMessage({ severity: 'success', text: 'השקופית נשמרה בהצלחה.' });
        } catch (error) {
            console.error('Failed to save promotional slide:', error);
            setMessage({
                severity: 'error',
                text: getFirestoreErrorMessage(error, 'שמירת השקופית נכשלה.'),
            });
        } finally {
            setSavingId('');
        }
    };

    const handleDelete = async (slide) => {
        if (slide.id.startsWith('new-')) {
            setSlides((currentSlides) => currentSlides.filter(({ id }) => id !== slide.id));
            return;
        }

        if (!window.confirm(`למחוק את השקופית "${slide.title}"?`)) return;

        setSavingId(slide.id);
        setMessage(null);

        try {
            await promotionalContentService.deleteSlide(slide.id);
            setSlides((currentSlides) => currentSlides.filter(({ id }) => id !== slide.id));
            setMessage({ severity: 'success', text: 'השקופית נמחקה.' });
        } catch (error) {
            console.error('Failed to delete promotional slide:', error);
            setMessage({
                severity: 'error',
                text: getFirestoreErrorMessage(error, 'מחיקת השקופית נכשלה.'),
            });
        } finally {
            setSavingId('');
        }
    };

    return (
        <Box component="section" aria-labelledby="promotional-content-heading" sx={{ mt: 5 }}>
            <Box
                className="content-management-section-header"
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'stretch', sm: 'flex-end' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2,
                }}
            >
                <Box>
                    <Typography
                        id="promotional-content-heading"
                        component="h2"
                        className="content-management-section-title"
                    >
                        ניהול קרוסלת התוכן העליונה
                    </Typography>
                    <Typography component="p" className="content-management-section-subtitle">
                        עריכת שקופיות הקרוסלה
                    </Typography>
                </Box>
                <Button variant="contained" onClick={handleAdd}>
                    הוספת שקופית
                </Button>
            </Box>

            {message && (
                <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
                    {message.text}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {slides.length === 0 && (
                        <Paper
                            elevation={0}
                            sx={{ p: 3, border: '1px solid var(--color-border)', textAlign: 'center' }}
                        >
                            <Typography>טרם נשמר תוכן מנוהל. עמוד הבית משתמש בתוכן המקומי הקיים.</Typography>
                        </Paper>
                    )}

                    {slides.map((slide) => (
                        <Paper
                            key={slide.id}
                            elevation={0}
                            sx={{
                                p: { xs: 2, md: 3 },
                                border: '1px solid var(--color-border)',
                                borderRight: '4px solid var(--color-accent)',
                                bgcolor: 'var(--color-surface)',
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(320px, 0.85fr)' },
                                    gap: 3,
                                }}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <TextField
                                        label="כותרת"
                                        value={slide.title}
                                        onChange={(event) => updateSlide(slide.id, { title: event.target.value })}
                                        slotProps={{ htmlInput: { maxLength: 80 } }}
                                        required
                                        fullWidth
                                    />
                                    <TextField
                                        label="תיאור קצר"
                                        value={slide.description}
                                        onChange={(event) => updateSlide(slide.id, { description: event.target.value })}
                                        slotProps={{ htmlInput: { maxLength: 140 } }}
                                        helperText={`${slide.description.length}/140`}
                                        required
                                        fullWidth
                                        multiline
                                        minRows={2}
                                    />

                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 130px 160px' }, gap: 2 }}>
                                        <Select
                                            value={slide.mediaAssetKey}
                                            onChange={(event) => handleAssetChange(slide.id, event.target.value)}
                                            aria-label="בחירת נכס מדיה"
                                        >
                                            {PROMOTIONAL_ASSETS.map((asset) => (
                                                <MenuItem key={asset.key} value={asset.key}>
                                                    {asset.label} ({asset.mediaType === 'video' ? 'וידאו' : 'תמונה'})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        <TextField
                                            label="סדר"
                                            type="number"
                                            value={slide.order}
                                            onChange={(event) => updateSlide(slide.id, { order: event.target.value })}
                                            slotProps={{ htmlInput: { min: 0, step: 1 } }}
                                        />
                                        <Select
                                            value={slide.audience}
                                            onChange={(event) => updateSlide(slide.id, { audience: event.target.value })}
                                            aria-label="בחירת קהל יעד"
                                        >
                                            {AUDIENCE_OPTIONS.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </Box>

                                    <FormControlLabel
                                        control={(
                                            <Checkbox
                                                checked={slide.isActive}
                                                onChange={(event) => updateSlide(slide.id, { isActive: event.target.checked })}
                                            />
                                        )}
                                        label="שקופית פעילה"
                                    />

                                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                                        <Button
                                            variant="contained"
                                            disabled={savingId === slide.id}
                                            onClick={() => handleSave(slide)}
                                        >
                                            {savingId === slide.id ? 'שומר...' : 'שמירה'}
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            disabled={savingId === slide.id}
                                            onClick={() => handleDelete(slide)}
                                        >
                                            מחיקה
                                        </Button>
                                    </Box>
                                </Box>

                                <SlidePreview slide={slide} />
                            </Box>
                        </Paper>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default PromotionalContentManager;
