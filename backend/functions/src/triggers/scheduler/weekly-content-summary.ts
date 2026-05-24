import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Scheduled function to alert the Manager about pending articles.
 * Runs every Sunday at 08:00 AM Jerusalem time.
 */
export const weeklyContentSummary = functions.pubsub
    .schedule('0 8 * * 0')
    .timeZone('Asia/Jerusalem')
    .onRun(async (context) => {
        const db = admin.firestore();
        
        // Fetching only links awaiting Managerial authorization
        const pendingArticles = await db.collection('links')
            .where('status', '==', 'pending')
            .get();

        if (pendingArticles.empty) {
            return null;
        }

        // We update a global system-notification flag that the Manager Portal observes
        return db.collection('system_notifications').doc('manager_summary').set({
            pendingCount: pendingArticles.size,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            hasUnreadContent: true
        }, { merge: true });
    });