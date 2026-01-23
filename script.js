// Sitzler Daily Shift Report - Form Logic

(function() {
    'use strict';

    // Data stores
    let operators = [];
    let locations = [];
    let equipment = [];
    let currentOperator = null;

    // DOM Elements
    const docketNo = document.getElementById('docketNo');
    const siteLocation = document.getElementById('siteLocation');
    const shiftDate = document.getElementById('shiftDate');
    const clientField = document.getElementById('client');
    const operatorName = document.getElementById('operatorName');
    const equipmentBody = document.getElementById('equipmentBody');
    const personnelBody = document.getElementById('personnelBody');

    // Initialize
    async function init() {
        await loadData();
        loadOperatorFromLanding();
        populateDropdowns();
        setDefaultDate();
        prefillPersonnel();
        bindEvents();
        initSignaturePads();
        loadDraft(); 
    }

    // Load all JSON data
    async function loadData() {
        try {
            const [opsRes, locRes, eqRes] = await Promise.all([
                fetch('data/operators.json'),
                fetch('data/locations.json'),
                fetch('data/equipment.json')
            ]);
            operators = await opsRes.json();
            locations = await locRes.json();
            equipment = await eqRes.json();
        } catch (error) {
            console.error('Failed to load data:', error);
            showToast('Error loading form data', 'error');
        }
    }

    // Load operator from landing page localStorage
    function loadOperatorFromLanding() {
        const saved = localStorage.getItem('opsTimeOperator');
        if (saved) {
            const data = JSON.parse(saved);
            currentOperator = operators.find(op => op.opkey === data.opkey);
            
            if (currentOperator) {
                // Set operator name
                operatorName.value = `${currentOperator.first} ${currentOperator.last}`;
                
                // Generate and set docket number
                docketNo.value = generateDocket();
            }
        } else {
            // No operator locked - redirect back to landing
            showToast('Please select and lock an operator first', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }

    // Generate docket number: OPKEY - DD-MM-YY
    function generateDocket() {
        if (!currentOperator) return '';
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2);
        return `${currentOperator.opkey} - ${dd}-${mm}-${yy}`;
    }

    // Populate dropdowns
    function populateDropdowns() {
        // Location dropdown
        siteLocation.innerHTML = '<option value="">-- Select Location --</option>';
        locations.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc.lockey;
            option.textContent = loc.location;
            option.dataset.client = loc.client;
            siteLocation.appendChild(option);
        });

        // Equipment dropdowns (initial row)
        populateEquipmentSelect(equipmentBody.querySelector('.asset-id'));
    }

    // Populate a single equipment select
    function populateEquipmentSelect(selectEl) {
        selectEl.innerHTML = '<option value="">-- Select --</option>';
        equipment.forEach(eq => {
            const option = document.createElement('option');
            option.value = eq.eqkey;
            option.textContent = eq.equipment;
            selectEl.appendChild(option);
        });
    }

    // Set default date to today
    function setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        shiftDate.value = today;
    }

    // Prefill personnel with current operator
    function prefillPersonnel() {
        if (currentOperator) {
            const firstPersonName = personnelBody.querySelector('.person-name');
            if (firstPersonName) {
                firstPersonName.value = `${currentOperator.first} ${currentOperator.last}`;
            }
        }
    }

    // Load draft from localStorage if exists
function loadDraft() {
    const docket = docketNo.value;
    if (!docket) return;

    const savedDraft = localStorage.getItem(`opsTimeDraft_${docket}`);
    if (!savedDraft) return;

    try {
        const data = JSON.parse(savedDraft);
        
        // Restore location and client
        if (data.location) {
            siteLocation.value = data.location;
            clientField.value = data.client || '';
        }

        // Restore date
        if (data.date) {
            shiftDate.value = data.date;
        }

        // Restore shift toggle
        if (data.shift) {
            document.querySelectorAll('.shift-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.shift === data.shift) {
                    btn.classList.add('active');
                }
            });
        }

        // Restore equipment rows
        if (data.equipment && data.equipment.length > 0) {
            // Clear existing rows
            equipmentBody.innerHTML = '';
            
            data.equipment.forEach((eq, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <select class="asset-id">
                            <option value="">-- Select --</option>
                        </select>
                    </td>
                    <td><input type="text" class="asset-desc" readonly placeholder="Auto-filled"></td>
                    <td><input type="number" class="hrs-start" placeholder="0" step="0.1"></td>
                    <td><input type="number" class="hrs-finish" placeholder="0" step="0.1"></td>
                    <td><input type="number" class="hrs-total" readonly></td>
                    <td class="action-col"><button type="button" class="remove-row-btn" title="Remove row">×</button></td>
                `;
                equipmentBody.appendChild(row);
                
                // Populate dropdown and set values
                const select = row.querySelector('.asset-id');
                populateEquipmentSelect(select);
                select.value = eq.assetKey || '';
                row.querySelector('.asset-desc').value = eq.description || '';
                row.querySelector('.hrs-start').value = eq.hrsStart || '';
                row.querySelector('.hrs-finish').value = eq.hrsFinish || '';
                row.querySelector('.hrs-total').value = eq.totalHrs || '';
            });
        }

        // Restore breakdown
        if (data.breakdown) {
            document.querySelectorAll('.yn-btn').forEach(btn => {
                btn.classList.remove('active');
                if ((data.breakdown.hasBreakdown && btn.dataset.value === 'Y') ||
                    (!data.breakdown.hasBreakdown && btn.dataset.value === 'N')) {
                    btn.classList.add('active');
                }
            });
            
            if (data.breakdown.hasBreakdown) {
                document.getElementById('breakdownDetails').style.display = 'block';
                document.getElementById('breakdownText').value = data.breakdown.details || '';
            }
        }

        // Restore personnel rows
        if (data.personnel && data.personnel.length > 0) {
            // Clear existing rows
            personnelBody.innerHTML = '';
            
            data.personnel.forEach((person, index) => {
                const row = document.createElement('tr');
                const isFirstRow = index === 0;
                row.innerHTML = `
                    <td><input type="text" class="person-name" ${isFirstRow ? 'readonly' : ''} placeholder="${isFirstRow ? '' : 'Enter name'}"></td>
                    <td><input type="time" class="time-start"></td>
                    <td><input type="time" class="time-finish"></td>
                    <td><input type="number" class="break-hrs" placeholder="0" step="0.25" min="0"></td>
                    <td><input type="number" class="total-hrs" readonly></td>
                    <td class="action-col"><button type="button" class="remove-row-btn" title="Remove row">×</button></td>
                `;
                personnelBody.appendChild(row);
                
                // Set values
                row.querySelector('.person-name').value = person.name || '';
                row.querySelector('.time-start').value = person.startTime || '';
                row.querySelector('.time-finish').value = person.finishTime || '';
                row.querySelector('.break-hrs').value = person.breakHrs || '';
                row.querySelector('.total-hrs').value = person.totalHrs || '';
            });
        }

        // Restore works description
        if (data.worksDescription) {
            document.getElementById('worksDescription').value = data.worksDescription;
        }

        // Restore signature text fields
        if (data.signatures) {
            if (data.signatures.sitzler) {
                document.getElementById('sitzlerName').value = data.signatures.sitzler.name || '';
                document.getElementById('sitzlerDate').value = data.signatures.sitzler.date || '';
                document.getElementById('sitzlerPosition').value = data.signatures.sitzler.position || '';
            }
            if (data.signatures.client) {
                document.getElementById('clientRepName').value = data.signatures.client.name || '';
                document.getElementById('clientRepDate').value = data.signatures.client.date || '';
                document.getElementById('clientRepPosition').value = data.signatures.client.position || '';
            }
        }

        // Restore signature images
        if (data.signatures?.sitzler?.signature) {
            restoreSignature('sitzlerSignature', data.signatures.sitzler.signature);
        }
        if (data.signatures?.client?.signature) {
            restoreSignature('clientSignature', data.signatures.client.signature);
        }

        showToast('Draft restored', 'success');
        
    } catch (error) {
        console.error('Failed to load draft:', error);
    }
}

// Restore signature from dataURL
function restoreSignature(canvasId, dataURL) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !dataURL) return;
    
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = function() {
        ctx.drawImage(img, 0, 0);
    };
    img.src = dataURL;
}
    
    // Bind all events
    function bindEvents() {
        // Location change - auto-fill client
        siteLocation.addEventListener('change', onLocationChange);

        // Shift toggle
        document.querySelectorAll('.shift-btn').forEach(btn => {
            btn.addEventListener('click', onShiftToggle);
        });

        // Equipment table
        document.getElementById('addEquipmentRow').addEventListener('click', addEquipmentRow);
        equipmentBody.addEventListener('click', onEquipmentTableClick);
        equipmentBody.addEventListener('change', onEquipmentChange);
        equipmentBody.addEventListener('input', onEquipmentInput);

        // Personnel table
        document.getElementById('addPersonnelRow').addEventListener('click', addPersonnelRow);
        personnelBody.addEventListener('click', onPersonnelTableClick);
        personnelBody.addEventListener('input', onPersonnelInput);

        // Breakdown toggle
        document.querySelectorAll('.yn-btn').forEach(btn => {
            btn.addEventListener('click', onBreakdownToggle);
        });

        // Form actions
        document.getElementById('clearFormBtn').addEventListener('click', clearForm);
        document.getElementById('saveDraftBtn').addEventListener('click', saveDraft);
        document.getElementById('submitFormBtn').addEventListener('click', submitForm);
    }

    // Location changed - auto-fill client
    function onLocationChange() {
        const selectedOption = siteLocation.options[siteLocation.selectedIndex];
        if (selectedOption && selectedOption.dataset.client) {
            clientField.value = selectedOption.dataset.client;
        } else {
            clientField.value = '';
        }
    }

    // Shift toggle
    function onShiftToggle(e) {
        document.querySelectorAll('.shift-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
    }

    // Equipment table - row click handler
    function onEquipmentTableClick(e) {
        if (e.target.classList.contains('remove-row-btn')) {
            const row = e.target.closest('tr');
            if (equipmentBody.querySelectorAll('tr').length > 1) {
                row.remove();
            } else {
                showToast('Cannot remove the last row', 'error');
            }
        }
    }

    // Equipment select changed - auto-fill description
    function onEquipmentChange(e) {
        if (e.target.classList.contains('asset-id')) {
            const row = e.target.closest('tr');
            const descField = row.querySelector('.asset-desc');
            const eqkey = parseInt(e.target.value);
            const eq = equipment.find(item => item.eqkey === eqkey);
            descField.value = eq ? eq.equipment : '';
        }
    }

    // Equipment hours input - calculate total
    function onEquipmentInput(e) {
        if (e.target.classList.contains('hrs-start') || e.target.classList.contains('hrs-finish')) {
            const row = e.target.closest('tr');
            calculateEquipmentHours(row);
        }
    }

    // Calculate equipment total hours
    function calculateEquipmentHours(row) {
        const start = parseFloat(row.querySelector('.hrs-start').value) || 0;
        const finish = parseFloat(row.querySelector('.hrs-finish').value) || 0;
        const total = finish - start;
        row.querySelector('.hrs-total').value = total > 0 ? total.toFixed(1) : '';
    }

    // Add equipment row
    function addEquipmentRow() {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>
                <select class="asset-id">
                    <option value="">-- Select --</option>
                </select>
            </td>
            <td><input type="text" class="asset-desc" readonly placeholder="Auto-filled"></td>
            <td><input type="number" class="hrs-start" placeholder="0" step="0.1"></td>
            <td><input type="number" class="hrs-finish" placeholder="0" step="0.1"></td>
            <td><input type="number" class="hrs-total" readonly></td>
            <td class="action-col"><button type="button" class="remove-row-btn" title="Remove row">×</button></td>
        `;
        equipmentBody.appendChild(newRow);
        populateEquipmentSelect(newRow.querySelector('.asset-id'));
    }

    // Personnel table - row click handler
    function onPersonnelTableClick(e) {
        if (e.target.classList.contains('remove-row-btn')) {
            const row = e.target.closest('tr');
            if (personnelBody.querySelectorAll('tr').length > 1) {
                row.remove();
            } else {
                showToast('Cannot remove the last row', 'error');
            }
        }
    }

    // Personnel time input - calculate total hours
    function onPersonnelInput(e) {
        if (e.target.classList.contains('time-start') || 
            e.target.classList.contains('time-finish') || 
            e.target.classList.contains('break-hrs')) {
            const row = e.target.closest('tr');
            calculatePersonnelHours(row);
        }
    }

    // Calculate personnel total hours
    function calculatePersonnelHours(row) {
        const startTime = row.querySelector('.time-start').value;
        const finishTime = row.querySelector('.time-finish').value;
        const breakHrs = parseFloat(row.querySelector('.break-hrs').value) || 0;

        if (startTime && finishTime) {
            const start = timeToMinutes(startTime);
            let finish = timeToMinutes(finishTime);
            
            // Handle overnight shifts
            if (finish < start) {
                finish += 24 * 60;
            }

            const totalMinutes = finish - start - (breakHrs * 60);
            const totalHours = totalMinutes / 60;
            row.querySelector('.total-hrs').value = totalHours > 0 ? totalHours.toFixed(2) : '';
        }
    }

    // Convert time string to minutes
    function timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // Add personnel row
    function addPersonnelRow() {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="text" class="person-name" placeholder="Enter name"></td>
            <td><input type="time" class="time-start"></td>
            <td><input type="time" class="time-finish"></td>
            <td><input type="number" class="break-hrs" placeholder="0" step="0.25" min="0"></td>
            <td><input type="number" class="total-hrs" readonly></td>
            <td class="action-col"><button type="button" class="remove-row-btn" title="Remove row">×</button></td>
        `;
        personnelBody.appendChild(newRow);
    }

    // Breakdown toggle
    function onBreakdownToggle(e) {
        document.querySelectorAll('.yn-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        const breakdownDetails = document.getElementById('breakdownDetails');
        if (e.target.dataset.value === 'Y') {
            breakdownDetails.style.display = 'block';
        } else {
            breakdownDetails.style.display = 'none';
        }
    }

    // Signature pads
    function initSignaturePads() {
        const canvases = document.querySelectorAll('.signature-pad');
        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            let isDrawing = false;
            let lastX = 0;
            let lastY = 0;

            // Set canvas size
            function resizeCanvas() {
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }

            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);

            // Get coordinates
            function getCoords(e) {
                const rect = canvas.getBoundingClientRect();
                if (e.touches) {
                    return {
                        x: e.touches[0].clientX - rect.left,
                        y: e.touches[0].clientY - rect.top
                    };
                }
                return {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
            }

            // Drawing functions
            function startDrawing(e) {
                isDrawing = true;
                const coords = getCoords(e);
                lastX = coords.x;
                lastY = coords.y;
            }

            function draw(e) {
                if (!isDrawing) return;
                e.preventDefault();
                const coords = getCoords(e);
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(coords.x, coords.y);
                ctx.stroke();
                lastX = coords.x;
                lastY = coords.y;
            }

            function stopDrawing() {
                isDrawing = false;
            }

            // Mouse events
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseout', stopDrawing);

            // Touch events
            canvas.addEventListener('touchstart', startDrawing);
            canvas.addEventListener('touchmove', draw);
            canvas.addEventListener('touchend', stopDrawing);
        });

        // Clear signature buttons
        document.querySelectorAll('.clear-sig-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const canvasId = btn.dataset.canvas;
                const canvas = document.getElementById(canvasId);
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            });
        });
    }

    // Clear form
    function clearForm() {
        if (confirm('Are you sure you want to clear the form? All data will be lost.')) {
            // Reset fields but keep operator and docket
            siteLocation.value = '';
            clientField.value = '';
            setDefaultDate();
            document.querySelector('.shift-btn[data-shift="day"]').click();
            
            // Reset equipment table to single row
            equipmentBody.innerHTML = `
                <tr>
                    <td>
                        <select class="asset-id">
                            <option value="">-- Select --</option>
                        </select>
                    </td>
                    <td><input type="text" class="asset-desc" readonly placeholder="Auto-filled"></td>
                    <td><input type="number" class="hrs-start" placeholder="0" step="0.1"></td>
                    <td><input type="number" class="hrs-finish" placeholder="0" step="0.1"></td>
                    <td><input type="number" class="hrs-total" readonly></td>
                    <td class="action-col"><button type="button" class="remove-row-btn" title="Remove row">×</button></td>
                </tr>
            `;
            populateEquipmentSelect(equipmentBody.querySelector('.asset-id'));

            // Reset personnel table but keep operator name
            personnelBody.innerHTML = `
                <tr>
                    <td><input type="text" class="person-name" readonly></td>
                    <td><input type="time" class="time-start"></td>
                    <td><input type="time" class="time-finish"></td>
                    <td><input type="number" class="break-hrs" placeholder="0" step="0.25" min="0"></td>
                    <td><input type="number" class="total-hrs" readonly></td>
                    <td class="action-col"><button type="button" class="remove-row-btn" title="Remove row">×</button></td>
                </tr>
            `;
            prefillPersonnel();

            // Reset breakdown
            document.querySelectorAll('.yn-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('breakdownDetails').style.display = 'none';
            document.getElementById('breakdownText').value = '';

            // Reset works description
            document.getElementById('worksDescription').value = '';

            // Reset signatures
            document.querySelectorAll('.signature-block input').forEach(input => {
                if (!input.id.includes('Date')) {
                    input.value = '';
                }
            });
            document.querySelectorAll('.signature-pad').forEach(canvas => {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            });

            showToast('Form cleared', 'success');
        }
    }

    // Save draft to localStorage
    function saveDraft() {
        const formData = collectFormData();
        const docket = docketNo.value;
        localStorage.setItem(`opsTimeDraft_${docket}`, JSON.stringify(formData));
        showToast('Draft saved', 'success');
    }

    // Collect all form data
    function collectFormData() {
        return {
            docket: docketNo.value,
            operator: currentOperator,
            location: siteLocation.value,
            locationName: siteLocation.options[siteLocation.selectedIndex]?.text || '',
            client: clientField.value,
            date: shiftDate.value,
            shift: document.querySelector('.shift-btn.active')?.dataset.shift || 'day',
            equipment: collectEquipmentData(),
            breakdown: {
                hasBreakdown: document.querySelector('.yn-btn.active')?.dataset.value === 'Y',
                details: document.getElementById('breakdownText').value
            },
            personnel: collectPersonnelData(),
            worksDescription: document.getElementById('worksDescription').value,
            signatures: {
                sitzler: {
                    name: document.getElementById('sitzlerName').value,
                    date: document.getElementById('sitzlerDate').value,
                    position: document.getElementById('sitzlerPosition').value,
                    signature: document.getElementById('sitzlerSignature').toDataURL()
                },
                client: {
                    name: document.getElementById('clientRepName').value,
                    date: document.getElementById('clientRepDate').value,
                    position: document.getElementById('clientRepPosition').value,
                    signature: document.getElementById('clientSignature').toDataURL()
                }
            },
            savedAt: new Date().toISOString()
        };
    }

    // Collect equipment table data
    function collectEquipmentData() {
        const rows = equipmentBody.querySelectorAll('tr');
        const data = [];
        rows.forEach(row => {
            const assetSelect = row.querySelector('.asset-id');
            data.push({
                assetKey: assetSelect.value,
                assetId: assetSelect.options[assetSelect.selectedIndex]?.text || '',
                description: row.querySelector('.asset-desc').value,
                hrsStart: row.querySelector('.hrs-start').value,
                hrsFinish: row.querySelector('.hrs-finish').value,
                totalHrs: row.querySelector('.hrs-total').value
            });
        });
        return data;
    }

    // Collect personnel table data
    function collectPersonnelData() {
        const rows = personnelBody.querySelectorAll('tr');
        const data = [];
        rows.forEach(row => {
            data.push({
                name: row.querySelector('.person-name').value,
                startTime: row.querySelector('.time-start').value,
                finishTime: row.querySelector('.time-finish').value,
                breakHrs: row.querySelector('.break-hrs').value,
                totalHrs: row.querySelector('.total-hrs').value
            });
        });
        return data;
    }

    // Submit form
    function submitForm() {
        // Basic validation
        if (!siteLocation.value) {
            showToast('Please select a location', 'error');
            return;
        }

        const formData = collectFormData();
        
        // Store in submitted forms collection
        const submitted = JSON.parse(localStorage.getItem('opsTimeSubmitted') || '[]');
        submitted.push({
            ...formData,
            submittedAt: new Date().toISOString()
        });
        localStorage.setItem('opsTimeSubmitted', JSON.stringify(submitted));

        // Remove draft
        localStorage.removeItem(`opsTimeDraft_${docketNo.value}`);

        showToast('Report submitted successfully!', 'success');

        // Optional: redirect back to landing after delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }

    // Toast notification
    function showToast(message, type = 'info') {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Start
    document.addEventListener('DOMContentLoaded', init);
})();