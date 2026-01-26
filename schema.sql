-- Submissions table (main form data)
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    docket VARCHAR(20) UNIQUE NOT NULL,
    opkey INTEGER NOT NULL,
    operator_name VARCHAR(100),
    location_key INTEGER,
    location_name VARCHAR(100),
    client VARCHAR(100),
    shift_date DATE NOT NULL,
    shift_type VARCHAR(10),
    has_breakdown BOOLEAN DEFAULT FALSE,
    breakdown_details TEXT,
    works_description TEXT,
    sitzler_rep_name VARCHAR(100),
    sitzler_rep_date DATE,
    sitzler_rep_position VARCHAR(100),
    sitzler_signature TEXT,
    client_rep_name VARCHAR(100),
    client_rep_date DATE,
    client_rep_position VARCHAR(100),
    client_signature TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Equipment rows (linked to submission)
CREATE TABLE IF NOT EXISTS submission_equipment (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
    equipment_key INTEGER,
    equipment_name VARCHAR(100),
    hrs_start DECIMAL(10,2),
    hrs_finish DECIMAL(10,2),
    total_hrs DECIMAL(10,2),
    row_order INTEGER
);

-- Personnel rows (linked to submission)
CREATE TABLE IF NOT EXISTS submission_personnel (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
    person_name VARCHAR(100),
    start_time TIME,
    finish_time TIME,
    break_hrs DECIMAL(5,2),
    total_hrs DECIMAL(5,2),
    row_order INTEGER
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_submissions_docket ON submissions(docket);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON submissions(shift_date);
CREATE INDEX IF NOT EXISTS idx_submissions_opkey ON submissions(opkey);
