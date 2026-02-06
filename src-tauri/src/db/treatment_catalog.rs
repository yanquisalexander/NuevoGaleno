use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::get_connection;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreatmentCatalogEntry {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub default_cost: f64,
    pub category: Option<String>,
    pub color: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreatmentCatalogItem {
    pub id: i64,
    pub treatment_catalog_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub default_cost: f64,
    pub color: Option<String>,
    pub is_active: bool,
    pub display_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTreatmentCatalogInput {
    pub name: String,
    pub description: Option<String>,
    pub default_cost: f64,
    pub category: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTreatmentCatalogInput {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub default_cost: f64,
    pub category: Option<String>,
    pub color: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTreatmentCatalogItemInput {
    pub treatment_catalog_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub default_cost: f64,
    pub color: Option<String>,
    pub display_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTreatmentCatalogItemInput {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub default_cost: f64,
    pub color: Option<String>,
    pub is_active: bool,
    pub display_order: i32,
}

// ============================================================================
// CRUD para Catálogo de Tratamientos
// ============================================================================

pub fn get_all_treatment_catalog() -> Result<Vec<TreatmentCatalogEntry>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, default_cost, category, color, is_active, created_at, updated_at
             FROM treatment_catalog
             WHERE is_active = 1
             ORDER BY category, name",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let entries = stmt
        .query_map([], |row| {
            Ok(TreatmentCatalogEntry {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                default_cost: row.get(3)?,
                category: row.get(4)?,
                color: row.get(5)?,
                is_active: row.get::<_, i32>(6)? == 1,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error obteniendo resultados: {}", e))?;

    Ok(entries)
}

pub fn get_treatment_catalog_by_id(id: i64) -> Result<Option<TreatmentCatalogEntry>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, default_cost, category, color, is_active, created_at, updated_at
             FROM treatment_catalog
             WHERE id = ?1",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let result = stmt.query_row(params![id], |row| {
        Ok(TreatmentCatalogEntry {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            default_cost: row.get(3)?,
            category: row.get(4)?,
            color: row.get(5)?,
            is_active: row.get::<_, i32>(6)? == 1,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    });

    match result {
        Ok(entry) => Ok(Some(entry)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Error obteniendo tratamiento: {}", e)),
    }
}

pub fn create_treatment_catalog(input: CreateTreatmentCatalogInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO treatment_catalog (name, description, default_cost, category, color, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7)",
        params![
            input.name,
            input.description,
            input.default_cost,
            input.category,
            input.color,
            &now,
            &now,
        ],
    )
    .map_err(|e| format!("Error creando tratamiento: {}", e))?;

    Ok(conn.last_insert_rowid())
}

pub fn update_treatment_catalog(input: UpdateTreatmentCatalogInput) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE treatment_catalog
         SET name = ?1, description = ?2, default_cost = ?3, category = ?4, color = ?5, is_active = ?6, updated_at = ?7
         WHERE id = ?8",
        params![
            input.name,
            input.description,
            input.default_cost,
            input.category,
            input.color,
            if input.is_active { 1 } else { 0 },
            &now,
            input.id,
        ],
    )
    .map_err(|e| format!("Error actualizando tratamiento: {}", e))?;

    Ok(())
}

pub fn delete_treatment_catalog(id: i64) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    // Soft delete
    conn.execute(
        "UPDATE treatment_catalog SET is_active = 0, updated_at = ?1 WHERE id = ?2",
        params![&now, id],
    )
    .map_err(|e| format!("Error eliminando tratamiento: {}", e))?;

    Ok(())
}

// ============================================================================
// CRUD para Items de Catálogo de Tratamientos (Sub-tratamientos)
// ============================================================================

pub fn get_treatment_catalog_items(
    treatment_catalog_id: i64,
) -> Result<Vec<TreatmentCatalogItem>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, treatment_catalog_id, name, description, default_cost, color, is_active, display_order, created_at, updated_at
             FROM treatment_catalog_items
             WHERE treatment_catalog_id = ?1 AND is_active = 1
             ORDER BY display_order, name",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let items = stmt
        .query_map(params![treatment_catalog_id], |row| {
            Ok(TreatmentCatalogItem {
                id: row.get(0)?,
                treatment_catalog_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                default_cost: row.get(4)?,
                color: row.get(5)?,
                is_active: row.get::<_, i32>(6)? == 1,
                display_order: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error obteniendo resultados: {}", e))?;

    Ok(items)
}

pub fn create_treatment_catalog_item(
    input: CreateTreatmentCatalogItemInput,
) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO treatment_catalog_items (treatment_catalog_id, name, description, default_cost, color, is_active, display_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?8)",
        params![
            input.treatment_catalog_id,
            input.name,
            input.description,
            input.default_cost,
            input.color,
            input.display_order,
            &now,
            &now,
        ],
    )
    .map_err(|e| format!("Error creando item: {}", e))?;

    Ok(conn.last_insert_rowid())
}

pub fn update_treatment_catalog_item(input: UpdateTreatmentCatalogItemInput) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE treatment_catalog_items
         SET name = ?1, description = ?2, default_cost = ?3, color = ?4, is_active = ?5, display_order = ?6, updated_at = ?7
         WHERE id = ?8",
        params![
            input.name,
            input.description,
            input.default_cost,
            input.color,
            if input.is_active { 1 } else { 0 },
            input.display_order,
            &now,
            input.id,
        ],
    )
    .map_err(|e| format!("Error actualizando item: {}", e))?;

    Ok(())
}

pub fn delete_treatment_catalog_item(id: i64) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    // Soft delete
    conn.execute(
        "UPDATE treatment_catalog_items SET is_active = 0, updated_at = ?1 WHERE id = ?2",
        params![&now, id],
    )
    .map_err(|e| format!("Error eliminando item: {}", e))?;

    Ok(())
}

pub fn get_treatment_catalog_item_by_id(id: i64) -> Result<Option<TreatmentCatalogItem>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, treatment_catalog_id, name, description, default_cost, color, is_active, display_order, created_at, updated_at
             FROM treatment_catalog_items
             WHERE id = ?1",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let result = stmt.query_row(params![id], |row| {
        Ok(TreatmentCatalogItem {
            id: row.get(0)?,
            treatment_catalog_id: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            default_cost: row.get(4)?,
            color: row.get(5)?,
            is_active: row.get::<_, i32>(6)? == 1,
            display_order: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    });

    match result {
        Ok(item) => Ok(Some(item)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Error obteniendo item: {}", e)),
    }
}
