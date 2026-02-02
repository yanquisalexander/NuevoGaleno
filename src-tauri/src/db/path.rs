use std::fs;
use std::path::PathBuf;

pub fn db_file_path() -> Result<PathBuf, String> {
    // Usar el directorio AppData de la aplicación
    let app_data_dir = get_app_data_dir()?;

    // Asegurarse de que el directorio existe
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Error creando directorio de datos: {}", e))?;

    Ok(app_data_dir.join("nuevogaleno.sqlite"))
}

pub fn get_app_data_dir() -> Result<PathBuf, String> {
    // En Windows: C:\Users\<usuario>\AppData\Roaming\dev.alexitoo.nuevogaleno
    let data_dir = dirs::data_dir()
        .ok_or_else(|| "No se pudo obtener el directorio de datos del sistema".to_string())?;

    Ok(data_dir.join("dev.alexitoo.nuevogaleno"))
}
