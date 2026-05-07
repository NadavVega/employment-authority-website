import * as admin from 'firebase-admin';

/**
 * Represents a raw news link discovered by the bot.
 * Status 'pending' means it's waiting for the Manager's approval.
 */
export interface IScrapedLink {
  id: string; // Base64 encoded URL to prevent duplicates
  url: string;
  title: string;
  sourceName: string; // e.g., 'Ynet', 'AllJobs'
  scrapedAt: admin.firestore.Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  processedBy?: string; // UID of the Manager who took action
}