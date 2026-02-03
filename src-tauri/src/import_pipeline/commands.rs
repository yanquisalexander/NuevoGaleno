// Comandos Tauri para el pipeline de importación
// Expone las operaciones del pipeline al frontend

use crate::import_pipeline::*;
use once_cell::sync::Lazy;
use std::sync::Mutex;
use tauri::Emitter;

// Estado global de la sesión de importación
static IMPORT_STATE: Lazy<Mutex<Option<ImportSessionState>>> = Lazy::new(|| Mutex::new(None));

struct ImportSessionState {
    session_id: String,
    patients: Vec<models::PatientDto>,
    validation: Option<validator::ValidationResult>,
    preview: Option<previewer::ImportPreview>,
}

// ═══════════════════════════════════════════════════════════════════════════
// COMANDOS TAURI
// ═══════════════════════════════════════════════════════════════════════════

/// Paso 1: Inicia una nueva sesión de importación desde un directorio extraído
/// Con preview_only=true, solo lee los primeros 5 registros para mostrar rápidamente
#[tauri::command]
pub async fn start_import_session(
    window: tauri::Window,
    extracted_dir: String,
    preview_only: Option<bool>,
) -> Result<serde_json::Value, String> {
    use std::time::{SystemTime, UNIX_EPOCH};

    let session_id = format!(
        "import_{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    );

    let is_preview = preview_only.unwrap_or(false);
    
    // Emitir evento de inicio
    let _ = window.emit("import:progress", serde_json::json!({
        "stage": "reading",
        "message": if is_preview { "Iniciando vista previa rápida..." } else { "Iniciando lectura completa de datos..." }
    }));

    // 1. Leer datos raw de Paradox con callback de progreso
    let window_clone = window.clone();
    let progress_callback = Box::new(move |msg: String| {
        let _ = window_clone.emit("import:progress", serde_json::json!({
            "stage": "reading",
            "message": msg
        }));
    });

    let raw_data = if is_preview {
        reader::read_all_tables_preview(&extracted_dir, 5, Some(progress_callback)).await?
    } else {
        reader::read_all_tables(&extracted_dir, Some(progress_callback)).await?
    };

    if raw_data.tables.is_empty() {
        return Err("No se encontraron tablas válidas en el directorio".to_string());
    }

    // Emitir evento de transformación
    let _ = window.emit("import:progress", serde_json::json!({
        "stage": "transforming",
        "message": "Transformando y normalizando datos..."
    }));

    // 2. Transformar a DTOs con callback de progreso
    let window_clone = window.clone();
    let transform_callback = Box::new(move |msg: String| {
        let _ = window_clone.emit("import:progress", serde_json::json!({
            "stage": "transforming",
            "message": msg
        }));
    });

    let transform_result = transformer::transform_raw_data(&raw_data, Some(transform_callback))?;

    if transform_result.patients.is_empty() {
        return Err("No se pudo extraer ningún paciente válido".to_string());
    }

    // Emitir evento de finalización de lectura
    let _ = window.emit("import:progress", serde_json::json!({
        "stage": "complete",
        "message": format!("✅ Lectura completada: {} pacientes encontrados", transform_result.patients.len())
    }));

    // 3. Guardar en estado global
    let mut state = IMPORT_STATE.lock().unwrap();
    *state = Some(ImportSessionState {
        session_id: session_id.clone(),
        patients: transform_result.patients.clone(),
        validation: None,
        preview: None,
    });

    Ok(serde_json::json!({
        "session_id": session_id,
        "patients_found": transform_result.patients.len(),
        "transformation_issues": transform_result.issues.len(),
        "status": "ready_for_validation"
    }))
}

/// Paso 2: Valida los datos importados
#[tauri::command]
pub fn validate_import_data() -> Result<serde_json::Value, String> {
    let mut state = IMPORT_STATE.lock().unwrap();
    let session = state
        .as_mut()
        .ok_or("No hay sesión de importación activa")?;

    // Ejecutar validación
    let validation_result = validator::validate_all(&session.patients);

    let summary = validator::generate_validation_summary(&validation_result);
    let can_proceed = validation_result.can_proceed();

    // Guardar resultado
    session.validation = Some(validation_result);

    Ok(serde_json::json!({
        "session_id": session.session_id,
        "summary": summary,
        "can_proceed": can_proceed,
        "status": if can_proceed { "validation_passed" } else { "validation_failed" }
    }))
}

/// Paso 3: Genera la previsualización de los datos
#[tauri::command]
pub fn generate_import_preview() -> Result<serde_json::Value, String> {
    let mut state = IMPORT_STATE.lock().unwrap();
    let session = state
        .as_mut()
        .ok_or("No hay sesión de importación activa")?;

    let validation = session
        .validation
        .as_ref()
        .ok_or("Debe validar los datos antes de generar la previsualización")?;

    // Generar preview
    let preview = previewer::generate_preview(&session.patients, validation);

    let can_proceed = preview.can_proceed;

    // Convertir a JSON
    let preview_json =
        serde_json::to_value(&preview).map_err(|e| format!("Error serializando preview: {}", e))?;

    // Guardar preview
    session.preview = Some(preview);

    Ok(serde_json::json!({
        "session_id": session.session_id,
        "preview": preview_json,
        "can_proceed": can_proceed,
        "status": "preview_ready"
    }))
}

/// Paso 4: Confirma y persiste los datos en SQLite
#[tauri::command]
pub fn confirm_and_persist_import() -> Result<serde_json::Value, String> {
    let mut state = IMPORT_STATE.lock().unwrap();
    let session = state
        .as_mut()
        .ok_or("No hay sesión de importación activa")?;

    let validation = session
        .validation
        .as_ref()
        .ok_or("Debe validar los datos antes de persistir")?;

    if !validation.can_proceed() {
        return Err("No se puede persistir: hay errores críticos en la validación".to_string());
    }

    // Obtener conexión a la base de datos
    // NOTA: get_connection devuelve &'static, necesitamos una conexión mutable
    // Por ahora, abrir una nueva conexión
    let db_path = crate::wizard::db_file_path()?;
    let mut conn =
        rusqlite::Connection::open(&db_path).map_err(|e| format!("Error abriendo DB: {}", e))?;

    // Verificar si ya hay datos importados
    let has_existing = persister::check_existing_imports(&conn)?;
    if has_existing {
        return Err(
            "Ya existen datos importados previamente. Use clear_imported_data primero si desea reimportar.".to_string()
        );
    }

    // Persistir todo
    let result = persister::persist_all(&mut conn, &session.patients)?;

    if !result.success {
        return Err(result
            .error
            .unwrap_or_else(|| "Error desconocido".to_string()));
    }

    Ok(serde_json::json!({
        "session_id": session.session_id,
        "patients_inserted": result.patients_inserted,
        "treatments_inserted": result.treatments_inserted,
        "payments_inserted": result.payments_inserted,
        "status": "completed"
    }))
}

/// Cancela la sesión actual
#[tauri::command]
pub fn cancel_import_session() -> Result<(), String> {
    let mut state = IMPORT_STATE.lock().unwrap();
    *state = None;
    Ok(())
}

/// Obtiene el estado actual de la sesión
#[tauri::command]
pub fn get_import_session_status() -> Result<serde_json::Value, String> {
    let state = IMPORT_STATE.lock().unwrap();

    match state.as_ref() {
        Some(session) => Ok(serde_json::json!({
            "active": true,
            "session_id": session.session_id,
            "patients_count": session.patients.len(),
            "has_validation": session.validation.is_some(),
            "has_preview": session.preview.is_some(),
        })),
        None => Ok(serde_json::json!({
            "active": false
        })),
    }
}

/// Limpia datos importados previamente (CUIDADO: destructivo)
#[tauri::command]
pub fn clear_imported_data() -> Result<(), String> {
    let db_path = crate::wizard::db_file_path()?;
    let mut conn =
        rusqlite::Connection::open(&db_path).map_err(|e| format!("Error abriendo DB: {}", e))?;
    persister::clear_imported_data(&mut conn)?;
    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN PARA DEBUGGING
// ═══════════════════════════════════════════════════════════════════════════

/// Exporta el estado completo de la sesión a JSON (para debugging)
#[tauri::command]
pub fn export_session_debug() -> Result<String, String> {
    let state = IMPORT_STATE.lock().unwrap();
    let session = state.as_ref().ok_or("No hay sesión activa")?;

    let export = serde_json::json!({
        "session_id": session.session_id,
        "patients": session.patients,
        "validation": session.validation,
        "preview": session.preview,
    });

    serde_json::to_string_pretty(&export).map_err(|e| format!("Error exportando: {}", e))
}
