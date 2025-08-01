/**
 * @fileoverview Handles user login functionality.
 * Relies on the globally exposed firebaseInstances from firebase-init.js.
 * @version 2.0.0
 */

// This script now assumes firebase-init.js has already run and populated window.firebaseInstances
const {
    auth,
    db,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} = window.firebaseInstances;

const pageLoader = document.getElementById('page-loader');
const loginContainer = document.getElementById('login-container');
const loginForm = document.getElementById('login-form');
const alertBox = document.getElementById('alert-box');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const loginBtn = document.getElementById('login-btn');
const googleSignInBtn = document.getElementById('google-signin-btn');
const btnText = document.getElementById('btn-text');
const loader = document.getElementById('loader');

// --- No changes to the functions below, they now use the global Firebase instances ---

const showAlert = (message, type = 'error') => {
    alertBox.textContent = message;
    alertBox.classList.remove('hidden', 'bg-red-900/50', 'text-red-300', 'bg-green-900/50', 'text-green-300');
    if (type === 'error') {
        alertBox.classList.add('bg-red-900/50', 'text-red-300');
    } else {
        alertBox.classList.add('bg-green-900/50', 'text-green-300');
    }
};

const setLoading = (isLoading) => {
    loginBtn.disabled = isLoading;
    googleSignInBtn.disabled = isLoading;
    if (isLoading) {
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        loader.classList.add('hidden');
    }
};

const handleUserRedirect = async (user) => {
    const userDocRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDocRef);

    const storedUid = localStorage.getItem('calverseUid');
    if (storedUid !== user.uid) {
        localStorage.setItem('calverseUid', user.uid);
    }

    if (docSnap.exists() && docSnap.data().profileComplete) {
        window.location.href = 'dashboard.html';
    } else {
        window.location.href = 'welcomepage.html';
    }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        const storedUid = localStorage.getItem('calverseUid');
        if (user.uid === storedUid) {
            handleUserRedirect(user);
        } else {
            pageLoader.classList.add('hidden');
            loginContainer.classList.remove('hidden');
        }
    } else {
        localStorage.removeItem('calverseUid');
        pageLoader.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    alertBox.classList.add('hidden');
    setLoading(true);

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        showAlert('Login successful! Redirecting...', 'success');
        await handleUserRedirect(userCredential.user);
    } catch (error) {
        showAlert("Invalid credentials. Please try again.", 'error');
        setLoading(false);
    }
});

googleSignInBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    alertBox.classList.add('hidden');
    setLoading(true);

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                createdAt: serverTimestamp(),
                profileComplete: false,
                premium: "no"
            });
        }
        showAlert('Login successful! Redirecting...', 'success');
        await handleUserRedirect(user);

    } catch (error) {
        showAlert("Could not sign in with Google. Please try again.", 'error');
        setLoading(false);
    }
});

forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    if (!email) {
        showAlert('Please enter your email address to reset your password.', 'error');
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showAlert('Password reset email sent! Please check your inbox.', 'success');
    } catch (error) {
        showAlert('Could not send reset email. Please check the address.', 'error');
    }
});
