-- Dynamic Billing System Schema for Phrelis OS

-- 1. Bed Master Table (Categories and Rates)
CREATE TABLE IF NOT EXISTS bed_master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT UNIQUE NOT NULL, -- ICU, ER, Ward, Deluxe
    daily_rate REAL NOT NULL
);

-- 2. Patient Ledger Table (Line-item Charges)
CREATE TABLE IF NOT EXISTS patient_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    item_type TEXT NOT NULL, -- BED, PHARMACY, CLINICAL, LAB
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients (id)
);

-- 3. Inventory Item Update (Added unit_price)
-- ALTER TABLE inventory_items ADD COLUMN unit_price REAL DEFAULT 0.0;

-- 4. Bed Model Mapping
-- BedModel.type (String) maps to bed_master.category (String)
-- Billing Listener logic uses this mapping to calculate dynamic stay costs.
