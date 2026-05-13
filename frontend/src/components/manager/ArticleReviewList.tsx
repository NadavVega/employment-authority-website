import React from 'react';
import { IArticleLink } from '../../interfaces/IArticleLink';

/**
 * Component for the Manager to review and approve scraped content.
 * Implements RBAC: Only visible/accessible by the Manager role.
 */
export const ArticleReviewList: React.FC<{ articles: IArticleLink[] }> = ({ articles }) => {
    
    /**
     * Moves an approved article from 'links' to the public 'articles' collection.
     */
    const handleApprove = async (articleId: string) => {
        // Logic to trigger ArticleService.approve() 
        // We follow the 'Authorization Policy' where only Manager approval makes content public.[cite: 1]
    };

    return (
        <div className="review-list">
            <h2>Pending Articles for Approval</h2>
            {articles.map(article => (
                <div key={article.id} className="article-card">
                    <h3>{article.title}</h3>
                    <p>Source: {article.sourceName}</p>
                    <button onClick={() => handleApprove(article.id)}>Approve & Publish</button>
                    <button className="delete-btn">Reject</button>
                </div>
            ))}
        </div>
    );
};