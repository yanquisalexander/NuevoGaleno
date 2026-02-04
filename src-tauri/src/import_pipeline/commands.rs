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
    run_id: String,
    source_path: String,
    patients: Vec<models::PatientDto>,
    orphan_treatments: Vec<models::TreatmentDto>,
    orphan_payments: Vec<models::PaymentDto>,
    orphan_odontograms: Vec<models::OdontogramDto>,
    anomalies: Vec<models::ImportAnomalyDto>,
    transform_issues: Vec<ValidationIssue>,
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

    let transform_result = transformer::transform_raw_data(
        &raw_data,
        Some(&extracted_dir),
        Some(transform_callback),
    )?;

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
    let run_id = format!("run_{}", session_id);

    let issues_len = transform_result.issues.len();
    
    *state = Some(ImportSessionState {
        session_id: session_id.clone(),
        run_id: run_id.clone(),
        source_path: extracted_dir.clone(),
        patients: transform_result.patients.clone(),
        orphan_treatments: transform_result.orphan_treatments,
        orphan_payments: transform_result.orphan_payments,
        orphan_odontograms: transform_result.orphan_odontograms,
        anomalies: transform_result.anomalies,
        transform_issues: transform_result.issues,
        validation: None,
        preview: None,
    });

    Ok(serde_json::json!({
        "session_id": session_id,
        "run_id": run_id,
        "patients_found": transform_result.patients.len(),
        "transformation_issues": issues_len,
        "issues": state.as_ref().map(|s| s.transform_issues.clone()).unwrap_or_default(),
        "orphan_treatments": state.as_ref().map(|s| s.orphan_treatments.len()).unwrap_or(0),
        "orphan_payments": state.as_ref().map(|s| s.orphan_payments.len()).unwrap_or(0),
        "orphan_odontograms": state.as_ref().map(|s| s.orphan_odontograms.len()).unwrap_or(0),
        "anomalies": state.as_ref().map(|s| s.anomalies.len()).unwrap_or(0),
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
pub async fn confirm_and_persist_import(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
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

    // Clone data we need outside the lock
    let run_id = session.run_id.clone();
    let source_path = session.source_path.clone();
    let patients = session.patients.clone();
    let orphan_treatments = session.orphan_treatments.clone();
    let orphan_payments = session.orphan_payments.clone();
    let orphan_odontograms = session.orphan_odontograms.clone();
    let anomalies = session.anomalies.clone();
    
    drop(state); // Release lock before async operation

    // Emit initial progress
    let _ = app.emit("import:progress", serde_json::json!({
        "stage": "persisting",
        "message": "Preparando base de datos..."
    }));

    // Obtener conexión a la base de datos
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

    let _ = app.emit("import:progress", serde_json::json!({
        "stage": "persisting",
        "message": "Guardando pacientes y tratamientos..."
    }));

    let mut progress_cb = |p: persister::PersistProgress| {
        let _ = app.emit("import:progress", serde_json::json!({
            "stage": "persisting",
            "substage": p.stage,
            "current": p.current,
            "total": p.total,
            "message": p.message
        }));
    };

    // Persistir todo
    let result = persister::persist_all(
        &mut conn,
        &run_id,
        &source_path,
        &patients,
        &orphan_treatments,
        &orphan_payments,
        &orphan_odontograms,
        &anomalies,
        Some(&mut progress_cb),
    )?;

    if !result.success {
        return Err(result
            .error
            .unwrap_or_else(|| "Error desconocido".to_string()));
    }

    let _ = app.emit("import:progress", serde_json::json!({
        "stage": "persisting",
        "message": "Importación completada exitosamente"
    }));

    Ok(serde_json::json!({
        "run_id": run_id,
        "patients_inserted": result.patients_inserted,
        "treatments_inserted": result.treatments_inserted,
        "payments_inserted": result.payments_inserted,
        "odontograms_inserted": result.odontograms_inserted,
        "history_documents_inserted": result.history_documents_inserted,
        "anomalies_recorded": result.anomalies_recorded,
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
            "run_id": session.run_id,
            "source_path": session.source_path,
            "patients_count": session.patients.len(),
            "orphan_treatments": session.orphan_treatments.len(),
            "orphan_payments": session.orphan_payments.len(),
            "orphan_odontograms": session.orphan_odontograms.len(),
            "anomalies": session.anomalies.len(),
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
        "run_id": session.run_id,
        "source_path": session.source_path,
        "patients": session.patients.clone(),
        "orphan_treatments": session.orphan_treatments.clone(),
        "orphan_payments": session.orphan_payments.clone(),
        "orphan_odontograms": session.orphan_odontograms.clone(),
        "anomalies": session.anomalies.clone(),
        "transform_issues": session.transform_issues.clone(),
        "validation": session.validation,
        "preview": session.preview,
    });

    serde_json::to_string_pretty(&export).map_err(|e| format!("Error exportando: {}", e))
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSIÓN DE DOCUMENTOS .DOC
// ═══════════════════════════════════════════════════════════════════════════

/// Detecta archivos .doc en el directorio de importación
#[tauri::command]
pub fn detect_doc_files_in_import(source_path: String) -> Result<serde_json::Value, String> {
    let doc_files = doc_converter::detect_doc_files(&source_path)?;
    let info = doc_converter::get_doc_files_info(&doc_files);

    Ok(serde_json::json!({
        "found": doc_files.len() > 0,
        "info": info,
        "files": doc_files.iter().map(|p| p.display().to_string()).collect::<Vec<_>>()
    }))
}

/// Convierte archivos .doc a .txt usando Word COM (requiere Microsoft Word en Windows)
/// IMPORTANTE: Abre PowerShell en segundo plano para ejecutar la conversión
#[tauri::command]
pub async fn convert_doc_files_to_txt(
    window: tauri::Window,
    doc_files_paths: Vec<String>,
) -> Result<serde_json::Value, String> {
    use std::path::PathBuf;
    use std::io::{BufRead, BufReader};

    if doc_files_paths.is_empty() {
        return Err("No se proporcionaron archivos para convertir".to_string());
    }

    let total = doc_files_paths.len();

    // Emitir evento de inicio
    let _ = window.emit("doc_conversion:progress", serde_json::json!({
        "stage": "starting",
        "current": 0,
        "total": total,
        "message": format!("Iniciando conversión de {} archivos .doc...", total)
    }));

    // Convertir strings a PathBuf
    let paths: Vec<PathBuf> = doc_files_paths.iter().map(|s| PathBuf::from(s)).collect();

    // Preparar archivos temporales
    let temp_dir = std::env::temp_dir();
    let script_path = temp_dir.join("convert_doc_to_txt.ps1");
    let paths_file = temp_dir.join("doc_files_to_convert.txt");

    // Crear script
    let script = doc_converter::get_conversion_script();
    std::fs::write(&script_path, script)
        .map_err(|e| format!("Error creando script: {}", e))?;

    let paths_content = paths
        .iter()
        .map(|p| p.display().to_string())
        .collect::<Vec<_>>()
        .join("\n");
    std::fs::write(&paths_file, paths_content)
        .map_err(|e| format!("Error creando archivo de paths: {}", e))?;

    // Ejecutar PowerShell con captura de stdout en tiempo real
    let mut child = std::process::Command::new("powershell.exe")
        .args(&[
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            script_path.to_str().unwrap(),
            "-PathsFile",
            paths_file.to_str().unwrap(),
        ])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Error ejecutando PowerShell: {}", e))?;

    // Leer stdout línea por línea para capturar progreso
    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                // Parsear líneas de progreso: "PROGRESS|current|total|message"
                if line.starts_with("PROGRESS|") {
                    let parts: Vec<&str> = line.split('|').collect();
                    if parts.len() >= 4 {
                        let current = parts[1].parse::<usize>().unwrap_or(0);
                        let total = parts[2].parse::<usize>().unwrap_or(total);
                        let message = parts[3..].join("|");
                        
                        let _ = window.emit("doc_conversion:progress", serde_json::json!({
                            "stage": "converting",
                            "current": current,
                            "total": total,
                            "message": message
                        }));
                    }
                } else if line.starts_with("COMPLETE|") {
                    // Línea final con resultados
                    let parts: Vec<&str> = line.split('|').collect();
                    if parts.len() >= 3 {
                        let success = parts[1].parse::<usize>().unwrap_or(0);
                        let errors_count = parts[2].parse::<usize>().unwrap_or(0);
                        
                        let _ = window.emit("doc_conversion:progress", serde_json::json!({
                            "stage": "complete",
                            "current": total,
                            "total": total,
                            "message": format!("✅ Conversión completada: {} exitosos, {} errores", success, errors_count)
                        }));
                    }
                }
            }
        }
    }

    // Esperar a que termine el proceso
    let output = child.wait_with_output()
        .map_err(|e| format!("Error esperando PowerShell: {}", e))?;

    // Limpiar archivos temporales
    let _ = std::fs::remove_file(&script_path);
    let _ = std::fs::remove_file(&paths_file);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("PowerShell falló: {}", stderr));
    }

    // Parsear resultado JSON de la última línea
    let stdout = String::from_utf8_lossy(&output.stdout);
    let json_lines: Vec<&str> = stdout.lines().filter(|l| !l.starts_with("PROGRESS") && !l.starts_with("COMPLETE")).collect();
    let json_output = json_lines.join("\n");
    
    let result: serde_json::Value = serde_json::from_str(&json_output)
        .map_err(|e| format!("Error parseando resultado: {} - Output: {}", e, json_output))?;

    Ok(result)
}

