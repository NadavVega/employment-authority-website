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