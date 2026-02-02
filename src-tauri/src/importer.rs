use log::{debug, error};
use std::fs::{self, File};
use std::path::Path;
use std::sync::mpsc;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use walkdir::WalkDir;

use crate::global::GLOBAL_APP_HANDLE;
use crate::pxlib::{field_type_name, Document, FieldInfo, FieldValue};
use encoding_rs;
use tauri::Emitter;
use tauri_plugin_dialog::DialogExt;

// Constantes para tipos de campo Paradox
const FIELD_TYPE_ALPHA: u8 = 0x01;
const FIELD_TYPE_DATE: u8 = 0x02;
const FIELD_TYPE_SHORT: u8 = 0x03;
const FIELD_TYPE_LONG: u8 = 0x04;
const FIELD_TYPE_CURRENCY: u8 = 0x05;
const FIELD_TYPE_NUMBER: u8 = 0x06;
const FIELD_TYPE_LOGICAL: u8 = 0x09;
const FIELD_TYPE_MEMO: u8 = 0x0C;
const FIELD_TYPE_BCD: u8 = 0x0D;
const FIELD_TYPE_BYTES: u8 = 0x0E;
const FIELD_TYPE_TIMESTAMP: u8 = 0x14;
const FIELD_TYPE_AUTOINCREMENT: u8 = 0x16;

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
            let progress = ((i + 1) as f32 / total as f32 * 100.0) as i32;

            // Log en terminal con formato visual
            let filled = (progress / 2) as usize;
            let empty = 50 - filled;
            let bar = format!("[{}{}]", "█".repeat(filled), "░".repeat(empty));
            debug!("📦 Extrayendo: {} {}% ({}/{})", bar, progress, i + 1, total);

            if let Some(app) = GLOBAL_APP_HANDLE.lock().unwrap().as_ref() {
                let _ = app.emit(
                    "import:progress",
                    serde_json::json!({"job_id": job_id_for_progress, "progress": progress}),
                );
            }
        }
    });

    tauri::async_runtime::spawn(async move {
        debug!("🚀 Iniciando extracción de archivo: {}", input);

        if let Some(app) = GLOBAL_APP_HANDLE.lock().unwrap().as_ref() {
            let _ = app.emit(
                "import:started",
                serde_json::json!({"job_id": job_id_for_emit, "path": input}),
            );
        }

        let extraction = tauri::async_runtime::spawn_blocking(move || -> Result<serde_json::Value, String> {
            let file = File::open(&input).map_err(|e| format!("error abriendo archivo: {}", e))?;
            debug!("📂 Archivo .gln abierto correctamente");

            let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("no es un ZIP válido: {}", e))?;
            debug!("📦 Contenedor ZIP válido, {} entradas detectadas", archive.len());

            let ts2 = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            let out_dir = std::env::temp_dir().join(format!("nuevogaleno_import_{}", ts2));
            fs::create_dir_all(&out_dir).map_err(|e| format!("no se pudo crear directorio temporal: {}", e))?;
            debug!("📁 Directorio temporal creado: {:?}", out_dir);

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

                let _ = tx.send((i, total));
            }

            debug!("✅ Extracción completada: {} archivos extraídos", entries.len());
            Ok(serde_json::json!({"extracted_to": out_dir.to_string_lossy().to_string(), "entries": entries}))
        }).await;

        match extraction {
            Ok(Ok(payload)) => {
                debug!("🎉 Importación finalizada exitosamente");
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
                error!("❌ Error durante la extracción: {}", err_str);
                if let Some(app) = GLOBAL_APP_HANDLE.lock().unwrap().as_ref() {
                    let _ = app.emit(
                        "import:error",
                        serde_json::json!({"job_id": job_id_for_emit, "error": err_str}),
                    );
                }
            }
            Err(join_err) => {
                error!("❌ Error crítico en thread de extracción: {}", join_err);
                if let Some(app) = GLOBAL_APP_HANDLE.lock().unwrap().as_ref() {
                    let _ = app.emit("import:error", serde_json::json!({"job_id": job_id_for_emit, "error": format!("join error: {}", join_err)}));
                }
            }
        }
        fn pxval_string_bytes<'a>(value: Option<&'a FieldValue<'a>>) -> Option<&'a [u8]> {
            value.and_then(|v| v.bytes())
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

/// Detecta la codificación del archivo Paradox basándose en el byte de código de página
fn detect_encoding(code_page: u8) -> &'static encoding_rs::Encoding {
    match code_page {
        0x00 => encoding_rs::WINDOWS_1252, // ASCII/ANSI
        0x01 => encoding_rs::WINDOWS_1252, // ANSI
        0x02 => encoding_rs::IBM866,       // DOS
        0x64 => encoding_rs::WINDOWS_1250, // Europa Central
        0x65 => encoding_rs::WINDOWS_1251, // Cirílico
        0x66 => encoding_rs::WINDOWS_1253, // Griego
        0x67 => encoding_rs::WINDOWS_1254, // Turco
        _ => encoding_rs::WINDOWS_1252,    // Default ANSI
    }
}

fn encoding_name(code_page: u8) -> &'static str {
    match code_page {
        0x00 | 0x01 => "WINDOWS-1252",
        0x02 => "IBM866",
        0x64 => "WINDOWS-1250",
        0x65 => "WINDOWS-1251",
        0x66 => "WINDOWS-1253",
        0x67 => "WINDOWS-1254",
        _ => "WINDOWS-1252",
    }
}

#[tauri::command]
pub fn inspect_paradox_db(path: String) -> Result<serde_json::Value, String> {
    let path_buf = Path::new(&path);
    if !path_buf.exists() {
        return Err("archivo Paradox no encontrado".into());
    }

    let doc = Document::open(path_buf).map_err(|e| format!("pxlib error: {}", e))?;
    Ok(serde_json::json!({
        "path": path,
        "size": fs::metadata(path_buf)
            .map(|m| m.len())
            .unwrap_or(0),
        "version": doc.file_version(),
        "record_size": doc.record_size(),
        "header_size": doc.header_size(),
        "num_records": doc.num_records(),
        "num_fields": doc.fields().len(),
        "code_page": doc.code_page(),
        "encoding": encoding_name(doc.code_page()),
    }))
}

fn pxval_string_bytes<'a>(value: Option<&'a FieldValue<'a>>) -> Option<&'a [u8]> {
    value.and_then(|v| v.bytes())
}

fn decode_pxval_string<'a>(
    value: Option<&'a FieldValue<'a>>,
    encoding: &'static encoding_rs::Encoding,
) -> String {
    if let Some(bytes) = pxval_string_bytes(value) {
        let (decoded, _, _) = encoding.decode(bytes);
        clean_text(&decoded)
    } else {
        String::new()
    }
}

fn format_pxval_hex<'a>(value: Option<&'a FieldValue<'a>>) -> String {
    if let Some(bytes) = pxval_string_bytes(value) {
        bytes
            .iter()
            .take(20)
            .map(|b| format!("{:02X}", b))
            .collect::<Vec<_>>()
            .join(" ")
    } else {
        String::new()
    }
}

fn parse_field_value<'a>(
    field: &FieldInfo,
    value: Option<&'a FieldValue<'a>>,
    encoding: &'static encoding_rs::Encoding,
) -> String {
   /*  debug!(
        "Parseando campo '{}' tipo {} ({}), tamaño {} bytes",
        field.name,
        field.field_type,
        field_type_name(field.field_type),
        field.size
    ); */

    let pxval = match value {
        Some(v) if !v.is_null() => v,
        _ => return String::new(),
    };

    match field.field_type {
        FIELD_TYPE_ALPHA | FIELD_TYPE_MEMO => decode_pxval_string(Some(pxval), encoding),
        FIELD_TYPE_DATE => {
            let days = pxval.lval() as i32;
            if days <= 0 || days < 656_933 || days > 766_644 {
                return String::new();
            }
            if let Some(date) = chrono::NaiveDate::from_num_days_from_ce_opt(days) {
                date.format("%Y-%m-%d").to_string()
            } else {
                String::new()
            }
        }
        FIELD_TYPE_SHORT => {
            let num = pxval.lval() as i16;
            if num == i16::MIN || num == -32768 {
                String::new()
            } else {
                num.to_string()
            }
        }
        FIELD_TYPE_LONG | FIELD_TYPE_AUTOINCREMENT => {
            let num = pxval.lval() as i32;
            if num == i32::MIN || num == -1 {
                String::new()
            } else if num < 0 && field.field_type == FIELD_TYPE_AUTOINCREMENT {
                let unsigned = num as u32;
                unsigned.to_string()
            } else {
                num.to_string()
            }
        }
        FIELD_TYPE_CURRENCY => {
            let value = pxval.dval();
            if value.is_nan() || value.is_infinite() {
                String::new()
            } else {
                format!("{:.4}", value)
            }
        }
        FIELD_TYPE_NUMBER => {
            let value = pxval.dval();
            if value.is_nan() || value.is_infinite() {
                String::new()
            } else if value.abs() < 1e-10 {
                "0".to_string()
            } else if value.abs() > 1e15 {
                String::new()
            } else {
                format!("{:.2}", value)
            }
        }
        FIELD_TYPE_LOGICAL => {
            if pxval.lval() & 0x80 != 0 {
                "true".to_string()
            } else {
                "false".to_string()
            }
        }
        FIELD_TYPE_BCD => {
            if let Some(bytes) = pxval_string_bytes(Some(pxval)) {
                if bytes.len() >= 17 {
                    bcd_to_number(bytes)
                } else {
                    String::new()
                }
            } else {
                String::new()
            }
        }
        FIELD_TYPE_TIMESTAMP => {
            let ms = pxval.dval() as i64;
            if ms <= 0 {
                String::new()
            } else {
                paradox_timestamp_to_string(ms)
            }
        }
        FIELD_TYPE_BYTES => format_pxval_hex(Some(pxval)),
        _ => decode_pxval_string(Some(pxval), encoding),
    }
}

#[tauri::command]
pub fn read_table_data(path: String, limit: usize) -> Result<serde_json::Value, String> {
    let path_buf = Path::new(&path);
    if !path_buf.exists() {
        return Err("Archivo Paradox no encontrado".into());
    }

    let doc = Document::open(path_buf).map_err(|e| format!("pxlib error: {}", e))?;
    let encoding = detect_encoding(doc.code_page());
    let max_records = limit.min(doc.num_records());

    let mut rows = Vec::new();
    for idx in 0..max_records {
        if let Some(record) = doc.read_record(idx) {
            let mut row = serde_json::Map::new();
            for (field_idx, field) in doc.fields().iter().enumerate() {
                let value = record.field_value(field_idx);
                let text = parse_field_value(field, value.as_ref(), encoding);
                row.insert(field.name.clone(), serde_json::Value::String(text));
            }
            rows.push(serde_json::Value::Object(row));
        }
    }

    let fields_metadata = doc
        .fields()
        .iter()
        .map(|f| {
            serde_json::json!({
                "name": f.name,
                "type": f.field_type,
                "size": f.size,
                "type_name": field_type_name(f.field_type)
            })
        })
        .collect::<Vec<_>>();

    Ok(serde_json::json!({
        "fields": fields_metadata,
        "rows": rows,
        "debug": {
            "file_version": doc.file_version(),
            "header_size": doc.header_size(),
            "record_size": doc.record_size(),
            "num_fields": doc.fields().len(),
            "num_records": doc.num_records(),
            "records_reported": rows.len(),
            "encoding": encoding.name(),
            "code_page": doc.code_page()
        }
    }))
}

fn clean_text(decoded: &str) -> String {
    let filtered: String = decoded.chars().filter(|c| !c.is_control()).collect();

    let trimmed = filtered
        .trim_matches(|c: char| c.is_whitespace() || c.is_control())
        .trim_start_matches(|c: char| !c.is_alphanumeric());

    trimmed.to_string()
}

fn paradox_date_to_string(days: i32) -> String {
    if days == 0 {
        return String::new();
    }

    let year = days / 365;
    let remaining = days % 365;
    let month = (remaining / 30).min(12);
    let day = (remaining % 30).max(1);

    format!("{:04}-{:02}-{:02}", year, month.max(1), day)
}

fn paradox_timestamp_to_string(timestamp: i64) -> String {
    if timestamp == 0 {
        return String::new();
    }

    let days = timestamp / (1000 * 60 * 60 * 24);
    let remaining_ms = timestamp % (1000 * 60 * 60 * 24);
    let hours = remaining_ms / (1000 * 60 * 60);
    let minutes = (remaining_ms % (1000 * 60 * 60)) / (1000 * 60);
    let seconds = (remaining_ms % (1000 * 60)) / 1000;

    let date = paradox_date_to_string(days as i32);
    format!("{} {:02}:{:02}:{:02}", date, hours, minutes, seconds)
}

fn bcd_to_number(bytes: &[u8]) -> String {
    if bytes.len() < 17 {
        return "0".to_string();
    }

    let sign = if bytes[0] & 0x80 != 0 { -1.0 } else { 1.0 };
    let mut result = 0.0;
    let mut multiplier = 1e16;

    for i in 1..17 {
        let byte = bytes[i];
        let high = (byte >> 4) & 0x0F;
        let low = byte & 0x0F;

        result += high as f64 * multiplier;
        multiplier /= 10.0;
        result += low as f64 * multiplier;
        multiplier /= 10.0;
    }

    format!("{}", sign * result)
}
