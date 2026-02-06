// Lector de datos desde Paradox
// Etapa 1: Extracción de datos raw sin transformación

use crate::import_pipeline::models::{RawField, RawParadoxData, RawTable};
use crate::importer;
use rayon::prelude::*;
use std::path::Path;

/// Callback para reportar progreso durante la lectura
pub type ProgressCallback = Box<dyn Fn(String) + Send>;

/// Lee todos los archivos .DB de un directorio extraído con límite de registros
pub async fn read_all_tables_with_limit(
    extracted_dir: &str,
    limit: usize,
    progress_cb: Option<ProgressCallback>,
) -> Result<RawParadoxData, String> {
    let mut data = RawParadoxData {
        tables: Vec::new(),
        errors: Vec::new(),
    };

    // Listar archivos .DB
    if let Some(ref cb) = progress_cb {
        cb("Listando archivos de la base de datos...".to_string());
    }
    let files_result: serde_json::Value =
        importer::list_extracted_files(extracted_dir.to_string()).await?;

    let db_files = files_result
        .get("db_files")
        .and_then(|v: &serde_json::Value| v.as_array())
        .ok_or("No se encontraron archivos .DB")?;

    let total_files = db_files.len();
    if let Some(ref cb) = progress_cb {
        cb(format!(
            "Encontrados {} archivos de base de datos",
            total_files
        ));
    }

    // Procesar tablas en paralelo usando rayon
    let results: Vec<Result<RawTable, String>> = db_files
        .par_iter()
        .enumerate()
        .map(|(_idx, db_file): (usize, &serde_json::Value)| {
            let path_str = db_file.as_str().ok_or("Ruta de archivo inválida")?;

            // Ejecutar la lectura async en un bloque sync
            tauri::async_runtime::block_on(async { read_single_table(path_str, limit).await })
        })
        .collect();

    if let Some(ref cb) = progress_cb {
        cb(format!(
            "📖 Procesadas {} tablas en paralelo",
            results.len()
        ));
    }

    for result in results {
        match result {
            Ok(table) => data.tables.push(table),
            Err(e) => {
                data.errors.push(e.clone());
                if let Some(ref cb) = progress_cb {
                    cb(format!("⚠️ Error: {}", e));
                }
            }
        }
    }

    if data.tables.is_empty() && !data.errors.is_empty() {
        return Err(format!(
            "No se pudo leer ninguna tabla. Errores: {:?}",
            data.errors
        ));
    }

    Ok(data)
}

/// Lee todos los archivos .DB sin límite (para importación completa)
pub async fn read_all_tables(
    extracted_dir: &str,
    progress_cb: Option<ProgressCallback>,
) -> Result<RawParadoxData, String> {
    read_all_tables_with_limit(extracted_dir, usize::MAX, progress_cb).await
}

/// Lee solo los primeros N registros de cada tabla (para preview rápido)
pub async fn read_all_tables_preview(
    extracted_dir: &str,
    limit: usize,
    progress_cb: Option<ProgressCallback>,
) -> Result<RawParadoxData, String> {
    read_all_tables_with_limit(extracted_dir, limit, progress_cb).await
}

/// Lee una tabla individual de Paradox con límite de registros
async fn read_single_table(file_path: &str, limit: usize) -> Result<RawTable, String> {
    let path = Path::new(file_path);
    let table_name = path
        .file_stem()
        .and_then(|s: &std::ffi::OsStr| s.to_str())
        .unwrap_or("unknown")
        .to_string();

    // Usar la función existente del importer con el límite especificado
    let result: serde_json::Value = importer::read_table_data(file_path.to_string(), limit).await?;

    let fields = result
        .get("fields")
        .and_then(|v: &serde_json::Value| v.as_array())
        .ok_or("No se encontraron campos en la tabla")?
        .iter()
        .filter_map(|f: &serde_json::Value| {
            Some(RawField {
                name: f.get("name")?.as_str()?.to_string(),
                field_type: f.get("type")?.as_u64()? as u8,
                size: f.get("size")?.as_u64()? as usize,
                type_name: f.get("type_name")?.as_str()?.to_string(),
            })
        })
        .collect::<Vec<_>>();

    let rows = result
        .get("rows")
        .and_then(|v: &serde_json::Value| v.as_array())
        .ok_or("No se encontraron registros en la tabla")?
        .iter()
        .filter_map(|r: &serde_json::Value| r.as_object().cloned())
        .collect::<Vec<_>>();

    Ok(RawTable {
        file_name: file_path.to_string(),
        table_name,
        fields,
        rows,
    })
}

/// Identifica la tabla de pacientes usando un puntaje heurístico
pub fn identify_patients_table(data: &RawParadoxData) -> Option<&RawTable> {
    let mut best: Option<&RawTable> = None;
    let mut best_score = 0i32;

    for table in &data.tables {
        let mut score = 0i32;

        for f in &table.fields {
            let name = f.name.to_lowercase();

            // Nombre
            if name.contains("nombre") || name.contains("name") {
                score += 5;
            }

            // Identificadores comunes en este dataset
            if name.contains("clavpac") || name.contains("clavpac") || name.contains("clavepac") {
                score += 4;
            }
            if name.contains("clavedoc") || name.contains("document") || name.contains("doc") {
                score += 3;
            }
            if name == "registro" || name.contains("registro") || name.contains("reg") {
                score += 3;
            }

            // Sexo / género
            if name.contains("sexo") || name.contains("genero") || name.contains("gender") {
                score += 2;
            }

            // Dirección / contacto
            if name.contains("direccion") || name.contains("domicilio") || name.contains("address")
            {
                score += 2;
            }
            if name.contains("telefono") || name.contains("phone") {
                score += 2;
            }
            if name.contains("email") || name.contains("correo") || name.contains("mail") {
                score += 2;
            }

            // Campos de uso propio: no suman, pero tampoco restan
        }

        // Bonus por cantidad de campos (más de 15 suele ser tabla de pacientes)
        if table.fields.len() >= 15 {
            score += 3;
        }

        // Bonus por cantidad de registros (mayor a 100 suele ser pacientes)
        if table.rows.len() >= 100 {
            score += 3;
        }

        if score > best_score {
            best_score = score;
            best = Some(table);
        }
    }

    best
}

/// Identifica qué tabla contiene tratamientos
pub fn identify_treatments_table(data: &RawParadoxData) -> Option<&RawTable> {
    let mut best: Option<&RawTable> = None;
    let mut best_score = 0i32;

    for table in &data.tables {
        let mut score = 0i32;

        for f in &table.fields {
            let name_lower = f.name.to_lowercase();

            // Columnas específicas de Tratam.db
            if name_lower.contains("notrat")
                || (name_lower.contains("trat") && name_lower.contains("id"))
            {
                score += 10;
            }
            if name_lower.contains("descripcio") || name_lower.contains("descripcion") {
                score += 5;
            }
            if name_lower.contains("precio") || name_lower.contains("honorario") {
                score += 5;
            }
            if name_lower.contains("referencia") {
                score += 3;
            }
            if name_lower.contains("categoria") || name_lower.contains("tipo") {
                score += 3;
            }

            // Términos genéricos
            if name_lower.contains("tratamiento") || name_lower.contains("treatment") {
                score += 4;
            }
            if name_lower.contains("procedimiento") || name_lower.contains("procedure") {
                score += 4;
            }
            if name_lower.contains("costo") || name_lower.contains("cost") {
                score += 3;
            }
        }

        // Penalizar si parece tabla de pacientes
        let looks_like_patients = table.fields.iter().any(|f| {
            let n = f.name.to_lowercase();
            n.contains("clavpac")
                || n.contains("clavepac")
                || (n.contains("nombre") && table.fields.len() > 10)
        });
        if looks_like_patients {
            score -= 20;
        }

        if score > best_score && score > 5 {
            best_score = score;
            best = Some(table);
        }
    }

    best
}

/// Identifica qué tabla contiene pagos
pub fn identify_payments_table(data: &RawParadoxData) -> Option<&RawTable> {
    let mut best: Option<&RawTable> = None;
    let mut best_score = 0i32;

    for table in &data.tables {
        let mut score = 0i32;

        let has_payment_fields = table.fields.iter().any(|f| {
            let name_lower = f.name.to_lowercase();
            if name_lower.contains("pago") || name_lower.contains("payment") {
                score += 5;
                true
            } else {
                false
            }
        });

        let has_key_fields = table.fields.iter().any(|f| {
            let name_lower = f.name.to_lowercase();
            if name_lower.contains("clave")
                && (name_lower.contains("pac") || name_lower.contains("tratam"))
            {
                score += 3;
                true
            } else {
                false
            }
        });

        let _has_date_field = table.fields.iter().any(|f| {
            let name_lower = f.name.to_lowercase();
            if name_lower.contains("fecha") || name_lower.contains("date") {
                score += 2;
                true
            } else {
                false
            }
        });

        if (has_payment_fields || has_key_fields) && score > best_score {
            best_score = score;
            best = Some(table);
        }
    }

    best
}

/// Identifica qué tabla contiene odontogramas
pub fn identify_odontograms_table(data: &RawParadoxData) -> Option<&RawTable> {
    let mut best: Option<&RawTable> = None;
    let mut best_score = 0i32;

    for table in &data.tables {
        let mut score = 0i32;

        for f in &table.fields {
            let name_lower = f.name.to_lowercase();

            if name_lower.contains("diente")
                || name_lower.contains("nodiente")
                || name_lower.contains("tooth")
            {
                score += 5;
            }
            if name_lower.contains("clavepac") || name_lower.contains("clavpac") {
                score += 3;
            }
            if name_lower.contains("tipo") || name_lower.contains("color") {
                score += 2;
            }
            if name_lower.contains("avance") || name_lower.contains("estado") {
                score += 2;
            }
        }

        if score > best_score {
            best_score = score;
            best = Some(table);
        }
    }

    if best_score >= 5 {
        best
    } else {
        None
    }
}

// Remover implementación anterior incompleta
pub fn _identify_payments_table_old(data: &RawParadoxData) -> Option<&RawTable> {
    for table in &data.tables {
        let has_payment_fields = table.fields.iter().any(|f| {
            let name_lower = f.name.to_lowercase();
            name_lower.contains("pago")
                || name_lower.contains("payment")
                || name_lower.contains("monto")
                || name_lower.contains("amount")
        });

        if has_payment_fields {
            return Some(table);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_table_identification() {
        // Tests básicos de identificación
        // TODO: Implementar con datos de muestra
    }
}
