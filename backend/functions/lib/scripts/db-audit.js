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
/**
 * DatabaseAuditTool
 * This script audits the live Firestore structure to define the System of Record.
 * Why: To prevent hallucinations by the AI and ensure field name consistency.
 */
async function runLiveAudit() {
    // Explicitly loading env from the frontend directory as per project structure
    const envPath = path.resolve(__dirname, '../../../../frontend/.env');
    dotenv.config({ path: envPath });
    console.log(`>>> [CONFIG] Environment loaded from: ${envPath}`);
    try {
        const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountRaw) {
            throw new Error("FIREBASE_SERVICE_ACCOUNT is missing from the .env file.");
        }
        const serviceAccount = JSON.parse(serviceAccountRaw);
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        const db = admin.firestore();
        const collections = await db.listCollections();
        if (collections.length === 0) {
            console.log(">>> [STATUS] Connection successful, but the database is empty.");
            return;
        }
        console.log(`>>> [SUCCESS] Audit found ${collections.length} top-level collections.\n`);
        for (const col of collections) {
            console.log(`--- Collection Structure: ${col.id} ---`);
            const snapshot = await col.limit(1).get();
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                Object.keys(data).forEach(key => {
                    console.log(`  - ${key} (${typeof data[key]})`);
                });
                // Checking for critical Sub-collections (Privacy/Double Opt-in logic)
                const subs = await snapshot.docs[0].ref.listCollections();
                for (const sub of subs) {
                    console.log(`  [Sub-collection: ${sub.id}]`);
                }
            }
            console.log("");
        }
    }
    catch (error) {
        // Implementing Type Guard to solve error TS18046
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(">>> [CRITICAL] Audit failed:", errorMessage);
    }
}
runLiveAudit().then(() => {
    console.log(">>> [FINISH] Process exited.");
    process.exit(0);
});
