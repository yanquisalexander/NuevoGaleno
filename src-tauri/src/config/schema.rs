use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConfigValueType {
    String,
    Integer,
    Float,
    Boolean,
    Enum,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigValue {
    #[serde(rename = "type")]
    pub type_: ConfigValueType,
    pub default: Value,
    pub description: String,
    #[serde(default)]
    pub ui_section: String,
    #[serde(default)]
    pub admin_only: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub choices: Option<Vec<Value>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigSchema {
    #[serde(flatten)]
    pub definitions: HashMap<String, ConfigValue>,
}

impl ConfigSchema {
    pub fn load_from_embedded() -> Result<Self, String> {
        const SCHEMA_YAML: &str = include_str!("../../resources/config_schema.yml");
        serde_yaml::from_str(SCHEMA_YAML)
            .map_err(|e| format!("Error al cargar el esquema de configuración: {}", e))
    }

    pub fn get_config_definition(&self, key: &str) -> Option<&ConfigValue> {
        self.definitions.get(key)
    }

    pub fn get_default_values(&self) -> HashMap<String, Value> {
        self.definitions
            .iter()
            .map(|(key, definition)| (key.clone(), definition.default.clone()))
            .collect()
    }

    pub fn get_ui_sections(&self) -> Vec<String> {
        let mut sections: Vec<String> = self
            .definitions
            .values()
            .map(|definition| definition.ui_section.clone())
            .filter(|section| !section.is_empty())
            .collect();

        sections.sort();
        sections.dedup();
        sections
    }
}
