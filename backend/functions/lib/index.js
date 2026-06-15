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
exports.triggerScraperBot = exports.scheduledScraper = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const ScraperBot_1 = require("./services/scraper/ScraperBot");
admin.initializeApp();
/**
 * Scheduled Cloud Function that runs every morning at 08:00 AM.
 * It initiates the content scraper to populate the manager's review table.
 */
exports.scheduledScraper = functions.pubsub
    .schedule('0 8 * * *')
    .timeZone('Israel')
    .onRun(async (context) => {
    const bot = new ScraperBot_1.ScraperBot();
    await bot.executeDailyScrape();
    return null;
});
/**
 * Callable Cloud Function to trigger the scraper manually from the frontend.
 */
exports.triggerScraperBot = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to trigger the bot.');
    }
    // Optionally verify if user is an admin.
    // We can do this by checking context.auth.token.role === 'admin' if custom claims exist,
    // or simply rely on the frontend hiding the button, but backend security is best.
    // For now, we ensure authentication.
    try {
        const bot = new ScraperBot_1.ScraperBot();
        await bot.executeDailyScrape();
        return { success: true, message: 'Scrape cycle completed successfully.' };
    }
    catch (error) {
        console.error('Error triggering ScraperBot:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while running the scraper bot.');
    }
});
