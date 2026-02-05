use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Template {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub template_type: String,
    pub content: String,
    pub variables: String, // JSON array de strings
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTemplateInput {
    pub name: String,
    #[serde(rename = "type")]
    pub template_type: String,
    pub content: String,
    pub variables: Option<Vec<String>>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTemplateInput {
    pub name: Option<String>,
    #[serde(rename = "type")]
    pub template_type: Option<String>,
    pub content: Option<String>,
    pub variables: Option<Vec<String>>,
    pub is_default: Option<bool>,
}

pub fn init_templates_table(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT NOT NULL,
            variables TEXT NOT NULL DEFAULT '[]',
            is_default BOOLEAN NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )",
        [],
    )?;

    // Crear índices
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_templates_is_default ON templates(is_default)",
        [],
    )?;

    Ok(())
}

pub fn get_all_templates(conn: &Connection) -> Result<Vec<Template>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, type, content, variables, is_default, created_at, updated_at 
         FROM templates 
         ORDER BY is_default DESC, created_at DESC"
    )?;

    let templates = stmt
        .query_map([], |row| {
            Ok(Template {
                id: row.get(0)?,
                name: row.get(1)?,
                template_type: row.get(2)?,
                content: row.get(3)?,
                variables: row.get(4)?,
                is_default: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    Ok(templates)
}

pub fn get_template_by_id(conn: &Connection, id: i64) -> Result<Option<Template>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, type, content, variables, is_default, created_at, updated_at 
         FROM templates 
         WHERE id = ?"
    )?;

    let mut rows = stmt.query(params![id])?;
    
    if let Some(row) = rows.next()? {
        Ok(Some(Template {
            id: row.get(0)?,
            name: row.get(1)?,
            template_type: row.get(2)?,
            content: row.get(3)?,
            variables: row.get(4)?,
            is_default: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn get_templates_by_type(conn: &Connection, template_type: &str) -> Result<Vec<Template>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, type, content, variables, is_default, created_at, updated_at 
         FROM templates 
         WHERE type = ? 
         ORDER BY is_default DESC, created_at DESC"
    )?;

    let templates = stmt
        .query_map(params![template_type], |row| {
            Ok(Template {
                id: row.get(0)?,
                name: row.get(1)?,
                template_type: row.get(2)?,
                content: row.get(3)?,
                variables: row.get(4)?,
                is_default: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    Ok(templates)
}

pub fn create_template(conn: &Connection, input: CreateTemplateInput) -> Result<Template> {
    let variables_json = if let Some(vars) = input.variables {
        serde_json::to_string(&vars).unwrap_or_else(|_| "[]".to_string())
    } else {
        "[]".to_string()
    };

    let is_default = input.is_default.unwrap_or(false);

    // Si se marca como default, desmarcar otros del mismo tipo
    if is_default {
        conn.execute(
            "UPDATE templates SET is_default = 0 WHERE type = ?",
            params![input.template_type],
        )?;
    }

    conn.execute(
        "INSERT INTO templates (name, type, content, variables, is_default) 
         VALUES (?, ?, ?, ?, ?)",
        params![
            input.name,
            input.template_type,
            input.content,
            variables_json,
            is_default
        ],
    )?;

    let id = conn.last_insert_rowid();
    get_template_by_id(conn, id)?.ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)
}

pub fn update_template(
    conn: &Connection,
    id: i64,
    input: UpdateTemplateInput,
) -> Result<()> {
    let mut updates = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(name) = input.name {
        updates.push("name = ?");
        params.push(Box::new(name));
    }

    if let Some(template_type) = input.template_type {
        updates.push("type = ?");
        params.push(Box::new(template_type));
    }

    if let Some(content) = input.content {
        updates.push("content = ?");
        params.push(Box::new(content));
    }

    if let Some(variables) = input.variables {
        let variables_json = serde_json::to_string(&variables).unwrap_or_else(|_| "[]".to_string());
        updates.push("variables = ?");
        params.push(Box::new(variables_json));
    }

    if let Some(is_default) = input.is_default {
        updates.push("is_default = ?");
        params.push(Box::new(is_default));
    }

    if !updates.is_empty() {
        updates.push("updated_at = datetime('now', 'localtime')");

        let query = format!("UPDATE templates SET {} WHERE id = ?", updates.join(", "));
        params.push(Box::new(id));

        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, params_refs.as_slice())?;
    }

    Ok(())
}

pub fn delete_template(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM templates WHERE id = ?", params![id])?;
    Ok(())
}

pub fn set_default_template(conn: &Connection, id: i64, template_type: &str) -> Result<()> {
    // Desmarcar todos los defaults del mismo tipo
    conn.execute(
        "UPDATE templates SET is_default = 0 WHERE type = ?",
        params![template_type],
    )?;

    // Marcar el nuevo default
    conn.execute(
        "UPDATE templates SET is_default = 1, updated_at = datetime('now', 'localtime') WHERE id = ?",
        params![id],
    )?;

    Ok(())
}
