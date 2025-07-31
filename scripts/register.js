import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

async function initializeRegister() {
    // Wait for the global firebaseReady promise to resolve
    await window.firebaseReady;

    // Now that config is loaded, we can safely access firebaseInstances
    const { auth, db } = window.firebaseInstances;

    const registerForm = document.getElementById('register-form');
    const alertBox = document.getElementById('alert-box');
    const registerBtn = document.getElementById('register-btn');
    const googleSignUpBtn = document.getElementById('google-signup-btn');
    const btnText = document.getElementById('btn-text');
    const loader = document.getElementById('loader');

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
        if (isLoading) {
            registerBtn.disabled = true;
            googleSignUpBtn.disabled = true;
            btnText.classList.add('hidden');
            loader.classList.remove('hidden');
        } else {
            registerBtn.disabled = false;
            googleSignUpBtn.disabled = false;
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    };

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = registerForm.email.value;
        const password = registerForm.password.value;
        const confirmPassword = registerForm['confirm-password'].value;
        alertBox.classList.add('hidden');

        if (password !== confirmPassword) {
            showAlert("Passwords do not match.", 'error');
            return;
        }

        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                createdAt: serverTimestamp(),
                profileComplete: false,
                premium: "no"
            });

            await signOut(auth);
            showAlert('Registration successful! Redirecting to login...', 'success');
            setTimeout(() => window.location.href = 'index.html', 2000);

        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                showAlert('This email is already registered. Please log in.', 'error');
            } else {
                showAlert('An error occurred during registration. Please try again.', 'error');
            }
        } finally {
            setLoading(false);
        }
    });

    googleSignUpBtn.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        alertBox.classList.add('hidden');

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                await signOut(auth);
                showAlert('This account already exists. Please log in.', 'error');
                setTimeout(() => window.location.href = 'index.html', 2000);
            } else {
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    email: user.email,
                    createdAt: serverTimestamp(),
                    profileComplete: false,
                    premium: "no"
                });
                 showAlert('Account created! Let\'s set up your profile...', 'success');
                setTimeout(() => {
                    window.location.href = 'welcomepage.html';
                }, 1500);
            }
        } catch (error) {
             showAlert('Could not sign up with Google. Please try again.', 'error');
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeRegister);
