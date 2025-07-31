/**
 * @fileoverview Handles the Nutrition Lookup feature in the Food Planner section.
 * @version 1.1.2
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase and config to be ready
    await window.firebaseReady;
    'use strict';

    // Ensure the global namespace exists
    window.healthHub = window.healthHub || {};

    const { geminiApiKeys } = window.firebaseInstances || {};

    const dom = {
        searchInput: document.getElementById('nutrition-search-input'),
        quantityBeforeSearchInput: document.getElementById('nutrition-quantity-before-search'),
        searchBtn: document.getElementById('nutrition-search-btn'),
        resultsContainer: document.getElementById('nutrition-results'),
    };

    // --- Gemini API Configuration with Failover ---
    const GEMINI_API_CONFIGS = (geminiApiKeys.food || []).map(key => ({
        key,
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    }));
    
    let currentApiIndex = 0;
    let lastApiCallTimestamp = 0;
    const API_COOLDOWN = 4000; // 4 seconds

    /**
     * Shows a temporary message in the result container.
     * @param {string} message - The message to display.
     * @param {boolean} isError - If true, formats the message as an error.
     */
    const showStatus = (message, isError = false) => {
        if (!dom.resultsContainer) return;
        const colorClass = isError ? 'text-red-400' : 'text-sub';
        dom.resultsContainer.innerHTML = `<div class="${colorClass} text-center">${message}</div>`;
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


    const handleNutritionSearch = async () => {
        const foodItemQuery = dom.searchInput.value;
        if (!foodItemQuery) return;
        const sanitizedFoodItemQuery = DOMPurify.sanitize(foodItemQuery);

        let quantityBeforeSearch = parseFloat(dom.quantityBeforeSearchInput.value);
        if (isNaN(quantityBeforeSearch) || quantityBeforeSearch <= 0) {
            quantityBeforeSearch = 100;
        }

        showStatus('Analyzing...');
        dom.searchBtn.disabled = true;

        try {
            const prompt = `Analyze the exact nutritional content for "${sanitizedFoodItemQuery}" per 100g. Provide a valid JSON object with ONLY these keys: "calories", "protein", "carbohydrates", "fat". The values must be numbers. Do not include any text, just the JSON.`;

            const result = await geminiFetchWithCooldown(prompt);

            if (!result.candidates || !result.candidates[0].content.parts[0].text) {
                throw new Error('Invalid response from API.');
            }

            const jsonText = result.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
            const baseNutritionData = JSON.parse(jsonText);

            renderNutritionResults(sanitizedFoodItemQuery, baseNutritionData, quantityBeforeSearch);

        } catch (error) {
            showStatus(`Error: ${error.message}`, true);
        } finally {
            dom.searchBtn.disabled = false;
        }
    };

    const renderNutritionResults = (foodItem, baseData, displayQuantity) => {

        const displayMultiplier = displayQuantity / 100.0;
        const displayData = {
            calories: parseFloat((baseData.calories * displayMultiplier).toFixed(1)),
            protein: parseFloat((baseData.protein * displayMultiplier).toFixed(1)),
            carbohydrates: parseFloat((baseData.carbohydrates * displayMultiplier).toFixed(1)),
            fat: parseFloat((baseData.fat * displayMultiplier).toFixed(1)),
        };
        const sanitizedFoodItem = DOMPurify.sanitize(foodItem);
        dom.resultsContainer.innerHTML = `
            <div class="card p-4">
                <h4 class="font-bold text-lg capitalize">${sanitizedFoodItem}</h4>
                <p class="text-sm text-sub mb-4">Values for ${displayQuantity}g</p>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-center">
                    <div><p class="font-bold text-xl">${displayData.calories || 0}</p><p class="text-sub text-sm">Calories</p></div>
                    <div><p class="font-bold text-xl">${displayData.protein || 0}g</p><p class="text-sub text-sm">Protein</p></div>
                    <div><p class="font-bold text-xl">${displayData.carbohydrates || 0}g</p><p class="text-sub text-sm">Carbs</p></div>
                    <div><p class="font-bold text-xl">${displayData.fat || 0}g</p><p class="text-sub text-sm">Fat</p></div>
                </div>
                
                <div class="mt-6">
                    <label for="nutrition-quantity-log" class="block text-sm font-medium text-sub mb-2">Adjust Quantity to Log</label>
                    <div class="relative">
                         <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i data-lucide="weight" class="w-5 h-5 text-zinc-500"></i>
                        </div>
                        <input 
                            type="number" 
                            id="nutrition-quantity-log" 
                            value="${displayQuantity}" 
                            min="1"
                            max="10000"
                            class="bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-3 pl-12 transition" 
                            aria-label="Quantity in grams to log"
                        />
                        <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span class="text-zinc-500 sm:text-sm">g</span>
                        </div>
                    </div>
                </div>

                <button id="log-from-lookup-btn" class="btn-secondary w-full mt-4 h-[46px]">Log this Item</button>
            </div>
        `;

        if (window.lucide) {
            window.lucide.createIcons();
        }

        document.getElementById('log-from-lookup-btn').addEventListener('click', () => {
            if (window.healthHub && typeof window.healthHub.logFoodItem === 'function') {

                const quantityLogInput = document.getElementById('nutrition-quantity-log');
                let finalQuantity = parseFloat(quantityLogInput.value);
                if (isNaN(finalQuantity) || finalQuantity <= 0) {
                    finalQuantity = 100;
                }

                const finalMultiplier = finalQuantity / 100.0;
                const finalAdjustedData = {
                    calories: parseFloat((baseData.calories * finalMultiplier).toFixed(1)),
                    protein: parseFloat((baseData.protein * finalMultiplier).toFixed(1)),
                    carbohydrates: parseFloat((baseData.carbohydrates * finalMultiplier).toFixed(1)),
                    fat: parseFloat((baseData.fat * finalMultiplier).toFixed(1)),
                };

                const foodItemWithQuantity = `${sanitizedFoodItem} (${finalQuantity}g)`;

                window.healthHub.logFoodItem(foodItemWithQuantity, finalAdjustedData);

                showStatus('Opening food log...');
            } else {
                 showStatus('Error: Could not log item. The logFoodItem function is missing.', true);
            }
        });
    };

    if (dom.searchBtn) {
        if (GEMINI_API_CONFIGS.length === 0 || !GEMINI_API_CONFIGS[0].key) {
            console.error("Gemini API keys for Food Lookup are not configured.");
            dom.searchBtn.disabled = true;
        }
        dom.searchBtn.addEventListener('click', handleNutritionSearch);
    }
});
