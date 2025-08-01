/**
 * @fileoverview Handles the Nutrition Lookup feature in the Food Planner section.
 * This version uses a secure Netlify proxy for all API calls.
 * @version 2.0.0
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    window.healthHub = window.healthHub || {};

    const dom = {
        searchInput: document.getElementById('nutrition-search-input'),
        quantityBeforeSearchInput: document.getElementById('nutrition-quantity-before-search'),
        searchBtn: document.getElementById('nutrition-search-btn'),
        resultsContainer: document.getElementById('nutrition-results'),
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
    
    const showStatus = (message, isError = false) => {
        if (!dom.resultsContainer) return;
        const colorClass = isError ? 'text-red-400' : 'text-sub';
        dom.resultsContainer.innerHTML = `<div class="${colorClass} text-center">${message}</div>`;
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

            // REPLACED: Call the secure proxy
            const result = await callProxyApi(prompt, 'food');

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
        dom.searchBtn.addEventListener('click', handleNutritionSearch);
    }
});
