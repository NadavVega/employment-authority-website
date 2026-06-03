import React, { useState } from 'react';
import { Container, Typography, Box, Paper, TextField, Button, Grid, Divider } from '@mui/material';
import { useAuth } from '../context/auth-context';
import { ArticleService } from '../services/ArticleService';
import { ArticleReviewList } from '../components/manager/ArticleReviewList';
import { Navigate } from 'react-router-dom';

const ContentManagementPage = () => {
    const { currentUser, isAdmin } = useAuth();
    
    // Redirect if not admin
    if (!isAdmin) {
        return <Navigate to="/home" replace />;
    }

    const [formData, setFormData] = useState({
        title: '',
        sourceName: '',
        category: 'general',
        url: '',
        content: '',
        imageUrl: ''
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // managerIdentifier using email, fallback to unknown
            const managerIdentifier = currentUser?.email || 'unknown';
            
            await ArticleService.publishArticle({
                title: formData.title,
                sourceName: formData.sourceName,
                category: formData.category,
                url: formData.url,
                content: formData.content,
                imageUrl: formData.imageUrl
            }, managerIdentifier);

            alert('הכתבה פורסמה בהצלחה!'); // Successfully published
            
            // Clear form
            setFormData({
                title: '',
                sourceName: '',
                category: 'general',
                url: '',
                content: '',
                imageUrl: ''
            });
        } catch (error) {
            console.error("Error publishing article:", error);
            alert('אירעה שגיאה בפרסום הכתבה. אנא נסה שוב.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box sx={{ bgcolor: '#f4f7fa', minHeight: '100vh', py: 4, direction: 'rtl' }}>
            <Container maxWidth="lg">
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#003b8b', mb: 4 }}>
                    ניהול תוכן וכתבות
                </Typography>
                
                <Grid container spacing={4}>
                    {/* Left Column (or Top): Publish New Article */}
                    <Grid item xs={12} md={6}>
                        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #e2e8f0' }}>
                            <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: '#003b8b' }}>
                                פרסום כתבה חדשה
                            </Typography>
                            
                            <form onSubmit={handleSubmit}>
                                <TextField
                                    fullWidth
                                    label="כותרת הכתבה"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    sx={{ mb: 2 }}
                                />
                                
                                <TextField
                                    fullWidth
                                    label="מקור הכתבה (למשל: 'מערכת האתר')"
                                    name="sourceName"
                                    value={formData.sourceName}
                                    onChange={handleChange}
                                    required
                                    sx={{ mb: 2 }}
                                />
                                
                                <TextField
                                    fullWidth
                                    label="קטגוריה"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                    sx={{ mb: 2 }}
                                />
                                
                                <TextField
                                    fullWidth
                                    label="קישור חיצוני (אופציונלי)"
                                    name="url"
                                    value={formData.url}
                                    onChange={handleChange}
                                    sx={{ mb: 2 }}
                                    dir="ltr"
                                />
                                
                                <TextField
                                    fullWidth
                                    label="קישור לתמונה (אופציונלי)"
                                    name="imageUrl"
                                    value={formData.imageUrl}
                                    onChange={handleChange}
                                    sx={{ mb: 2 }}
                                    dir="ltr"
                                />
                                
                                <TextField
                                    fullWidth
                                    label="תוכן הכתבה (אופציונלי)"
                                    name="content"
                                    value={formData.content}
                                    onChange={handleChange}
                                    multiline
                                    rows={6}
                                    sx={{ mb: 3 }}
                                />
                                
                                <Button 
                                    type="submit" 
                                    variant="contained" 
                                    color="primary" 
                                    fullWidth
                                    disabled={isSubmitting}
                                    sx={{ py: 1.5, fontWeight: 'bold' }}
                                >
                                    {isSubmitting ? 'מפרסם...' : 'פרסם כתבה'}
                                </Button>
                            </form>
                        </Paper>
                    </Grid>

                    {/* Right Column (or Bottom): Pending Articles Review */}
                    <Grid item xs={12} md={6}>
                        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #e2e8f0', minHeight: '100%' }}>
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h5" fontWeight="bold" sx={{ color: '#003b8b' }}>
                                    אישור כתבות שנאספו
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    רשימת כתבות שנאספו על ידי הבוט וממתינות לאישור מנהל
                                </Typography>
                            </Box>
                            
                            <Divider sx={{ mb: 3 }} />
                            
                            <ArticleReviewList />
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default ContentManagementPage;
