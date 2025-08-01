/**
 * @fileoverview Health Label Analyzer - Analyzes food labels using AI and provides health scores and personalized advice.
 * This version uses a secure Netlify proxy for all API calls.
 * @version 3.0.0
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- Firebase Instances (from global scope) ---
    const { auth, db, doc, getDoc } = window.firebaseInstances || {};

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
        clearFab: document.getElementById('la-clear-fab'),
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

    // --- State ---
    let currentStream = null;
    let capturedImageData = null;
    let lastAnalysisData = null;

    /**
     * Calls our secure Netlify proxy function.
     * @param {string} prompt - The prompt to send.
     * @param {string} type - The category of the call ('analyzer', 'dashboard', etc.)
     * @param {string|null} base64Image - The base64 encoded image string, if any.
     * @returns {Promise<Object>} The JSON response from the proxy.
     */
    const callProxyApi = async (prompt, type, base64Image = null) => {
        try {
            const response = await fetch('/api/gemini-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, type, base64Image })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || `Proxy Error: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to call proxy function:', error);
            throw error;
        }
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

        // Call the secure proxy instead of the direct API
        const result = await callProxyApi(prompt, 'analyzer', base64Image);

        if (!result.candidates || !result.candidates[0].content.parts[0].text) {
            throw new Error("Invalid response from analysis service.");
        }
        return result.candidates[0].content.parts[0].text;
    };

    // --- Personalized Suggestion Logic ---
    const getPersonalizedSuggestion = async () => {
        // ... (function logic remains the same)
        // It now calls callGeminiForText, which is already updated.
    };

    const callGeminiForText = async (prompt) => {
        // Call the secure proxy for text-only requests
        const result = await callProxyApi(prompt, 'analyzer'); // 'analyzer' keys are fine for this
        if (!result.candidates || !result.candidates[0].content.parts[0].text) {
            throw new Error("Invalid response from text generation service.");
        }
        return result.candidates[0].content.parts[0].text;
    };

    // --- All other functions (UI, Camera, Event Listeners) remain unchanged ---
    // ... (paste the rest of your analyzer.js code here, from init() onwards)
    // --- Initialization ---
    const init = () => {
        if (!auth || !db) {
            console.error("Firebase is not initialized. Personalized features will be disabled.");
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
