/**
 * @fileoverview Handles the Recipe Generator, Cravings Solver, and Recipe Makeover tools.
 * This version uses a secure Netlify proxy for all API calls.
 * @version 2.0.0
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    window.healthHub = window.healthHub || {};

    const dom = {
        ingredientsInput: document.getElementById('recipe-ingredients-input'),
        findRecipesBtn: document.getElementById('find-recipes-btn'),
        clearRecipesBtn: document.getElementById('clear-recipes-btn'),
        recipeResults: document.getElementById('recipe-results'),
        cravingInput: document.getElementById('craving-input'),
        solveCravingBtn: document.getElementById('solve-craving-btn'),
        clearCravingBtn: document.getElementById('clear-craving-btn'),
        cravingResults: document.getElementById('craving-results'),
        makeoverInput: document.getElementById('makeover-input'),
        makeoverBtn: document.getElementById('makeover-btn'),
        clearMakeoverBtn: document.getElementById('clear-makeover-btn'),
        makeoverResults: document.getElementById('makeover-results'),
    };

    /**
     * Calls our secure Netlify proxy function.
     * @param {string} prompt - The prompt to send.
     * @param {string} type - The category of the call ('analyzer', 'dashboard', etc.)
     * @returns {Promise<Object>} The JSON response from the proxy.
     */
    const callProxyApi = async (prompt, type) => {
        try {
            const response = await fetch('/api/gemini-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, type })
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
    
    // --- Recipe Generator ---
    const handleFindRecipes = async () => {
        const ingredients = dom.ingredientsInput.value.trim();
        if (!ingredients) { /* ... */ return; }
        // REMOVED: DOMPurify.sanitize()
        const sanitizedIngredients = ingredients;
        showStatus(dom.recipeResults, 'loading');
        dom.findRecipesBtn.disabled = true;
        try {
            const prompt = `Find 2 simple indian homemade recipes using: ${sanitizedIngredients}. Respond with a valid JSON array. Each object must have "title", "ingredients" (array of strings), and "instructions" (array of strings). The response must be only the JSON array.`;
            
            // REPLACED: Call the secure proxy
            const result = await callProxyApi(prompt, 'tools');

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

    // --- Cravings Solver ---
    const handleSolveCraving = async () => {
        const craving = dom.cravingInput.value.trim();
        if (!craving) { /* ... */ return; }
        // REMOVED: DOMPurify.sanitize()
        const sanitizedCraving = craving;
        showStatus(dom.cravingResults, 'loading');
        dom.solveCravingBtn.disabled = true;
        try {
            const prompt = `I'm craving ${sanitizedCraving}. Suggest 2 healthy indian alternatives. Respond with a valid JSON array. Each object must have "name" and "description" (a brief, one-sentence explanation). The response must be only the JSON array.`;
            
            // REPLACED: Call the secure proxy
            const result = await callProxyApi(prompt, 'tools');

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

    // --- Recipe Makeover ---
    const handleMakeover = async () => {
        const ingredients = dom.makeoverInput.value.trim();
        if (!ingredients) { /* ... */ return; }
        // REMOVED: DOMPurify.sanitize()
        const sanitizedIngredients = ingredients;
        showStatus(dom.makeoverResults, 'loading');
        dom.makeoverBtn.disabled = true;
        try {
            const prompt = `Analyze this recipe: "${sanitizedIngredients}". Suggest 2-3 indian healthier swaps. Respond with a valid JSON object with two keys: "estimated_savings" (a string like "You could save up to 150 calories and 10g of fat.") and "swaps" (an array of objects, where each object has "original", "swap", and "notes"). The response must be only the JSON object.`;
            
            // REPLACED: Call the secure proxy
            const result = await callProxyApi(prompt, 'tools');

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
        // REMOVED: DOMPurify.sanitize()
        const sanitizedSavings = makeover.estimated_savings;
        const savingsHTML = makeover.estimated_savings ? `<div class="p-4 rounded-lg bg-primary/10 text-primary text-center font-semibold mb-4">${sanitizedSavings}</div>` : '';
        const swapsHTML = makeover.swaps.map(swap => {
            // REMOVED: DOMPurify.sanitize()
            const sanitizedOriginal = swap.original;
            const sanitizedSwap = swap.swap;
            const sanitizedNotes = swap.notes;
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
