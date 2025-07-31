import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, increment, arrayUnion, updateDoc, getDocs, collection, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Creates a global promise that resolves when Firebase and other configurations
 * are successfully fetched and initialized. Other scripts can 'await' this promise
 * to ensure services are ready before they execute.
 */
window.firebaseReady = new Promise(async (resolve, reject) => {
  try {
    // Fetch the configuration from our Netlify serverless function.
    // Netlify automatically makes the function available at this path.
    const response = await fetch('/.netlify/functions/config');
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.statusText}`);
    }
    const config = await response.json();

    // Initialize Firebase with the fetched configuration
    const app = initializeApp(config.firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Expose Firebase instances and Gemini API keys globally
    // so other scripts can access them.
    window.firebaseInstances = {
      auth,
      db,
      onAuthStateChanged,
      signOut,
      sendPasswordResetEmail,
      doc,
      setDoc,
      onSnapshot,
      increment,
      arrayUnion,
      updateDoc,
      getDocs,
      collection,
      getDoc,
      geminiApiKeys: config.geminiApiKeys // Store the fetched Gemini keys
    };

    console.log("Firebase initialized and config loaded successfully.");
    resolve(); // Resolve the promise, signaling that initialization is complete.

  } catch (error) {
    console.error("Fatal Error: Could not initialize Firebase.", error);
    // Optionally, display an error message to the user on the page
    document.body.innerHTML = '<div style="color: red; text-align: center; padding: 2rem;">Could not load application configuration. Please try again later.</div>';
    reject(error); // Reject the promise on failure.
  }
});
