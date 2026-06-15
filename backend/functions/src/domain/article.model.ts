import * as admin from 'firebase-admin';

/**
 * Represents an article in the system, either scraped or manually added.
 */
export interface IArticle {
  title: string;
  url: string;
  sourceName: string;
  category: string;
  status: string; // 'pending' | 'approved' | 'rejected'
  publishedAt?: admin.firestore.Timestamp | admin.firestore.FieldValue;
  approvedBy?: string;
  imageUrl?: string;
  content?: string;
}