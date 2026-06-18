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
const envPath = path.resolve(__dirname, '../../../frontend/.env');
dotenv.config({ path: envPath });
async function seedUsers() {
    console.log('--- Starting User Seeding Process ---');
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    if (!serviceAccountRaw) {
        console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT is missing from environment.');
        return;
    }
    const serviceAccount = JSON.parse(serviceAccountRaw);
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: projectId
        });
    }
    const db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    const auth = admin.auth();
    const mockUsers = [
        {
            email: 'admin@jerusalem.demo',
            password: 'Password123!',
            role: 'admin',
            fullName: 'Sarah Admin'
        },
        {
            email: 'coordinator@jerusalem.demo',
            password: 'Password123!',
            role: 'coordinator',
            fullName: 'David Coordinator'
        },
        {
            email: 'employer@jerusalem.demo',
            password: 'Password123!',
            role: 'employer',
            fullName: 'Rachel Employer'
        },
        {
            email: 'guest@jerusalem.demo',
            password: 'Password123!',
            role: 'guest',
            fullName: 'Yossi Guest'
        }
    ];
    for (const mock of mockUsers) {
        let userRecord;
        try {
            // Check if user already exists in Auth
            userRecord = await auth.getUserByEmail(mock.email);
            console.log(`Auth user ${mock.email} already exists. Updating password.`);
            await auth.updateUser(userRecord.uid, { password: mock.password });
        }
        catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Create new auth user
                userRecord = await auth.createUser({
                    email: mock.email,
                    password: mock.password,
                    displayName: mock.fullName,
                });
                console.log(`Created Auth user: ${mock.email}`);
            }
            else {
                console.error(`Error fetching/creating user ${mock.email}:`, error);
                continue;
            }
        }
        // Upsert into Firestore `users` collection using UID as the document ID
        // We also use Email as the document ID sometimes depending on the setup. 
        // Usually frontend services query by email for the whitelist.
        // In auth-context.jsx it does: `checkWhitelist(user.email)`. So let's use email as the document ID just in case, 
        // or store the email inside the doc. I'll use the email as the doc ID to ensure checkWhitelist works perfectly.
        const userDocRef = db.collection('users').doc(mock.email);
        const userData = {
            isWhitelisted: true,
            role: mock.role,
            profile: {
                fullName: mock.fullName,
                company: mock.role === 'employer' ? 'Tech Jerusalem Ltd.' : undefined,
                center: mock.role === 'coordinator' ? 'Downtown Hub' : undefined,
            },
            contactHistory: {}
        };
        await userDocRef.set(userData, { merge: true });
        console.log(`Seeded Firestore document for: ${mock.email} with role: ${mock.role}`);
    }
    console.log('--- User Seeding Process Completed Successfully ---');
}
seedUsers();
