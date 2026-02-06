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
    pub icon: Option<String>,
    pub show_independently: bool,
    pub applies_to_whole_tooth: bool,
    pub visual_effect: Option<String>,
    pub is_bridge_component: bool,
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
    pub icon: Option<String>,
    pub applies_to_whole_tooth: bool,
    pub visual_effect: Option<String>,
    pub is_bridge_component: bool,
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
    pub icon: Option<String>,
    pub show_independently: bool,
    pub applies_to_whole_tooth: bool,
    pub visual_effect: Option<String>,
    pub is_bridge_component: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTreatmentCatalogInput {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub default_cost: f64,
    pub category: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub show_independently: bool,
    pub applies_to_whole_tooth: bool,
    pub visual_effect: Option<String>,
    pub is_bridge_component: bool,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTreatmentCatalogItemInput {
    pub treatment_catalog_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub default_cost: f64,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub applies_to_whole_tooth: bool,
    pub visual_effect: Option<String>,
    pub is_bridge_component: bool,
    pub display_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTreatmentCatalogItemInput {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub default_cost: f64,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub applies_to_whole_tooth: bool,
    pub visual_effect: Option<String>,
    pub is_bridge_component: bool,
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
            "SELECT id, name, description, default_cost, category, color, icon, show_independently, 
                    applies_to_whole_tooth, visual_effect, is_bridge_component, is_active, created_at, updated_at
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
                icon: row.get(6)?,
                show_independently: row.get::<_, i32>(7)? == 1,
                applies_to_whole_tooth: row.get::<_, i32>(8)? == 1,
                visual_effect: row.get(9)?,
                is_bridge_component: row.get::<_, i32>(10)? == 1,
                is_active: row.get::<_, i32>(11)? == 1,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
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
            "SELECT id, name, description, default_cost, category, color, icon, show_independently, 
                    applies_to_whole_tooth, visual_effect, is_bridge_component, is_active, created_at, updated_at
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
            icon: row.get(6)?,
            show_independently: row.get::<_, i32>(7)? == 1,
            applies_to_whole_tooth: row.get::<_, i32>(8)? == 1,
            visual_effect: row.get(9)?,
            is_bridge_component: row.get::<_, i32>(10)? == 1,
            is_active: row.get::<_, i32>(11)? == 1,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
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
        "INSERT INTO treatment_catalog (name, description, default_cost, category, color, icon, show_independently, 
                                        applies_to_whole_tooth, visual_effect, is_bridge_component, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 1, ?11, ?12)",
        params![
            input.name,
            input.description,
            input.default_cost,
            input.category,
            input.color,
            input.icon,
            if input.show_independently { 1 } else { 0 },
            if input.applies_to_whole_tooth { 1 } else { 0 },
            input.visual_effect,
            if input.is_bridge_component { 1 } else { 0 },
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
         SET name = ?1, description = ?2, default_cost = ?3, category = ?4, color = ?5, icon = ?6, 
             show_independently = ?7, applies_to_whole_tooth = ?8, visual_effect = ?9, is_bridge_component = ?10, 
             is_active = ?11, updated_at = ?12
         WHERE id = ?13",
        params![
            input.name,
            input.description,
            input.default_cost,
            input.category,
            input.color,
            input.icon,
            if input.show_independently { 1 } else { 0 },
            if input.applies_to_whole_tooth { 1 } else { 0 },
            input.visual_effect,
            if input.is_bridge_component { 1 } else { 0 },
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
            "SELECT id, treatment_catalog_id, name, description, default_cost, color, icon, 
                    applies_to_whole_tooth, visual_effect, is_bridge_component, is_active, display_order, created_at, updated_at
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
                icon: row.get(6)?,
                applies_to_whole_tooth: row.get::<_, i32>(7)? == 1,
                visual_effect: row.get(8)?,
                is_bridge_component: row.get::<_, i32>(9)? == 1,
                is_active: row.get::<_, i32>(10)? == 1,
                display_order: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
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
        "INSERT INTO treatment_catalog_items (treatment_catalog_id, name, description, default_cost, color, icon, 
                                             applies_to_whole_tooth, visual_effect, is_bridge_component, is_active, display_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?11, ?12)",
        params![
            input.treatment_catalog_id,
            input.name,
            input.description,
            input.default_cost,
            input.color,
            input.icon,
            if input.applies_to_whole_tooth { 1 } else { 0 },
            input.visual_effect,
            if input.is_bridge_component { 1 } else { 0 },
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
         SET name = ?1, description = ?2, default_cost = ?3, color = ?4, icon = ?5, 
             applies_to_whole_tooth = ?6, visual_effect = ?7, is_bridge_component = ?8, 
             is_active = ?9, display_order = ?10, updated_at = ?11
         WHERE id = ?12",
        params![
            input.name,
            input.description,
            input.default_cost,
            input.color,
            input.icon,
            if input.applies_to_whole_tooth { 1 } else { 0 },
            input.visual_effect,
            if input.is_bridge_component { 1 } else { 0 },
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
            "SELECT id, treatment_catalog_id, name, description, default_cost, color, icon, 
                    applies_to_whole_tooth, visual_effect, is_bridge_component, is_active, display_order, created_at, updated_at
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
            icon: row.get(6)?,
            applies_to_whole_tooth: row.get::<_, i32>(7)? == 1,
            visual_effect: row.get(8)?,
            is_bridge_component: row.get::<_, i32>(9)? == 1,
            is_active: row.get::<_, i32>(10)? == 1,
            display_order: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
        })
    });

    match result {
        Ok(item) => Ok(Some(item)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Error obteniendo item: {}", e)),
    }
}
