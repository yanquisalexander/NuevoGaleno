pub mod schema;
pub mod validation;

use crate::db::config as db_config;
use once_cell::sync::OnceCell;
use serde_json::Value;
use std::{collections::HashMap, sync::Mutex};

use schema::ConfigSchema;
use validation::{validate_config_value, ValidationError};

#[derive(Debug)]
pub struct ConfigManager {
    schema: ConfigSchema,
    values: HashMap<String, Value>,
}

impl ConfigManager {
    fn new() -> Result<Self, String> {
        let schema = ConfigSchema::load_from_embedded()?;
        let mut values = HashMap::new();

        for (key, definition) in &schema.definitions {
            let stored = db_config::get_config(key)
                .map_err(|e| format!("Error leyendo configuración {}: {}", key, e))?;

            let value = stored
                .as_ref()
                .map(|raw| parse_stored_value(raw))
                .unwrap_or_else(|| definition.default.clone());

            values.insert(key.clone(), value);
        }

        Ok(Self { schema, values })
    }

    fn schema(&self) -> &ConfigSchema {
        &self.schema
    }

    fn get_all(&self) -> HashMap<String, Value> {
        self.values.clone()
    }

    fn get_value(&self, key: &str) -> Option<Value> {
        self.values.get(key).cloned()
    }

    fn set_value(&mut self, key: &str, value: Value) -> Result<(), ValidationError> {
        if let Some(definition) = self.schema().get_config_definition(key) {
            validate_config_value(key, &value, definition)?;
            let serialized = serde_json::to_string(&value)
                .map_err(|e| ValidationError::Other(format!("Error serializando valor: {}", e)))?;
            db_config::set_config(key, &serialized)
                .map_err(|e| ValidationError::Other(format!("Error guardando configuración: {}", e)))?;
            self.values.insert(key.to_string(), value);
            Ok(())
        } else {
            Err(ValidationError::Other(format!(
                "La clave '{}' no está definida en el esquema",
                key
            )))
        }
    }
}

fn parse_stored_value(raw: &str) -> Value {
    serde_json::from_str(raw).unwrap_or_else(|_| Value::String(raw.to_string()))
}

static INSTANCE: OnceCell<Mutex<Result<ConfigManager, String>>> = OnceCell::new();

pub fn get_config_manager() -> &'static Mutex<Result<ConfigManager, String>> {
    INSTANCE.get_or_init(|| Mutex::new(ConfigManager::new()))
}

#[tauri::command]
pub fn get_config_schema() -> Result<Value, String> {
    let guard = get_config_manager()
        .lock()
        .map_err(|_| "Error accediendo al gestor de configuración".to_string())?;

    match &*guard {
        Ok(manager) => serde_json::to_value(&manager.schema().definitions)
            .map_err(|e| format!("Error serializando el esquema: {}", e)),
        Err(e) => Err(e.clone()),
    }
}

#[tauri::command]
pub fn get_config_values() -> Result<Value, String> {
    let guard = get_config_manager()
        .lock()
        .map_err(|_| "Error accediendo al gestor de configuración".to_string())?;

    match &*guard {
        Ok(manager) => serde_json::to_value(manager.get_all())
            .map_err(|e| format!("Error serializando la configuración: {}", e)),
        Err(e) => Err(e.clone()),
    }
}

#[tauri::command]
pub fn get_config_value(key: String) -> Result<Option<Value>, String> {
    let guard = get_config_manager()
        .lock()
        .map_err(|_| "Error accediendo al gestor de configuración".to_string())?;

    match &*guard {
        Ok(manager) => Ok(manager.get_value(&key)),
        Err(e) => Err(e.clone()),
    }
}

#[tauri::command]
pub fn set_config_value(key: String, value: Value) -> Result<(), String> {
    let mut guard = get_config_manager()
        .lock()
        .map_err(|_| "Error accediendo al gestor de configuración".to_string())?;

    match &mut *guard {
        Ok(manager) => manager
            .set_value(&key, value)
            .map_err(|e| e.to_string()),
        Err(e) => Err(e.clone()),
    }
}
