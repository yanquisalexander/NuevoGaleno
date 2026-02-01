use std::fs::{self, File};
use std::path::Path;
use std::sync::mpsc;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use std::io::SeekFrom;

use std::io::{Read, Seek};
use walkdir::WalkDir;

use crate::global::GLOBAL_APP_HANDLE;
use tauri::Emitter;
use tauri_plugin_dialog::DialogExt;
use encoding_rs;

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

#[derive(Debug, Clone)]
struct ParadoxField {
    name: String,
    field_type: u8,
    size: usize,
}

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

                let _ = tx.send((i, total));
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

#[tauri::command]
pub fn inspect_paradox_db(path: String) -> Result<serde_json::Value, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("archivo Paradox no encontrado".into());
    }

    let metadata = fs::metadata(p).map_err(|e| format!("metadata error: {}", e))?;
    let size = metadata.len();

    let mut f = File::open(p).map_err(|e| format!("open err: {}", e))?;
    let mut header_buf = vec![0u8; 4096.min(size as usize)];
    let bytes_read = f
        .read(&mut header_buf)
        .map_err(|e| format!("read err: {}", e))?;

    // --- CORRECCIÓN DE OFFSETS ---
    
    // 0x00: Record Size (2 bytes, Little Endian)
    let record_size = header_buf
        .get(0..2)
        .map(|b| u16::from_le_bytes([b[0], b[1]]))
        .unwrap_or(0);

    // 0x02: Header Size (2 bytes, Little Endian)
    let header_size = header_buf
        .get(2..4)
        .map(|b| u16::from_le_bytes([b[0], b[1]]))
        .unwrap_or(0);

    // 0x04: File Type / Version (1 byte)
    let version = header_buf.get(0x04).copied().unwrap_or(0);
    
    // 0x05: Max Block Size (1 byte)
    // 0x06: Record Count (4 bytes) - Útil para debug
    let num_records = header_buf
        .get(6..10)
        .map(|b| u32::from_le_bytes([b[0], b[1], b[2], b[3]]))
        .unwrap_or(0);

    // 0x21: Field Count
    let num_fields = header_buf.get(0x21).copied().unwrap_or(0);
    let primary_key_fields = header_buf.get(0x22).copied().unwrap_or(0);
    let code_page = header_buf.get(0x6A).copied().unwrap_or(0);

    let encoding = detect_encoding(code_page);

    let header_hex = header_buf[..bytes_read.min(1024)]
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect::<Vec<_>>()
        .join(" ");
        
    // Extraer sección de nombres de campo como texto para debug
    let names_section_start = 0x78 + (num_fields as usize * 2);
    let names_section_end = (names_section_start + 512).min(bytes_read);
    let names_text = if names_section_start < bytes_read {
        let (decoded, _, _) = encoding.decode(&header_buf[names_section_start..names_section_end]);
        decoded.into_owned()
    } else {
        String::new()
    };

    Ok(serde_json::json!({
        "path": p.to_string_lossy().to_string(),
        "size": size,
        "version": version,
        "record_size": record_size,
        "header_size": header_size,
        "num_records": num_records, // Agregado para que veas si coincide con la realidad
        "num_fields": num_fields,
        "primary_key_fields": primary_key_fields,
        "code_page": code_page,
        "header_hex": header_hex,
        "names_section_offset": names_section_start,
        "names_text": names_text
    }))
}

/// Lee campos de memo desde archivo .MB
fn read_memo_field(db_path: &Path, block_number: u32) -> Result<String, String> {
    let mb_path = db_path.with_extension("MB");
    if !mb_path.exists() {
        return Ok(String::new());
    }

    let mut f = File::open(&mb_path).map_err(|e| format!("error abriendo .MB: {}", e))?;
    
    // Los bloques de memo típicamente son de 64 bytes, pero puede variar
    let block_size = 64;
    let offset = block_number as u64 * block_size;
    
    f.seek(std::io::SeekFrom::Start(offset))
        .map_err(|e| format!("seek error en .MB: {}", e))?;
    
    let mut buffer = vec![0u8; 4096]; // Leer hasta 4KB
    let bytes_read = f.read(&mut buffer).unwrap_or(0);
    
    if bytes_read == 0 {
        return Ok(String::new());
    }
    
    // Buscar el terminador null
    let end = buffer.iter().position(|&b| b == 0).unwrap_or(bytes_read);
    
    Ok(String::from_utf8_lossy(&buffer[..end]).to_string())
}

/// Convierte una fecha Paradox (días desde 1/1/0001) a formato legible
fn paradox_date_to_string(days: i32) -> String {
    if days == 0 {
        return String::new();
    }
    
    // Paradox epoch: 1 de enero del año 1
    // Convertir a días desde Unix epoch sería complejo, así que devolvemos el valor
    // O podríamos convertirlo a una fecha aproximada
    
    // Cálculo simple: asumimos año 365.25 días
    let year = days / 365;
    let remaining = days % 365;
    let month = (remaining / 30).min(12);
    let day = (remaining % 30).max(1);
    
    format!("{:04}-{:02}-{:02}", year, month.max(1), day)
}

/// Convierte un timestamp Paradox a formato legible
fn paradox_timestamp_to_string(timestamp: i64) -> String {
    if timestamp == 0 {
        return String::new();
    }
    
    // Timestamp Paradox son milisegundos desde 1/1/0001
    let days = timestamp / (1000 * 60 * 60 * 24);
    let remaining_ms = timestamp % (1000 * 60 * 60 * 24);
    let hours = remaining_ms / (1000 * 60 * 60);
    let minutes = (remaining_ms % (1000 * 60 * 60)) / (1000 * 60);
    let seconds = (remaining_ms % (1000 * 60)) / 1000;
    
    let date = paradox_date_to_string(days as i32);
    format!("{} {:02}:{:02}:{:02}", date, hours, minutes, seconds)
}

/// Convierte BCD (Binary Coded Decimal) a número
fn bcd_to_number(bytes: &[u8]) -> String {
    if bytes.len() < 17 {
        return "0".to_string();
    }
    
    // Paradox BCD es de 17 bytes: 1 byte de signo + 16 bytes de dígitos
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

fn parse_field_value(field: &ParadoxField, data: &[u8], encoding: &'static encoding_rs::Encoding, db_path: &Path) -> String {
    // Verificar si el campo está marcado como NULL
    // En Paradox, el primer bit puede indicar NULL en algunos tipos
    
    match field.field_type {
        FIELD_TYPE_ALPHA => {
            let (decoded, _, _) = encoding.decode(data);
            decoded.trim_end_matches('\0').trim().to_string()
        },
        
        FIELD_TYPE_DATE => {
            if data.len() >= 4 {
                // Paradox almacena fechas como días desde 1/1/0001
                // PERO en formato little-endian de 32 bits
                let days = i32::from_le_bytes([data[0], data[1], data[2], data[3]]);
                
                // Valor especial para fechas nulas/inválidas
                if days <= 0 || days > 3652059 { // 3652059 = 31/12/9999
                    return "".to_string();
                }
                
                // Conversión aproximada a fecha gregoriana
                // 1 = 1/1/0001, entonces restamos para obtener offset
                let year = 1 + (days / 365);
                let day_in_year = days % 365;
                let month = 1 + (day_in_year / 30).min(11);
                let day = 1 + (day_in_year % 30).min(29);
                
                format!("{:04}-{:02}-{:02}", year, month, day)
            } else {
                "".to_string()
            }
        },
        
        FIELD_TYPE_SHORT => {
            if data.len() >= 2 {
                let num = i16::from_le_bytes([data[0], data[1]]);
                // Valor especial para NULL en algunos casos
                if num == i16::MIN {
                    "".to_string()
                } else {
                    num.to_string()
                }
            } else {
                "".to_string()
            }
        },
        
        FIELD_TYPE_LONG | FIELD_TYPE_AUTOINCREMENT => {
            if data.len() >= 4 {
                let num = i32::from_le_bytes([data[0], data[1], data[2], data[3]]);
                if num == i32::MIN {
                    "".to_string()
                } else {
                    num.to_string()
                }
            } else {
                "".to_string()
            }
        },
        
        FIELD_TYPE_CURRENCY => {
            if data.len() >= 8 {
                // Currency es BCD especial con 4 decimales implícitos
                let raw = i64::from_le_bytes([
                    data[0], data[1], data[2], data[3],
                    data[4], data[5], data[6], data[7]
                ]);
                
                if raw == i64::MIN {
                    "".to_string()
                } else {
                    let value = raw as f64 / 10000.0;
                    format!("{:.4}", value)
                }
            } else {
                "".to_string()
            }
        },
        
        FIELD_TYPE_NUMBER => {
            if data.len() >= 8 {
                let bytes = [
                    data[0], data[1], data[2], data[3],
                    data[4], data[5], data[6], data[7]
                ];
                let val = f64::from_le_bytes(bytes);
                
                // Verificar NaN o valores especiales
                if val.is_nan() || val.is_infinite() {
                    "".to_string()
                } else {
                    format!("{}", val)
                }
            } else {
                "".to_string()
            }
        },
        
        FIELD_TYPE_LOGICAL => {
            if !data.is_empty() {
                match data[0] {
                    0x80 => "true".to_string(),
                    0x00 => "false".to_string(),
                    _ => "".to_string()
                }
            } else {
                "false".to_string()
            }
        },
        
        FIELD_TYPE_MEMO => {
            if data.len() >= 4 {
                let block_num = u32::from_le_bytes([data[0], data[1], data[2], data[3]]);
                
                if block_num > 0 && block_num < 0xFFFFFFFF {
                    read_memo_field(db_path, block_num).unwrap_or_default()
                } else {
                    "".to_string()
                }
            } else {
                "".to_string()
            }
        },
        
        FIELD_TYPE_BCD => {
            if data.len() >= 17 {
                bcd_to_number(data)
            } else {
                "".to_string()
            }
        },
        
        FIELD_TYPE_TIMESTAMP => {
            if data.len() >= 8 {
                // Timestamp es milisegundos desde 1/1/0001
                let ms = i64::from_le_bytes([
                    data[0], data[1], data[2], data[3],
                    data[4], data[5], data[6], data[7]
                ]);
                
                if ms <= 0 {
                    "".to_string()
                } else {
                    paradox_timestamp_to_string(ms)
                }
            } else {
                "".to_string()
            }
        },
        
        FIELD_TYPE_BYTES => {
            // Datos binarios - mostrar como hex
            data.iter()
                .take(20) // Limitar a 20 bytes
                .map(|b| format!("{:02X}", b))
                .collect::<Vec<_>>()
                .join(" ")
        },
        
        _ => {
            // Tipo desconocido - intentar decodificar como texto
            let (decoded, _, _) = encoding.decode(data);
            decoded.trim_end_matches('\0').trim().to_string()
        }
    }
}

// --- HELPER FUNCTIONS ---




#[tauri::command]
pub fn read_table_data(path: String, limit: usize) -> Result<serde_json::Value, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("Archivo Paradox no encontrado".into());
    }

    let mut f = File::open(p).map_err(|e| format!("Error abriendo archivo: {}", e))?;

    // 1. LEER CABECERA COMPLETA
    let mut header = vec![0u8; 4096];
    let header_bytes_read = f.read(&mut header)
        .map_err(|e| format!("Error leyendo cabecera: {}", e))?;

    if header_bytes_read < 0x78 { 
        return Err("Archivo corrupto: cabecera muy pequeña".into()); 
    }

   // 2. PARSEAR DATOS DEL HEADER CON VALIDACIÓN (CORREGIDO)
    // Paradox usa LITTLE-ENDIAN en arquitectura x86 estándar.
    // Los offsets estándar son: 
    // 0x00: Record Size (2 bytes)
    // 0x02: Header Size (2 bytes)
    // 0x04: File Type (1 byte)
    // 0x05: Max Block Size (1 byte)
    // 0x06: Record Count (4 bytes)
    
    let record_size = u16::from_le_bytes([header[0x00], header[0x01]]) as usize;
    let header_block_size = u16::from_le_bytes([header[0x02], header[0x03]]) as usize; // Tamaño de cabecera
    let _file_type = header[0x04]; // Tipo de archivo
    let _max_block_size_code = header[0x05]; 
    let num_records = u32::from_le_bytes([header[0x06], header[0x07], header[0x08], header[0x09]]) as usize;
    
    // Los siguientes offsets suelen ser correctos para Paradox 5/7
    let num_fields = header[0x21] as usize;
    let primary_index_fields = header[0x22] as usize;
    let code_page = header[0x6A];
    
    // Validaciones básicas
    if record_size == 0 {
        return Err("Tamaño de registro inválido (0)".into());
    }
    
    if num_fields == 0 {
        return Err("Número de campos inválido (0)".into());
    }
    
    if num_fields > 255 {
        return Err(format!("Número de campos sospechoso: {}", num_fields));
    }
    
    // CRÍTICO para v7: el tamaño real del header
    let actual_header_size = if header_block_size >= 2048 {
        header_block_size
    } else {
        2048 // Fallback seguro
    };

    let encoding = detect_encoding(code_page);

    // 3. PARSEAR DEFINICIONES DE CAMPOS
    let mut fields = Vec::new();
    let field_defs_start = 0x78;
    
    // Calcular el tamaño total esperado de los campos
    let mut total_field_size = 0usize;

    for i in 0..num_fields {
        let offset = field_defs_start + (i * 2);
        
        // Verificar que no nos salimos del header
        if offset + 1 >= header_bytes_read { 
            break; 
        }
        
        let field_type = header[offset];
        let field_size = header[offset + 1] as usize;
        
        // Validar que el tamaño sea razonable
        if field_size == 0 {
            return Err(format!("Campo {} tiene tamaño 0", i + 1));
        }
        
        if field_size > 4096 {
            return Err(format!("Campo {} tiene tamaño sospechoso: {}", i + 1, field_size));
        }
        
        total_field_size += field_size;
        
        fields.push(ParadoxField {
            name: format!("Field_{}", i + 1),
            field_type,
            size: field_size,
        });
    }

    // VALIDACIÓN CRÍTICA: Verificar que se parsearon todos los campos
    if fields.len() != num_fields {
        return Err(format!(
            "Solo se pudieron parsear {} de {} campos declarados", 
            fields.len(), 
            num_fields
        ));
    }

   // 4. LEER NOMBRES DE CAMPOS (Con filtro de basura/nombre de tabla)
    
    // Offset base donde terminan los tipos de datos
    let mut current_offset = 0x78 + (num_fields * 2);
    
    // Ajuste por campos clave
    if primary_index_fields > 0 {
        current_offset += primary_index_fields * 2;
    }

    let mut field_idx = 0;
    
    // Bucle de búsqueda y asignación
    // Iteramos hasta encontrar nombres para todos los campos o hasta acabar el archivo
    while field_idx < fields.len() && current_offset < header_bytes_read {
        
        let mut name_bytes = Vec::new();
        let _start_offset = current_offset;
        
        // 1. Leer hasta el siguiente 0x00 (Null Terminator)
        while current_offset < header_bytes_read {
            let b = header[current_offset];
            current_offset += 1;
            
            if b == 0 { break; }
            name_bytes.push(b);
        }

        // Si leímos algo, lo analizamos
        if !name_bytes.is_empty() {
            let (cow, _, _) = encoding.decode(&name_bytes);
            let candidate_name = cow.trim().to_string();

            // --- FILTRO HEURÍSTICO ---
            
            // Criterio 1: ¿Es el nombre de la tabla? (Termina en .DB, .db, .MB, etc)
            let is_filename = candidate_name.to_uppercase().ends_with(".DB") 
                           || candidate_name.to_uppercase().ends_with(".MB");

            // Criterio 2: ¿Empieza con basura? (Caracteres de control o extendidos raros)
            // Paradox permite caracteres ASCII extendidos, pero NO suele empezar con 
            // bytes de control (< 32) o ciertos caracteres gráficos al inicio.
            // En tu ejemplo empezaba con 0x90 (\u0090).
            let starts_with_garbage = name_bytes[0] < 32 || name_bytes[0] > 0xF0;

            // Criterio 3: ¿Es muy largo para ser un campo? (Opcional, campos suelen ser < 25 chars)
            // Pero en tu caso la "basura" era larguísima.
            
            if is_filename || starts_with_garbage {
                // ES BASURA O NOMBRE DE TABLA -> Lo ignoramos y seguimos buscando
                // println!("DEBUG: Saltando metadato: {}", candidate_name);
                continue; 
            }

            // Si pasa los filtros, es un nombre de campo válido
            fields[field_idx].name = candidate_name;
            field_idx += 1;
        }
    }

    // 5. POSICIONARSE AL INICIO DE DATOS
    f.seek(SeekFrom::Start(actual_header_size as u64))
        .map_err(|e| format!("Error posicionando al inicio de datos: {}", e))?;

    // --- CORRECCIÓN CRÍTICA ---
    // Los registros están dentro de bloques de datos.
    // El primer bloque de datos tiene un encabezado de 6 bytes:
    // 2 bytes (Next Block) + 2 bytes (Prev Block) + 2 bytes (Count/Offset).
    // Debemos saltarlos para llegar al primer registro real.
    f.seek(SeekFrom::Current(6))
        .map_err(|e| format!("Error saltando encabezado de bloque: {}", e))?;
    // --------------------------

    // 6. LEER REGISTROS
    let mut rows = Vec::new();
    let mut record_buffer = vec![0u8; record_size];
    
    let max_records = limit.min(num_records);
    let mut records_read = 0;
    let mut records_skipped = 0;

    for _ in 0..max_records {
        let bytes_read = f.read(&mut record_buffer).unwrap_or(0);
        
        if bytes_read < record_size { 
            break; // Fin de archivo
        }

        // Verificar si el registro está marcado como borrado
        // En Paradox, primer byte a 0x00 o patrón de todos ceros indica borrado
        if record_buffer[0] == 0x00 || record_buffer.iter().all(|&b| b == 0) {
            records_skipped += 1;
            continue;
        }

        let mut row = serde_json::Map::new();
        let mut current_pos = 0;

        for field in &fields {
            if current_pos + field.size <= record_buffer.len() {
                let field_data = &record_buffer[current_pos..current_pos + field.size];
                let value = parse_field_value(field, field_data, encoding, p);
                row.insert(field.name.clone(), serde_json::Value::String(value));
            } else {
                row.insert(field.name.clone(), serde_json::Value::Null);
            }
            current_pos += field.size;
        }
        
        rows.push(serde_json::Value::Object(row));
        records_read += 1;
    }

    Ok(serde_json::json!({
        "fields": fields.iter().map(|f| serde_json::json!({
            "name": f.name,
            "type": f.field_type,
            "size": f.size,
            "type_name": get_field_type_name(f.field_type)
        })).collect::<Vec<_>>(),
        "rows": rows,
        "debug": {
            "file_version": header[0],
            "header_size": actual_header_size,
            "record_size": record_size,
            "num_fields": num_fields,
            "total_field_size": total_field_size,
            "num_records_declared": num_records,
            "records_read": records_read,
            "records_skipped": records_skipped,
            "encoding": encoding.name(),
            "code_page": code_page
        }
    }))
}
// --- HELPER FUNCTIONS (Encodings y Conversiones) ---

fn get_field_type_name(field_type: u8) -> &'static str {
    match field_type {
        FIELD_TYPE_ALPHA => "Alpha",
        FIELD_TYPE_DATE => "Date",
        FIELD_TYPE_SHORT => "Short",
        FIELD_TYPE_LONG => "Long",
        FIELD_TYPE_CURRENCY => "Currency",
        FIELD_TYPE_NUMBER => "Number",
        FIELD_TYPE_LOGICAL => "Logical",
        FIELD_TYPE_MEMO => "Memo",
        FIELD_TYPE_BCD => "BCD",
        FIELD_TYPE_TIMESTAMP => "Timestamp",
        FIELD_TYPE_AUTOINCREMENT => "AutoIncrement",
        _ => "Unknown",
    }
}
