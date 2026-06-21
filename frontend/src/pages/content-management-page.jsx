import { useRef, useState } from 'react';
import { Typography, Box, Tabs, Tab } from '@mui/material';
import { useAuth } from '../context/auth-context';
import { ArticleService } from '../services/ArticleService';
import { ArticleReviewList } from '../components/manager/ArticleReviewList';
import { ApprovedArticleList } from '../components/manager/ApprovedArticleList';
import { Navigate } from 'react-router-dom';
import PromotionalContentManager from '../features/promotional-content/promotional-content-manager';
import BotSettingsDialog from '../components/manager/bot-settings-dialog';

import '../design/content-management.css';

const ContentManagementPage = () => {
    const { currentUser, isAdmin, isCoordinator } = useAuth();
    const [formData, setFormData] = useState({
        title: '', sourceName: '', category: 'general', url: '', content: '', imageUrl: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isBotSettingsOpen, setIsBotSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const manualArticleRef = useRef(null);
    const articlesManagementRef = useRef(null);
    const carouselManagementRef = useRef(null);

    if (!isAdmin && !isCoordinator) {
        return <Navigate to="/home" replace />;
    }

    const scrollToSection = (sectionRef) => {
        sectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const managerIdentifier = currentUser?.email || 'unknown';
            await ArticleService.publishArticle(formData, managerIdentifier);
            alert('הכתבה פורסמה בהצלחה!'); 
            setFormData({ title: '', sourceName: '', category: 'general', url: '', content: '', imageUrl: '' });
        } catch (error) {
            console.error("Error publishing article:", error);
            alert('אירעה שגיאה בפרסום הכתבה. אנא נסה שוב.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box className="modern-layout-wrapper" sx={{ pt: 4, px: { xs: 2, md: 6, lg: 8 }, direction: 'rtl' }}>
            <Typography variant="h4" fontWeight="800" sx={{ color: 'var(--color-primary-dark)', mb: 4 }}>
                ניהול תוכן וכתבות
            </Typography>

            {isAdmin && (
                <Box
                    component="nav"
                    aria-label="ניווט ניהול תוכן"
                    sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 30,
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 1.5,
                        flexWrap: 'wrap',
                        mb: 3,
                        py: 1.75,
                        px: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.96)',
                        borderBottom: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-sm)',
                        direction: 'rtl',
                    }}
                >
                    <button
                        type="button"
                        className="content-management-nav-btn"
                        onClick={() => scrollToSection(carouselManagementRef)}
                    >
                        קרוסלת תוכן
                    </button>
                    <button
                        type="button"
                        className="content-management-nav-btn"
                        onClick={() => scrollToSection(articlesManagementRef)}
                    >
                        כתבות
                    </button>
                </Box>
            )}
            
            {/* FLEXBOX LAYOUT - 'stretch' forces both columns to be equal height */}
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', lg: 'row' }, 
                gap: 4, 
                alignItems: 'stretch', /* CHANGED: This makes them equal height */
                width: '100%'
            }}>
                
                {/* RIGHT COLUMN: Form (40% width for admin, 100% for coordinator) */}
                <Box ref={manualArticleRef} sx={{ 
                    scrollMarginTop: '88px',
                    flex: isAdmin ? { xs: '1 1 100%', lg: '0 0 40%' } : '1 1 100%', 
                    maxWidth: isAdmin ? 'none' : '800px',
                    margin: isAdmin ? '0' : '0 auto',
                    width: '100%'
                }}>
                    {/* Added height: '100%' to the wrapper */}
                    <div className="form-contrast-wrapper" style={{ width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" fontWeight="800" sx={{ mb: 3, color: 'var(--color-primary-dark)' }}>
                            הוספה ידנית של כתבה
                        </Typography>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1 }}>
                            
                            <input 
                                type="text" name="title" required
                                placeholder="כותרת הכתבה *" 
                                className="input-standard" 
                                value={formData.title} onChange={handleChange} 
                            />
                            <input 
                                type="text" name="sourceName" required
                                placeholder="מקור הכתבה *" 
                                className="input-standard" 
                                value={formData.sourceName} onChange={handleChange} 
                            />
                            <input 
                                type="text" name="url" dir="ltr"
                                placeholder="קישור חיצוני (URL)" 
                                className="input-standard" 
                                value={formData.url} onChange={handleChange} 
                            />
                            <textarea 
                                name="content" rows="5"
                                placeholder="תוכן הכתבה (אופציונלי)" 
                                className="input-standard" style={{ resize: 'vertical', flexGrow: 1 }}
                                value={formData.content} onChange={handleChange} 
                            />
                            
                            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ marginTop: 'auto', width: '100%' }}>
                                {isSubmitting ? 'מפרסם...' : 'פרסם כתבה'}
                            </button>
                        </form>
                    </div>
                </Box>

                {/* LEFT COLUMN: List (60% width) - ONLY FOR ADMIN */}
                {isAdmin && (
                    <Box ref={articlesManagementRef} sx={{ 
                        scrollMarginTop: '88px',
                        flex: { xs: '1 1 100%', lg: '1 1 0%' }, 
                        width: '100%'
                    }}>
                        {/* Added height: '100%' to the wrapper */}
                        <div className="form-contrast-wrapper" style={{ width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                            
                            <div className="bot-header-controls">
                                <div className="bot-header-text">
                                    <h2 className="content-management-section-title">ניהול כתבות</h2>
                                    <p className="content-management-section-subtitle">רשימת כתבות שנאספו על ידי הבוט או פורסמו</p>
                                </div>
                                <button className="btn-secondary pill-btn" onClick={() => setIsBotSettingsOpen(true)}>
                                    ⚙️ ניהול הגדרות בוט
                                </button>
                            </div>
                            
                            <Tabs 
                                value={activeTab} 
                                onChange={(e, newValue) => setActiveTab(newValue)} 
                                centered
                                sx={{ mb: 2, borderBottom: '1px solid var(--color-border)' }}
                            >
                                <Tab label="ממתינות לאישור" />
                                <Tab label="כתבות מאושרות" />
                            </Tabs>
                            
                            <Box sx={{ flexGrow: 1 }}>
                                {activeTab === 0 && <ArticleReviewList />}
                                {activeTab === 1 && <ApprovedArticleList />}
                            </Box>
                        </div>
                    </Box>
                )}

            </Box>

            {isAdmin && (
                <Box ref={carouselManagementRef} sx={{ scrollMarginTop: '88px' }}>
                    <PromotionalContentManager currentUser={currentUser} />
                </Box>
            )}
            {isAdmin && <BotSettingsDialog open={isBotSettingsOpen} onClose={() => setIsBotSettingsOpen(false)} />}
        </Box>
    );
};

export default ContentManagementPage;
