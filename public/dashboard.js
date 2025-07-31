/**
 * @fileoverview Main client-side script for the Health Hub dashboard.
 * Handles Firebase authentication, data fetching, UI updates, and user interactions.
 * @version 4.5.1
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase and config to be ready
    await window.firebaseReady;
    'use strict';

    // --- MODULE SCOPE VARIABLES ---

    // Firebase Configuration and API Keys
    const { auth, db, onAuthStateChanged, signOut, sendPasswordResetEmail, doc, setDoc, onSnapshot, increment, arrayUnion, updateDoc, getDocs, collection, geminiApiKeys } = window.firebaseInstances;
    
    // --- Gemini API Configuration with Failover ---
    const GEMINI_API_CONFIGS = (geminiApiKeys.dashboard || []).map(key => ({
        key,
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    }));
    
    let currentApiIndex = 0;
    let lastApiCallTimestamp = 0;
    const API_COOLDOWN = 4000; // 4 seconds


    // DOM Element Cache for performance
    const dom = {
        body: document.body,
        loadingSpinner: document.getElementById('loading-spinner'),
        presentDayBtn: document.getElementById('present-day-btn'),
        dashboardContainer: document.getElementById('dashboard-container'),
        mainWelcomeMessage: document.getElementById('main-welcome-message'),
        dailyQuote: document.getElementById('daily-quote'),
        todayGoalHighlight: document.getElementById('today-goal-highlight'),
        profileWelcome: document.getElementById('profile-welcome'),
        userAvatar: document.getElementById('user-avatar'),
        profileButton: document.getElementById('profile-button'),
        calendarButton: document.getElementById('calendar-button'),
        dateDisplay: document.getElementById('date-display'),
        consumedCaloriesCard: document.getElementById('consumed-calories-card'),
        consumedCaloriesSummary: document.getElementById('consumed-calories-summary'),
        goalCaloriesSummary: document.getElementById('goal-calories-summary'),
        burnedCaloriesSummary: document.getElementById('burned-calories-summary'),
        netCaloriesSummary: document.getElementById('net-calories-summary'),
        progressContainer: document.getElementById('progress-container'),
        goalCompletedContainer: document.getElementById('goal-completed-container'),
        calorieSummaryText: document.getElementById('calorie-summary-text'),
        calorieProgressBar: document.getElementById('calorie-progress-bar'),
        calorieProgressPercentage: document.getElementById('calorie-progress-percentage'),
        addGlassBtn: document.getElementById('add-glass-btn'),
        removeGlassBtn: document.getElementById('remove-glass-btn'),
        waterGlassCount: document.getElementById('water-glass-count'),
        hydrationChartTabs: document.getElementById('hydration-chart-tabs'),
        hydrationTotalIntake: document.getElementById('hydration-total-intake'),
        hydrationGoal: document.getElementById('hydration-goal'),
        hydrationNoData: document.getElementById('hydration-no-data'),
        weightInput: document.getElementById('weight-input'),
        logWeightBtn: document.getElementById('log-weight-btn'),
        burnedCaloriesInput: document.getElementById('burned-calories-input'),
        logBurnedCaloriesBtn: document.getElementById('log-burned-calories-btn'),
        foodLogForm: document.getElementById('food-log-form'),
        foodItemInput: document.getElementById('food-item-input'),
        mealTypeSelect: document.getElementById('meal-type-select'),
        logFoodBtn: document.getElementById('log-food-btn'),
        foodLogError: document.getElementById('food-log-error'),
        
        profileModal: document.getElementById('profile-modal'),
        closeProfileModalBtn: document.getElementById('close-profile-modal-btn'),
        profileModalAvatar: document.getElementById('profile-modal-avatar'),
        profileModalName: document.getElementById('profile-modal-name'),
        profileModalEmail: document.getElementById('profile-modal-email'),
        editNameBtn: document.getElementById('edit-name-btn'),
        settingsForm: document.getElementById('settings-form'),
        preferencesBtn: document.getElementById('preferences-btn'),
        preferencesInputs: document.getElementById('preferences-inputs'),
        nameInput: document.getElementById('name-input'),
        calorieGoalInput: document.getElementById('calorie-goal-input'),
        waterGoalInput: document.getElementById('water-goal-input'),
        glassSizeInput: document.getElementById('glass-size-input'),
        saveChangesBtn: document.getElementById('save-changes-btn'),
        premiumBtn: document.getElementById('premium-btn'),
        premiumDetails: document.getElementById('premium-details'),
        premiumPlanName: document.getElementById('premium-plan-name'),
        premiumExpiryDate: document.getElementById('premium-expiry-date'),
        premiumActionBtn: document.getElementById('premium-action-btn'),
        resetPasswordBtn: document.getElementById('reset-password-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        healthProfileBtn: document.getElementById('health-profile-btn'),
        healthProfileInputs: document.getElementById('health-profile-inputs'),
        healthProfileForm: document.getElementById('health-profile-form'),
        ageInput: document.getElementById('age-input'),
        heightInput: document.getElementById('height-input'),
        activityLevelSelect: document.getElementById('activity-level-select'),
        
        foodLogModal: document.getElementById('food-log-modal'),
        closeFoodLogModalBtn: document.getElementById('close-food-log-modal-btn'),
        foodLogModalList: document.getElementById('food-log-modal-list'),
        foodLoggingModal: document.getElementById('food-logging-modal'),
        closeFoodLoggingModalBtn: document.getElementById('close-food-logging-modal-btn'),
        logFoodBtnDesktop: document.getElementById('log-food-btn-desktop'),
        logFoodBtnMobile: document.getElementById('log-food-btn-mobile'),
        calendarModal: document.getElementById('calendar-modal'),
        monthYearDisplay: document.getElementById('month-year-display'),
        prevMonthBtn: document.getElementById('prev-month-btn'),
        nextMonthBtn: document.getElementById('next-month-btn'),
        calendarGrid: document.getElementById('calendar-grid'),
        presentDayBtn: document.getElementById('present-day-btn'),
        macrosCard: document.getElementById('macros-card'),
        macrosLegend: document.getElementById('macros-legend'),
        macrosChart: document.getElementById('macros-chart'),
        hydrationChart: document.getElementById('hydration-chart'),
        settingsTab: document.querySelector('[data-section="settings"]'),
        premiumNavIcon: document.getElementById('premium-nav-icon'),
        profileCrownIcon: document.getElementById('profile-crown-icon'),
        scrollIndicator: document.getElementById('scroll-indicator'),
        popupNotification: document.getElementById('popup-notification'),
        premiumLockOverlay: document.getElementById('premium-lock-overlay'),
        premiumContentWrapper: document.getElementById('premium-content-wrapper'),
        weightDataCard: document.getElementById('weight-data-card'),
        weightChartContainer: document.getElementById('weight-chart-container'),
        currentWeightDisplay: document.getElementById('current-weight-display'),
        weightChartTabs: document.getElementById('weight-chart-tabs'),
        mainWeightChart: document.getElementById('main-weight-chart'),
        weightNoData: document.getElementById('weight-no-data'),
        weightLogFormContainer: document.getElementById('weight-log-form-container'),
    };

    // Application State
    let userUid = null;
    let dailyDataUnsubscribe = null;
    let userDataUnsubscribe = null;
    let userSettings = { 
        name: 'User', 
        calorieGoal: 2000, 
        waterGoalLiters: 2, 
        glassSizeMl: 250, 
        isPremium: false, 
        premiumPlan: null, 
        premiumExpirationDate: null,
        age: null,
        height: null,
        activityLevel: 'sedentary',
    };
    let dailyData = {};
    let selectedDate = new Date();
    let calendarDate = new Date();
    let charts = { macros: null, hydration: null, weight: null };
    let hydrationHistory = [];
    let weightHistory = [];
    let isUserDataReady = false;
    let preloadedNutritionData = null; 

    // --- GLOBAL NAMESPACE ---
    window.healthHub = window.healthHub || {};
    window.healthHub.logFoodItem = (foodItem, nutritionData) => {
        dom.foodItemInput.value = foodItem;
        preloadedNutritionData = nutritionData;
        dom.foodLoggingModal.classList.remove('hidden');
        updateInputStyles();
    };
    window.healthHub.deleteLoggedFoodItem = async (itemIndex) => {
        if (!userUid || !dailyData.foodLog) {
            showPopup('Could not delete item. Data not loaded.', true);
            return;
        }
        const dateStr = getFormattedDate(selectedDate);
        const currentFoodLog = [...dailyData.foodLog];
        if (itemIndex >= 0 && itemIndex < currentFoodLog.length) {
            currentFoodLog.splice(itemIndex, 1);
            const dailyDocRef = doc(db, 'users', userUid, 'dailyData', dateStr);
            try {
                await updateDoc(dailyDocRef, { foodLog: currentFoodLog });
                showPopup('Food item removed successfully.');
            } catch (error) {
                console.error("Error removing food item from database: ", error);
                showPopup('Failed to remove item. Please try again.', true);
            }
        } else {
            console.error("Invalid index provided for food item deletion.");
        }
    };

    // --- DAILY QUOTE LOGIC ---
    const quotes = [
        "The only bad workout is the one that didn't happen.",
        "Your body can stand almost anything. It’s your mind that you have to convince.",
        "Success isn’t always about greatness. It’s about consistency. Consistent hard work gains success.",
        "The last three or four reps is what makes the muscle grow.",
        "Don't watch the clock; do what it does. Keep going.",
        "The secret of getting ahead is getting started.",
        "The body achieves what the mind believes.",
        "What seems impossible today will one day become your warm-up.",
        "Push yourself, because no one else is going to do it for you.",
        "Sweat is just fat crying.",
        "Believe you can and you're halfway there.",
        "Strive for progress, not perfection.",
        "It's going to be a journey. It's not a sprint to get in shape."
    ];

    const setDailyQuote = () => {
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 0);
        const diff = today - startOfYear;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        const quote = quotes[dayOfYear % quotes.length];
        if (dom.dailyQuote) {
            dom.dailyQuote.textContent = `"${quote}"`;
        }
    };

    // --- UTILITY FUNCTIONS ---
    function getFormattedDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function formatDisplayDate(date) {
        if (!date || !(date instanceof Date)) return 'N/A';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const showLoading = (isLoading) => {
        if (dom.loadingSpinner) dom.loadingSpinner.style.display = isLoading ? 'flex' : 'none';
        if (dom.dashboardContainer) dom.dashboardContainer.classList.toggle('hidden', isLoading);
    };

    const updateInputStyles = () => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="number"], select, textarea');
        inputs.forEach(input => {
            if (input.value && input.value.length > 0 && input.value !== "") {
                input.classList.add('has-value');
            } else {
                input.classList.remove('has-value');
            }
        });
    };
    
    const showPopup = (message, isError = false) => {
        if (!dom.popupNotification) return;
        dom.popupNotification.querySelector('p').textContent = message;
        dom.popupNotification.classList.toggle('bg-red-500', isError);
        dom.popupNotification.classList.toggle('bg-green-500', !isError);
        dom.popupNotification.classList.remove('opacity-0', '-translate-y-4');
        
        setTimeout(() => {
            dom.popupNotification.classList.add('opacity-0', '-translate-y-4');
        }, 3000);
    };
    
    // --- Gemini API Wrapper with Cooldown & Failover ---
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

    // --- AUTHENTICATION & INITIALIZATION ---
    function initialize() {
        if (GEMINI_API_CONFIGS.length === 0 || !GEMINI_API_CONFIGS[0].key) {
            console.error("Gemini API keys for Dashboard are not configured.");
        }
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userUid = user.uid;
                if (dom.dateDisplay) dom.dateDisplay.textContent = formatDisplayDate(selectedDate);
                listenToUserData();
                listenToDailyData(getFormattedDate(selectedDate));
                fetchHydrationHistory();
                fetchWeightHistory();
                bindEventListeners();
                updateInputStyles();
                setDailyQuote();
                showLoading(false);
                if (window.lucide) lucide.createIcons();
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    // --- REAL-TIME DATA LISTENERS ---
    const listenToUserData = () => {
        if (userDataUnsubscribe) userDataUnsubscribe();
        const userDocRef = doc(db, 'users', userUid);
        userDataUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const userName = data.name || 'User';
                if (dom.profileWelcome) dom.profileWelcome.textContent = `Hi ${userName.split(' ')[0]}`;
                if (dom.mainWelcomeMessage) dom.mainWelcomeMessage.textContent = `Welcome back, ${userName.split(' ')[0]}!`;
                if (dom.userAvatar) dom.userAvatar.textContent = userName.charAt(0).toUpperCase();
                
                if (dom.profileModalAvatar) dom.profileModalAvatar.textContent = userName.charAt(0).toUpperCase();
                if (dom.profileModalName) dom.profileModalName.textContent = userName;
                if (dom.profileModalEmail && auth.currentUser) {
                    dom.profileModalEmail.textContent = auth.currentUser.email;
                }

                userSettings = {
                    name: data.name || 'User',
                    calorieGoal: data.calorieGoal || 2000,
                    waterGoalLiters: data.waterGoalLiters || 2,
                    glassSizeMl: data.glassSizeMl || 250,
                    isPremium: data.premium === true || String(data.premium).toLowerCase() === 'yes',
                    premiumPlan: data.premiumPlan || null,
                    premiumExpirationDate: data.premiumExpirationDate && data.premiumExpirationDate.toDate ? data.premiumExpirationDate.toDate() : null,
                    age: data.age || null,
                    height: data.height || null,
                    activityLevel: data.activityLevel || 'sedentary',
                };
            }
            isUserDataReady = true;
            updateUI();
            updatePremiumStatusUI(); 
        });
    };

    const listenToDailyData = (dateStr) => {
        if (dailyDataUnsubscribe) dailyDataUnsubscribe();
        const dailyDocRef = doc(db, 'users', userUid, 'dailyData', dateStr);
        dailyDataUnsubscribe = onSnapshot(dailyDocRef, (docSnap) => {
            dailyData = docSnap.exists() ? docSnap.data() : {};
            
            const updateHistory = (historyArray, key) => {
                const historyIndex = historyArray.findIndex(h => h.date === dateStr);
                if (dailyData[key]) {
                    const newValue = { date: dateStr, [key]: dailyData[key] };
                    if (historyIndex > -1) {
                        historyArray[historyIndex] = newValue;
                    } else {
                        historyArray.push(newValue);
                        historyArray.sort((a, b) => new Date(a.date) - new Date(b.date));
                    }
                } else {
                    if (historyIndex > -1) {
                        historyArray.splice(historyIndex, 1);
                    }
                }
            };

            if (dailyData.weight) updateHistory(weightHistory, 'weight');
            
            updateUI();
        });
    };

    const fetchHydrationHistory = async () => {
        if (!userUid) return;
        const querySnapshot = await getDocs(collection(db, 'users', userUid, 'dailyData'));
        const history = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.waterLog && data.waterLog.length > 0) {
                 const totalWaterMl = data.waterLog.reduce((acc, log) => acc + (log && log.amount ? log.amount : 0), 0);
                 history.push({ date: doc.id, total: totalWaterMl });
            }
        });
        hydrationHistory = history.sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    const fetchWeightHistory = async () => {
        if (!userUid) return;
        const querySnapshot = await getDocs(collection(db, 'users', userUid, 'dailyData'));
        const history = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.weight) history.push({ date: doc.id, weight: data.weight });
        });
        weightHistory = history.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const activeTab = dom.weightChartTabs?.querySelector('.active');
        const range = activeTab ? activeTab.dataset.range : 'week';
        renderWeightChart(range);
    };

    // --- UI UPDATE FUNCTIONS ---
    const updateUI = () => {
        if (!isUserDataReady) return;
        const isPresentDay = getFormattedDate(selectedDate) === getFormattedDate(new Date());
        if (dom.presentDayBtn) dom.presentDayBtn.classList.toggle('hidden', isPresentDay);
        
        const inputsToToggle = [dom.addGlassBtn, dom.removeGlassBtn, dom.logWeightBtn, dom.logFoodBtnDesktop, dom.logFoodBtnMobile, dom.weightInput, dom.burnedCaloriesInput, dom.logBurnedCaloriesBtn, dom.foodItemInput, dom.mealTypeSelect];
        inputsToToggle.forEach(input => {
            if (input) input.disabled = !isPresentDay;
        });
        if (dom.foodLogForm) dom.foodLogForm.classList.toggle('opacity-50', !isPresentDay);

        const foodLog = dailyData.foodLog || [];
        const burnedCalories = dailyData.burnedCalories || 0;
        const consumedTotals = foodLog.reduce((acc, item) => {
            if (item && item.nutrition) {
                acc.calories += (item.nutrition.calories || 0);
                acc.protein += (item.nutrition.protein || 0);
                acc.carbs += (item.nutrition.carbohydrates || 0);
                acc.fats += (item.nutrition.fat || 0);
            }
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
        
        const netCals = Math.round(consumedTotals.calories - burnedCalories);

        if (dom.consumedCaloriesSummary) dom.consumedCaloriesSummary.textContent = `${Math.round(consumedTotals.calories)} kcal`;
        if (dom.goalCaloriesSummary) dom.goalCaloriesSummary.textContent = `${userSettings.calorieGoal} kcal`;
        if (dom.todayGoalHighlight) dom.todayGoalHighlight.textContent = `${userSettings.calorieGoal} Kcal`;
        if (dom.burnedCaloriesSummary) dom.burnedCaloriesSummary.textContent = `${Math.round(burnedCalories)} kcal`;
        if (dom.netCaloriesSummary) dom.netCaloriesSummary.textContent = `${netCals} kcal`;
        
        updateFoodLogModal(foodLog);
        
        if (userSettings.isPremium) {
            dom.premiumLockOverlay.classList.add('hidden');
            dom.premiumContentWrapper.classList.remove('hidden');
            
            const waterLog = dailyData.waterLog || [];
            const totalWaterMl = waterLog.reduce((acc, log) => acc + (log && log.amount ? log.amount : 0), 0);
            const caloriePercentage = userSettings.calorieGoal > 0 ? Math.round((consumedTotals.calories / userSettings.calorieGoal) * 100) : 0;

            if (caloriePercentage >= 100) {
                dom.progressContainer.classList.add('hidden');
                dom.goalCompletedContainer.classList.remove('hidden');
                dom.calorieProgressBar.classList.add('completed');
                dom.calorieProgressBar.style.width = '100%';
            } else {
                dom.progressContainer.classList.remove('hidden');
                dom.goalCompletedContainer.classList.add('hidden');
                dom.calorieProgressBar.classList.remove('completed');
                dom.calorieProgressBar.style.width = `${caloriePercentage}%`;
            }
            
            if (dom.calorieSummaryText) dom.calorieSummaryText.textContent = `${Math.round(consumedTotals.calories)} / ${userSettings.calorieGoal} kcal`;
            if (dom.calorieProgressPercentage) dom.calorieProgressPercentage.textContent = `${caloriePercentage}%`;
            
            const glassCount = userSettings.glassSizeMl > 0 ? Math.round(totalWaterMl / userSettings.glassSizeMl) : 0;
            if (dom.waterGlassCount) dom.waterGlassCount.textContent = `${glassCount} ${glassCount === 1 ? 'glass' : 'glasses'}`;
            
            updateMacrosChart(consumedTotals.protein, consumedTotals.carbs, consumedTotals.fats);
            
            const activeHydrationTab = dom.hydrationChartTabs.querySelector('.active');
            renderHydrationChart(activeHydrationTab ? activeHydrationTab.dataset.range : 'day');

            const activeWeightTab = dom.weightChartTabs.querySelector('.active');
            renderWeightChart(activeWeightTab ? activeWeightTab.dataset.range : 'week');
            
            const hasWeightForToday = dailyData.weight && dailyData.weight > 0;

            if (isPresentDay) {
                dom.weightChartContainer.classList.toggle('hidden', !hasWeightForToday);
                dom.weightLogFormContainer.classList.toggle('hidden', hasWeightForToday);
            } else {
                dom.weightChartContainer.classList.remove('hidden');
                dom.weightLogFormContainer.classList.add('hidden');
            }
        } else {
            dom.premiumLockOverlay.classList.remove('hidden');
            dom.premiumLockOverlay.classList.add('flex');
            dom.premiumContentWrapper.classList.add('hidden');
        }

        if (dom.premiumNavIcon) dom.premiumNavIcon.classList.toggle('hidden', !userSettings.isPremium);
        if (dom.profileCrownIcon) dom.profileCrownIcon.classList.toggle('hidden', !userSettings.isPremium);
    };

    const updatePremiumStatusUI = () => {
        if (!userSettings || !dom.premiumPlanName || !dom.premiumExpiryDate || !dom.premiumActionBtn) return;
        const hasPlan = userSettings.premiumPlan;
        const now = new Date();
        const expirationDate = userSettings.premiumExpirationDate;
        const isExpired = expirationDate && expirationDate < now;

        if (hasPlan) {
            dom.premiumPlanName.textContent = userSettings.premiumPlan;
            if (isExpired) {
                dom.premiumExpiryDate.textContent = `Expired on ${formatDisplayDate(expirationDate)}`;
                dom.premiumActionBtn.textContent = 'Renew Premium';
                dom.premiumActionBtn.href = 'payment.html';
                dom.premiumActionBtn.classList.remove('hidden');
            } else {
                dom.premiumExpiryDate.textContent = `Active until ${formatDisplayDate(expirationDate)}`;
                dom.premiumActionBtn.classList.add('hidden'); 
            }
        } else {
            dom.premiumPlanName.textContent = 'Free Plan';
            dom.premiumExpiryDate.textContent = 'No active subscription.';
            dom.premiumActionBtn.textContent = 'Buy Premium';
            dom.premiumActionBtn.href = 'payment.html';
            dom.premiumActionBtn.classList.remove('hidden');
        }
    };

    const updateMacrosChart = (protein, carbs, fat) => {
        if (!dom.macrosChart) return;
        const ctx = dom.macrosChart.getContext('2d');
        if (charts.macros) charts.macros.destroy();
        const total = protein + carbs + fat;

        const data = total > 0 ? [fat, protein, carbs] : [2, 2, 1];
        const labels = ['Fat', 'Protein', 'Carbs'];
        const colors = ['#facc15', '#3b82f6', '#ef4444'];
        const cardBackgroundColor = '#18181B'; 

        charts.macros = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ 
                    data: data, 
                    backgroundColor: colors,
                    borderWidth: 4,
                    borderColor: cardBackgroundColor, 
                    hoverOffset: 8,
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                cutout: '75%',
                plugins: { 
                    legend: { display: false },
                    tooltip: { 
                        enabled: total > 0,
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed !== null) { label += context.parsed.toFixed(1) + 'g'; }
                                return label;
                            }
                        }
                    }
                } 
            }
        });

        if (dom.macrosLegend) {
            dom.macrosLegend.innerHTML = '';
            if (total > 0) {
                labels.forEach((label, index) => {
                    const value = data[index];
                    const percentage = ((value / total) * 100).toFixed(0);
                    const legendItemHTML = `
                        <div class="flex items-center justify-between text-sm">
                            <div class="flex items-center gap-3">
                                <span class="h-3 w-3 rounded-full" style="background-color: ${colors[index]}"></span>
                                <span class="font-semibold text-main">${label}</span>
                                <span class="text-sub">${value.toFixed(0)}g</span>
                            </div>
                            <span class="font-bold text-main">${percentage}%</span>
                        </div>
                    `;
                    dom.macrosLegend.insertAdjacentHTML('beforeend', legendItemHTML);
                });
            } else {
                 dom.macrosLegend.innerHTML = '<p class="text-center text-sub">No macro data for this day.</p>';
            }
        }
    };
    
    const renderHydrationChart = (range = 'day') => {
        if (!dom.hydrationChart) return;
        const ctx = dom.hydrationChart.getContext('2d');
        if (charts.hydration) charts.hydration.destroy();

        const showNoDataMessage = (show) => {
            dom.hydrationChart.classList.toggle('hidden', show);
            dom.hydrationNoData.classList.toggle('hidden', !show);
        };

        let labels = [];
        let dataPoints = [];
        const today = new Date();
        let totalIntakeForRange = 0;

        if (dom.hydrationGoal) dom.hydrationGoal.style.display = range === 'day' ? 'inline' : 'none';

        if (range === 'day') {
            const waterLog = dailyData.waterLog || [];
            const sortedLog = waterLog
                .filter(log => log && log.time && typeof log.time.seconds === 'number')
                .sort((a, b) => a.time.seconds - b.time.seconds);
            
            if (sortedLog.length === 0) {
                showNoDataMessage(true);
                dom.hydrationTotalIntake.textContent = `Today: 0.0L`;
                dom.hydrationGoal.textContent = `Goal: ${userSettings.waterGoalLiters.toFixed(1)}L`;
                return;
            }
            showNoDataMessage(false);

            let cumulativeAmount = 0;
            labels = sortedLog.map(log => new Date(log.time.seconds * 1000));
            dataPoints = sortedLog.map(log => {
                cumulativeAmount += log.amount;
                return cumulativeAmount;
            });
            totalIntakeForRange = cumulativeAmount;
            if(dom.hydrationTotalIntake) dom.hydrationTotalIntake.textContent = `Today: ${(totalIntakeForRange / 1000).toFixed(1)}L`;

        } else { // week, month, all
            let startDate = new Date();
            let rangeText = "Total";
            if (range === 'week') {
                startDate.setDate(today.getDate() - 6);
                rangeText = "This Week";
            } else if (range === 'month') {
                startDate.setDate(today.getDate() - 29);
                rangeText = "This Month";
            } else { // 'all'
                startDate = hydrationHistory.length > 0 ? new Date(hydrationHistory[0].date) : new Date();
            }
            
            const filteredHistory = hydrationHistory.filter(item => {
                const itemDate = new Date(item.date + 'T00:00:00');
                return itemDate >= startDate && itemDate <= today;
            });

            totalIntakeForRange = filteredHistory.reduce((acc, item) => acc + item.total, 0);
            if(dom.hydrationTotalIntake) dom.hydrationTotalIntake.textContent = `${rangeText}: ${(totalIntakeForRange / 1000).toFixed(1)}L`;

            if (filteredHistory.length < 2 && range !== 'all') {
                labels = [];
                const dayCount = range === 'week' ? 7 : 30;
                for (let i = dayCount - 1; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(today.getDate() - i);
                    labels.push(date);
                    const historyEntry = filteredHistory.find(h => h.date === getFormattedDate(date));
                    dataPoints.push(historyEntry ? historyEntry.total : null);
                }
                showNoDataMessage(filteredHistory.length === 0);
            } else {
                labels = filteredHistory.map(item => new Date(item.date + 'T00:00:00'));
                dataPoints = filteredHistory.map(item => item.total);
                showNoDataMessage(labels.length === 0);
            }
        }
        
        if(dom.hydrationGoal) dom.hydrationGoal.textContent = `Goal: ${userSettings.waterGoalLiters.toFixed(1)}L`;

        const timeSettings = {
            day: { unit: 'hour', tooltipFormat: 'h:mm a', displayFormats: { hour: 'h a' } },
            week: { unit: 'day', tooltipFormat: 'MMM d', displayFormats: { day: 'EEE' } },
            month: { unit: 'week', tooltipFormat: 'MMM d', displayFormats: { week: 'MMM d' } },
            all: { unit: 'month', tooltipFormat: 'MMM yyyy', displayFormats: { month: 'MMM yy' } }
        };

        charts.hydration = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Water Intake (ml)',
                    data: dataPoints,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                spanGaps: true,
                scales: {
                    x: {
                        type: 'time',
                        time: timeSettings[range],
                        grid: { display: false },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            maxTicksLimit: window.innerWidth < 768 ? 5 : (range === 'week' ? 7 : 6),
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.2)',
                            borderDash: [5, 5]
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            callback: function(value) {
                                return `${(value / 1000).toFixed(1)}L`;
                            },
                            stepSize: 500,
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                if (context.parsed.y === null) return null;
                                return `Intake: ${context.parsed.y} ml`;
                            }
                        }
                    }
                }
            }
        });
    };

    const renderWeightChart = (range = 'week') => {
        if (!dom.mainWeightChart) return;
        const ctx = dom.mainWeightChart.getContext('2d');
        if (charts.weight) charts.weight.destroy();

        const showNoDataMessage = (show) => {
            if (!dom.mainWeightChart || !dom.weightNoData) return;
            dom.mainWeightChart.classList.toggle('hidden', show);
            dom.weightNoData.classList.toggle('hidden', !show);
        };

        if (dom.currentWeightDisplay) {
            const selectedDateStr = getFormattedDate(selectedDate);
            const selectedDayWeightEntry = weightHistory.find(item => item.date === selectedDateStr);
            let displayWeight = '--';

            if (selectedDayWeightEntry) {
                displayWeight = selectedDayWeightEntry.weight;
            } else if (weightHistory.length > 0) {
                const relevantHistory = weightHistory.filter(item => new Date(item.date) <= selectedDate);
                if(relevantHistory.length > 0) {
                    displayWeight = relevantHistory[relevantHistory.length - 1].weight;
                }
            }
            dom.currentWeightDisplay.textContent = `Current: ${displayWeight} kg`;
        }

        let labels = [];
        let dataPoints = [];
        const today = new Date();
        let filteredHistory = [];
        let startDate = new Date();
        if (range === 'week') {
            startDate.setDate(today.getDate() - 6);
        } else if (range === 'month') {
            startDate.setDate(today.getDate() - 29);
        } else { // 'all'
            startDate = weightHistory.length > 0 ? new Date(weightHistory[0].date) : new Date();
        }
        
        filteredHistory = weightHistory.filter(item => {
            const itemDate = new Date(item.date + 'T00:00:00');
            return itemDate >= startDate && itemDate <= today;
        });

        if (filteredHistory.length < 2 && range !== 'all') {
            const dayCount = range === 'week' ? 7 : 30;
            for (let i = dayCount - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(today.getDate() - i);
                labels.push(date);
                const historyEntry = filteredHistory.find(h => h.date === getFormattedDate(date));
                dataPoints.push(historyEntry ? historyEntry.weight : null);
            }
        } else {
            labels = filteredHistory.map(item => new Date(item.date + 'T00:00:00'));
            dataPoints = filteredHistory.map(item => item.weight);
        }
        
        showNoDataMessage(dataPoints.every(p => p === null || p === undefined));
        
        const timeSettings = {
            week: { unit: 'day', tooltipFormat: 'MMM d, yyyy', displayFormats: { day: 'EEE' } },
            month: { unit: 'week', tooltipFormat: 'MMM d, yyyy', displayFormats: { week: 'MMM d' } },
            all: { unit: 'month', tooltipFormat: 'MMM yyyy', displayFormats: { month: 'MMM yy' } }
        };

        charts.weight = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Weight (kg)',
                    data: dataPoints,
                    borderColor: '#FACC15',
                    backgroundColor: 'rgba(250, 204, 21, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#FACC15',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                spanGaps: true,
                scales: {
                    x: {
                        type: 'time',
                        time: timeSettings[range],
                        grid: { display: false },
                        ticks: { color: 'rgba(255, 255, 255, 0.7)', maxTicksLimit: 7 }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(255, 255, 255, 0.2)', borderDash: [5, 5] },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            callback: (value) => `${value} kg`,
                            maxTicksLimit: 5
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => context.parsed.y !== null ? `Weight: ${context.parsed.y.toFixed(1)} kg` : null
                        }
                    }
                }
            }
        });
    };
    const updateFoodLogModal = (foodLog) => {
        if (!dom.foodLogModalList) return;
        dom.foodLogModalList.innerHTML = '';
        
        if (foodLog && foodLog.length > 0) {
            foodLog.forEach((item, index) => {
                if (item && item.nutrition) {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'p-3 bg-border-color-dark rounded-lg flex justify-between items-center gap-4';
                    itemEl.innerHTML = `
                        <div>
                            <p class="font-semibold">${item.foodItem} <span class="text-sm font-normal text-sub">(${item.mealType})</span></p>
                            <p class="text-xs text-sub">~${Math.round(item.nutrition.calories)} kcal | P: ${item.nutrition.protein}g | C: ${item.nutrition.carbohydrates}g | F: ${item.nutrition.fat}g</p>
                        </div>
                        <button 
                            onclick="window.healthHub.deleteLoggedFoodItem(${index})" 
                            class="text-red-500 hover:text-red-400 p-2 rounded-full -mr-2 flex-shrink-0 transition-colors"
                            aria-label="Remove ${item.foodItem}"
                        >
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    `;
                    dom.foodLogModalList.appendChild(itemEl);
                }
            });
            if (window.lucide) {
                lucide.createIcons();
            }
        } else {
            dom.foodLogModalList.innerHTML = `<p class="text-center text-sub mt-4">No food logged for this day.</p>`;
        }
    };

    // --- FIREBASE WRITE FUNCTIONS ---
    const updateDailyData = async (payload) => {
        if (!userUid) return;
        const dateStr = getFormattedDate(new Date());
        const dailyDocRef = doc(db, 'users', userUid, 'dailyData', dateStr);
        await setDoc(dailyDocRef, payload, { merge: true });
    };

    const saveUserSettings = async (settings) => {
        if (!userUid) return;
        const userDocRef = doc(db, 'users', userUid);
        await setDoc(userDocRef, settings, { merge: true });
    };

    // --- EVENT HANDLERS & BINDING ---
    const handleProfileOpen = () => {
        if (dom.nameInput) dom.nameInput.value = userSettings.name;
        if (dom.calorieGoalInput) dom.calorieGoalInput.value = userSettings.calorieGoal;
        if (dom.waterGoalInput) dom.waterGoalInput.value = userSettings.waterGoalLiters;
        if (dom.glassSizeInput) dom.glassSizeInput.value = userSettings.glassSizeMl;
        if (dom.ageInput) dom.ageInput.value = userSettings.age || '';
        if (dom.heightInput) dom.heightInput.value = userSettings.height || '';
        if (dom.activityLevelSelect) dom.activityLevelSelect.value = userSettings.activityLevel || 'sedentary';
        
        if (dom.profileModal) dom.profileModal.classList.remove('hidden');
        if (dom.preferencesInputs) dom.preferencesInputs.classList.add('hidden');
        if (dom.healthProfileInputs) dom.healthProfileInputs.classList.add('hidden');
        if (dom.premiumDetails) dom.premiumDetails.classList.add('hidden');
        dom.body.setAttribute('data-no-scroll', 'true');
        updateInputStyles();
    };
    
    const handleProfileClose = () => {
        if (dom.profileModal) dom.profileModal.classList.add('hidden');
        dom.body.removeAttribute('data-no-scroll');
    };

    const handleSettingsSave = async (e) => {
        e.preventDefault();
        const settingsToSave = {
            calorieGoal: Number(dom.calorieGoalInput.value),
            waterGoalLiters: Number(dom.waterGoalInput.value),
            glassSizeMl: Number(dom.glassSizeInput.value),
        };

        if (dom.nameInput.value !== userSettings.name) {
            settingsToSave.name = dom.nameInput.value;
        }

        await saveUserSettings(settingsToSave);
        showPopup('Preferences saved successfully!');
        if (dom.preferencesInputs) dom.preferencesInputs.classList.add('hidden');
    };

    const handleHealthProfileSave = async (e) => {
        e.preventDefault();
        const healthSettingsToSave = {
            age: Number(dom.ageInput.value) || null,
            height: Number(dom.heightInput.value) || null,
            activityLevel: dom.activityLevelSelect.value,
        };

        await saveUserSettings(healthSettingsToSave);
        showPopup('Health profile saved successfully!');
        if (dom.healthProfileInputs) dom.healthProfileInputs.classList.add('hidden');
    };

    const handleLogWeight = (e) => {
        e.stopPropagation();
        if (dom.weightInput.value) {
            const weight = parseFloat(dom.weightInput.value);
            if (weight > 0) { updateDailyData({ weight }); dom.weightInput.value = ''; updateInputStyles(); }
        }
    };

    const handleLogBurnedCalories = () => {
        if(dom.burnedCaloriesInput.value) {
            const calories = parseInt(dom.burnedCaloriesInput.value);
            if (calories > 0) { updateDailyData({ burnedCalories: increment(calories) }); dom.burnedCaloriesInput.value = ''; updateInputStyles(); }
        }
    };

    const handleFoodLogSubmit = async (e) => {
        e.preventDefault();
        const foodItem = dom.foodItemInput.value;
        if (!foodItem) return;
        dom.logFoodBtn.disabled = true; 
        dom.logFoodBtn.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>'; 
        if(dom.foodLogError) dom.foodLogError.classList.add('hidden');
        
        try {
            let nutritionData;
            if (preloadedNutritionData) {
                nutritionData = preloadedNutritionData;
            } else {
                const prompt = `Analyze the exact nutritional content for "${foodItem}". Provide a valid JSON object with ONLY these keys: "calories", "protein", "carbohydrates", "fat". The values must be numbers. Do not include any text, just the JSON.`;
                const payload = { contents: [{ parts: [{ text: prompt }] }] };
                const result = await geminiFetchWithCooldown(payload);
                
                if (!result.candidates || !result.candidates[0] || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0] || !result.candidates[0].content.parts[0].text) {
                    throw new Error("Invalid response from API.");
                }
                const jsonText = result.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
                nutritionData = JSON.parse(jsonText);
            }

            const newLogEntry = { 
                foodItem, 
                mealType: dom.mealTypeSelect.value, 
                nutrition: { 
                    calories: Number(nutritionData.calories) || 0, 
                    protein: Number(nutritionData.protein) || 0, 
                    carbohydrates: Number(nutritionData.carbohydrates) || 0, 
                    fat: Number(nutritionData.fat) || 0 
                } 
            };
            await updateDailyData({ foodLog: arrayUnion(newLogEntry) });
            
            dom.foodLogForm.reset();
            updateInputStyles();
            dom.foodLoggingModal.classList.add('hidden');
            showPopup('Food item logged successfully!');

        } catch (error) {
            if(dom.foodLogError) {
                dom.foodLogError.textContent = `Error: ${error.message}`;
                dom.foodLogError.classList.remove('hidden');
            }
        } finally {
            preloadedNutritionData = null; 
            dom.logFoodBtn.disabled = false; 
            dom.logFoodBtn.textContent = 'Analyze & Log'; 
        }
    };
    
    // --- CALENDAR LOGIC ---
    const renderCalendar = (year, month) => {
        if (!dom.calendarGrid || !dom.monthYearDisplay) return;
        dom.calendarGrid.innerHTML = '';
        dom.monthYearDisplay.textContent = new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' });
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let i = 0; i < firstDay; i++) {
            dom.calendarGrid.insertAdjacentHTML('beforeend', '<div></div>');
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = getFormattedDate(date);
            const isSelected = dateStr === getFormattedDate(selectedDate);
            const isToday = dateStr === getFormattedDate(new Date());

            const dayEl = document.createElement('button');
            dayEl.textContent = day;
            dayEl.className = `calendar-day p-2 rounded-full cursor-pointer ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`;
            dayEl.dataset.date = dateStr;
            dom.calendarGrid.appendChild(dayEl);
        }
    };
    
    const handleFirstScroll = () => {
        if (dom.scrollIndicator) dom.scrollIndicator.classList.add('hidden');
        localStorage.setItem('hasScrolled', 'true');
    };

    function bindEventListeners() {
        if (dom.profileButton) dom.profileButton.addEventListener('click', handleProfileOpen);
        if (dom.closeProfileModalBtn) dom.closeProfileModalBtn.addEventListener('click', handleProfileClose);
        if (dom.editNameBtn) dom.editNameBtn.addEventListener('click', () => {
            if (dom.preferencesInputs) dom.preferencesInputs.classList.remove('hidden');
            dom.nameInput.focus();
        });
        if (dom.preferencesBtn) dom.preferencesBtn.addEventListener('click', () => {
            if (dom.preferencesInputs) dom.preferencesInputs.classList.toggle('hidden');
        });
        if (dom.healthProfileBtn) dom.healthProfileBtn.addEventListener('click', () => {
            if (dom.healthProfileInputs) dom.healthProfileInputs.classList.toggle('hidden');
        });

        if (dom.settingsTab) dom.settingsTab.addEventListener('click', (e) => {
            e.preventDefault();
            handleProfileOpen();
        });
        if (dom.premiumBtn) dom.premiumBtn.addEventListener('click', () => {
            if (dom.premiumDetails) dom.premiumDetails.classList.toggle('hidden');
        });
        
        if (dom.logoutBtn) dom.logoutBtn.addEventListener('click', () => signOut(auth));
        if (dom.resetPasswordBtn) dom.resetPasswordBtn.addEventListener('click', async () => {
            try {
                await sendPasswordResetEmail(auth, auth.currentUser.email);
                showPopup('Password reset email sent!');
            } catch (error) {
                showPopup(error.message, true);
            }
        });
        
        if (dom.presentDayBtn) dom.presentDayBtn.addEventListener('click', () => {
            selectedDate = new Date();
            if (dom.dateDisplay) dom.dateDisplay.textContent = formatDisplayDate(selectedDate);
            listenToDailyData(getFormattedDate(selectedDate));
        });

        if (dom.settingsForm) dom.settingsForm.addEventListener('submit', handleSettingsSave);
        if (dom.healthProfileForm) dom.healthProfileForm.addEventListener('submit', handleHealthProfileSave);

        if (dom.consumedCaloriesCard) dom.consumedCaloriesCard.addEventListener('click', () => dom.foodLogModal.classList.remove('hidden'));
        if (dom.closeFoodLogModalBtn) dom.closeFoodLogModalBtn.addEventListener('click', () => dom.foodLogModal.classList.add('hidden'));
        
        const openFoodLogger = () => {
            preloadedNutritionData = null; 
            dom.foodLoggingModal.classList.remove('hidden');
        };
        if (dom.logFoodBtnDesktop) dom.logFoodBtnDesktop.addEventListener('click', openFoodLogger);
        if (dom.logFoodBtnMobile) dom.logFoodBtnMobile.addEventListener('click', openFoodLogger);
        if (dom.closeFoodLoggingModalBtn) dom.closeFoodLoggingModalBtn.addEventListener('click', () => dom.foodLoggingModal.classList.add('hidden'));
        
        if (dom.addGlassBtn) dom.addGlassBtn.addEventListener('click', () => {
            updateDailyData({ waterLog: arrayUnion({ time: new Date(), amount: userSettings.glassSizeMl }) });
        });
        if (dom.removeGlassBtn) dom.removeGlassBtn.addEventListener('click', async () => {
            if (dailyData.waterLog && dailyData.waterLog.length > 0) {
                const dateStr = getFormattedDate(new Date());
                const sortedLog = (dailyData.waterLog || [])
                    .filter(log => log && log.time && typeof log.time.seconds === 'number')
                    .sort((a, b) => a.time.seconds - b.time.seconds);
                sortedLog.pop();
                await updateDoc(doc(db, 'users', userUid, 'dailyData', dateStr), { waterLog: sortedLog });
            }
        });
        if (dom.logWeightBtn) dom.logWeightBtn.addEventListener('click', handleLogWeight);
        if (dom.logBurnedCaloriesBtn) dom.logBurnedCaloriesBtn.addEventListener('click', handleLogBurnedCalories);
        if (dom.foodLogForm) dom.foodLogForm.addEventListener('submit', handleFoodLogSubmit);

        if (dom.calendarButton) dom.calendarButton.addEventListener('click', () => {
            calendarDate = new Date(selectedDate);
            renderCalendar(calendarDate.getFullYear(), calendarDate.getMonth());
            dom.calendarModal.classList.remove('hidden');
        });
        if (dom.prevMonthBtn) dom.prevMonthBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            renderCalendar(calendarDate.getFullYear(), calendarDate.getMonth());
        });
        if (dom.nextMonthBtn) dom.nextMonthBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            renderCalendar(calendarDate.getFullYear(), calendarDate.getMonth());
        });
        if (dom.calendarGrid) dom.calendarGrid.addEventListener('click', (e) => {
            if (e.target.matches('.calendar-day')) {
                selectedDate = new Date(e.target.dataset.date + 'T12:00:00');
                if (dom.dateDisplay) dom.dateDisplay.textContent = formatDisplayDate(selectedDate);
                listenToDailyData(getFormattedDate(selectedDate));
                dom.calendarModal.classList.add('hidden');
            }
        });
        
        if (dom.presentDayBtn) {
            dom.presentDayBtn.addEventListener('click', () => {
                selectedDate = new Date(); 
                if (dom.dateDisplay) {
                    dom.dateDisplay.textContent = formatDisplayDate(selectedDate);
                }
                listenToDailyData(getFormattedDate(selectedDate));
                showPopup("Showing today's data.");
            });
        }


        if (dom.hydrationChartTabs) {
            dom.hydrationChartTabs.addEventListener('click', (e) => {
                const button = e.target.closest('.tab-button');
                if (button) {
                    dom.hydrationChartTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    renderHydrationChart(button.dataset.range);
                }
            });
        }
        
        if (dom.weightChartTabs) {
            dom.weightChartTabs.addEventListener('click', (e) => {
                const button = e.target.closest('.tab-button');
                if (button) {
                    dom.weightChartTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    renderWeightChart(button.dataset.range);
                }
            });
        }

        const inputs = document.querySelectorAll('input[type="text"], input[type="number"], select');
        inputs.forEach(input => {
            input.addEventListener('input', updateInputStyles);
            input.addEventListener('blur', updateInputStyles);
        });
        
        if (!localStorage.getItem('hasScrolled')) {
            if (dom.scrollIndicator) dom.scrollIndicator.classList.remove('hidden');
            window.addEventListener('scroll', handleFirstScroll, { once: true });
        }
    }

    // --- START THE APP ---
    initialize();

});
