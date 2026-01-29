use std::fs::{self, File};
use std::path::Path;
use std::sync::mpsc;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use std::io::{Read, Seek};
use walkdir::WalkDir;

use crate::global::GLOBAL_APP_HANDLE;
use crate::pxlib_wrapper;
use tauri::Emitter;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub fn select_gln(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let picked = app.dialog().file().blocking_pick_file();
    if let Some(p) = picked {
        Ok(Some(p.to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn read_table_data_pxlib(path: String, limit: usize) -> Result<serde_json::Value, String> {
    match pxlib_wrapper::read_table_data(&path, limit) {
        Ok(v) => Ok(v),
        Err(e) => Err(e),
    }
}

#[tauri::command]
#[allow(non_snake_case)]
pub fn extract_gln(glnPath: String) -> Result<String, String> {
    let path = Path::new(&glnPath);
    if !path.exists() {
        return Err("Archivo .gln no encontrado".into());
    }

    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let job_id = format!("job_{}", ts);
    let job_id_for_emit = job_id.clone();

    let input = glnPath.clone();

    let (tx, rx) = mpsc::channel::<(usize, usize)>();
    let job_id_for_progress = job_id_for_emit.clone();
    thread::spawn(move || {
        while let Ok((i, total)) = rx.recv() {
            if let Some(app) = GLOBAL_APP_HANDLE.lock().unwrap().as_ref() {
                let progress = ((i + 1) as f32 / total as f32 * 100.0) as i32;
                let _ = app.emit(
                    "import:progress",
                    serde_json::json!({"job_id": job_id_for_progress, "progress": progress}),
                );
            }
        }
    });

    tauri::async_runtime::spawn(async move {
        if let Some(app) = GLOBAL_APP_HANDLE.lock().unwrap().as_ref() {
            let _ = app.emit(
                "import:started",
                serde_json::json!({"job_id": job_id_for_emit, "path": input}),
            );
        }

        let extraction = tauri::async_runtime::spawn_blocking(move || -> Result<serde_json::Value, String> {
            let file = File::open(&input).map_err(|e| format!("error abriendo archivo: {}", e))?;
            let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("no es un ZIP válido: {}", e))?;

            let ts2 = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            let out_dir = std::env::temp_dir().join(format!("nuevogaleno_import_{}", ts2));
            fs::create_dir_all(&out_dir).map_err(|e| format!("no se pudo crear directorio temporal: {}", e))?;

            let mut entries: Vec<String> = Vec::new();
            let total = archive.len();
            for i in 0..total {
                let mut file = archive.by_index(i).map_err(|e| format!("zip error: {}", e))?;
                let outpath = match file.enclosed_name() {
                    Some(p) => out_dir.join(p.to_owned()),
                    None => continue,
                };

                if (&*file.name()).ends_with('/') {
                    fs::create_dir_all(&outpath).ok();
                    continue;
                }

                if let Some(parent) = outpath.parent() {
                    fs::create_dir_all(parent).map_err(|e| format!("mkdir err: {}", e))?;
                }

                let mut outfile = File::create(&outpath).map_err(|e| format!("create file err: {}", e))?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| format!("copy err: {}", e))?;
                entries.push(outpath.to_string_lossy().to_string());

                let _ = tx.send((i + 1, total));
            }

            Ok(serde_json::json!({"extracted_to": out_dir.to_string_lossy().to_string(), "entries": entries}))
        }).await;

        match extraction {
            Ok(Ok(payload)) => {
                let mut p = payload;
                if let serde_json::Value::Object(ref mut map) = p {
                    map.insert(
                        "job_id".to_string(),
                        serde_json::Value::String(job_id_for_emit.clone()),
                    );
                }
                if let Some(app) = GLOBAL_APP_HANDLE.lock().unwrap().as_ref() {
                    let _ = app.emit("import:finished", p);
                }
            }
            Ok(Err(err_str)) => {
                if let Some(app) = GLOBAL_APP_HANDLE.lock().unwrap().as_ref() {
                    let _ = app.emit(
                        "import:error",
                        serde_json::json!({"job_id": job_id_for_emit, "error": err_str}),
                    );
                }
            }
            Err(join_err) => {
                if let Some(app) = GLOBAL_APP_HANDLE.lock().unwrap().as_ref() {
                    let _ = app.emit("import:error", serde_json::json!({"job_id": job_id_for_emit, "error": format!("join error: {}", join_err)}));
                }
            }
        }
    });

    Ok(job_id)
}

#[tauri::command]
pub fn list_extracted_files(dir: String) -> Result<serde_json::Value, String> {
    let p = std::path::PathBuf::from(dir);
    if !p.exists() {
        return Err("directorio no encontrado".into());
    }

    let mut db_files: Vec<String> = Vec::new();
    let mut docs: Vec<String> = Vec::new();

    for entry in WalkDir::new(&p).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let path = entry.path();
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                let ext_l = ext.to_lowercase();
                if ext_l == "db" {
                    db_files.push(path.to_string_lossy().to_string());
                } else {
                    docs.push(path.to_string_lossy().to_string());
                }
            } else {
                docs.push(path.to_string_lossy().to_string());
            }
        }
    }

    Ok(serde_json::json!({"db_files": db_files, "documents": docs}))
}

#[tauri::command]
pub fn list_tables(path: String) -> Result<Vec<String>, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("archivo Paradox no encontrado".into());
    }

    let table_name = p
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or("invalid filename")?
        .to_string();

    Ok(vec![table_name])
}

#[tauri::command]
pub fn inspect_paradox_db(path: String) -> Result<serde_json::Value, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("archivo Paradox no encontrado".into());
    }

    let metadata = fs::metadata(p).map_err(|e| format!("metadata error: {}", e))?;
    let size = metadata.len();

    let mut f = File::open(p).map_err(|e| format!("open err: {}", e))?;
    let mut header_buf = vec![0u8; 2048.min(size as usize)];
    let bytes_read = f
        .read(&mut header_buf)
        .map_err(|e| format!("read err: {}", e))?;

    let version = header_buf.get(0).copied().unwrap_or(0);
    let record_size = header_buf
        .get(1..3)
        .map(|b| u16::from_le_bytes([b[0], b[1]]))
        .unwrap_or(0);
    let header_size = header_buf
        .get(3..5)
        .map(|b| u16::from_le_bytes([b[0], b[1]]))
        .unwrap_or(0);
    let num_fields = header_buf.get(5).copied().unwrap_or(0);

    let header_hex = header_buf[..bytes_read.min(512)]
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect::<Vec<_>>()
        .join("");

    Ok(serde_json::json!({
        "path": p.to_string_lossy().to_string(),
        "size": size,
        "version": version,
        "record_size": record_size,
        "header_size": header_size,
        "num_fields": num_fields,
        "header_hex": header_hex
    }))
}

#[tauri::command]
pub fn read_table_data(path: String, limit: usize) -> Result<serde_json::Value, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("archivo Paradox no encontrado".into());
    }

    let mut f = File::open(p).map_err(|e| format!("open err: {}", e))?;
    let mut header = vec![0u8; 2048];
    f.read(&mut header)
        .map_err(|e| format!("read header err: {}", e))?;

    let record_size = u16::from_le_bytes([header[1], header[2]]) as usize;
    let header_size = u16::from_le_bytes([header[3], header[4]]) as usize;
    let num_fields = header[5] as usize;

    if record_size == 0 || num_fields == 0 {
        return Ok(serde_json::json!({"fields": [], "rows": []}));
    }

    // Parsear campos (offset 0x78)
    let mut fields = Vec::new();
    let mut offset = 0x78;

    for _ in 0..num_fields {
        let field_type = header[offset];
        let field_size = header[offset + 1] as usize;

        let name_bytes = &header[offset + 2..offset + 13];
        let name = String::from_utf8_lossy(name_bytes)
            .trim_end_matches('\0')
            .to_string();

        fields.push((name, field_type, field_size));
        offset += 32;
    }

    // Leer datos
    f.seek(std::io::SeekFrom::Start(header_size as u64))
        .map_err(|e| format!("seek err: {}", e))?;

    let mut rows = Vec::new();

    for _ in 0..limit {
        let mut record = vec![0u8; record_size];
        if f.read(&mut record).ok() != Some(record_size) {
            break;
        }

        let mut row = serde_json::Map::new();
        let mut pos = 0;

        for (name, field_type, size) in &fields {
            let value = match field_type {
                0x01 => {
                    // Alpha
                    if pos + size > record.len() {
                        "".to_string()
                    } else {
                        String::from_utf8_lossy(&record[pos..pos + size])
                            .trim_end_matches('\0')
                            .trim()
                            .to_string()
                    }
                }
                0x02 => {
                    // Date
                    if pos + 4 > record.len() {
                        "0".to_string()
                    } else {
                        let days = i32::from_le_bytes([
                            record[pos],
                            record[pos + 1],
                            record[pos + 2],
                            record[pos + 3],
                        ]);
                        format!("{}", days)
                    }
                }
                0x03 | 0x04 => {
                    // Short, Long
                    if pos + 4 > record.len() {
                        "0".to_string()
                    } else {
                        let num = i32::from_le_bytes([
                            record[pos],
                            record[pos + 1],
                            record[pos + 2],
                            record[pos + 3],
                        ]);
                        num.to_string()
                    }
                }
                0x06 => {
                    // Number
                    if pos + 8 > record.len() {
                        "0.0".to_string()
                    } else {
                        let bytes = [
                            record[pos],
                            record[pos + 1],
                            record[pos + 2],
                            record[pos + 3],
                            record[pos + 4],
                            record[pos + 5],
                            record[pos + 6],
                            record[pos + 7],
                        ];
                        f64::from_le_bytes(bytes).to_string()
                    }
                }
                _ => {
                    if pos + size > record.len() {
                        "".to_string()
                    } else {
                        String::from_utf8_lossy(&record[pos..pos + size])
                            .trim_end_matches('\0')
                            .to_string()
                    }
                }
            };

            row.insert(name.clone(), serde_json::Value::String(value));
            pos += size;
        }

        rows.push(serde_json::Value::Object(row));
    }

    Ok(serde_json::json!({
        "fields": fields.iter().map(|(n, t, s)|
            serde_json::json!({"name": n, "type": t, "size": s})
        ).collect::<Vec<_>>(),
        "rows": rows
    }))
}
