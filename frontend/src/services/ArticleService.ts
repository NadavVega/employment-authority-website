import { collection, query, where, getDocs, doc, updateDoc, Timestamp, addDoc } from 'firebase/firestore';
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
}
