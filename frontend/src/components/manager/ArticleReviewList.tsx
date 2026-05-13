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
        return <div className="review-list">Loading pending articles...</div>;
    }

    return (
        <div className="review-list">
            <h2>Pending Articles for Approval</h2>
            {articles.length === 0 ? (
                <p>No articles pending approval.</p>
            ) : (
                articles.map(article => (
                    <div key={article.id} className="article-card">
                        <h3>{article.title}</h3>
                        <p>Source: {article.sourceName}</p>
                        <p>
                            <a href={article.url} target="_blank" rel="noreferrer">
                                Read Original Article
                            </a>
                        </p>
                        <div className="article-actions">
                            <button onClick={() => article.id && handleApprove(article.id)}>
                                Approve & Publish
                            </button>
                            <button className="delete-btn" onClick={() => article.id && handleReject(article.id)}>
                                Reject
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};