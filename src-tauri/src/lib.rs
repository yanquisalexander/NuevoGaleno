// Modular Tauri commands: wizard (db/config) and importer (gln handling)
mod global;
mod importer;
mod pxlib_wrapper;
mod wizard;

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
            importer::read_table_data_pxlib,
            // wizard
            wizard::init_app_db,
            wizard::set_config,
            wizard::get_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
