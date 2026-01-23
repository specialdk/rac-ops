/**
 * OPS Time 1 Sitzler - Daily Shift Report
 * Form functionality script
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
});

function initializeForm() {
    // Set today's date as default
    setDefaultDates();
    
    // Initialize shift toggle
    initShiftToggle();
    
    // Initialize breakdown Y/N toggle
    initBreakdownToggle();
    
    // Initialize equipment table
    initEquipmentTable();
    
    // Initialize personnel table
    initPersonnelTable();
    
    // Initialize signature pads
    initSignaturePads();
    
    // Initialize form actions
    initFormActions();
    
    // Load draft if exists
    loadDraft();
}

// ===================
// Date Defaults
// ===================
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('shiftDate').value = today;
    document.getElementById('sitzlerDate').value = today;
    document.getElementById('clientRepDate').value = today;
}

// ===================
// Shift Toggle
// ===================
function initShiftToggle() {
    const shiftBtns = document.querySelectorAll('.shift-btn');
    
    shiftBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            shiftBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// ===================
// Breakdown Toggle
// ===================
function initBreakdownToggle() {
    const ynBtns = document.querySelectorAll('.yn-btn');
    const breakdownDetails = document.getElementById('breakdownDetails');
    
    ynBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            ynBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show/hide details based on selection
            if (this.dataset.value === 'Y') {
                breakdownDetails.style.display = 'block';
            } else {
                breakdownDetails.style.display = 'none';
            }
        });
    });
}

// ===================
// Equipment Table
// ===================
function initEquipmentTable() {
    const addBtn = document.getElementById('addEquipmentRow');
    const tbody = document.getElementById('equipmentBody');
    
    // Add row button
    addBtn.addEventListener('click', () => addEquipmentRow());
    
    // Initialize existing rows
    initEquipmentRowListeners(tbody.querySelector('tr'));
}

function addEquipmentRow() {
    const tbody = document.getElementById('equipmentBody');
    const newRow = document.createElement('tr');
    
    newRow.innerHTML = `
        <td><input type="text" class="asset-id" placeholder="EX17"></td>
        <td><input type="text" class="asset-desc" placeholder="Excavator"></td>
        <td><input type="number" class="hrs-start" placeholder="0" step="0.1"></td>
        <td><input type="number" class="hrs-finish" placeholder="0" step="0.1"></td>
        <td><input type="number" class="hrs-total" readonly></td>
        <td class="action-col"><button type="button" class="remove-row-btn" title="Remove row">×</button></td>
    `;
    
    tbody.appendChild(newRow);
    initEquipmentRowListeners(newRow);
    
    // Focus on first input
    newRow.querySelector('.asset-id').focus();
}

function initEquipmentRowListeners(row) {
    // Calculate total hours
    const hrsStart = row.querySelector('.hrs-start');
    const hrsFinish = row.querySelector('.hrs-finish');
    const hrsTotal = row.querySelector('.hrs-total');
    
    function calculateEquipmentHours() {
        const start = parseFloat(hrsStart.value) || 0;
        const finish = parseFloat(hrsFinish.value) || 0;
        const total = finish - start;
        hrsTotal.value = total >= 0 ? total.toFixed(1) : '';
    }
    
    hrsStart.addEventListener('input', calculateEquipmentHours);
    hrsFinish.addEventListener('input', calculateEquipmentHours);
    
    // Remove row
    const removeBtn = row.querySelector('.remove-row-btn');
    removeBtn.addEventListener('click', function() {
        const tbody = document.getElementById('equipmentBody');
        if (tbody.children.length > 1) {
            row.remove();
        } else {
            showToast('At least one equipment row is required', 'error');
        }
    });
}

// ===================
// Personnel Table
// ===================
function initPersonnelTable() {
    const addBtn = document.getElementById('addPersonnelRow');
    const tbody = document.getElementById('personnelBody');
    
    // Add row button
    addBtn.addEventListener('click', () => addPersonnelRow());
    
    // Initialize existing rows
    initPersonnelRowListeners(tbody.querySelector('tr'));
}

function addPersonnelRow() {
    const tbody = document.getElementById('personnelBody');
    const newRow = document.createElement('tr');
    
    newRow.innerHTML = `
        <td><input type="text" class="person-name" placeholder="Enter name"></td>
        <td><input type="time" class="time-start"></td>
        <td><input type="time" class="time-finish"></td>
        <td><input type="number" class="break-hrs" placeholder="0" step="0.25" min="0"></td>
        <td><input type="number" class="total-hrs" readonly></td>
        <td class="action-col"><button type="button" class="remove-row-btn" title="Remove row">×</button></td>
    `;
    
    tbody.appendChild(newRow);
    initPersonnelRowListeners(newRow);
    
    // Focus on first input
    newRow.querySelector('.person-name').focus();
}

function initPersonnelRowListeners(row) {
    // Calculate total hours
    const timeStart = row.querySelector('.time-start');
    const timeFinish = row.querySelector('.time-finish');
    const breakHrs = row.querySelector('.break-hrs');
    const totalHrs = row.querySelector('.total-hrs');
    
    function calculatePersonnelHours() {
        if (!timeStart.value || !timeFinish.value) {
            totalHrs.value = '';
            return;
        }
        
        const start = timeToDecimal(timeStart.value);
        const finish = timeToDecimal(timeFinish.value);
        const breakTime = parseFloat(breakHrs.value) || 0;
        
        let total = finish - start - breakTime;
        
        // Handle overnight shifts
        if (total < 0) {
            total += 24;
        }
        
        totalHrs.value = total >= 0 ? total.toFixed(2) : '';
    }
    
    timeStart.addEventListener('input', calculatePersonnelHours);
    timeFinish.addEventListener('input', calculatePersonnelHours);
    breakHrs.addEventListener('input', calculatePersonnelHours);
    
    // Remove row
    const removeBtn = row.querySelector('.remove-row-btn');
    removeBtn.addEventListener('click', function() {
        const tbody = document.getElementById('personnelBody');
        if (tbody.children.length > 1) {
            row.remove();
        } else {
            showToast('At least one personnel row is required', 'error');
        }
    });
}

function timeToDecimal(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes / 60);
}

// ===================
// Signature Pads
// ===================
let signaturePads = {};

function initSignaturePads() {
    const canvases = ['sitzlerSignature', 'clientSignature'];
    
    canvases.forEach(canvasId => {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        resizeCanvas(canvas);
        
        signaturePads[canvasId] = {
            canvas: canvas,
            ctx: ctx,
            isDrawing: false,
            lastX: 0,
            lastY: 0
        };
        
        // Mouse events
        canvas.addEventListener('mousedown', (e) => startDrawing(canvasId, e));
        canvas.addEventListener('mousemove', (e) => draw(canvasId, e));
        canvas.addEventListener('mouseup', () => stopDrawing(canvasId));
        canvas.addEventListener('mouseout', () => stopDrawing(canvasId));
        
        // Touch events
        canvas.addEventListener('touchstart', (e) => startDrawing(canvasId, e));
        canvas.addEventListener('touchmove', (e) => draw(canvasId, e));
        canvas.addEventListener('touchend', () => stopDrawing(canvasId));
    });
    
    // Clear signature buttons
    document.querySelectorAll('.clear-sig-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const canvasId = this.dataset.canvas;
            clearSignature(canvasId);
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvases.forEach(canvasId => {
            resizeCanvas(document.getElementById(canvasId));
        });
    });
}

function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

function getPosition(canvasId, e) {
    const canvas = signaturePads[canvasId].canvas;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDrawing(canvasId, e) {
    e.preventDefault();
    const pad = signaturePads[canvasId];
    const pos = getPosition(canvasId, e);
    
    pad.isDrawing = true;
    pad.lastX = pos.x;
    pad.lastY = pos.y;
}

function draw(canvasId, e) {
    e.preventDefault();
    const pad = signaturePads[canvasId];
    
    if (!pad.isDrawing) return;
    
    const pos = getPosition(canvasId, e);
    
    pad.ctx.beginPath();
    pad.ctx.moveTo(pad.lastX, pad.lastY);
    pad.ctx.lineTo(pos.x, pos.y);
    pad.ctx.stroke();
    
    pad.lastX = pos.x;
    pad.lastY = pos.y;
}

function stopDrawing(canvasId) {
    signaturePads[canvasId].isDrawing = false;
}

function clearSignature(canvasId) {
    const pad = signaturePads[canvasId];
    pad.ctx.clearRect(0, 0, pad.canvas.width, pad.canvas.height);
}

function isSignatureEmpty(canvasId) {
    const canvas = signaturePads[canvasId].canvas;
    const ctx = canvas.getContext('2d');
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    for (let i = 3; i < pixelData.length; i += 4) {
        if (pixelData[i] > 0) return false;
    }
    return true;
}

// ===================
// Form Actions
// ===================
function initFormActions() {
    document.getElementById('clearFormBtn').addEventListener('click', clearForm);
    document.getElementById('saveDraftBtn').addEventListener('click', saveDraft);
    document.getElementById('submitFormBtn').addEventListener('click', submitForm);
}

function clearForm() {
    if (confirm('Are you sure you want to clear the form? All data will be lost.')) {
        // Clear all inputs
        document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => {
            if (!input.readOnly) {
                input.value = '';
            }
        });
        
        // Reset dates
        setDefaultDates();
        
        // Reset shift toggle
        document.querySelectorAll('.shift-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.shift-btn[data-shift="day"]').classList.add('active');
        
        // Reset breakdown toggle
        document.querySelectorAll('.yn-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('breakdownDetails').style.display = 'none';
        
        // Clear signatures
        Object.keys(signaturePads).forEach(canvasId => clearSignature(canvasId));
        
        // Reset tables to single row
        resetTable('equipmentBody', addEquipmentRow, initEquipmentRowListeners);
        resetTable('personnelBody', addPersonnelRow, initPersonnelRowListeners);
        
        // Clear local storage
        localStorage.removeItem('opsTimeDraft');
        
        showToast('Form cleared', 'success');
    }
}

function resetTable(tbodyId, addRowFn, initRowFn) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    
    // Add fresh row based on table type
    if (tbodyId === 'equipmentBody') {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="text" class="asset-id" placeholder="EX17"></td>
            <td><input type="text" class="asset-desc" placeholder="Excavator"></td>
            <td><input type="number" class="hrs-start" placeholder="0" step="0.1"></td>
            <td><input type="number" class="hrs-finish" placeholder="0" step="0.1"></td>
            <td><input type="number" class="hrs-total" readonly></td>
            <td class="action-col"><button type="button" class="remove-row-btn" title="Remove row">×</button></td>
        `;
        tbody.appendChild(newRow);
        initEquipmentRowListeners(newRow);
    } else {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="text" class="person-name" placeholder="Enter name"></td>
            <td><input type="time" class="time-start"></td>
            <td><input type="time" class="time-finish"></td>
            <td><input type="number" class="break-hrs" placeholder="0" step="0.25" min="0"></td>
            <td><input type="number" class="total-hrs" readonly></td>
            <td class="action-col"><button type="button" class="remove-row-btn" title="Remove row">×</button></td>
        `;
        tbody.appendChild(newRow);
        initPersonnelRowListeners(newRow);
    }
}

function saveDraft() {
    const formData = collectFormData();
    localStorage.setItem('opsTimeDraft', JSON.stringify(formData));
    showToast('Draft saved', 'success');
}

function loadDraft() {
    const draft = localStorage.getItem('opsTimeDraft');
    if (draft) {
        try {
            const formData = JSON.parse(draft);
            populateForm(formData);
        } catch (e) {
            console.error('Error loading draft:', e);
        }
    }
}

function collectFormData() {
    // Collect all form data
    const data = {
        docketNo: document.getElementById('docketNo').value,
        siteLocation: document.getElementById('siteLocation').value,
        client: document.getElementById('client').value,
        operatorName: document.getElementById('operatorName').value,
        shiftDate: document.getElementById('shiftDate').value,
        shift: document.querySelector('.shift-btn.active')?.dataset.shift || 'day',
        breakdown: document.querySelector('.yn-btn.active')?.dataset.value || null,
        breakdownText: document.getElementById('breakdownText').value,
        worksDescription: document.getElementById('worksDescription').value,
        equipment: [],
        personnel: [],
        sitzler: {
            name: document.getElementById('sitzlerName').value,
            date: document.getElementById('sitzlerDate').value,
            position: document.getElementById('sitzlerPosition').value,
            signature: document.getElementById('sitzlerSignature').toDataURL()
        },
        clientRep: {
            name: document.getElementById('clientRepName').value,
            date: document.getElementById('clientRepDate').value,
            position: document.getElementById('clientRepPosition').value,
            signature: document.getElementById('clientSignature').toDataURL()
        }
    };
    
    // Collect equipment rows
    document.querySelectorAll('#equipmentBody tr').forEach(row => {
        data.equipment.push({
            assetId: row.querySelector('.asset-id').value,
            assetDesc: row.querySelector('.asset-desc').value,
            hrsStart: row.querySelector('.hrs-start').value,
            hrsFinish: row.querySelector('.hrs-finish').value,
            hrsTotal: row.querySelector('.hrs-total').value
        });
    });
    
    // Collect personnel rows
    document.querySelectorAll('#personnelBody tr').forEach(row => {
        data.personnel.push({
            name: row.querySelector('.person-name').value,
            timeStart: row.querySelector('.time-start').value,
            timeFinish: row.querySelector('.time-finish').value,
            breakHrs: row.querySelector('.break-hrs').value,
            totalHrs: row.querySelector('.total-hrs').value
        });
    });
    
    return data;
}

function populateForm(data) {
    // Populate basic fields
    if (data.docketNo) document.getElementById('docketNo').value = data.docketNo;
    if (data.siteLocation) document.getElementById('siteLocation').value = data.siteLocation;
    if (data.client) document.getElementById('client').value = data.client;
    if (data.operatorName) document.getElementById('operatorName').value = data.operatorName;
    if (data.shiftDate) document.getElementById('shiftDate').value = data.shiftDate;
    if (data.worksDescription) document.getElementById('worksDescription').value = data.worksDescription;
    if (data.breakdownText) document.getElementById('breakdownText').value = data.breakdownText;
    
    // Set shift
    if (data.shift) {
        document.querySelectorAll('.shift-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.shift-btn[data-shift="${data.shift}"]`)?.classList.add('active');
    }
    
    // Set breakdown
    if (data.breakdown) {
        document.querySelectorAll('.yn-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.yn-btn[data-value="${data.breakdown}"]`)?.classList.add('active');
        if (data.breakdown === 'Y') {
            document.getElementById('breakdownDetails').style.display = 'block';
        }
    }
    
    // Populate signature fields
    if (data.sitzler) {
        if (data.sitzler.name) document.getElementById('sitzlerName').value = data.sitzler.name;
        if (data.sitzler.date) document.getElementById('sitzlerDate').value = data.sitzler.date;
        if (data.sitzler.position) document.getElementById('sitzlerPosition').value = data.sitzler.position;
    }
    
    if (data.clientRep) {
        if (data.clientRep.name) document.getElementById('clientRepName').value = data.clientRep.name;
        if (data.clientRep.date) document.getElementById('clientRepDate').value = data.clientRep.date;
        if (data.clientRep.position) document.getElementById('clientRepPosition').value = data.clientRep.position;
    }
}

function submitForm() {
    // Basic validation
    const errors = validateForm();
    
    if (errors.length > 0) {
        showToast(errors[0], 'error');
        return;
    }
    
    const formData = collectFormData();
    
    // For now, just log and show success
    // In production, this would send to a backend
    console.log('Form submitted:', formData);
    
    showToast('Report submitted successfully!', 'success');
    
    // Clear draft after successful submission
    localStorage.removeItem('opsTimeDraft');
}

function validateForm() {
    const errors = [];
    
    if (!document.getElementById('docketNo').value) {
        errors.push('Please enter a Docket Number');
    }
    
    if (!document.getElementById('siteLocation').value) {
        errors.push('Please enter Site/Location');
    }
    
    if (!document.getElementById('client').value) {
        errors.push('Please enter Client name');
    }
    
    if (!document.getElementById('operatorName').value) {
        errors.push('Please enter Operator Name');
    }
    
    if (!document.getElementById('worksDescription').value) {
        errors.push('Please enter Works Description');
    }
    
    return errors;
}

// ===================
// Toast Notifications
// ===================
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hide toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
