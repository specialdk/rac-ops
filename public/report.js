(function() {
    'use strict';

    const reportDate = document.getElementById('reportDate');
    const loadBtn = document.getElementById('loadReport');
    const printBtn = document.getElementById('printReport');
    const reportTable = document.getElementById('reportTable');
    const reportBody = document.getElementById('reportBody');
    const reportFooter = document.getElementById('reportFooter');
    const loading = document.getElementById('loading');
    const noData = document.getElementById('noData');

    // Set default date to today
    function init() {
        const today = new Date().toISOString().split('T')[0];
        reportDate.value = today;
        loadReport();
        bindEvents();
    }

    function bindEvents() {
        loadBtn.addEventListener('click', loadReport);
        printBtn.addEventListener('click', () => window.print());
        reportDate.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadReport();
        });
    }

    async function loadReport() {
        const date = reportDate.value;
        if (!date) return;

        // Show loading
        loading.style.display = 'block';
        reportTable.style.display = 'none';
        noData.style.display = 'none';

        try {
            const response = await fetch(`/api/reports/daily?date=${date}`);
            const data = await response.json();

            if (data.submissions && data.submissions.length > 0) {
                renderReport(data);
                reportTable.style.display = 'table';
            } else {
                noData.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to load report:', error);
            noData.textContent = 'Error loading report.';
            noData.style.display = 'block';
        } finally {
            loading.style.display = 'none';
        }

        // Update print header
        const dateDisplay = document.querySelector('.report-date-display');
        if (dateDisplay) {
            dateDisplay.textContent = formatDate(date);
        }
        
        const genTime = document.getElementById('generatedTime');
        if (genTime) {
            genTime.textContent = new Date().toLocaleString();
        }
    }

    function renderReport(data) {
        // Clear previous
        reportBody.innerHTML = '';
        reportFooter.innerHTML = '';

        // Render rows
        data.submissions.forEach(row => {
            const equipmentList = formatEquipment(row.equipment_summary);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.operator_name || ''}</td>
                <td>${row.location_name || ''}</td>
                <td>${equipmentList}</td>
                <td>${parseFloat(row.total_equipment_hrs || 0).toFixed(1)}</td>
                <td>${parseFloat(row.total_personnel_hrs || 0).toFixed(1)}</td>
                <td>${row.works_description || ''}</td>
            `;
            reportBody.appendChild(tr);
        });

        // Render totals
        const footerRow = document.createElement('tr');
        footerRow.innerHTML = `
            <td colspan="3"><strong>TOTALS</strong></td>
            <td><strong>${data.totals.equipment_hrs.toFixed(1)}</strong></td>
            <td><strong>${data.totals.personnel_hrs.toFixed(1)}</strong></td>
            <td></td>
        `;
        reportFooter.appendChild(footerRow);
    }

    function formatEquipment(summary) {
        if (!summary || !Array.isArray(summary)) return '';
        return summary.map(e => e.name).join(', ');
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-AU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();