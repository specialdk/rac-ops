// Landing Page - Operator Selection & Lock

(function() {
    'use strict';

    // State
    let operators = [];
    let currentOperator = null;
    let isLocked = false;

    // DOM Elements
    const operatorSelect = document.getElementById('operatorSelect');
    const lockBtn = document.getElementById('lockBtn');
    const operatorStatus = document.getElementById('operatorStatus');
    const sitzlerCard = document.getElementById('sitzlerCard');

    // Initialize
    async function init() {
        await loadOperators();
        restoreState();
        bindEvents();
    }

    // Load operators from JSON
    async function loadOperators() {
        try {
            const response = await fetch('data/operators.json');
            operators = await response.json();
            populateOperatorDropdown();
        } catch (error) {
            console.error('Failed to load operators:', error);
            operatorStatus.textContent = 'Error loading operators';
        }
    }

    // Populate dropdown
    function populateOperatorDropdown() {
        operatorSelect.innerHTML = '<option value="">-- Select Operator --</option>';
        operators.forEach(op => {
            const option = document.createElement('option');
            option.value = op.opkey;
            option.textContent = `${op.initial} | ${op.first} ${op.last}`;
            operatorSelect.appendChild(option);
        });
    }

    // Restore state from localStorage
    function restoreState() {
        const saved = localStorage.getItem('opsTimeOperator');
        if (saved) {
            const data = JSON.parse(saved);
            currentOperator = operators.find(op => op.opkey === data.opkey);
            isLocked = data.isLocked;

            if (currentOperator) {
                operatorSelect.value = currentOperator.opkey;
                if (isLocked) {
                    applyLockedState();
                }
            }
        }
        updateUI();
    }

    // Bind events
    function bindEvents() {
        operatorSelect.addEventListener('change', onOperatorChange);
        lockBtn.addEventListener('click', onLockToggle);
    }

    // Operator selection changed
    function onOperatorChange() {
        const opkey = parseInt(operatorSelect.value);
        currentOperator = operators.find(op => op.opkey === opkey) || null;
        updateUI();
    }

    // Lock/Unlock toggle
    function onLockToggle() {
        if (isLocked) {
            // Unlock
            isLocked = false;
            operatorSelect.disabled = false;
            lockBtn.classList.remove('is-locked');
            sitzlerCard.classList.remove('enabled');
            sitzlerCard.classList.add('disabled');
            localStorage.removeItem('opsTimeOperator');
        } else {
            // Lock
            if (!currentOperator) return;
            isLocked = true;
            applyLockedState();
            saveState();
        }
        updateUI();
    }

    // Apply locked state to UI
    function applyLockedState() {
        operatorSelect.disabled = true;
        lockBtn.classList.add('is-locked');
        sitzlerCard.classList.remove('disabled');
        sitzlerCard.classList.add('enabled');
    }

    // Save state to localStorage
    function saveState() {
        if (currentOperator && isLocked) {
            localStorage.setItem('opsTimeOperator', JSON.stringify({
                opkey: currentOperator.opkey,
                isLocked: true
            }));
        }
    }

    // Generate docket number
    function generateDocket() {
        if (!currentOperator) return '';
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2);
        return `${currentOperator.opkey} - ${dd}-${mm}-${yy}`;
    }

    // Update UI state
    function updateUI() {
        // Lock button state
        lockBtn.disabled = !currentOperator;

        // Status message
        if (isLocked && currentOperator) {
            const docket = generateDocket();
            operatorStatus.textContent = `Docket: ${docket}`;
            operatorStatus.classList.add('has-docket');
        } else if (currentOperator) {
            operatorStatus.textContent = 'Lock operator to continue';
            operatorStatus.classList.remove('has-docket');
        } else {
            operatorStatus.textContent = '';
            operatorStatus.classList.remove('has-docket');
        }
    }

    // Start
    document.addEventListener('DOMContentLoaded', init);
})();