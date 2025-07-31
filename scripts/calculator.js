/**
 * @fileoverview Standalone module for the health calculators functionality.
 * Handles UI interactions and calculations for the various health metrics.
 * @version 1.1.0
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- MAIN INITIALIZATION ---
    const accordionContainer = document.getElementById('health-calculators-container');
    if (!accordionContainer) {
        // This is expected if the user is not on the calculator page.
        return;
    }

    // --- UI HELPER FUNCTIONS ---

    /**
     * Toggles the accordion items. Closes other open items.
     * @param {Event} e The click event.
     */
    const handleAccordionToggle = (e) => {
        const header = e.target.closest('.accordion-header');
        if (!header) return;

        const item = header.parentElement;
        const currentlyOpen = accordionContainer.querySelector('.accordion-item.open');

        // Close the currently open item if it's not the one being clicked
        if (currentlyOpen && currentlyOpen !== item) {
            currentlyOpen.classList.remove('open');
        }
        // Toggle the clicked item
        item.classList.toggle('open');
    };
    
    /**
     * Shows the result in a standardized format.
     * @param {HTMLElement} resultEl The element to display the result in.
     * @param {string} htmlContent The HTML content to display.
     */
    const showResult = (resultEl, htmlContent) => {
        resultEl.innerHTML = htmlContent;
        resultEl.classList.remove('hidden');
    };

    // --- CALCULATOR LOGIC ---

    // 1. BMI Calculator
    const initBmiCalculator = () => {
        const form = document.getElementById('bmi-form');
        const resultEl = document.getElementById('bmi-result');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const weight = parseFloat(form.querySelector('#bmi-weight').value);
            const height = parseFloat(form.querySelector('#bmi-height').value);

            if (weight > 0 && height > 0) {
                const heightInMeters = height / 100;
                const bmi = weight / (heightInMeters * heightInMeters);
                const category = bmi < 18.5 ? "Underweight" : bmi < 24.9 ? "Normal weight" : bmi < 29.9 ? "Overweight" : "Obesity";
                showResult(resultEl, `<p class="label">Your BMI</p><p class="value">${bmi.toFixed(1)}</p><p class="text-sub">${category}</p>`);
            }
        });
    };

    // 2. BMR Calculator
    const initBmrCalculator = () => {
        const form = document.getElementById('bmr-form');
        const resultEl = document.getElementById('bmr-result');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const weight = parseFloat(form.querySelector('#bmr-weight').value);
            const height = parseFloat(form.querySelector('#bmr-height').value);
            const age = parseInt(form.querySelector('#bmr-age').value);
            const gender = form.querySelector('#bmr-gender').value;

            if (weight > 0 && height > 0 && age > 0) {
                let bmr;
                if (gender === 'male') {
                    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
                } else {
                    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
                }
                showResult(resultEl, `<p class="label">Basal Metabolic Rate</p><p class="value">${bmr.toFixed(0)}</p><p class="text-sub">calories/day</p>`);
            }
        });
    };

    // 3. Body Fat Calculator
    const initBodyFatCalculator = () => {
        const form = document.getElementById('bodyfat-form');
        const resultEl = document.getElementById('bodyfat-result');
        const genderSelect = document.getElementById('bf-gender');
        const hipContainer = document.getElementById('bf-hip-container');
        if (!form) return;

        genderSelect.addEventListener('change', () => {
            hipContainer.classList.toggle('hidden', genderSelect.value === 'male');
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const gender = genderSelect.value;
            const height = parseFloat(form.querySelector('#bf-height').value);
            const waist = parseFloat(form.querySelector('#bf-waist').value);
            const neck = parseFloat(form.querySelector('#bf-neck').value);
            let bodyFat;

            if (gender === 'male' && height > 0 && waist > 0 && neck > 0) {
                bodyFat = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
            } else if (gender === 'female' && height > 0 && waist > 0 && neck > 0) {
                const hip = parseFloat(form.querySelector('#bf-hip').value);
                if (hip > 0) {
                    bodyFat = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387;
                }
            }
            
            if (bodyFat && bodyFat > 0) {
                showResult(resultEl, `<p class="label">Estimated Body Fat</p><p class="value">${bodyFat.toFixed(1)}%</p>`);
            }
        });
    };
    
    // 4. Maintenance Calories Calculator
    const initMaintCalsCalculator = () => {
        const form = document.getElementById('maint-cals-form');
        const resultEl = document.getElementById('maint-cals-result');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const bmr = parseFloat(form.querySelector('#mc-bmr').value);
            const activity = parseFloat(form.querySelector('#mc-activity').value);
            if (bmr > 0) {
                const maintCals = bmr * activity;
                showResult(resultEl, `<p class="label">Maintenance Calories</p><p class="value">${maintCals.toFixed(0)}</p><p class="text-sub">calories/day</p>`);
            }
        });
    };

    // 5. Protein Intake Calculator
    const initProteinCalculator = () => {
        const form = document.getElementById('protein-form');
        const resultEl = document.getElementById('protein-result');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const weight = parseFloat(form.querySelector('#protein-weight').value);
            const goal = parseFloat(form.querySelector('#protein-goal').value);
            if (weight > 0) {
                const proteinIntake = weight * goal;
                showResult(resultEl, `<p class="label">Daily Protein Intake</p><p class="value">${proteinIntake.toFixed(0)}g</p><p class="text-sub">grams/day</p>`);
            }
        });
    };
    
    // 6. Period & Ovulation Calculator
    const initPeriodCalculator = () => {
        const form = document.getElementById('period-form');
        const resultEl = document.getElementById('period-result');
        if (!form) return;
        
        const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const lastDate = new Date(form.querySelector('#period-last-date').value + 'T00:00:00');
            const cycleLength = parseInt(form.querySelector('#period-cycle-length').value);

            if (lastDate && cycleLength > 0) {
                const nextPeriod = new Date(lastDate);
                nextPeriod.setDate(lastDate.getDate() + cycleLength);
                
                const ovulationDay = new Date(nextPeriod);
                ovulationDay.setDate(nextPeriod.getDate() - 14);
                
                const fertileStart = new Date(ovulationDay);
                fertileStart.setDate(ovulationDay.getDate() - 5);
                
                const fertileEnd = new Date(ovulationDay);
                fertileEnd.setDate(ovulationDay.getDate() + 1);

                showResult(resultEl, `
                    <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-left">
                        <p class="font-semibold text-sub">Next Period:</p><p class="font-bold text-main text-right">${formatDate(nextPeriod)}</p>
                        <p class="font-semibold text-sub">Est. Ovulation:</p><p class="font-bold text-main text-right">${formatDate(ovulationDay)}</p>
                        <p class="font-semibold text-sub col-span-2 text-center mt-2">Fertile Window:</p>
                        <p class="col-span-2 text-center font-bold text-primary">${formatDate(fertileStart)} - ${formatDate(fertileEnd)}</p>
                    </div>
                `);
            }
        });
    };

    // 7. Creatine Intake Calculator
    const initCreatineCalculator = () => {
        const form = document.getElementById('creatine-form');
        const resultEl = document.getElementById('creatine-result');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const weight = parseFloat(form.querySelector('#creatine-weight').value);
            const age = parseInt(form.querySelector('#creatine-age').value);
            const phase = form.querySelector('#creatine-phase').value;

            if (weight > 0 && age > 0) {
                let resultHtml;
                if (phase === 'loading') {
                    const dosage = weight * 0.3;
                    resultHtml = `
                        <p class="label">Loading Phase Dosage</p>
                        <p class="value">${dosage.toFixed(1)}g</p>
                        <p class="text-sub">per day, for 5-7 days</p>
                        <p class="text-xs text-zinc-500 mt-2">Split into 4-5 smaller doses throughout the day.</p>
                    `;
                } else { // maintenance
                    resultHtml = `
                        <p class="label">Maintenance Phase Dosage</p>
                        <p class="value">3-5g</p>
                        <p class="text-sub">per day</p>
                        <p class="text-xs text-zinc-500 mt-2">A standard dose suitable for most active individuals.</p>
                    `;
                }
                showResult(resultEl, resultHtml);
            }
        });
    };

    // --- EVENT LISTENERS & INITIALIZATIONS ---
    accordionContainer.addEventListener('click', handleAccordionToggle);

    initBmiCalculator();
    initBmrCalculator();
    initBodyFatCalculator();
    initMaintCalsCalculator();
    initProteinCalculator();
    initPeriodCalculator();
    initCreatineCalculator();

});
