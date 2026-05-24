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
exports.weeklyContentSummary = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Scheduled function to alert the Manager about pending articles.
 * Runs every Sunday at 08:00 AM Jerusalem time.
 */
exports.weeklyContentSummary = functions.pubsub
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
