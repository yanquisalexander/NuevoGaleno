// Lector de datos desde Paradox
// Etapa 1: Extracción de datos raw sin transformación

use crate::import_pipeline::models::{RawField, RawParadoxData, RawTable};
use crate::importer;
use std::path::Path;

/// Lee todos los archivos .DB de un directorio extraído con límite de registros
pub fn read_all_tables_with_limit(
    extracted_dir: &str,
    limit: usize,
) -> Result<RawParadoxData, String> {
    let mut data = RawParadoxData {
        tables: Vec::new(),
        errors: Vec::new(),
    };

    // Listar archivos .DB
    let files_result = importer::list_extracted_files(extracted_dir.to_string())?;

    let db_files = files_result
        .get("db_files")
        .and_then(|v| v.as_array())
        .ok_or("No se encontraron archivos .DB")?;

    for db_file in db_files {
        let path_str = db_file.as_str().ok_or("Ruta de archivo inválida")?;

        match read_single_table(path_str, limit) {
            Ok(table) => data.tables.push(table),
            Err(e) => {
                data.errors
                    .push(format!("Error leyendo {}: {}", path_str, e));
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
pub fn read_all_tables(extracted_dir: &str) -> Result<RawParadoxData, String> {
    read_all_tables_with_limit(extracted_dir, usize::MAX)
}

/// Lee solo los primeros N registros de cada tabla (para preview rápido)
pub fn read_all_tables_preview(
    extracted_dir: &str,
    limit: usize,
) -> Result<RawParadoxData, String> {
    read_all_tables_with_limit(extracted_dir, limit)
}

/// Lee una tabla individual de Paradox con límite de registros
fn read_single_table(file_path: &str, limit: usize) -> Result<RawTable, String> {
    let path = Path::new(file_path);
    let table_name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_string();

    // Usar la función existente del importer con el límite especificado
    let result = importer::read_table_data(file_path.to_string(), limit)?;

    // Parsear el resultado JSON
    let fields = result
        .get("fields")
        .and_then(|v| v.as_array())
        .ok_or("No se encontraron campos en la tabla")?
        .iter()
        .filter_map(|f| {
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
        .and_then(|v| v.as_array())
        .ok_or("No se encontraron registros en la tabla")?
        .iter()
        .filter_map(|r| r.as_object().cloned())
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
    for table in &data.tables {
        let has_treatment_fields = table.fields.iter().any(|f| {
            let name_lower = f.name.to_lowercase();
            name_lower.contains("tratamiento")
                || name_lower.contains("treatment")
                || name_lower.contains("procedimiento")
                || name_lower.contains("procedure")
        });

        let has_cost_field = table.fields.iter().any(|f| {
            let name_lower = f.name.to_lowercase();
            name_lower.contains("costo")
                || name_lower.contains("precio")
                || name_lower.contains("cost")
                || name_lower.contains("price")
        });

        if has_treatment_fields || has_cost_field {
            return Some(table);
        }
    }
    None
}

/// Identifica qué tabla contiene pagos
pub fn identify_payments_table(data: &RawParadoxData) -> Option<&RawTable> {
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
