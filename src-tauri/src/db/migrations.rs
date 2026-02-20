use rusqlite::Connection;

const CURRENT_SCHEMA_VERSION: i32 = 12;

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
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0),
        )
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

    if current_version < 5 {
        migrate_v5(conn)?;
        conn.execute("INSERT INTO schema_version(version) VALUES (5)", [])
            .map_err(|e| format!("Error actualizando versión: {}", e))?;
    }

    if current_version < 6 {
        migrate_v6(conn)?;
        conn.execute("INSERT INTO schema_version(version) VALUES (6)", [])
            .map_err(|e| format!("Error actualizando versión: {}", e))?;
    }

    if current_version < 7 {
        migrate_v7(conn)?;
        conn.execute("INSERT INTO schema_version(version) VALUES (7)", [])
            .map_err(|e| format!("Error actualizando versión: {}", e))?;
    }

    if current_version < 8 {
        migrate_v8(conn)?;
        conn.execute("INSERT INTO schema_version(version) VALUES (8)", [])
            .map_err(|e| format!("Error actualizando versión: {}", e))?;
    }

    if current_version < 9 {
        migrate_v9(conn)?;
        conn.execute("INSERT INTO schema_version(version) VALUES (9)", [])
            .map_err(|e| format!("Error actualizando versión: {}", e))?;
    }

    if current_version < 10 {
        migrate_v10(conn)?;
        conn.execute("INSERT INTO schema_version(version) VALUES (10)", [])
            .map_err(|e| format!("Error actualizando versión: {}", e))?;
    }

    if current_version < 11 {
        migrate_v11(conn)?;
        conn.execute("INSERT INTO schema_version(version) VALUES (11)", [])
            .map_err(|e| format!("Error actualizando versión: {}", e))?;
    }

    if current_version < 12 {
        migrate_v12(conn)?;
        conn.execute("INSERT INTO schema_version(version) VALUES (12)", [])
            .map_err(|e| format!("Error actualizando versión: {}", e))?;
    }

    Ok(())
}

/// Asegura compatibilidad con esquemas antiguos: agrega columnas que puedan faltar
pub fn ensure_legacy_columns(conn: &Connection) -> Result<(), String> {
    // Si la tabla treatments no existe, no hacemos nada
    let table_exists: Result<i64, _> = conn
        .query_row(
            "SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name='treatments'",
            [],
            |row| row.get(0),
        );

    if table_exists.is_err() || table_exists.unwrap_or(0) == 0 {
        return Ok(());
    }

    // Obtener columnas existentes
    let mut stmt = conn
        .prepare("PRAGMA table_info(treatments)")
        .map_err(|e| format!("Error preparando pragma: {}", e))?;

    let cols: Result<Vec<String>, _> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("Error ejecutando pragma: {}", e))?
        .collect();

    let cols = cols.map_err(|e| format!("Error leyendo columnas: {}", e))?;

    if !cols.contains(&"start_date".to_string()) {
        conn.execute("ALTER TABLE treatments ADD COLUMN start_date TEXT", [])
            .map_err(|e| format!("Error agregando columna start_date: {}", e))?;
    }

    if !cols.contains(&"completion_date".to_string()) {
        conn.execute("ALTER TABLE treatments ADD COLUMN completion_date TEXT", [])
            .map_err(|e| format!("Error agregando columna completion_date: {}", e))?;
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
    let add_column_if_not_exists =
        |conn: &Connection, table: &str, column: &str, definition: &str| -> Result<(), String> {
            let check_query = format!("PRAGMA table_info({})", table);
            let mut stmt = conn
                .prepare(&check_query)
                .map_err(|e| format!("Error preparando pragma: {}", e))?;

            let columns: Result<Vec<String>, _> = stmt
                .query_map([], |row| row.get::<_, String>(1))
                .map_err(|e| format!("Error ejecutando pragma: {}", e))?
                .collect();

            let columns = columns.map_err(|e| format!("Error leyendo columnas: {}", e))?;

            if !columns.contains(&column.to_string()) {
                let alter_query =
                    format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, definition);
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

    let _ = conn.execute(
        "ALTER TABLE treatments RENAME COLUMN started_date TO start_date",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE treatments RENAME COLUMN completed_date TO completion_date",
        [],
    );

    Ok(())
}

/// Migración v4: Agregar tabla de templates
fn migrate_v4(conn: &Connection) -> Result<(), String> {
    use crate::db::templates;

    templates::init_templates_table(conn)
        .map_err(|e| format!("Error creando tabla templates: {}", e))?;

    Ok(())
}

/// Migración v5: Catálogo de tratamientos y mejoras al odontograma
fn migrate_v5(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        -- Catálogo de tratamientos disponibles
        CREATE TABLE IF NOT EXISTS treatment_catalog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            default_cost REAL NOT NULL DEFAULT 0.0,
            category TEXT,
            color TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_treatment_catalog_category ON treatment_catalog(category);
        CREATE INDEX IF NOT EXISTS idx_treatment_catalog_active ON treatment_catalog(is_active);

        -- Sub-tratamientos del catálogo
        CREATE TABLE IF NOT EXISTS treatment_catalog_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            treatment_catalog_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            default_cost REAL NOT NULL DEFAULT 0.0,
            color TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            display_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (treatment_catalog_id) REFERENCES treatment_catalog(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_catalog_items_treatment ON treatment_catalog_items(treatment_catalog_id);
        CREATE INDEX IF NOT EXISTS idx_catalog_items_active ON treatment_catalog_items(is_active);

        -- Actualizar tabla de odontogramas para soportar caras dentales y tratamientos
        CREATE TABLE IF NOT EXISTS odontogram_surfaces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            tooth_number TEXT NOT NULL,
            surface TEXT NOT NULL, -- 'mesial', 'distal', 'vestibular', 'palatina', 'lingual', 'oclusal'
            treatment_catalog_id INTEGER,
            treatment_catalog_item_id INTEGER,
            condition TEXT NOT NULL DEFAULT 'healthy',
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (treatment_catalog_id) REFERENCES treatment_catalog(id) ON DELETE SET NULL,
            FOREIGN KEY (treatment_catalog_item_id) REFERENCES treatment_catalog_items(id) ON DELETE SET NULL,
            UNIQUE(patient_id, tooth_number, surface)
        );

        CREATE INDEX IF NOT EXISTS idx_odonto_surfaces_patient ON odontogram_surfaces(patient_id);
        CREATE INDEX IF NOT EXISTS idx_odonto_surfaces_tooth ON odontogram_surfaces(tooth_number);
        CREATE INDEX IF NOT EXISTS idx_odonto_surfaces_treatment ON odontogram_surfaces(treatment_catalog_id);

        -- Insertar algunos tratamientos de ejemplo
        INSERT OR IGNORE INTO treatment_catalog (id, name, description, default_cost, category, color)
        VALUES 
            (1, 'Obturación', 'Restauración dental con resina o amalgama', 800.00, 'Operatoria', '#10b981'),
            (2, 'Endodoncia', 'Tratamiento de conductos', 2500.00, 'Endodoncia', '#3b82f6'),
            (3, 'Corona', 'Corona protésica', 4000.00, 'Prótesis', '#fbbf24'),
            (4, 'Extracción', 'Extracción dental', 500.00, 'Cirugía', '#ef4444'),
            (5, 'Limpieza', 'Profilaxis dental', 400.00, 'Prevención', '#4ade80'),
            (6, 'Caries', 'Diagnóstico de caries', 0.00, 'Diagnóstico', '#f97316');

        -- Sub-tratamientos de ejemplo
        INSERT OR IGNORE INTO treatment_catalog_items (id, treatment_catalog_id, name, default_cost, display_order)
        VALUES
            (1, 1, 'Obturación simple', 800.00, 1),
            (2, 1, 'Obturación compuesta', 1200.00, 2),
            (3, 2, 'Endodoncia unirradicular', 2000.00, 1),
            (4, 2, 'Endodoncia birradicular', 2500.00, 2),
            (5, 2, 'Endodoncia multirradicular', 3500.00, 3),
            (6, 3, 'Corona de porcelana', 4000.00, 1),
            (7, 3, 'Corona de zirconio', 6000.00, 2),
            (8, 4, 'Extracción simple', 500.00, 1),
            (9, 4, 'Extracción compleja', 1200.00, 2);
        "#,
    )
    .map_err(|e| format!("migration v5 err: {}", e))
}

/// Migración v6: Múltiples tratamientos por superficie dental con historial
fn migrate_v6(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        -- Eliminar restricción UNIQUE de odontogram_surfaces para permitir múltiples tratamientos
        -- SQLite no permite eliminar constraints directamente, así que recreamos la tabla
        
        -- 1. Crear tabla temporal con los datos actuales
        CREATE TABLE IF NOT EXISTS odontogram_surfaces_backup (
            id INTEGER PRIMARY KEY,
            patient_id INTEGER NOT NULL,
            tooth_number TEXT NOT NULL,
            surface TEXT NOT NULL,
            treatment_catalog_id INTEGER,
            treatment_catalog_item_id INTEGER,
            condition TEXT NOT NULL DEFAULT 'healthy',
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        -- 2. Copiar datos existentes
        INSERT OR IGNORE INTO odontogram_surfaces_backup 
        SELECT id, patient_id, tooth_number, surface, treatment_catalog_id, 
               treatment_catalog_item_id, condition, notes, created_at, updated_at
        FROM odontogram_surfaces;

        -- 3. Eliminar tabla original
        DROP TABLE IF EXISTS odontogram_surfaces;

        -- 4. Crear nueva tabla sin la restricción UNIQUE
        CREATE TABLE odontogram_surfaces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            tooth_number TEXT NOT NULL,
            surface TEXT NOT NULL, 
            treatment_catalog_id INTEGER,
            treatment_catalog_item_id INTEGER,
            condition TEXT NOT NULL DEFAULT 'healthy',
            notes TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            applied_date TEXT NOT NULL DEFAULT (datetime('now')),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (treatment_catalog_id) REFERENCES treatment_catalog(id) ON DELETE SET NULL,
            FOREIGN KEY (treatment_catalog_item_id) REFERENCES treatment_catalog_items(id) ON DELETE SET NULL
        );

        -- 5. Restaurar datos desde backup
        INSERT INTO odontogram_surfaces (id, patient_id, tooth_number, surface, treatment_catalog_id, 
                                         treatment_catalog_item_id, condition, notes, created_at, updated_at)
        SELECT id, patient_id, tooth_number, surface, treatment_catalog_id, 
               treatment_catalog_item_id, condition, notes, created_at, updated_at
        FROM odontogram_surfaces_backup;

        -- 6. Eliminar backup
        DROP TABLE odontogram_surfaces_backup;

        -- 7. Recrear índices
        CREATE INDEX IF NOT EXISTS idx_odonto_surfaces_patient ON odontogram_surfaces(patient_id);
        CREATE INDEX IF NOT EXISTS idx_odonto_surfaces_tooth ON odontogram_surfaces(tooth_number);
        CREATE INDEX IF NOT EXISTS idx_odonto_surfaces_treatment ON odontogram_surfaces(treatment_catalog_id);
        CREATE INDEX IF NOT EXISTS idx_odonto_surfaces_active ON odontogram_surfaces(is_active);
        CREATE INDEX IF NOT EXISTS idx_odonto_surfaces_composite ON odontogram_surfaces(patient_id, tooth_number, surface);

        -- Tabla de historial para auditoría y cambios
        CREATE TABLE IF NOT EXISTS odontogram_surface_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            tooth_number TEXT NOT NULL,
            surface TEXT NOT NULL,
            treatment_catalog_id INTEGER,
            treatment_catalog_item_id INTEGER,
            condition TEXT NOT NULL,
            notes TEXT,
            action TEXT NOT NULL, -- 'created', 'updated', 'deactivated'
            applied_date TEXT NOT NULL,
            recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (treatment_catalog_id) REFERENCES treatment_catalog(id) ON DELETE SET NULL,
            FOREIGN KEY (treatment_catalog_item_id) REFERENCES treatment_catalog_items(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_surface_history_patient ON odontogram_surface_history(patient_id);
        CREATE INDEX IF NOT EXISTS idx_surface_history_tooth ON odontogram_surface_history(tooth_number);
        CREATE INDEX IF NOT EXISTS idx_surface_history_composite ON odontogram_surface_history(patient_id, tooth_number, surface);
        CREATE INDEX IF NOT EXISTS idx_surface_history_date ON odontogram_surface_history(applied_date);
        "#,
    )
    .map_err(|e| format!("migration v6 err: {}", e))
}

/// Migración v7: Tratamientos independientes con íconos
fn migrate_v7(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        -- Agregar campos para mostrar tratamientos de forma independiente y con íconos
        ALTER TABLE treatment_catalog ADD COLUMN show_independently INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE treatment_catalog ADD COLUMN icon TEXT;
        ALTER TABLE treatment_catalog_items ADD COLUMN icon TEXT;

        CREATE INDEX IF NOT EXISTS idx_treatment_catalog_independent ON treatment_catalog(show_independently);

        -- Actualizar algunos tratamientos comunes para mostrarlos independientemente
        UPDATE treatment_catalog SET show_independently = 1, icon = '🦷' WHERE name = 'Ortodoncia' OR category = 'Ortodoncia';
        UPDATE treatment_catalog SET show_independently = 1, icon = '👄' WHERE name = 'Prótesis' OR category = 'Prótesis';
        "#,
    )
    .map_err(|e| format!("migration v7 err: {}", e))
}

/// Migración v8: Atributos especiales para tratamientos (oscurecer, ausente, puentes, etc.)
fn migrate_v8(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        -- Agregar campos para efectos visuales y tratamientos especiales
        -- applies_to_whole_tooth: si el tratamiento se aplica al diente completo (no a superficie específica)
        -- visual_effect: efecto visual especial (darken, absent, implant, etc.)
        -- is_bridge_component: si este tratamiento puede formar parte de un puente
        ALTER TABLE treatment_catalog ADD COLUMN applies_to_whole_tooth INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE treatment_catalog ADD COLUMN visual_effect TEXT;
        ALTER TABLE treatment_catalog ADD COLUMN is_bridge_component INTEGER NOT NULL DEFAULT 0;
        
        ALTER TABLE treatment_catalog_items ADD COLUMN applies_to_whole_tooth INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE treatment_catalog_items ADD COLUMN visual_effect TEXT;
        ALTER TABLE treatment_catalog_items ADD COLUMN is_bridge_component INTEGER NOT NULL DEFAULT 0;

        -- Tabla para registrar tratamientos a nivel de diente completo
        CREATE TABLE IF NOT EXISTS odontogram_tooth_treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            tooth_number TEXT NOT NULL,
            treatment_catalog_id INTEGER,
            treatment_catalog_item_id INTEGER,
            condition TEXT NOT NULL DEFAULT 'treatment',
            notes TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            applied_date TEXT NOT NULL DEFAULT (datetime('now')),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (treatment_catalog_id) REFERENCES treatment_catalog(id) ON DELETE SET NULL,
            FOREIGN KEY (treatment_catalog_item_id) REFERENCES treatment_catalog_items(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tooth_treatments_patient ON odontogram_tooth_treatments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_tooth_treatments_tooth ON odontogram_tooth_treatments(tooth_number);
        CREATE INDEX IF NOT EXISTS idx_tooth_treatments_active ON odontogram_tooth_treatments(is_active);
        CREATE INDEX IF NOT EXISTS idx_tooth_treatments_composite ON odontogram_tooth_treatments(patient_id, tooth_number);

        -- Tabla para registrar puentes dentales
        CREATE TABLE IF NOT EXISTS odontogram_bridges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            bridge_name TEXT NOT NULL,
            tooth_start TEXT NOT NULL,
            tooth_end TEXT NOT NULL,
            treatment_catalog_id INTEGER,
            treatment_catalog_item_id INTEGER,
            notes TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            applied_date TEXT NOT NULL DEFAULT (datetime('now')),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (treatment_catalog_id) REFERENCES treatment_catalog(id) ON DELETE SET NULL,
            FOREIGN KEY (treatment_catalog_item_id) REFERENCES treatment_catalog_items(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_bridges_patient ON odontogram_bridges(patient_id);
        CREATE INDEX IF NOT EXISTS idx_bridges_active ON odontogram_bridges(is_active);

        -- Historial para tratamientos de diente completo
        CREATE TABLE IF NOT EXISTS odontogram_tooth_treatment_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            tooth_number TEXT NOT NULL,
            treatment_catalog_id INTEGER,
            treatment_catalog_item_id INTEGER,
            condition TEXT NOT NULL,
            notes TEXT,
            action TEXT NOT NULL,
            applied_date TEXT NOT NULL,
            recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (treatment_catalog_id) REFERENCES treatment_catalog(id) ON DELETE SET NULL,
            FOREIGN KEY (treatment_catalog_item_id) REFERENCES treatment_catalog_items(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tooth_history_patient ON odontogram_tooth_treatment_history(patient_id);
        CREATE INDEX IF NOT EXISTS idx_tooth_history_tooth ON odontogram_tooth_treatment_history(tooth_number);

        -- Crear algunos tratamientos de ejemplo con efectos visuales
        INSERT OR IGNORE INTO treatment_catalog (name, description, default_cost, category, color, applies_to_whole_tooth, visual_effect, show_independently)
        VALUES 
            ('Ausente', 'Diente ausente', 0.00, 'Diagnóstico', '#64748b', 1, 'absent', 0),
            ('Implante', 'Implante dental', 8000.00, 'Implantología', '#8b5cf6', 1, 'implant', 0),
            ('Diente Oscurecido', 'Diente con alteración de color', 0.00, 'Diagnóstico', '#1e293b', 1, 'darken', 0),
            ('Puente Dental', 'Puente fijo', 12000.00, 'Prótesis', '#f59e0b', 0, NULL, 0);

        UPDATE treatment_catalog SET is_bridge_component = 1 WHERE name = 'Puente Dental';
        "#,
    )
    .map_err(|e| format!("migration v8 err: {}", e))
}

/// Migración v9: Agregar campo treatment_id para vincular con la tabla de tratamientos
fn migrate_v9(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        -- Agregar campo treatment_id a odontogram_surfaces
        ALTER TABLE odontogram_surfaces ADD COLUMN treatment_id INTEGER DEFAULT NULL;
        CREATE INDEX IF NOT EXISTS idx_odontogram_surfaces_treatment ON odontogram_surfaces(treatment_id);

        -- Agregar campo treatment_id a odontogram_tooth_treatments
        ALTER TABLE odontogram_tooth_treatments ADD COLUMN treatment_id INTEGER DEFAULT NULL;
        CREATE INDEX IF NOT EXISTS idx_odontogram_tooth_treatments_treatment ON odontogram_tooth_treatments(treatment_id);

        -- Agregar campo treatment_id a odontogram_bridges
        ALTER TABLE odontogram_bridges ADD COLUMN treatment_id INTEGER DEFAULT NULL;
        CREATE INDEX IF NOT EXISTS idx_odontogram_bridges_treatment ON odontogram_bridges(treatment_id);
        "#,
    )
    .map_err(|e| format!("migration v9 err: {}", e))
}

/// Migración v10: Agregar campo preferences a users
fn migrate_v10(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT NULL;
        "#,
    )
    .map_err(|e| format!("migration v10 err: {}", e))
}

/// Migración v11: Crear tabla para almacenamiento de datos de plugins
fn migrate_v11(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        -- Tabla para almacenar datos de plugins de forma estructurada
        CREATE TABLE IF NOT EXISTS plugin_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plugin_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            value_type TEXT NOT NULL DEFAULT 'string',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(plugin_id, key)
        );

        CREATE INDEX IF NOT EXISTS idx_plugin_data_plugin_id ON plugin_data(plugin_id);
        CREATE INDEX IF NOT EXISTS idx_plugin_data_key ON plugin_data(plugin_id, key);

        -- Tabla para metadatos de plugins instalados
        CREATE TABLE IF NOT EXISTS plugin_metadata (
            plugin_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            installed_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT,
            first_party INTEGER NOT NULL DEFAULT 0,
            settings TEXT
        );

        -- Tabla para logs/eventos de plugins (opcional, para debugging)
        CREATE TABLE IF NOT EXISTS plugin_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plugin_id TEXT NOT NULL,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            metadata TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_plugin_logs_plugin_id ON plugin_logs(plugin_id);
        CREATE INDEX IF NOT EXISTS idx_plugin_logs_created_at ON plugin_logs(created_at);
        "#,
    )
    .map_err(|e| format!("migration v11 err: {}", e))
}

/// Migración v12: Galeno Filesystem - Sistema de archivos virtual
fn migrate_v12(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        -- Metadata table for files and folders
        CREATE TABLE IF NOT EXISTS filesystem_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            virtual_path TEXT NOT NULL UNIQUE,
            physical_path TEXT NOT NULL,
            name TEXT NOT NULL,
            entry_type TEXT NOT NULL CHECK(entry_type IN ('file', 'folder')),
            size INTEGER NOT NULL DEFAULT 0,
            mime_type TEXT,
            owner_username TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            modified_at TEXT NOT NULL DEFAULT (datetime('now')),
            parent_path TEXT,
            FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_filesystem_metadata_virtual_path ON filesystem_metadata(virtual_path);
        CREATE INDEX IF NOT EXISTS idx_filesystem_metadata_parent_path ON filesystem_metadata(parent_path);
        CREATE INDEX IF NOT EXISTS idx_filesystem_metadata_owner ON filesystem_metadata(owner_username);

        -- Permissions table
        CREATE TABLE IF NOT EXISTS filesystem_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            virtual_path TEXT NOT NULL,
            username TEXT NOT NULL,
            can_read INTEGER NOT NULL DEFAULT 0,
            can_write INTEGER NOT NULL DEFAULT 0,
            can_delete INTEGER NOT NULL DEFAULT 0,
            granted_at TEXT NOT NULL DEFAULT (datetime('now')),
            granted_by TEXT NOT NULL,
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
            UNIQUE(virtual_path, username)
        );

        CREATE INDEX IF NOT EXISTS idx_filesystem_permissions_path ON filesystem_permissions(virtual_path);
        CREATE INDEX IF NOT EXISTS idx_filesystem_permissions_user ON filesystem_permissions(username);

        -- File locks for concurrent access control
        CREATE TABLE IF NOT EXISTS filesystem_locks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            virtual_path TEXT NOT NULL UNIQUE,
            locked_by TEXT NOT NULL,
            locked_at TEXT NOT NULL DEFAULT (datetime('now')),
            expires_at TEXT NOT NULL,
            FOREIGN KEY (locked_by) REFERENCES users(username) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_filesystem_locks_path ON filesystem_locks(virtual_path);
        CREATE INDEX IF NOT EXISTS idx_filesystem_locks_expires ON filesystem_locks(expires_at);

        -- Audit log for all operations
        CREATE TABLE IF NOT EXISTS filesystem_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL DEFAULT (datetime('now')),
            username TEXT NOT NULL,
            operation TEXT NOT NULL,
            virtual_path TEXT NOT NULL,
            target_path TEXT,
            success INTEGER NOT NULL,
            error_message TEXT,
            metadata TEXT,
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_filesystem_audit_timestamp ON filesystem_audit_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_filesystem_audit_user ON filesystem_audit_log(username);
        CREATE INDEX IF NOT EXISTS idx_filesystem_audit_operation ON filesystem_audit_log(operation);

        -- Patient file associations
        CREATE TABLE IF NOT EXISTS filesystem_patient_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            virtual_path TEXT NOT NULL,
            patient_id INTEGER NOT NULL,
            linked_at TEXT NOT NULL DEFAULT (datetime('now')),
            linked_by TEXT NOT NULL,
            notes TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (linked_by) REFERENCES users(username) ON DELETE SET NULL,
            UNIQUE(virtual_path, patient_id)
        );

        CREATE INDEX IF NOT EXISTS idx_filesystem_patient_links_path ON filesystem_patient_links(virtual_path);
        CREATE INDEX IF NOT EXISTS idx_filesystem_patient_links_patient ON filesystem_patient_links(patient_id);

        -- Trash/Recycle bin
        CREATE TABLE IF NOT EXISTS filesystem_trash (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_virtual_path TEXT NOT NULL,
            original_parent_path TEXT NOT NULL,
            name TEXT NOT NULL,
            entry_type TEXT NOT NULL CHECK(entry_type IN ('file', 'folder')),
            size INTEGER NOT NULL,
            owner_username TEXT NOT NULL,
            deleted_at TEXT NOT NULL DEFAULT (datetime('now')),
            deleted_by TEXT NOT NULL,
            physical_backup_path TEXT NOT NULL,
            FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE CASCADE,
            FOREIGN KEY (deleted_by) REFERENCES users(username) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_filesystem_trash_owner ON filesystem_trash(owner_username);
        CREATE INDEX IF NOT EXISTS idx_filesystem_trash_deleted_at ON filesystem_trash(deleted_at);

        -- Storage quotas
        CREATE TABLE IF NOT EXISTS filesystem_quotas (
            username TEXT PRIMARY KEY,
            quota_bytes INTEGER NOT NULL,
            used_bytes INTEGER NOT NULL DEFAULT 0,
            last_calculated TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        );

        -- File type restrictions (whitelist)
        CREATE TABLE IF NOT EXISTS filesystem_allowed_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            extension TEXT NOT NULL UNIQUE,
            mime_type TEXT NOT NULL,
            description TEXT,
            enabled INTEGER NOT NULL DEFAULT 1
        );

        -- Insert default allowed types for medical documents
        INSERT OR IGNORE INTO filesystem_allowed_types (extension, mime_type, description) VALUES
            ('pdf', 'application/pdf', 'PDF Document'),
            ('jpg', 'image/jpeg', 'JPEG Image'),
            ('jpeg', 'image/jpeg', 'JPEG Image'),
            ('png', 'image/png', 'PNG Image'),
            ('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Word Document'),
            ('doc', 'application/msword', 'Word Document (Legacy)'),
            ('txt', 'text/plain', 'Text File'),
            ('dcm', 'application/dicom', 'DICOM Medical Image'),
            ('xml', 'application/xml', 'XML Document'),
            ('csv', 'text/csv', 'CSV File');
        "#,
    )
    .map_err(|e| format!("migration v12 err: {}", e))
}
