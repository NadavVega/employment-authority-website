import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDiNaKN9JkKIphBdy9fhZPdbbDdxu3_m6I",
    authDomain: "employemnt-autority.firebaseapp.com",
    projectId: "employemnt-autority",
    storageBucket: "employemnt-autority.firebasestorage.app",
    messagingSenderId: "375963334236",
    appId: "1:375963334236:web:75d179541e733071821899"
};

import { getFunctions } from "firebase/functions";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'us-central1'); // Default region

// Export the auth, db and storage instances for use in other parts of the application
export { auth, db, storage, functions };