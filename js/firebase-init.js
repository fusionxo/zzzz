/**
 * @fileoverview Initializes Firebase and exports the necessary services and functions.
 * This file uses ES Module syntax (import/export) to be compatible with modern browsers.
 * @version 2.0.0
 */

// Use ES Module imports from the Firebase CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    addDoc, 
    updateDoc,
    serverTimestamp,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-functions.js";

// =================================================================================
// IMPORTANT: Replace with your actual Firebase project configuration
// You can find this in your project's settings in the Firebase console.
// =================================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAS1fvvgtRXx9wLwmJec-2tkBX2PlnAuN0",
    authDomain: "calversev2.firebaseapp.com",
    projectId: "calversev2",
    storageBucket: "calversev2.appspot.com",
    messagingSenderId: "794294005093",
    appId: "1:794294005093:web:6104521d5e4a2de812858c",
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Export everything needed by other modules so they can be imported elsewhere.
export { 
    app, 
    auth, 
    db, 
    functions,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    doc,
    getDoc,
    setDoc,
    collection,
    addDoc,
    updateDoc,
    serverTimestamp,
    httpsCallable,
    query,
    where,
    getDocs
};
