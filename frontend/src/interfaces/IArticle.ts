export interface IArticle {
  id?: string;
  title: string;
  url?: string;
  sourceName: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  publishedAt?: any; // Firestore Timestamp
  approvedBy?: string;
  content?: string;
  imageUrl?: string;
}
