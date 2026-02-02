use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY
        );

        INSERT OR IGNORE INTO schema_version(version) VALUES (1);

        CREATE TABLE IF NOT EXISTS app_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            legacy_id TEXT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            document_number TEXT,
            phone TEXT,
            email TEXT,
            birth_date TEXT,
            gender TEXT,
            blood_type TEXT,
            allergies TEXT,
            medical_notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            raw_data TEXT NOT NULL DEFAULT '{}'
        );
        
        CREATE INDEX IF NOT EXISTS idx_patients_document ON patients(document_number);
        CREATE INDEX IF NOT EXISTS idx_patients_legacy_id ON patients(legacy_id);
        CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);

        CREATE TABLE IF NOT EXISTS treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            legacy_id TEXT,
            name TEXT NOT NULL,
            tooth_number TEXT,
            sector TEXT,
            status TEXT NOT NULL DEFAULT 'Pending',
            total_cost REAL NOT NULL DEFAULT 0.0,
            paid_amount REAL NOT NULL DEFAULT 0.0,
            balance REAL NOT NULL DEFAULT 0.0,
            start_date TEXT,
            completion_date TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            raw_data TEXT NOT NULL DEFAULT '{}',
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(status);
        CREATE INDEX IF NOT EXISTS idx_treatments_legacy_id ON treatments(legacy_id);

        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            treatment_id INTEGER NOT NULL,
            legacy_id TEXT,
            amount REAL NOT NULL,
            payment_date TEXT NOT NULL,
            payment_method TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            raw_data TEXT NOT NULL DEFAULT '{}',
            FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_payments_treatment ON payments(treatment_id);
        CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

        CREATE TABLE IF NOT EXISTS odontograms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            tooth_number TEXT NOT NULL,
            condition TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_odontograms_patient ON odontograms(patient_id);
        CREATE INDEX IF NOT EXISTS idx_odontograms_tooth ON odontograms(patient_id, tooth_number);
        "#,
    )
    .map_err(|e| format!("migration err: {}", e))?;

    Ok(())
}
