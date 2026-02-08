const express = require('express');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' })); // Large limit for signature images
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Submit timesheet
app.post('/api/submissions', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const data = req.body;
        
        // Insert main submission
        const submissionResult = await client.query(`
            INSERT INTO submissions (
                docket, opkey, operator_name, location_key, location_name,
                client, shift_date, shift_type, has_breakdown, breakdown_details,
                works_description, sitzler_rep_name, sitzler_rep_date, 
                sitzler_rep_position, sitzler_signature, client_rep_name,
                client_rep_date, client_rep_position, client_signature, submitted_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            ON CONFLICT (docket) DO UPDATE SET
                location_key = EXCLUDED.location_key,
                location_name = EXCLUDED.location_name,
                client = EXCLUDED.client,
                shift_type = EXCLUDED.shift_type,
                has_breakdown = EXCLUDED.has_breakdown,
                breakdown_details = EXCLUDED.breakdown_details,
                works_description = EXCLUDED.works_description,
                sitzler_rep_name = EXCLUDED.sitzler_rep_name,
                sitzler_rep_date = EXCLUDED.sitzler_rep_date,
                sitzler_rep_position = EXCLUDED.sitzler_rep_position,
                sitzler_signature = EXCLUDED.sitzler_signature,
                client_rep_name = EXCLUDED.client_rep_name,
                client_rep_date = EXCLUDED.client_rep_date,
                client_rep_position = EXCLUDED.client_rep_position,
                client_signature = EXCLUDED.client_signature,
                submitted_at = EXCLUDED.submitted_at
            RETURNING id
        `, [
            data.docket,
            data.operator?.opkey,
            data.operator ? `${data.operator.first} ${data.operator.last}` : null,
            data.location || null,
            data.locationName || null,
            data.client || null,
            data.date || null,
            data.shift || 'day',
            data.breakdown?.hasBreakdown || false,
            data.breakdown?.details || null,
            data.worksDescription || null,
            data.signatures?.sitzler?.name || null,
            data.signatures?.sitzler?.date || null,
            data.signatures?.sitzler?.position || null,
            data.signatures?.sitzler?.signature || null,
            data.signatures?.client?.name || null,
            data.signatures?.client?.date || null,
            data.signatures?.client?.position || null,
            data.signatures?.client?.signature || null,
            data.submittedAt || new Date().toISOString()
        ]);
        
        const submissionId = submissionResult.rows[0].id;
        
        // Delete existing equipment/personnel rows (for updates)
        await client.query('DELETE FROM submission_equipment WHERE submission_id = $1', [submissionId]);
        await client.query('DELETE FROM submission_personnel WHERE submission_id = $1', [submissionId]);
        
        // Insert equipment rows
        if (data.equipment && data.equipment.length > 0) {
            for (let i = 0; i < data.equipment.length; i++) {
                const eq = data.equipment[i];
                if (eq.assetKey || eq.assetId) {
                    await client.query(`
                        INSERT INTO submission_equipment 
                        (submission_id, equipment_key, equipment_name, hrs_start, hrs_finish, total_hrs, row_order)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `, [
                        submissionId,
                        eq.assetKey || null,
                        eq.assetId || eq.description || null,
                        eq.hrsStart || null,
                        eq.hrsFinish || null,
                        eq.totalHrs || null,
                        i + 1
                    ]);
                }
            }
        }
        
        // Insert personnel rows
        if (data.personnel && data.personnel.length > 0) {
            for (let i = 0; i < data.personnel.length; i++) {
                const person = data.personnel[i];
                if (person.name) {
                    await client.query(`
                        INSERT INTO submission_personnel 
                        (submission_id, person_name, start_time, finish_time, break_hrs, total_hrs, row_order)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `, [
                        submissionId,
                        person.name,
                        person.startTime || null,
                        person.finishTime || null,
                        person.breakHrs || null,
                        person.totalHrs || null,
                        i + 1
                    ]);
                }
            }
        }
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Submission saved',
            id: submissionId,
            docket: data.docket
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Submission error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    } finally {
        client.release();
    }
});

// Get all submissions (for reporting)
app.get('/api/submissions', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.*, 
                   json_agg(DISTINCT jsonb_build_object(
                       'equipment_name', e.equipment_name,
                       'hrs_start', e.hrs_start,
                       'hrs_finish', e.hrs_finish,
                       'total_hrs', e.total_hrs
                   )) FILTER (WHERE e.id IS NOT NULL) as equipment,
                   json_agg(DISTINCT jsonb_build_object(
                       'person_name', p.person_name,
                       'start_time', p.start_time,
                       'finish_time', p.finish_time,
                       'break_hrs', p.break_hrs,
                       'total_hrs', p.total_hrs
                   )) FILTER (WHERE p.id IS NOT NULL) as personnel
            FROM submissions s
            LEFT JOIN submission_equipment e ON s.id = e.submission_id
            LEFT JOIN submission_personnel p ON s.id = p.submission_id
            GROUP BY s.id
            ORDER BY s.shift_date DESC, s.submitted_at DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single submission by docket
app.get('/api/submissions/:docket', async (req, res) => {
    try {
        const { docket } = req.params;
        
        const result = await pool.query(`
            SELECT s.*, 
                   json_agg(DISTINCT jsonb_build_object(
                       'equipment_name', e.equipment_name,
                       'hrs_start', e.hrs_start,
                       'hrs_finish', e.hrs_finish,
                       'total_hrs', e.total_hrs
                   )) FILTER (WHERE e.id IS NOT NULL) as equipment,
                   json_agg(DISTINCT jsonb_build_object(
                       'person_name', p.person_name,
                       'start_time', p.start_time,
                       'finish_time', p.finish_time,
                       'break_hrs', p.break_hrs,
                       'total_hrs', p.total_hrs
                   )) FILTER (WHERE p.id IS NOT NULL) as personnel
            FROM submissions s
            LEFT JOIN submission_equipment e ON s.id = e.submission_id
            LEFT JOIN submission_personnel p ON s.id = p.submission_id
            WHERE s.docket = $1
            GROUP BY s.id
        `, [docket]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Daily summary report
app.get('/api/reports/daily', async (req, res) => {
    try {
        const { date } = req.query;
        const reportDate = date || new Date().toISOString().split('T')[0];
        
        const result = await pool.query(`
            SELECT 
                s.id,
                s.docket,
                s.operator_name,
                s.location_name,
                s.client,
                s.shift_type,
                s.works_description,
                COALESCE(eq.total_equipment_hrs, 0) as total_equipment_hrs,
                COALESCE(p.total_personnel_hrs, 0) as total_personnel_hrs,
                eq.equipment_summary,
                p.personnel_summary
            FROM submissions s
            LEFT JOIN (
                SELECT 
                    submission_id,
                    SUM(total_hrs) as total_equipment_hrs,
                    json_agg(json_build_object(
                        'name', equipment_name,
                        'hrs', total_hrs
                    )) as equipment_summary
                FROM submission_equipment
                GROUP BY submission_id
            ) eq ON s.id = eq.submission_id
            LEFT JOIN (
                SELECT 
                    submission_id,
                    SUM(total_hrs) as total_personnel_hrs,
                    json_agg(json_build_object(
                        'name', person_name,
                        'hrs', total_hrs
                    )) as personnel_summary
                FROM submission_personnel
                GROUP BY submission_id
            ) p ON s.id = p.submission_id
            WHERE s.shift_date = $1
            ORDER BY s.operator_name
        `, [reportDate]);
        
        // Calculate totals
        const totals = {
            equipment_hrs: result.rows.reduce((sum, r) => sum + parseFloat(r.total_equipment_hrs || 0), 0),
            personnel_hrs: result.rows.reduce((sum, r) => sum + parseFloat(r.total_personnel_hrs || 0), 0)
        };
        
        res.json({
            date: reportDate,
            submissions: result.rows,
            totals
        });
    } catch (error) {
        console.error('Report error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ INVENTORY INTEGRATION ============
const INVENTORY_API = 'https://rac-inventory-production.up.railway.app/api/inventory-summary';

// Live proxy - main summary
app.get('/api/inventory/live', async (req, res) => {
    try {
        const response = await fetch(INVENTORY_API);
        if (!response.ok) throw new Error(`Inventory API returned ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Inventory fetch error:', error);
        res.status(502).json({ error: 'Inventory API unavailable', detail: error.message });
    }
});

// Live proxy - production breakdown
app.get('/api/inventory/production', async (req, res) => {
    try {
        const days = req.query.days || 30;
        const response = await fetch(`${INVENTORY_API}/production?days=${days}`);
        if (!response.ok) throw new Error(`Inventory API returned ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Inventory production fetch error:', error);
        res.status(502).json({ error: 'Inventory API unavailable', detail: error.message });
    }
});

// Live proxy - sales breakdown
app.get('/api/inventory/sales', async (req, res) => {
    try {
        const days = req.query.days || 30;
        const response = await fetch(`${INVENTORY_API}/sales?days=${days}`);
        if (!response.ok) throw new Error(`Inventory API returned ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Inventory sales fetch error:', error);
        res.status(502).json({ error: 'Inventory API unavailable', detail: error.message });
    }
});

// Live proxy - forward orders
app.get('/api/inventory/forward-orders', async (req, res) => {
    try {
        const response = await fetch(`${INVENTORY_API}/forward-orders`);
        if (!response.ok) throw new Error(`Inventory API returned ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Inventory forward orders fetch error:', error);
        res.status(502).json({ error: 'Inventory API unavailable', detail: error.message });
    }
});

// Save month-end snapshot
app.post('/api/inventory/snapshot', async (req, res) => {
    try {
        // Fetch live data from Inventory API
        const response = await fetch(INVENTORY_API);
        if (!response.ok) throw new Error(`Inventory API returned ${response.status}`);
        const data = await response.json();

        const snapshotDate = req.body.date || new Date().toISOString().split('T')[0];
        const snapshotType = req.body.type || 'month_end';

        const result = await pool.query(`
            INSERT INTO inventory_snapshots (
                snapshot_date, snapshot_type,
                total_soh_tonnes, total_inventory_value,
                forward_order_count, forward_order_tonnes, forward_order_value,
                mtd_production, mtd_sales, mtd_sales_revenue, mtd_sales_cost,
                product_detail, family_groups
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (snapshot_date, snapshot_type) DO UPDATE SET
                total_soh_tonnes = EXCLUDED.total_soh_tonnes,
                total_inventory_value = EXCLUDED.total_inventory_value,
                forward_order_count = EXCLUDED.forward_order_count,
                forward_order_tonnes = EXCLUDED.forward_order_tonnes,
                forward_order_value = EXCLUDED.forward_order_value,
                mtd_production = EXCLUDED.mtd_production,
                mtd_sales = EXCLUDED.mtd_sales,
                mtd_sales_revenue = EXCLUDED.mtd_sales_revenue,
                mtd_sales_cost = EXCLUDED.mtd_sales_cost,
                product_detail = EXCLUDED.product_detail,
                family_groups = EXCLUDED.family_groups,
                captured_at = CURRENT_TIMESTAMP
            RETURNING id, snapshot_date
        `, [
            snapshotDate,
            snapshotType,
            data.totals?.sohTonnes,
            data.totals?.inventoryValue,
            data.totals?.forwardOrders?.orderCount,
            data.totals?.forwardOrders?.tonnes,
            data.totals?.forwardOrders?.estimatedValue,
            data.totals?.mtd?.production,
            data.totals?.mtd?.sales,
            data.totals?.mtd?.salesRevenue,
            data.totals?.mtd?.salesCost,
            JSON.stringify(data.products),
            JSON.stringify(data.familyGroups)
        ]);

        res.json({
            success: true,
            message: `Snapshot saved for ${snapshotDate}`,
            id: result.rows[0].id
        });
    } catch (error) {
        console.error('Snapshot save error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get snapshot history
app.get('/api/inventory/snapshots', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM inventory_snapshots 
            ORDER BY snapshot_date DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Snapshot fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single snapshot by date
app.get('/api/inventory/snapshots/:date', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM inventory_snapshots WHERE snapshot_date = $1',
            [req.params.date]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No snapshot for that date' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Snapshot fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Catch-all: serve index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});