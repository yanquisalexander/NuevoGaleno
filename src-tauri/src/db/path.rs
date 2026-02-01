use std::path::{Path, PathBuf};

pub fn db_file_path() -> Result<PathBuf, String> {
    // Usar el directorio del ejecutable (más simple y portátil)
    let exe = std::env::current_exe()
        .map_err(|e| format!("current_exe err: {}", e))?;
    let dir = exe.parent().unwrap_or_else(|| Path::new("."));
    
    Ok(dir.join("nuevogaleno.sqlite"))
}
