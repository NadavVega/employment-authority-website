import React, { useEffect, useState } from 'react';
import { IArticle } from '../../interfaces/IArticle'; 
import { ArticleService } from '../../services/ArticleService';
import { useAuth } from '../../context/auth-context';

/**
 * Component for the Manager to review and approve scraped content.
 * Implements RBAC: Only visible/accessible by the Manager role.
 */
export const ArticleReviewList: React.FC = () => {
    const { currentUser } = useAuth();
    
    // תיקון קריטי: הוספת <IArticle[]> מונעת את שגיאת ה-never
    const [articles, setArticles] = useState<IArticle[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        loadPendingArticles();
    }, []);

    const loadPendingArticles = async () => {
        try {
            setLoading(true);
            const pending = await ArticleService.getPendingArticles();
            setArticles(pending);
        } catch (error) {
            console.error("Failed to load pending articles:", error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Approves an article, changing its status to 'approved' so it becomes public.
     */
    const handleApprove = async (articleId: string) => {
        if (!articleId || !currentUser) return;
        try {
            // Using email as an identifier for the manager
            await ArticleService.approveArticle(articleId, currentUser.email || 'unknown');
            // Remove the approved article from the local state
            setArticles(prev => prev.filter(a => a.id !== articleId));
        } catch (error) {
            console.error("Failed to approve article:", error);
        }
    };

    /**
     * Rejects an article.
     */
    const handleReject = async (articleId: string) => {
        if (!articleId || !currentUser) return;
        try {
            await ArticleService.rejectArticle(articleId, currentUser.email || 'unknown');
            // Remove the rejected article from the local state
            setArticles(prev => prev.filter(a => a.id !== articleId));
        } catch (error) {
            console.error("Failed to reject article:", error);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                טוען כתבות ממתינות לאישור...
            </div>
        );
    }

    return (
        <div className="article-review-list">
            {articles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                    <p>אין כתבות שממתינות לאישור כרגע.</p>
                </div>
            ) : (
                articles.map(article => (
                    <div key={article.id} className="article-review-card" dir="rtl">
                        <h3 className="article-title">{article.title}</h3>
                        
                        <div className="article-meta">
                            <span><strong>מקור:</strong> {article.sourceName}</span>
                            <a href={article.url} target="_blank" rel="noreferrer" className="article-link">
                                קרא את הכתבה המקורית
                            </a>
                        </div>
                        
                        <div className="article-actions">
                            <button 
                                className="btn-reject-article" 
                                onClick={() => article.id && handleReject(article.id)}
                            >
                                דחה כתבה
                            </button>
                            <button 
                                className="btn-approve-article" 
                                onClick={() => article.id && handleApprove(article.id)}
                            >
                                אשר ופרסם
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default ArticleReviewList;