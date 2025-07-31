import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

async function initializeWelcome() {
    // Wait for the global firebaseReady promise to resolve
    await window.firebaseReady;
    
    // Now that config is loaded, we can safely access firebaseInstances
    const { auth, db } = window.firebaseInstances;

    let userId;
    let currentStep = -1;
    let isAnimating = false;
    const cards = [];
    const cardData = [];

    const welcomeScreen = document.getElementById('welcome-screen');
    const welcomeTextEl = document.querySelector('.welcome-text');
    const startArrow = document.getElementById('start-arrow');
    const appContainer = document.getElementById('app-container');
    const formContainer = document.querySelector('.card-stack-container');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            userId = user.uid;
            console.log("User is signed in with UID:", userId);
        } else {
            console.error("User is not signed in. Redirecting to login.");
            window.location.href = 'index.html'; 
        }
    });

    const cardElements = Array.from(document.querySelectorAll('.card'));
    cardElements.forEach(card => cards.push(card));

    cardData.push(
        { id: 'step-1', validate: () => document.getElementById('name').value.trim() !== '' },
        { id: 'step-2', validate: () => formContainer.querySelector('input[name="gender"]:checked') },
        { id: 'step-3', validate: () => true },
        { id: 'step-4', validate: () => true },
        { id: 'step-5', validate: () => true },
        { id: 'step-6', validate: () => formContainer.querySelector('input[name="activity"]:checked') },
        { id: 'step-7', validate: () => true }
    );

    function animateWelcomeText() {
        const text = "welcome to calverse";
        welcomeTextEl.innerHTML = text.split('').map((char, i) => 
            `<span style="animation-delay: ${i * 0.05}s">${char === ' ' ? '&nbsp;' : char}</span>`
        ).join('');
    }
    
    function startApp() {
        welcomeScreen.classList.add('hidden');
        setTimeout(() => {
            appContainer.classList.add('visible');
            setInitialCardPositions();
        }, 500);
    }

    function setInitialCardPositions() {
        cards.forEach((card, index) => {
            card.style.opacity = 0;
            card.style.pointerEvents = 'none';
            card.style.transform = `translateY(30px) scale(0.95)`;
            card.style.display = 'none';
        });
        currentStep = 0;
        updateCardPositions();
    }
    
    async function updateCardPositions() {
        if (isAnimating) return;
        isAnimating = true;

        const prevCard = cards[currentStep - 1];
        const currentCard = cards[currentStep];

        if (prevCard) {
             prevCard.animate({
                transform: `translateY(-50px) scale(0.9)`,
                opacity: 0
            }, { duration: 400, easing: 'ease-in-out', fill: 'forwards' })
            .finished.then(() => prevCard.style.display = 'none');
        }
        
        if(currentCard) {
            currentCard.style.display = 'flex';
            currentCard.style.pointerEvents = 'auto';
            currentCard.animate({
                transform: 'translateY(0) scale(1)',
                opacity: 1
            }, { duration: 400, easing: 'ease-in-out', fill: 'forwards', delay: 100 });
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        isAnimating = false;

        if (currentStep === cards.length - 1) {
            setTimeout(saveProfileData, 1000); 
        }
    }

    function goToNextStep() {
        if (isAnimating) return;
        if (currentStep >= 0 && !cardData[currentStep].validate()) {
            cards[currentStep].animate([
                { transform: 'translateX(0)' }, { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' }, { transform: 'translateX(0)' }
            ], { duration: 500, easing: 'ease-in-out' });
            return;
        }

        if (currentStep < cardData.length - 1) {
            currentStep++;
            updateCardPositions();
        }
    }

    function goToPrevStep() {
        if (isAnimating || currentStep <= 0) return;
        
        isAnimating = true;
        const currentCard = cards[currentStep];
        const prevCard = cards[currentStep - 1];

        currentCard.animate({
            transform: 'translateY(50px) scale(0.95)',
            opacity: 0
        }, { duration: 400, easing: 'ease-in-out', fill: 'forwards' })
        .finished.then(() => currentCard.style.display = 'none');
        
        currentStep--;

        prevCard.style.display = 'flex';
        prevCard.style.pointerEvents = 'auto';
        prevCard.animate({
            transform: 'translateY(0) scale(1)',
            opacity: 1
        }, { duration: 400, easing: 'ease-in-out', fill: 'forwards', delay: 100 })
        .finished.then(() => isAnimating = false);
    }
    
    async function saveProfileData() {
        if (!userId) {
            console.error("Error: No user is signed in. Cannot save data.");
            document.getElementById('redirect-message').textContent = 'Authentication error. Please refresh.';
            return;
        }

        try {
            const profileData = {
                name: document.getElementById('name').value,
                gender: formContainer.querySelector('input[name="gender"]:checked').value,
                age: document.getElementById('age').value,
                height: document.getElementById('height').value,
                weight: document.getElementById('weight').value,
                activityLevel: formContainer.querySelector('input[name="activity"]:checked').value,
                profileComplete: true,
                updatedAt: serverTimestamp()
            };
            
            const userDocRef = doc(db, "users", userId);
            await updateDoc(userDocRef, profileData);
            
            document.getElementById('redirect-message').textContent = 'Redirecting to your dashboard...';
            
            console.log("Profile saved! Redirecting to dashboard.html");
          
            setTimeout(() => window.location.href = 'dashboard.html', 1500);

        } catch (error) {
            console.error("Error saving profile data: ", error);
            document.getElementById('redirect-message').textContent = 'Could not save profile. Please refresh.';
        }
    }
    
    startArrow.addEventListener('click', startApp);
    
    formContainer.addEventListener('click', e => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        if (target.dataset.action === 'next') goToNextStep();
        else if (target.dataset.action === 'prev') goToPrevStep();
    });
     
    formContainer.addEventListener('change', e => {
        if (e.target.type === 'radio') {
            setTimeout(goToNextStep, 400);
        }
    });
    
    document.getElementById('age').addEventListener('input', e => document.getElementById('ageValue').textContent = e.target.value);
    document.getElementById('height').addEventListener('input', e => document.getElementById('heightValue').textContent = e.target.value);
    document.getElementById('weight').addEventListener('input', e => document.getElementById('weightValue').textContent = e.target.value);

    animateWelcomeText();
}

document.addEventListener('DOMContentLoaded', initializeWelcome);
