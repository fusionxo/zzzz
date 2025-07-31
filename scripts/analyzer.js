/**
 * @fileoverview Health Label Analyzer - Analyzes food labels using AI and provides health scores and personalized advice.
 * @version 2.5.2
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase and config to be ready
    await window.firebaseReady;
    'use strict';

    // --- Firebase Instances and API Keys (from global scope) ---
    const { auth, db, doc, getDoc, geminiApiKeys } = window.firebaseInstances || {};

    // --- DOM Elements Cache ---
    const elements = {
        uploader: document.getElementById('la-uploader'),
        cameraButton: document.getElementById('la-camera-button'),
        uploadButton: document.getElementById('la-upload-button'),
        fileInput: document.getElementById('la-fileInput'),
        imagePreviewContainer: document.getElementById('la-imagePreviewContainer'),
        imagePreview: document.getElementById('la-imagePreview'),
        analyzeButton: document.getElementById('la-analyzeButton'),
        loader: document.getElementById('la-loader'),
        results: document.getElementById('la-results'),
        scoreSummary: document.getElementById('la-score-summary'),
        scoreBreakdown: document.getElementById('la-score-breakdown'),
        resetButton: document.getElementById('la-resetButton'),
        clearFab: document.getElementById('la-clear-fab'), // Floating Action Button
        cameraModal: document.getElementById('la-camera-modal'),
        cameraView: document.getElementById('la-camera-view'),
        cameraCanvas: document.getElementById('la-camera-canvas'),
        captureButton: document.getElementById('la-capture-button'),
        cancelCamera: document.getElementById('la-cancel-camera'),
        recaptureControls: document.getElementById('la-recapture-controls'),
        recaptureButton: document.getElementById('la-recapture-button'),
        usePhotoButton: document.getElementById('la-use-photo-button'),
        cameraControls: document.getElementById('la-camera-controls'),
        additiveModal: document.getElementById('la-additive-modal'),
        modalTitle: document.getElementById('la-modal-title'),
        modalBody: document.getElementById('la-modal-body'),
        chatExplainer: document.getElementById('la-chat-explainer'),
        askWhyButton: document.getElementById('la-ask-why-button'),
        chatResponseContainer: document.getElementById('la-chat-response-container'),
        chatResponse: document.getElementById('la-chat-response'),
    };

    // --- Configuration & State ---
    // Get Gemini API keys from the global config
    const GEMINI_API_CONFIGS = (geminiApiKeys.analyzer || []).map(key => ({
        key,
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    }));

    let currentApiIndex = 0;
    let lastApiCallTimestamp = 0;
    const API_COOLDOWN = 4000; // 4 seconds

    let currentStream = null;
    let capturedImageData = null;
    let lastAnalysisData = null;

    // --- Initialization ---
    const init = () => {
        if (!auth || !db) {
            console.error("Firebase is not initialized. Personalized features will be disabled.");
        }
        if (GEMINI_API_CONFIGS.length === 0 || !GEMINI_API_CONFIGS[0].key) {
            console.error("Gemini API keys for Analyzer are not configured.");
            // Optionally disable the feature
            if(elements.analyzeButton) elements.analyzeButton.disabled = true;
        }
        setupEventListeners();
        setupDragAndDrop();
        setupPasteHandler();
    };

    // --- Event Listeners Setup ---
    const setupEventListeners = () => {
        elements.cameraButton?.addEventListener('click', openCamera);
        elements.uploadButton?.addEventListener('click', () => elements.fileInput?.click());
        elements.fileInput?.addEventListener('change', handleFileSelect);
        elements.analyzeButton?.addEventListener('click', analyzeImage);
        elements.resetButton?.addEventListener('click', resetAnalyzer);
        elements.clearFab?.addEventListener('click', resetAnalyzer); // FAB listener
        elements.captureButton?.addEventListener('click', capturePhoto);
        elements.cancelCamera?.addEventListener('click', closeCamera);
        elements.recaptureButton?.addEventListener('click', recapture);
        elements.usePhotoButton?.addEventListener('click', usePhoto);
        elements.askWhyButton?.addEventListener('click', getPersonalizedSuggestion);
    };

    // --- Drag-and-Drop & Paste Handlers ---
    const setupDragAndDrop = () => {
        const uploaderEl = elements.uploader;
        if (!uploaderEl) return;
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => uploaderEl.addEventListener(eventName, preventDefaults));
        ['dragenter', 'dragover'].forEach(eventName => uploaderEl.addEventListener(eventName, () => uploaderEl.classList.add('border-primary', 'bg-primary/10')));
        ['dragleave', 'drop'].forEach(eventName => uploaderEl.addEventListener(eventName, () => uploaderEl.classList.remove('border-primary', 'bg-primary/10')));
        uploaderEl.addEventListener('drop', handleDrop);
    };

    const setupPasteHandler = () => {
        document.addEventListener('paste', (e) => {
            const file = Array.from(e.clipboardData?.files || []).find(f => f.type.startsWith('image/'));
            if (file) handleImageFile(file);
        });
    };

    // --- Utility Functions ---
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        const file = e.dataTransfer.files[0];
        if (file) handleImageFile(file);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) handleImageFile(file);
    };

    const handleImageFile = (file) => {
        if (!file.type.startsWith('image/')) {
            showNotification('Please select a valid image file.', true);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => displayImagePreview(e.target.result);
        reader.readAsDataURL(file);
    };

    const displayImagePreview = (imageSrc) => {
        if (!elements.imagePreview || !elements.imagePreviewContainer) return;
        elements.imagePreview.src = imageSrc;
        elements.imagePreviewContainer.classList.remove('hidden');
        elements.uploader.style.display = 'none';
        hideResults();
        hideLoader();
    };

    // --- Camera Functions ---
    const openCamera = async () => {
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            elements.cameraView.srcObject = currentStream;
            elements.cameraModal.classList.remove('hidden');
            elements.cameraControls.classList.remove('hidden');
            elements.recaptureControls.classList.add('hidden');
        } catch (error) {
            console.error('Camera access error:', error);
            showNotification('Unable to access camera. Please try uploading an image instead.', true);
        }
    };

    const closeCamera = () => {
        currentStream?.getTracks().forEach(track => track.stop());
        currentStream = null;
        elements.cameraModal.classList.add('hidden');
        capturedImageData = null;
    };

    const capturePhoto = () => {
        const canvas = elements.cameraCanvas;
        const video = elements.cameraView;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        capturedImageData = canvas.toDataURL('image/jpeg', 0.8);
        elements.cameraView.srcObject = null;
        elements.cameraView.src = capturedImageData;
        elements.cameraControls.classList.add('hidden');
        elements.recaptureControls.classList.remove('hidden');
    };

    const recapture = () => {
        elements.cameraView.src = '';
        elements.cameraView.srcObject = currentStream;
        elements.cameraControls.classList.remove('hidden');
        elements.recaptureControls.classList.add('hidden');
        capturedImageData = null;
    };

    const usePhoto = () => {
        if (capturedImageData) {
            displayImagePreview(capturedImageData);
            closeCamera();
        }
    };

    // --- Gemini API Wrappers with Cooldown & Failover ---
    const geminiFetchWithCooldown = async (bodyPayload) => {
        const now = Date.now();
        if (now - lastApiCallTimestamp < API_COOLDOWN) {
            throw new Error(`Please wait ${Math.ceil((API_COOLDOWN - (now - lastApiCallTimestamp)) / 1000)}s.`);
        }
        
        if (GEMINI_API_CONFIGS.length === 0) {
             throw new Error("API keys are not configured.");
        }

        let lastError = null;
        for (let i = 0; i < GEMINI_API_CONFIGS.length; i++) {
            const config = GEMINI_API_CONFIGS[currentApiIndex];
            const apiUrl = `${config.url}?key=${config.key}`;

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyPayload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error.message || `API Error: ${response.statusText}`);
                }

                lastApiCallTimestamp = Date.now();
                return await response.json();

            } catch (error) {
                console.warn(`API at index ${currentApiIndex} failed. Trying next...`, error);
                lastError = error;
                currentApiIndex = (currentApiIndex + 1) % GEMINI_API_CONFIGS.length;
            }
        }
        throw new Error(`All API attempts failed. Last error: ${lastError.message}`);
    };

    // --- Analysis Core Logic ---
    const analyzeImage = async () => {
        if (!elements.imagePreview.src) {
            showNotification('Please select an image first.', true);
            return;
        }
        showLoader();
        hideResults();

        try {
            const base64Image = await getBase64FromImage(elements.imagePreview.src);
            const analysisResultText = await callGeminiAPIForAnalysis(base64Image);
            const cleanedText = analysisResultText.replace(/```json\s*|\s*```/g, '').trim();
            const analysisResult = JSON.parse(cleanedText);

            if (analysisResult && analysisResult.scores) {
                lastAnalysisData = analysisResult.scores;
                displayResults(lastAnalysisData);
            } else {
                throw new Error('Invalid analysis structure in response.');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            showNotification(`Analysis failed: ${error.message}`, true);
            resetAnalyzer();
        } finally {
            hideLoader();
        }
    };

    const getBase64FromImage = (imageSrc) => {
        if (imageSrc.startsWith('data:')) return Promise.resolve(imageSrc.split(',')[1]);
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
            };
            img.onerror = reject;
            img.src = imageSrc;
        });
    };

    const callGeminiAPIForAnalysis = async (base64Image) => {
        const prompt = `Analyze this food label image and provide a comprehensive health assessment. Return your response as a valid JSON object with this exact structure:
{
  "scores": {
    "glycemic_nutrient_density": { "score": "[number 1-10]", "reason": "[detailed explanation]" },
    "micronutrient_bioavailability": { "score": "[number 1-10]", "reason": "[detailed explanation]" },
    "health_trifecta": { "score": "[number 1-10]", "reason": "[detailed explanation]" },
    "ingredient_quality": { "score": "[number 1-10]", "reason": "[detailed explanation]" },
    "processing_additives": { "score": "[number 1-10]", "reason": "[detailed explanation]", "additives": ["list", "of", "additives"] },
    "carcinogenic_risk": { "score": "[number 1-10]", "reason": "[detailed explanation]" }
  }
}
Scoring: 1-3 (Poor), 4-6 (Fair), 7-8 (Good), 9-10 (Excellent). Provide detailed reasoning for each score.`;

        const payload = {
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Image } }] }],
            generationConfig: { responseMimeType: "application/json" }
        };

        const result = await geminiFetchWithCooldown(payload);
        if (!result.candidates || !result.candidates[0].content.parts[0].text) {
            throw new Error("Invalid response from analysis service.");
        }
        return result.candidates[0].content.parts[0].text;
    };

    // --- Personalized Suggestion Logic ---
    const getPersonalizedSuggestion = async () => {
        if (!auth?.currentUser) {
            showNotification("You must be logged in for personalized advice.", true);
            return;
        }
        if (!lastAnalysisData) {
            showNotification("Please analyze a product first.", true);
            return;
        }

        const button = elements.askWhyButton;
        button.disabled = true;
        button.innerHTML = `<div class="loader !w-5 !h-5 !border-2 !border-t-black mx-auto"></div>`;
        elements.chatResponseContainer.classList.remove('hidden');
        elements.chatResponse.innerHTML = `<div class="flex justify-center"><div class="loader"></div></div>`;

        try {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                throw new Error("Could not find your user profile.");
            }

            const userData = userDocSnap.data();

            const firstName = (userData.name || 'there').split(' ')[0];
            const userProfile = {
                name: firstName,
                age: userData.age || 'an adult',
                gender: userData.gender || 'not specified',
                activityLevel: userData.activityLevel || 'a general',
                calorieGoal: userData.calorieGoal || 2000,
            };

            const prompt = `
                Act as a friendly, caring, and professional health advisor. Your name is Dr. Calverse.
                You are speaking to ${userProfile.name}, who is ${userProfile.age} years old with a ${userProfile.activityLevel} activity level. Their daily calorie goal is ~${userProfile.calorieGoal} kcal.
                
                Here is the health analysis of a food product they scanned: ${JSON.stringify(lastAnalysisData)}.

                Provide a personalized response. Structure your response with the following markdown headings. Use a warm, encouraging, and non-judgmental tone. Do not mention that you are a language model. Only use the user's first name once in the opening sentence.

                **Okay ${userProfile.name}, let's take a look at this! Here's a quick breakdown:**

                **The Good Stuff:**
                (A short, positive point about its benefits. Connect it to the user if possible.)

                **A Little Caution:**
                (A gentle, supportive explanation of the drawbacks, relating it to the user's profile.)

                **Healthier Swaps:**
                (Suggest three simple, varied, and practical Indian alternatives.)

                **My Friendly Advice:**
                (A warm, personalized tip from Dr. Calverse that is encouraging. Address the user directly without using their name again.)

                **The Bottom Line:**
                (A one-line summary verdict for this specific user.)
            `;

            const responseText = await callGeminiForText(prompt);
            const sanitizedText = DOMPurify.sanitize(responseText);

            const formattedHtml = sanitizedText
                .replace(/\*\*(.*?):\*\*/g, '<strong>$1</strong>')
                .split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .map(line => `<p>${line}</p>`)
                .join('');

            elements.chatResponse.innerHTML = formattedHtml;

        } catch (error) {
            console.error("Personalized suggestion error:", error);
            elements.chatResponse.innerHTML = `<p class="text-red-400">Sorry, I couldn't generate a personalized explanation right now. Error: ${error.message}</p>`;
        } finally {
            button.disabled = false;
            button.innerHTML = `<i data-lucide="refresh-cw" class="mr-2"></i><span>Regenerate Advice</span>`;
            if (window.lucide) lucide.createIcons();
        }
    };

    const callGeminiForText = async (prompt) => {
        const payload = {
            contents: [{ parts: [{ text: prompt }] }]
        };
        const result = await geminiFetchWithCooldown(payload);
        if (!result.candidates || !result.candidates[0].content.parts[0].text) {
            throw new Error("Invalid response from text generation service.");
        }
        return result.candidates[0].content.parts[0].text;
    };

    // --- UI Display & Management ---
    const showLoader = () => elements.loader?.classList.remove('hidden');
    const hideLoader = () => elements.loader?.classList.add('hidden');

    const hideResults = () => {
        if (elements.results) {
            elements.results.classList.remove('visible');
            elements.results.style.display = 'none';
        }
        elements.chatExplainer?.classList.add('hidden');
        elements.chatResponseContainer?.classList.add('hidden');
        elements.chatResponse.innerHTML = '';
        elements.clearFab?.classList.remove('visible'); // Hide FAB
    };

    const displayResults = (scores) => {
        if (!elements.results || !elements.scoreSummary || !elements.scoreBreakdown) return;

        elements.scoreSummary.innerHTML = '';
        elements.scoreBreakdown.innerHTML = '';

        const scoreValues = Object.values(scores).map(item => Number(item?.score) || 0);
        const overallScore = Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length);
        const gradeInfo = getGradeInfo(overallScore);

        elements.scoreSummary.innerHTML = `
            <div class="text-center p-4 sm:p-6 card mb-6">
                <div class="text-5xl sm:text-6xl font-bold mb-2" style="color: ${gradeInfo.color};">${gradeInfo.grade}</div>
                <div class="text-lg sm:text-xl font-semibold text-main mb-1">Overall Health Score</div>
                <div class="text-sub text-sm sm:text-base">${overallScore}/10 - ${gradeInfo.label}</div>
            </div>`;

        const categoryData = {
            'glycemic_nutrient_density': { name: 'Glycemic & Nutrient Density', icon: 'trending-up' },
            'micronutrient_bioavailability': { name: 'Micronutrient Bioavailability', icon: 'pill' },
            'health_trifecta': { name: 'Health Trifecta', icon: 'heart' },
            'ingredient_quality': { name: 'Ingredient Quality', icon: 'leaf' },
            'processing_additives': { name: 'Processing & Additives', icon: 'flask-conical' },
            'carcinogenic_risk': { name: 'Carcinogenic Risk', icon: 'shield-alert' }
        };

        let breakdownHTML = '';
        Object.entries(scores).forEach(([category, data]) => {
            const categoryInfo = categoryData[category];
            if (!categoryInfo) return;
            const { score = 0, reason = 'No analysis available', additives = [] } = data;
            const gradeInfo = getGradeInfo(score);
            const sanitizedReason = DOMPurify.sanitize(reason);
            breakdownHTML += `
                <div class="card p-4 mb-3">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-3"><i data-lucide="${categoryInfo.icon}" class="w-5 h-5 text-primary"></i><h4 class="font-semibold text-main">${categoryInfo.name}</h4></div>
                        <div class="text-right"><div class="text-xl sm:text-2xl font-bold" style="color: ${gradeInfo.color};">${gradeInfo.grade}</div><div class="text-xs sm:text-sm text-sub">${score}/10</div></div>
                    </div>
                    <p class="text-sub text-sm leading-relaxed">${sanitizedReason}</p>
                    ${additives.length > 0 ? `<div class="mt-3 pt-3 border-t border-zinc-700"><p class="text-sm font-semibold text-main mb-2">Concerning Additives:</p><div class="flex flex-wrap gap-2">${additives.map(a => `<span class="clickable-additive text-xs px-2 py-1 bg-red-900/30 text-red-300 rounded-full" onclick="showAdditiveInfo('${a}')">${a}</span>`).join('')}</div></div>` : ''}
                </div>`;
        });
        elements.scoreBreakdown.innerHTML = breakdownHTML;

        elements.results.style.display = 'block';
        setTimeout(() => elements.results.classList.add('visible'), 50);

        elements.chatExplainer?.classList.remove('hidden');
        elements.clearFab?.classList.add('visible'); // Show FAB

        if (window.lucide) lucide.createIcons();
    };

    const getGradeInfo = (score) => {
        if (score >= 9) return { grade: 'A+', color: '#10B981', label: 'Excellent' };
        if (score >= 8) return { grade: 'A', color: '#34D399', label: 'Very Good' };
        if (score >= 7) return { grade: 'B', color: '#FBBF24', label: 'Good' };
        if (score >= 5) return { grade: 'C', color: '#F97316', label: 'Fair' };
        return { grade: 'F', color: '#EF4444', label: 'Poor' };
    };

    const resetAnalyzer = () => {
        elements.imagePreviewContainer?.classList.add('hidden');
        elements.imagePreview.src = '';
        elements.uploader.style.display = 'block';
        elements.fileInput.value = '';
        hideResults();
        hideLoader();
        capturedImageData = null;
        lastAnalysisData = null;
    };

    const showNotification = (message, isError = false) => {
        const popup = document.getElementById('popup-notification');
        if (!popup) return;
        popup.querySelector('p').textContent = message;
        popup.className = `fixed top-8 left-1/2 -translate-x-1/2 p-4 rounded-lg text-white shadow-lg opacity-0 -translate-y-4 pointer-events-none transition-transform transition-opacity duration-300 z-50`;
        popup.classList.add(isError ? 'bg-red-600' : 'bg-green-600');

        requestAnimationFrame(() => {
            popup.classList.remove('opacity-0', '-translate-y-4');
        });

        setTimeout(() => {
            popup.classList.add('opacity-0', '-translate-y-4');
        }, 4000);
    };

    // --- Global Functions for Modal ---
    window.showAdditiveInfo = async (additiveName) => {
        if (!elements.additiveModal) return;
        elements.modalTitle.textContent = additiveName;
        elements.modalBody.innerHTML = '<div class="loader mx-auto"></div>';
        elements.additiveModal.classList.remove('hidden');
        try {
            const info = await callGeminiForText(`Provide detailed information about the food additive "${additiveName}". Include its purpose, potential health effects, and safety concerns. Keep the response concise but informative.`);
            elements.modalBody.innerHTML = `<div class="text-sub whitespace-pre-wrap">${DOMPurify.sanitize(info)}</div>`;
        } catch (error) {
            elements.modalBody.innerHTML = `<div class="text-red-400">Failed to load additive information. ${error.message}</div>`;
        }
    };

    window.closeModal = () => elements.additiveModal?.classList.add('hidden');

    // --- Start the App ---
    init();
});
