use super::schema::{ConfigValue, ConfigValueType};
use serde_json::Value;
use std::fmt;

#[derive(Debug, Clone)]
pub enum ValidationError {
    TypeMismatch {
        expected: String,
        got: String,
    },
    ValueOutOfRange {
        min: Option<Value>,
        max: Option<Value>,
        value: Value,
    },
    InvalidChoice {
        value: Value,
        choices: Vec<Value>,
    },
    Other(String),
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ValidationError::TypeMismatch { expected, got } => {
                write!(
                    f,
                    "Tipo incorrecto: se esperaba {} y se recibió {}",
                    expected, got
                )
            }
            ValidationError::ValueOutOfRange { min, max, value } => {
                write!(f, "Valor fuera de rango: {}.", value)?;
                if let Some(min) = min {
                    write!(f, " Mín: {}.", min)?;
                }
                if let Some(max) = max {
                    write!(f, " Máx: {}.", max)?;
                }
                Ok(())
            }
            ValidationError::InvalidChoice { value, choices } => {
                write!(f, "Valor '{}' no permitido. Opciones: {:?}", value, choices)
            }
            ValidationError::Other(message) => write!(f, "{}", message),
        }
    }
}

pub fn validate_config_value(
    _key: &str,
    value: &Value,
    def: &ConfigValue,
) -> Result<(), ValidationError> {
    validate_type(value, &def.type_)?;

    if let Some(min) = &def.min {
        if let (Some(min_val), Some(val)) = (min.as_f64(), value.as_f64()) {
            if val < min_val {
                return Err(ValidationError::ValueOutOfRange {
                    min: Some(min.clone()),
                    max: def.max.clone(),
                    value: value.clone(),
                });
            }
        }
    }

    if let Some(max) = &def.max {
        if let (Some(max_val), Some(val)) = (max.as_f64(), value.as_f64()) {
            if val > max_val {
                return Err(ValidationError::ValueOutOfRange {
                    min: def.min.clone(),
                    max: Some(max.clone()),
                    value: value.clone(),
                });
            }
        }
    }

    if def.type_ == ConfigValueType::Enum {
        if let Some(choices) = &def.choices {
            if !choices.contains(value) {
                return Err(ValidationError::InvalidChoice {
                    value: value.clone(),
                    choices: choices.clone(),
                });
            }
        }
    }

    Ok(())
}

fn validate_type(value: &Value, expected: &ConfigValueType) -> Result<(), ValidationError> {
    let valid = match expected {
        ConfigValueType::String => value.is_string(),
        ConfigValueType::Integer => value.is_i64(),
        ConfigValueType::Float => value.is_f64() || value.is_i64(),
        ConfigValueType::Boolean => value.is_boolean(),
        ConfigValueType::Enum => true,
    };

    if !valid {
        let got = match value {
            Value::Null => "null".to_string(),
            Value::Bool(_) => "boolean".to_string(),
            Value::Number(_) => "number".to_string(),
            Value::String(_) => "string".to_string(),
            Value::Array(_) => "array".to_string(),
            Value::Object(_) => "object".to_string(),
        };
        return Err(ValidationError::TypeMismatch {
            expected: format!("{:?}", expected),
            got,
        });
    }

    Ok(())
}
