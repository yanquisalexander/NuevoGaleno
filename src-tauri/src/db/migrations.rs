use rusqlite::Connection;

const CURRENT_SCHEMA_VERSION: i32 = 4;

pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    // Setup inicial
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY
        );
        "#,
    )
    .map_err(|e| format!("Error en setup inicial: {}", e))?;

    // Obtener versión actual
    let current_version: i32 = conn
        .query_row("SELECT COALESCE(MAX(version), 0) FROM schema_version", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);

    // Aplicar migraciones pendientes
    if current_version < 1 {
        migrate_v1(conn)?;
        conn.execute("INSERT INTO schema_version(version) VALUES (1)", [])
            .map_err(|e| format!("Error actualizando versión: {}", e))?;
    }

    if current_version < 2 {
        migrate_v2(conn)?;
        conn.execute("INSERT INTO schema_version(version) VALUES (2)", [])
            .map_err(|e| format!("Error actualizando versión: {}", e))?;
    }

    if current_version < 3 {
        migrate_v3(conn)?;
        conn.execute("INSERT INTO schema_version(version) VALUES (3)", [])
            .map_err(|e| format!("Error actualizando versión: {}", e))?;
    }

    if current_version < 4 {
        migrate_v4(conn)?;
        conn.execute("INSERT INTO schema_version(version) VALUES (4)", [])
            .map_err(|e| format!("Error actualizando versión: {}", e))?;
    }

    Ok(())
}

/// Migración v1: Schema inicial
fn migrate_v1(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS app_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            pin TEXT,
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
            legacy_patient_id TEXT,
            legacy_external_id TEXT,
            external_reference TEXT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            document_type TEXT,
            document_number TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            city TEXT,
            postal_code TEXT,
            birth_date TEXT,
            gender TEXT,
            blood_type TEXT,
            allergies TEXT,
            medical_notes TEXT,
            created_at_legacy TEXT,
            updated_at_legacy TEXT,
            raw_data TEXT,
            source_run_id TEXT,
            source_record_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (legacy_patient_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_patients_document ON patients(document_number);
        CREATE INDEX IF NOT EXISTS idx_patients_legacy_id ON patients(legacy_patient_id);
        CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
        CREATE INDEX IF NOT EXISTS idx_patients_source_run ON patients(source_run_id);

        CREATE TABLE IF NOT EXISTS treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            legacy_treatment_id TEXT,
            legacy_patient_id TEXT,
            reference_code TEXT,
            name TEXT NOT NULL,
            description TEXT,
            tooth_number TEXT,
            sector TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            total_cost REAL NOT NULL DEFAULT 0.0,
            paid_amount REAL NOT NULL DEFAULT 0.0,
            balance REAL NOT NULL DEFAULT 0.0,
            planned_date TEXT,
            start_date TEXT,
            completion_date TEXT,
            notes TEXT,
            raw_data TEXT,
            source_run_id TEXT,
            source_record_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
        );
        
        CREATE UNIQUE INDEX IF NOT EXISTS idx_treatments_legacy_run ON treatments(legacy_treatment_id, source_run_id);
        CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(status);

        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            treatment_id INTEGER,
            patient_id INTEGER,
            legacy_payment_id TEXT,
            legacy_treatment_id TEXT,
            legacy_patient_id TEXT,
            legacy_receipt_number TEXT,
            legacy_consecutive TEXT,
            legacy_concept TEXT,
            legacy_observations TEXT,
            amount REAL NOT NULL,
            payment_date TEXT,
            payment_method TEXT,
            notes TEXT,
            raw_data TEXT,
            orphan_reason TEXT,
            source_run_id TEXT,
            source_record_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE SET NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_payments_treatment ON payments(treatment_id);
        CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

        CREATE TABLE IF NOT EXISTS odontograms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            legacy_record_id TEXT,
            legacy_patient_id TEXT,
            legacy_treatment_id TEXT,
            legacy_budget_number TEXT,
            tooth_number TEXT NOT NULL,
            condition TEXT NOT NULL,
            notes TEXT,
            color TEXT,
            date TEXT,
            raw_data TEXT,
            source_run_id TEXT,
            source_record_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_odontograms_patient ON odontograms(patient_id);

        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'scheduled',
            appointment_type TEXT,
            location TEXT,
            reminder_minutes INTEGER DEFAULT 30,
            color TEXT,
            created_by INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
        CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
        CREATE INDEX IF NOT EXISTS idx_appointments_date_range ON appointments(start_time, end_time);

        CREATE TABLE IF NOT EXISTS appointment_reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            appointment_id INTEGER NOT NULL,
            scheduled_time TEXT NOT NULL,
            sent INTEGER NOT NULL DEFAULT 0,
            sent_at TEXT,
            notification_id TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_reminders_appointment ON appointment_reminders(appointment_id);
        CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON appointment_reminders(scheduled_time, sent);
        "#,
    )
    .map_err(|e| format!("migration v1 err: {}", e))
}

/// Migración v2: Columnas del sistema de importación
fn migrate_v2(conn: &Connection) -> Result<(), String> {
    // Helper para agregar columnas si no existen
    let add_column_if_not_exists = |conn: &Connection, table: &str, column: &str, definition: &str| -> Result<(), String> {
        let check_query = format!("PRAGMA table_info({})", table);
        let mut stmt = conn.prepare(&check_query)
            .map_err(|e| format!("Error preparando pragma: {}", e))?;
        
        let columns: Result<Vec<String>, _> = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| format!("Error ejecutando pragma: {}", e))?
            .collect();
        
        let columns = columns.map_err(|e| format!("Error leyendo columnas: {}", e))?;
        
        if !columns.contains(&column.to_string()) {
            let alter_query = format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, definition);
            conn.execute(&alter_query, [])
                .map_err(|e| format!("Error agregando columna {}: {}", column, e))?;
        }
        Ok(())
    };

    // Agregar columnas del importer a patients
    add_column_if_not_exists(conn, "patients", "legacy_patient_id", "TEXT")?;
    add_column_if_not_exists(conn, "patients", "legacy_external_id", "TEXT")?;
    add_column_if_not_exists(conn, "patients", "blood_type", "TEXT")?;
    add_column_if_not_exists(conn, "patients", "allergies", "TEXT")?;
    add_column_if_not_exists(conn, "patients", "medical_notes", "TEXT")?;
    add_column_if_not_exists(conn, "patients", "created_at_legacy", "TEXT")?;
    add_column_if_not_exists(conn, "patients", "updated_at_legacy", "TEXT")?;
    add_column_if_not_exists(conn, "patients", "source_run_id", "TEXT")?;
    add_column_if_not_exists(conn, "patients", "source_record_hash", "TEXT")?;

    // Agregar columnas del importer a treatments
    add_column_if_not_exists(conn, "treatments", "legacy_treatment_id", "TEXT")?;
    add_column_if_not_exists(conn, "treatments", "legacy_patient_id", "TEXT")?;
    add_column_if_not_exists(conn, "treatments", "reference_code", "TEXT")?;
    add_column_if_not_exists(conn, "treatments", "description", "TEXT")?;
    add_column_if_not_exists(conn, "treatments", "planned_date", "TEXT")?;
    add_column_if_not_exists(conn, "treatments", "start_date", "TEXT")?;
    add_column_if_not_exists(conn, "treatments", "completion_date", "TEXT")?;
    add_column_if_not_exists(conn, "treatments", "source_run_id", "TEXT")?;
    add_column_if_not_exists(conn, "treatments", "source_record_hash", "TEXT")?;

    // Agregar columnas del importer a payments
    add_column_if_not_exists(conn, "payments", "legacy_payment_id", "TEXT")?;
    add_column_if_not_exists(conn, "payments", "legacy_treatment_id", "TEXT")?;
    add_column_if_not_exists(conn, "payments", "legacy_patient_id", "TEXT")?;
    add_column_if_not_exists(conn, "payments", "legacy_receipt_number", "TEXT")?;
    add_column_if_not_exists(conn, "payments", "legacy_consecutive", "TEXT")?;
    add_column_if_not_exists(conn, "payments", "legacy_concept", "TEXT")?;
    add_column_if_not_exists(conn, "payments", "legacy_observations", "TEXT")?;
    add_column_if_not_exists(conn, "payments", "patient_id", "INTEGER")?;
    add_column_if_not_exists(conn, "payments", "orphan_reason", "TEXT")?;
    add_column_if_not_exists(conn, "payments", "source_run_id", "TEXT")?;
    add_column_if_not_exists(conn, "payments", "source_record_hash", "TEXT")?;

    // Agregar columnas del importer a odontograms
    add_column_if_not_exists(conn, "odontograms", "legacy_record_id", "TEXT")?;
    add_column_if_not_exists(conn, "odontograms", "legacy_patient_id", "TEXT")?;
    add_column_if_not_exists(conn, "odontograms", "legacy_treatment_id", "TEXT")?;
    add_column_if_not_exists(conn, "odontograms", "legacy_budget_number", "TEXT")?;
    add_column_if_not_exists(conn, "odontograms", "color", "TEXT")?;
    add_column_if_not_exists(conn, "odontograms", "date", "TEXT")?;
    add_column_if_not_exists(conn, "odontograms", "raw_data", "TEXT")?;
    add_column_if_not_exists(conn, "odontograms", "source_run_id", "TEXT")?;
    add_column_if_not_exists(conn, "odontograms", "source_record_hash", "TEXT")?;

    // Crear índices para nuevas columnas
    conn.execute_batch(
        r#"
        CREATE INDEX IF NOT EXISTS idx_patients_legacy_id ON patients(legacy_patient_id);
        CREATE INDEX IF NOT EXISTS idx_patients_source_run ON patients(source_run_id);
        CREATE INDEX IF NOT EXISTS idx_treatments_legacy_id ON treatments(legacy_treatment_id);
        CREATE INDEX IF NOT EXISTS idx_treatments_source_run ON treatments(source_run_id);
        CREATE INDEX IF NOT EXISTS idx_payments_legacy_id ON payments(legacy_payment_id);
        CREATE INDEX IF NOT EXISTS idx_payments_source_run ON payments(source_run_id);
        CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
        "#,
    )
    .map_err(|e| format!("Error creando indices v2: {}", e))?;

    Ok(())
}

/// Migración v3: Corregir nombres de columnas en treatments
fn migrate_v3(conn: &Connection) -> Result<(), String> {
    // SQLite soporta RENAME COLUMN desde la versión 3.25.0
    // Intentamos renombrar, si falla es que ya existen o no se puede
    
    let _ = conn.execute("ALTER TABLE treatments RENAME COLUMN started_date TO start_date", []);
    let _ = conn.execute("ALTER TABLE treatments RENAME COLUMN completed_date TO completion_date", []);

    Ok(())
}

/// Migración v4: Agregar tabla de templates
fn migrate_v4(conn: &Connection) -> Result<(), String> {
    use crate::db::templates;
    
    templates::init_templates_table(conn)
        .map_err(|e| format!("Error creando tabla templates: {}", e))?;

    Ok(())
}
