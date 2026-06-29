import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ScraperBot } from './services/scraper/ScraperBot';

// We resolve the absolute path to the frontend .env to ensure consistency
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

/**
 * Emergency test runner for the ScraperBot.
 * It manually initializes the Admin SDK using the stringified JSON from .env
 */
async function testScraper(): Promise<void> {
  console.log('--- Starting Scraper Test Session ---');

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccountRaw) {
    console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT is missing from environment.');
    return;
  }

  try {
    // We convert the stringified JSON from .env into a JavaScript object
    const serviceAccount = JSON.parse(serviceAccountRaw);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
      });
    }

    const bot = new ScraperBot();
    console.log(`Executing scrape cycle for project: ${projectId}...`);
    
    // Triggering the Application Layer logic to fetch and persist data
    await bot.executeDailyScrape();
    
    console.log('--- Test Completed Successfully ---');
    console.log('Action Required: Verify the "articles" collection in Firestore Console.');
  } catch (error) {
    // We log the error in English as per project standards
    console.error('Infrastructure failure: Failed to initialize Firebase or run scraper.', error);
  }
}

testScraper();