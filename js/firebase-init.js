import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, increment, arrayUnion, updateDoc, getDocs, collection, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAS1fvvgtRXx9wLwmJec-2tkBX2PlnAuN0",
    authDomain: "calversev2.firebaseapp.com",
    projectId: "calversev2",
    storageBucket: "calversev2.appspot.com",
    messagingSenderId: "794294005093",
    appId: "1:794294005093:web:6104521d5e4a2de812858c",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


window.firebaseInstances = { auth, db, onAuthStateChanged, signOut, sendPasswordResetEmail, doc, setDoc, onSnapshot, increment, arrayUnion, updateDoc, getDocs, collection, getDoc };