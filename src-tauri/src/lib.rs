// Modular Tauri commands: wizard (db/config) and importer (gln handling)
mod db;
mod global;
mod importer;
mod wizard;
mod import_pipeline;

// Simple greeting for sanity checks
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
            // wizard
            wizard::init_app_db,
            wizard::set_config,
            wizard::get_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
