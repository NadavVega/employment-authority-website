import { collection, query, where, getDocs, doc, updateDoc, Timestamp, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from './firebase/config';
import { IArticle } from '../interfaces/IArticle';

const ARTICLES_COLLECTION = 'articles';

export class ArticleService {
    /**
     * Fetch all articles that are pending approval
     */
    static async getPendingArticles(): Promise<IArticle[]> {
        const q = query(
            collection(db, ARTICLES_COLLECTION),
            where('status', '==', 'pending')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnapshot => ({
            id: docSnapshot.id,
            ...docSnapshot.data()
        })) as IArticle[];
    }

    /**
     * Fetch all articles that are approved
     */
    static async getApprovedArticles(): Promise<IArticle[]> {
        const q = query(
            collection(db, ARTICLES_COLLECTION),
            where('status', '==', 'approved')
        );

        const snapshot = await getDocs(q);
        // We do client-side sorting if needed or just return them
        const articles = snapshot.docs.map(docSnapshot => ({
            id: docSnapshot.id,
            ...docSnapshot.data()
        })) as IArticle[];
        
        return articles.sort((a, b) => {
            const dateA = a.publishedAt?.toDate ? a.publishedAt.toDate().getTime() : 0;
            const dateB = b.publishedAt?.toDate ? b.publishedAt.toDate().getTime() : 0;
            return dateB - dateA; // Newest first
        });
    }

    /**
     * Approve an article so it becomes publicly visible
     */
    static async approveArticle(articleId: string, managerIdentifier: string): Promise<void> {
        const articleRef = doc(db, ARTICLES_COLLECTION, articleId);
        await updateDoc(articleRef, {
            status: 'approved',
            approvedBy: managerIdentifier,
            publishedAt: Timestamp.now()
        });
    }

    /**
     * Reject an article, preventing it from being shown
     */
    static async rejectArticle(articleId: string, managerIdentifier: string): Promise<void> {
        const articleRef = doc(db, ARTICLES_COLLECTION, articleId);
        await updateDoc(articleRef, {
            status: 'rejected',
            approvedBy: managerIdentifier
        });
    }

    /**
     * Move an article back to pending status
     */
    static async moveToPending(articleId: string, managerIdentifier: string): Promise<void> {
        const articleRef = doc(db, ARTICLES_COLLECTION, articleId);
        await updateDoc(articleRef, {
            status: 'pending',
            approvedBy: managerIdentifier
        });
    }

    /**
     * Publish a new article manually
     */
    static async publishArticle(data: Partial<IArticle>, managerIdentifier: string): Promise<void> {
        await addDoc(collection(db, ARTICLES_COLLECTION), {
            ...data,
            status: 'approved',
            approvedBy: managerIdentifier,
            publishedAt: Timestamp.now()
        });
    }

    /**
     * Delete an article completely
     */
    static async deleteArticle(articleId: string): Promise<void> {
        const articleRef = doc(db, ARTICLES_COLLECTION, articleId);
        await deleteDoc(articleRef);
    }
}
