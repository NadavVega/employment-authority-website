import React, { useEffect, useState } from 'react';
import { IArticle } from '../../interfaces/IArticle'; 
import { ArticleService } from '../../services/ArticleService';
import { useAuth } from '../../context/auth-context';

/**
 * Component for the Manager to review and manage already approved articles.
 */
export const ApprovedArticleList: React.FC = () => {
    const { currentUser } = useAuth();
    
    const [articles, setArticles] = useState<IArticle[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        loadApprovedArticles();
    }, []);

    const loadApprovedArticles = async () => {
        try {
            setLoading(true);
            const approved = await ArticleService.getApprovedArticles();
            setArticles(approved);
        } catch (error) {
            console.error("Failed to load approved articles:", error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Changes an article's status to rejected, removing it from the public view.
     */
    const handleMoveToRejected = async (articleId: string) => {
        if (!articleId || !currentUser) return;
        try {
            await ArticleService.rejectArticle(articleId, currentUser.email || 'unknown');
            setArticles(prev => prev.filter(a => a.id !== articleId));
        } catch (error) {
            console.error("Failed to reject article:", error);
        }
    };

    /**
     * Changes an article's status back to pending.
     */
    const handleMoveToPendingStatus = async (articleId: string) => {
        if (!articleId || !currentUser) return;
        try {
            await ArticleService.moveToPending(articleId, currentUser.email || 'unknown');
            setArticles(prev => prev.filter(a => a.id !== articleId));
        } catch (error) {
            console.error("Failed to move article to pending:", error);
        }
    };

    /**
     * Permanently deletes an article.
     */
    const handleDelete = async (articleId: string) => {
        if (!articleId || !window.confirm('האם אתה בטוח שברצונך למחוק כתבה זו לצמיתות?')) return;
        try {
            await ArticleService.deleteArticle(articleId);
            setArticles(prev => prev.filter(a => a.id !== articleId));
        } catch (error) {
            console.error("Failed to delete article:", error);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                טוען כתבות מאושרות...
            </div>
        );
    }

    return (
        <div className="article-review-list">
            {articles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                    <p>אין כתבות מאושרות כרגע.</p>
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
                        
                        {article.imageUrl && (
                            <img 
                                src={article.imageUrl} 
                                alt={article.title} 
                                style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px', marginBottom: '16px' }} 
                            />
                        )}
                        
                        {article.content && (
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: '1.5', marginBottom: '16px' }}>
                                {article.content}
                            </p>
                        )}
                        
                        <div className="article-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button 
                                className="btn-reject-article" 
                                onClick={() => article.id && handleDelete(article.id)}
                                style={{ backgroundColor: '#dc3545', color: 'white' }}
                            >
                                מחק לצמיתות
                            </button>
                            <button 
                                className="btn-secondary" 
                                onClick={() => article.id && handleMoveToRejected(article.id)}
                            >
                                העבר לנדחים
                            </button>
                            <button 
                                className="btn-approve-article" 
                                onClick={() => article.id && handleMoveToPendingStatus(article.id)}
                                style={{ backgroundColor: '#ffc107', color: 'black' }}
                            >
                                העבר לממתינים
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default ApprovedArticleList;
