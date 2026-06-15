import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ScraperBot } from './services/scraper/ScraperBot';

admin.initializeApp();

/**
 * Scheduled Cloud Function that runs every morning at 08:00 AM.
 * It initiates the content scraper to populate the manager's review table.
 */
export const scheduledScraper = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('Israel')
  .onRun(async (context) => {
    const bot = new ScraperBot();
    await bot.executeDailyScrape();
    return null;
  });

/**
 * Callable Cloud Function to trigger the scraper manually from the frontend.
 */
export const triggerScraperBot = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to trigger the bot.');
  }

  // Optionally verify if user is an admin.
  // We can do this by checking context.auth.token.role === 'admin' if custom claims exist,
  // or simply rely on the frontend hiding the button, but backend security is best.
  // For now, we ensure authentication.

  try {
    const bot = new ScraperBot();
    await bot.executeDailyScrape();
    return { success: true, message: 'Scrape cycle completed successfully.' };
  } catch (error) {
    console.error('Error triggering ScraperBot:', error);
    throw new functions.https.HttpsError('internal', 'An error occurred while running the scraper bot.');
  }
});