/**
 * @fileoverview Handles the Recipe Generator, Cravings Solver, and Recipe Makeover tools.
 * @version 1.4.2
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase and config to be ready
    await window.firebaseReady;
    'use strict';

    window.healthHub = window.healthHub || {};

    const { geminiApiKeys } = window.firebaseInstances || {};

    const dom = {
        // Recipe Generator
        ingredientsInput: document.getElementById('recipe-ingredients-input'),
        findRecipesBtn: document.getElementById('find-recipes-btn'),
        clearRecipesBtn: document.getElementById('clear-recipes-btn'),
        recipeResults: document.getElementById('recipe-results'),

        // Cravings Solver
        cravingInput: document.getElementById('craving-input'),
        solveCravingBtn: document.getElementById('solve-craving-btn'),
        clearCravingBtn: document.getElementById('clear-craving-btn'),
        cravingResults: document.getElementById('craving-results'),

        // Recipe Makeover
        makeoverInput: document.getElementById('makeover-input'),
        makeoverBtn: document.getElementById('makeover-btn'),
        clearMakeoverBtn: document.getElementById('clear-makeover-btn'),
        makeoverResults: document.getElementById('makeover-results'),
    };

    if (!dom.findRecipesBtn) {
        return;
    }

    // --- Gemini API Configuration with Failover ---
    const GEMINI_API_CONFIGS = (geminiApiKeys.tools || []).map(key => ({
        key,
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    }));
    
    let currentApiIndex = 0;
    let lastApiCallTimestamp = 0;
    const API_COOLDOWN = 4000; // 4 seconds

    const showStatus = (container, type, message = '') => {
        if (!container) return;
        if (type === 'loading') {
            container.innerHTML = '<div class="flex justify-center p-4"><div class="loader"></div></div>';
        } else if (type === 'error') {
            container.innerHTML = `<div class="text-red-400 text-center p-4 bg-red-900/20 rounded-lg"><strong>Error:</strong> ${message}</div>`;
        } else if (type === 'message') {
            container.innerHTML = `<div class="text-sub text-center p-4">${message}</div>`;
        }
    };

    const safeJsonParse = (text) => {
        const cleanedText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanedText);
    };

    /**
     * Fetches data from Gemini API with cooldown and failover logic.
     * @param {string} prompt - The prompt to send to the API.
     * @returns {Promise<Object>} The JSON response from the API.
     */
    const geminiFetchWithCooldown = async (prompt) => {
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
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
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


    // --- Recipe Generator ---
    const handleFindRecipes = async () => {
        const ingredients = dom.ingredientsInput.value.trim();
        if (!ingredients) {
            showStatus(dom.recipeResults, 'error', 'Please enter some ingredients.');
            return;
        }
        const sanitizedIngredients = DOMPurify.sanitize(ingredients);
        showStatus(dom.recipeResults, 'loading');
        dom.findRecipesBtn.disabled = true;
        try {
            const prompt = `Find 2 simple indian homemade recipes using: ${sanitizedIngredients}. Respond with a valid JSON array. Each object must have "title", "ingredients" (array of strings), and "instructions" (array of strings). The response must be only the JSON array.`;

            const result = await geminiFetchWithCooldown(prompt);

            if (!result.candidates || result.candidates.length === 0) {
                 throw new Error("No recipes were generated. please try again with entering the food seperated by coma.");
            }
            const recipes = safeJsonParse(result.candidates[0].content.parts[0].text);
            renderRecipes(recipes);
        } catch (error) {
            console.error("Recipe Generator Error:", error);
            showStatus(dom.recipeResults, 'error', error.message || "Couldn't generate recipes. Please try rephrasing.");
        } finally {
            dom.findRecipesBtn.disabled = false;
        }
    };

    const renderRecipes = (recipes) => {
        if (!recipes || !Array.isArray(recipes)) {
             showStatus(dom.recipeResults, 'error', "Received an invalid format for recipes.");
             return;
        }
        dom.recipeResults.innerHTML = recipes.map(recipe => {
            const sanitizedTitle = DOMPurify.sanitize(recipe.title);
            const sanitizedIngredients = recipe.ingredients.map(ing => `<li>${DOMPurify.sanitize(ing)}</li>`).join('');
            const sanitizedInstructions = recipe.instructions.map(step => `<li>${DOMPurify.sanitize(step)}</li>`).join('');
            return `
            <div class="card p-4 sm:p-6 bg-background-dark">
                <h4 class="font-bold text-lg text-primary">${sanitizedTitle}</h4>
                <div class="mt-3">
                    <h5 class="font-semibold text-main">Ingredients:</h5>
                    <ul class="list-disc list-inside text-sub text-sm space-y-1 mt-2">
                        ${sanitizedIngredients}
                    </ul>
                </div>
                <div class="mt-4">
                    <h5 class="font-semibold text-main">Instructions:</h5>
                    <ol class="list-decimal list-inside text-sub text-sm space-y-1 mt-2">
                        ${sanitizedInstructions}
                    </ol>
                </div>
            </div>
        `}).join('');
    };

    const handleClearRecipes = () => {
        dom.ingredientsInput.value = '';
        dom.recipeResults.innerHTML = '';
    };

    // --- Cravings Solver ---
    const handleSolveCraving = async () => {
        const craving = dom.cravingInput.value.trim();
        if (!craving) {
            showStatus(dom.cravingResults, 'error', 'Please enter a craving.');
            return;
        }
        const sanitizedCraving = DOMPurify.sanitize(craving);
        showStatus(dom.cravingResults, 'loading');
        dom.solveCravingBtn.disabled = true;
        try {
            const prompt = `I'm craving ${sanitizedCraving}. Suggest 2 healthy indian alternatives. Respond with a valid JSON array. Each object must have "name" and "description" (a brief, one-sentence explanation). The response must be only the JSON array.`;

            const result = await geminiFetchWithCooldown(prompt);

            if (!result.candidates || result.candidates.length === 0) {
                throw new Error("No content was found.");
            }
            const alternatives = safeJsonParse(result.candidates[0].content.parts[0].text);
            renderCravingAlternatives(alternatives);
        } catch (error) {
            console.error("Cravings Solver Error:", error);
            showStatus(dom.cravingResults, 'error', error.message || "Couldn't find alternatives. Please try again.");
        } finally {
            dom.solveCravingBtn.disabled = false;
        }
    };

    const renderCravingAlternatives = (alternatives) => {
        if (!alternatives || !Array.isArray(alternatives)) {
             showStatus(dom.cravingResults, 'error', "Received an invalid format for alternatives.");
             return;
        }
        dom.cravingResults.innerHTML = alternatives.map(alt => {
            const sanitizedName = DOMPurify.sanitize(alt.name);
            const sanitizedDescription = DOMPurify.sanitize(alt.description);
            return `
            <div class="card p-4 sm:p-5 bg-background-dark">
                <h4 class="font-bold text-lg text-primary">${sanitizedName}</h4>
                <p class="text-sub text-sm mt-2">${sanitizedDescription}</p>
            </div>
        `}).join('<div class="my-4"></div>');
    };

    const handleClearCraving = () => {
        dom.cravingInput.value = '';
        dom.cravingResults.innerHTML = '';
    };

    // --- Recipe Makeover ---
    const handleMakeover = async () => {
        const ingredients = dom.makeoverInput.value.trim();
        if (!ingredients) {
            showStatus(dom.makeoverResults, 'error', 'Please enter a recipe or ingredients seperated with ",".');
            return;
        }
        const sanitizedIngredients = DOMPurify.sanitize(ingredients);
        showStatus(dom.makeoverResults, 'loading');
        dom.makeoverBtn.disabled = true;
        try {
            const prompt = `Analyze this recipe: "${sanitizedIngredients}". Suggest 2-3 indian healthier swaps. Respond with a valid JSON object with two keys: "estimated_savings" (a string like "You could save up to 150 calories and 10g of fat.") and "swaps" (an array of objects, where each object has "original", "swap", and "notes"). The response must be only the JSON object.`;

            const result = await geminiFetchWithCooldown(prompt);

            if (!result.candidates || result.candidates.length === 0) {
                throw new Error("No makeover suggestions were generated.");
            }
            const makeover = safeJsonParse(result.candidates[0].content.parts[0].text);
            renderMakeover(makeover);
        } catch (error) {
            console.error("Recipe Makeover Error:", error);
            showStatus(dom.makeoverResults, 'error', error.message || "Couldn't generate a makeover. Please try again.");
        } finally {
            dom.makeoverBtn.disabled = false;
        }
    };

    const renderMakeover = (makeover) => {
        if (!makeover || !makeover.swaps) {
            showStatus(dom.makeoverResults, 'error', 'Received an invalid format for the makeover.');
            return;
        }
        const sanitizedSavings = DOMPurify.sanitize(makeover.estimated_savings);
        const savingsHTML = makeover.estimated_savings ? `<div class="p-4 rounded-lg bg-primary/10 text-primary text-center font-semibold mb-4">${sanitizedSavings}</div>` : '';
        const swapsHTML = makeover.swaps.map(swap => {
            const sanitizedOriginal = DOMPurify.sanitize(swap.original);
            const sanitizedSwap = DOMPurify.sanitize(swap.swap);
            const sanitizedNotes = DOMPurify.sanitize(swap.notes);
            return `
            <div class="grid grid-cols-3 items-center gap-4 text-sm">
                <div class="text-center p-2 rounded bg-red-900/40">${sanitizedOriginal}</div>
                <div class="text-center"><i data-lucide="arrow-right" class="w-5 h-5 mx-auto text-sub"></i></div>
                <div class="text-center p-2 rounded bg-green-900/40">${sanitizedSwap}</div>
                <p class="col-span-3 text-xs text-sub text-center mt-1">${sanitizedNotes}</p>
            </div>
        `}).join('<hr class="border-zinc-700 my-4">');

        dom.makeoverResults.innerHTML = `
            <div class="card p-4 sm:p-6 bg-background-dark">
                ${savingsHTML}
                <div class="space-y-4">${swapsHTML}</div>
            </div>`;
        lucide.createIcons();
    };

    const handleClearMakeover = () => {
        dom.makeoverInput.value = '';
        dom.makeoverResults.innerHTML = '';
    };

    // --- Event Listeners ---
    if (dom.findRecipesBtn) dom.findRecipesBtn.addEventListener('click', handleFindRecipes);
    if (dom.clearRecipesBtn) dom.clearRecipesBtn.addEventListener('click', handleClearRecipes);

    if (dom.solveCravingBtn) dom.solveCravingBtn.addEventListener('click', handleSolveCraving);
    if (dom.clearCravingBtn) dom.clearCravingBtn.addEventListener('click', handleClearCraving);

    if (dom.makeoverBtn) dom.makeoverBtn.addEventListener('click', handleMakeover);
    if (dom.clearMakeoverBtn) dom.clearMakeoverBtn.addEventListener('click', handleClearMakeover);
});
