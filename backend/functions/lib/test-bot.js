"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const ScraperBot_1 = require("./services/scraper/ScraperBot");
// We resolve the absolute path to the frontend .env to ensure consistency
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
/**
 * Emergency test runner for the ScraperBot.
 * It manually initializes the Admin SDK using the stringified JSON from .env
 */
async function testScraper() {
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
        const bot = new ScraperBot_1.ScraperBot();
        console.log(`Executing scrape cycle for project: ${projectId}...`);
        // Triggering the Application Layer logic to fetch and persist data
        await bot.executeDailyScrape();
        console.log('--- Test Completed Successfully ---');
        console.log('Action Required: Verify the "articles" collection in Firestore Console.');
    }
    catch (error) {
        // We log the error in English as per project standards
        console.error('Infrastructure failure: Failed to initialize Firebase or run scraper.', error);
    }
}
testScraper();
