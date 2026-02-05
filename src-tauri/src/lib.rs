// Modular Tauri commands: wizard (db/config) and importer (gln handling)
mod db;
mod global;
mod import_pipeline;
mod importer;
mod pxlib;
mod config;
mod session;
mod wizard;

// Simple greeting for sanity checks
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ===== PATIENTS COMMANDS =====
#[tauri::command]
fn get_patients(
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<db::patients::Patient>, String> {
    db::patients::get_patients(limit, offset)
}

#[tauri::command]
fn get_patient_by_id(id: i64) -> Result<Option<db::patients::Patient>, String> {
    db::patients::get_patient_by_id(id)
}

#[tauri::command]
fn create_patient(input: db::patients::CreatePatientInput) -> Result<i64, String> {
    db::patients::create_patient(input)
}

#[tauri::command]
fn update_patient(id: i64, input: db::patients::UpdatePatientInput) -> Result<(), String> {
    db::patients::update_patient(id, input)
}

#[tauri::command]
fn delete_patient(id: i64) -> Result<(), String> {
    db::patients::delete_patient(id)
}

#[tauri::command]
fn search_patients(query: String) -> Result<Vec<db::patients::Patient>, String> {
    db::patients::search_patients(&query)
}

#[tauri::command]
fn get_patients_count() -> Result<i64, String> {
    db::patients::get_patients_count()
}

// ===== TREATMENTS COMMANDS =====
#[tauri::command]
fn get_all_treatments(
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<db::treatments::Treatment>, String> {
    db::treatments::get_all_treatments(limit, offset)
}

#[tauri::command]
fn get_treatment_by_id(id: i64) -> Result<Option<db::treatments::Treatment>, String> {
    db::treatments::get_treatment_by_id(id)
}

#[tauri::command]
fn get_treatments_by_patient(patient_id: i64) -> Result<Vec<db::treatments::Treatment>, String> {
    db::treatments::get_treatments_by_patient(patient_id)
}

#[tauri::command]
fn get_treatments_by_status(status: String) -> Result<Vec<db::treatments::Treatment>, String> {
    db::treatments::get_treatments_by_status(&status)
}

#[tauri::command]
fn create_treatment(input: db::treatments::CreateTreatmentInput) -> Result<i64, String> {
    db::treatments::create_treatment(input)
}

#[tauri::command]
fn update_treatment(id: i64, input: db::treatments::UpdateTreatmentInput) -> Result<(), String> {
    db::treatments::update_treatment(id, input)
}

#[tauri::command]
fn update_treatment_status(id: i64, status: String) -> Result<(), String> {
    db::treatments::update_treatment_status(id, &status)
}

#[tauri::command]
fn delete_treatment(id: i64) -> Result<(), String> {
    db::treatments::delete_treatment(id)
}

// ===== TEMPLATES COMMANDS =====
#[tauri::command]
fn get_all_templates() -> Result<Vec<db::templates::Template>, String> {
    let conn = db::get_connection()?;
    db::templates::get_all_templates(&conn)
        .map_err(|e| format!("Error getting templates: {}", e))
}

#[tauri::command]
fn get_template_by_id(id: i64) -> Result<Option<db::templates::Template>, String> {
    let conn = db::get_connection()?;
    db::templates::get_template_by_id(&conn, id)
        .map_err(|e| format!("Error getting template: {}", e))
}

#[tauri::command]
fn get_templates_by_type(template_type: String) -> Result<Vec<db::templates::Template>, String> {
    let conn = db::get_connection()?;
    db::templates::get_templates_by_type(&conn, &template_type)
        .map_err(|e| format!("Error getting templates by type: {}", e))
}

#[tauri::command]
fn create_template(input: db::templates::CreateTemplateInput) -> Result<db::templates::Template, String> {
    let conn = db::get_connection()?;
    db::templates::create_template(&conn, input)
        .map_err(|e| format!("Error creating template: {}", e))
}

#[tauri::command]
fn update_template(id: i64, input: db::templates::UpdateTemplateInput) -> Result<(), String> {
    let conn = db::get_connection()?;
    db::templates::update_template(&conn, id, input)
        .map_err(|e| format!("Error updating template: {}", e))
}

#[tauri::command]
fn delete_template(id: i64) -> Result<(), String> {
    let conn = db::get_connection()?;
    db::templates::delete_template(&conn, id)
        .map_err(|e| format!("Error deleting template: {}", e))
}

#[tauri::command]
fn set_default_template(id: i64, template_type: String) -> Result<(), String> {
    let conn = db::get_connection()?;
    db::templates::set_default_template(&conn, id, &template_type)
        .map_err(|e| format!("Error setting default template: {}", e))
}

#[tauri::command]
fn get_treatment_stats() -> Result<db::treatments::TreatmentStats, String> {
    db::treatments::get_treatment_stats()
}

// ===== PAYMENTS COMMANDS =====
#[tauri::command]
fn get_all_payments(
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<db::payments::Payment>, String> {
    db::payments::get_all_payments(limit, offset)
}

#[tauri::command]
fn get_payment_by_id(id: i64) -> Result<Option<db::payments::Payment>, String> {
    db::payments::get_payment_by_id(id)
}

#[tauri::command]
fn get_payments_by_treatment(treatment_id: i64) -> Result<Vec<db::payments::Payment>, String> {
    db::payments::get_payments_by_treatment(treatment_id)
}

#[tauri::command]
fn get_payments_by_patient(patient_id: i64) -> Result<Vec<db::payments::Payment>, String> {
    db::payments::get_payments_by_patient(patient_id)
}

#[tauri::command]
fn create_payment(input: db::payments::CreatePaymentInput) -> Result<i64, String> {
    db::payments::create_payment(input)
}

#[tauri::command]
fn update_payment(id: i64, input: db::payments::UpdatePaymentInput) -> Result<(), String> {
    db::payments::update_payment(id, input)
}

#[tauri::command]
fn delete_payment(id: i64) -> Result<(), String> {
    db::payments::delete_payment(id)
}

#[tauri::command]
fn get_patient_balance(patient_id: i64) -> Result<db::payments::PatientBalance, String> {
    db::payments::get_patient_balance(patient_id)
}

#[tauri::command]
fn get_patients_with_debt() -> Result<Vec<db::payments::PatientBalance>, String> {
    db::payments::get_patients_with_debt()
}

#[tauri::command]
fn get_total_debt() -> Result<f64, String> {
    db::payments::get_total_debt()
}

#[tauri::command]
fn get_recent_payments(limit: Option<i64>) -> Result<Vec<db::payments::Payment>, String> {
    db::payments::get_recent_payments(limit)
}

// ===== ODONTOGRAMS COMMANDS =====
#[tauri::command]
fn get_odontogram_by_patient(
    patient_id: i64,
) -> Result<Vec<db::odontograms::OdontogramEntry>, String> {
    db::odontograms::get_odontogram_by_patient(patient_id)
}

#[tauri::command]
fn get_tooth_by_patient_and_number(
    patient_id: i64,
    tooth_number: String,
) -> Result<Option<db::odontograms::OdontogramEntry>, String> {
    db::odontograms::get_tooth_by_patient_and_number(patient_id, &tooth_number)
}

#[tauri::command]
fn update_tooth_condition(
    input: db::odontograms::UpdateToothConditionInput,
) -> Result<i64, String> {
    db::odontograms::update_tooth_condition(input)
}

#[tauri::command]
fn delete_tooth_condition(patient_id: i64, tooth_number: String) -> Result<(), String> {
    db::odontograms::delete_tooth_condition(patient_id, &tooth_number)
}

#[tauri::command]
fn clear_patient_odontogram(patient_id: i64) -> Result<(), String> {
    db::odontograms::clear_patient_odontogram(patient_id)
}

#[tauri::command]
fn get_tooth_history(
    patient_id: i64,
    tooth_number: String,
) -> Result<Vec<db::odontograms::OdontogramEntry>, String> {
    db::odontograms::get_tooth_history(patient_id, &tooth_number)
}

// ===== ODONTOGRAM SURFACES COMMANDS =====
#[tauri::command]
fn get_odontogram_surfaces_by_patient(
    patient_id: i64,
) -> Result<Vec<db::odontogram_surfaces::OdontogramSurface>, String> {
    db::odontogram_surfaces::get_odontogram_surfaces_by_patient(patient_id)
}

#[tauri::command]
fn get_tooth_surfaces(
    patient_id: i64,
    tooth_number: String,
) -> Result<Vec<db::odontogram_surfaces::OdontogramSurface>, String> {
    db::odontogram_surfaces::get_tooth_surfaces(patient_id, &tooth_number)
}

#[tauri::command]
fn update_tooth_surface(
    input: db::odontogram_surfaces::UpdateSurfaceInput,
) -> Result<i64, String> {
    db::odontogram_surfaces::update_tooth_surface(input)
}

#[tauri::command]
fn delete_tooth_surface(
    patient_id: i64,
    tooth_number: String,
    surface: String,
) -> Result<(), String> {
    db::odontogram_surfaces::delete_tooth_surface(patient_id, &tooth_number, &surface)
}

#[tauri::command]
fn clear_tooth_surfaces(patient_id: i64, tooth_number: String) -> Result<(), String> {
    db::odontogram_surfaces::clear_tooth_surfaces(patient_id, &tooth_number)
}

// ===== TREATMENT CATALOG COMMANDS =====
#[tauri::command]
fn get_all_treatment_catalog(
) -> Result<Vec<db::treatment_catalog::TreatmentCatalogEntry>, String> {
    db::treatment_catalog::get_all_treatment_catalog()
}

#[tauri::command]
fn get_treatment_catalog_by_id(
    id: i64,
) -> Result<Option<db::treatment_catalog::TreatmentCatalogEntry>, String> {
    db::treatment_catalog::get_treatment_catalog_by_id(id)
}

#[tauri::command]
fn create_treatment_catalog(
    input: db::treatment_catalog::CreateTreatmentCatalogInput,
) -> Result<i64, String> {
    db::treatment_catalog::create_treatment_catalog(input)
}

#[tauri::command]
fn update_treatment_catalog(
    input: db::treatment_catalog::UpdateTreatmentCatalogInput,
) -> Result<(), String> {
    db::treatment_catalog::update_treatment_catalog(input)
}

#[tauri::command]
fn delete_treatment_catalog(id: i64) -> Result<(), String> {
    db::treatment_catalog::delete_treatment_catalog(id)
}

#[tauri::command]
fn get_treatment_catalog_items(
    treatment_catalog_id: i64,
) -> Result<Vec<db::treatment_catalog::TreatmentCatalogItem>, String> {
    db::treatment_catalog::get_treatment_catalog_items(treatment_catalog_id)
}

#[tauri::command]
fn get_treatment_catalog_item_by_id(
    id: i64,
) -> Result<Option<db::treatment_catalog::TreatmentCatalogItem>, String> {
    db::treatment_catalog::get_treatment_catalog_item_by_id(id)
}

#[tauri::command]
fn create_treatment_catalog_item(
    input: db::treatment_catalog::CreateTreatmentCatalogItemInput,
) -> Result<i64, String> {
    db::treatment_catalog::create_treatment_catalog_item(input)
}

#[tauri::command]
fn update_treatment_catalog_item(
    input: db::treatment_catalog::UpdateTreatmentCatalogItemInput,
) -> Result<(), String> {
    db::treatment_catalog::update_treatment_catalog_item(input)
}

#[tauri::command]
fn delete_treatment_catalog_item(id: i64) -> Result<(), String> {
    db::treatment_catalog::delete_treatment_catalog_item(id)
}

// ===== APPOINTMENTS COMMANDS =====
#[tauri::command]
fn create_appointment(appointment: db::appointments::Appointment) -> Result<i64, String> {
    let conn = db::get_connection()?;
    db::appointments::create_appointment(&conn, &appointment)
}

#[tauri::command]
fn update_appointment(appointment: db::appointments::Appointment) -> Result<(), String> {
    let conn = db::get_connection()?;
    db::appointments::update_appointment(&conn, &appointment)
}

#[tauri::command]
fn delete_appointment(id: i64) -> Result<(), String> {
    let conn = db::get_connection()?;
    db::appointments::delete_appointment(&conn, id)
}

#[tauri::command]
fn get_appointment(id: i64) -> Result<db::appointments::Appointment, String> {
    let conn = db::get_connection()?;
    db::appointments::get_appointment(&conn, id)
}

#[tauri::command]
fn list_appointments(
    filter: db::appointments::AppointmentFilter,
) -> Result<Vec<db::appointments::AppointmentWithPatient>, String> {
    let conn = db::get_connection()?;
    db::appointments::list_appointments(&conn, &filter)
}

#[tauri::command]
fn get_pending_reminders() -> Result<Vec<db::appointments::AppointmentReminder>, String> {
    let conn = db::get_connection()?;
    db::appointments::get_pending_reminders(&conn)
}

#[tauri::command]
fn mark_reminder_sent(reminder_id: i64, notification_id: String) -> Result<(), String> {
    let conn = db::get_connection()?;
    db::appointments::mark_reminder_sent(&conn, reminder_id, &notification_id)
}

#[tauri::command]
fn get_upcoming_appointments(hours: i32) -> Result<Vec<db::appointments::AppointmentWithPatient>, String> {
    let conn = db::get_connection()?;
    db::appointments::get_upcoming_appointments(&conn, hours)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // store global AppHandle for modules that need to emit from background tasks
            let mut g = global::GLOBAL_APP_HANDLE.lock().unwrap();
            *g = Some(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            // importer
            importer::select_gln,
            importer::extract_gln,
            importer::list_extracted_files,
            importer::inspect_paradox_db,
            importer::list_tables,
            importer::read_table_data,
            // import pipeline
            import_pipeline::commands::start_import_session,
            import_pipeline::commands::validate_import_data,
            import_pipeline::commands::generate_import_preview,
            import_pipeline::commands::confirm_and_persist_import,
            import_pipeline::commands::cancel_import_session,
            import_pipeline::commands::get_import_session_status,
            import_pipeline::commands::clear_imported_data,
            import_pipeline::commands::export_session_debug,
            import_pipeline::commands::detect_doc_files_in_import,
            import_pipeline::commands::convert_doc_files_to_txt,
            // wizard & users
            wizard::init_app_db,
            wizard::set_config,
            wizard::get_config,
            wizard::create_user,
            wizard::authenticate_user,
            wizard::list_users,
            wizard::update_user_password,
            wizard::delete_user,
            wizard::verify_system_password,
            wizard::set_system_password,
            wizard::wipe_system,
            config::get_config_schema,
            config::get_config_values,
            config::get_config_value,
            config::set_config_value,
            // session management
            session::login_user,
            session::login_with_pin,
            session::unlock_with_password,
            session::unlock_with_pin,
            session::set_user_pin,
            session::remove_user_pin,
            session::logout_user,
            session::get_current_user,
            session::get_current_session_info,
            session::verify_session,
            session::exit_application,
            session::get_session_duration,
            // patients
            get_patients,
            get_patient_by_id,
            create_patient,
            update_patient,
            delete_patient,
            search_patients,
            get_patients_count,
            // treatments
            get_all_treatments,
            get_treatment_by_id,
            get_treatments_by_patient,
            get_treatments_by_status,
            create_treatment,
            update_treatment,
            update_treatment_status,
            delete_treatment,
            get_treatment_stats,
            // templates
            get_all_templates,
            get_template_by_id,
            get_templates_by_type,
            create_template,
            update_template,
            delete_template,
            set_default_template,
            // payments
            get_all_payments,
            get_payment_by_id,
            get_payments_by_treatment,
            get_payments_by_patient,
            create_payment,
            update_payment,
            delete_payment,
            get_patient_balance,
            get_patients_with_debt,
            get_total_debt,
            get_recent_payments,
            // odontograms
            get_odontogram_by_patient,
            get_tooth_by_patient_and_number,
            update_tooth_condition,
            delete_tooth_condition,
            clear_patient_odontogram,
            get_tooth_history,
            // odontogram surfaces
            get_odontogram_surfaces_by_patient,
            get_tooth_surfaces,
            update_tooth_surface,
            delete_tooth_surface,
            clear_tooth_surfaces,
            // treatment catalog
            get_all_treatment_catalog,
            get_treatment_catalog_by_id,
            create_treatment_catalog,
            update_treatment_catalog,
            delete_treatment_catalog,
            get_treatment_catalog_items,
            get_treatment_catalog_item_by_id,
            create_treatment_catalog_item,
            update_treatment_catalog_item,
            delete_treatment_catalog_item,
            // appointments
            create_appointment,
            update_appointment,
            delete_appointment,
            get_appointment,
            list_appointments,
            get_pending_reminders,
            mark_reminder_sent,
            get_upcoming_appointments,
        ])
        .plugin(tauri_plugin_updater::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
