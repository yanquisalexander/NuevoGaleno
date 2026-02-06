use crate::db::path::get_app_data_dir;
use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const LEMON_SQUEEZY_API_BASE: &str = "https://api.lemonsqueezy.com/v1";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseKey {
    pub id: i64,
    pub status: String, // inactive, active, expired, disabled
    pub key: String,
    pub activation_limit: i64,
    pub activation_usage: i64,
    pub created_at: String,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseInstance {
    pub id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseMeta {
    pub store_id: i64,
    pub order_id: i64,
    pub order_item_id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub variant_id: i64,
    pub variant_name: String,
    pub customer_id: i64,
    pub customer_name: String,
    pub customer_email: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LemonSqueezyActivateResponse {
    pub activated: bool,
    pub error: Option<String>,
    pub license_key: LicenseKey,
    pub instance: LicenseInstance,
    pub meta: LicenseMeta,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LemonSqueezyValidateResponse {
    pub valid: bool,
    pub error: Option<String>,
    pub license_key: LicenseKey,
    pub instance: Option<LicenseInstance>,
    pub meta: LicenseMeta,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LemonSqueezyDeactivateResponse {
    pub deactivated: bool,
    pub error: Option<String>,
    pub license_key: LicenseKey,
    pub meta: LicenseMeta,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalLicenseInfo {
    pub license_key: String,
    pub instance_id: String,
    pub customer_email: String,
    pub last_validation: String,
    pub cached_response: Option<String>, // JSON de LemonSqueezyValidateResponse
    pub activated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrialInfo {
    pub is_trial: bool,
    pub trial_started_at: Option<String>,
    pub trial_days_remaining: i64,
    pub trial_expired: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseStatus {
    pub is_licensed: bool,
    pub is_active: bool,
    pub is_trial: bool,
    pub trial_days_remaining: i64,
    pub trial_expired: bool,
    pub trial_used: bool, // Nuevo campo: indica si alguna vez se inició el trial
    pub license_key: Option<String>,
    pub customer_email: Option<String>,
    pub status: String, // active, trial, expired, unlicensed
    pub last_check: Option<String>,
    pub offline_mode: bool,
    pub cached_response: Option<LemonSqueezyValidateResponse>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseVariant {
    pub id: i64,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LemonSqueezyConfig {
    pub store_id: i64,
    pub product_id: i64,
    pub variants: Vec<LicenseVariant>,
    pub trial_days: i64,
    pub validation_interval_hours: i64,
    pub offline_grace_period_days: i64,
}
#[derive(Clone)]
pub struct LicenseManager {
    db_path: PathBuf,
    config: LemonSqueezyConfig,
}

impl LicenseManager {
    pub fn new(config: LemonSqueezyConfig) -> Result<Self> {
        let app_data_dir = get_app_data_dir()
            .map_err(|e| anyhow!("Error obteniendo directorio de datos: {}", e))?;

        let db_path = app_data_dir.join("license.db");

        let manager = Self { db_path, config };

        manager.init_db()?;
        Ok(manager)
    }

    fn init_db(&self) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS license_info (
                id INTEGER PRIMARY KEY,
                license_key TEXT NOT NULL,
                instance_id TEXT NOT NULL,
                customer_email TEXT NOT NULL,
                last_validation TEXT NOT NULL,
                cached_response TEXT,
                activated_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS trial_info (
                id INTEGER PRIMARY KEY,
                trial_started_at TEXT NOT NULL
            )",
            [],
        )?;

        Ok(())
    }

    fn get_conn(&self) -> Result<Connection> {
        Ok(Connection::open(&self.db_path)?)
    }

    pub fn get_config(&self) -> LemonSqueezyConfig {
        self.config.clone()
    }

    // Activar licencia con Lemon Squeezy
    pub async fn activate_license(
        &self,
        license_key: &str,
        customer_email: &str,
        instance_name: &str,
    ) -> Result<LemonSqueezyActivateResponse> {
        let client = reqwest::Client::new();
        let hostname = hostname::get()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let full_instance_name = format!("{} - {}", instance_name, hostname);

        let response = client
            .post(format!("{}/licenses/activate", LEMON_SQUEEZY_API_BASE))
            .header("Accept", "application/json")
            .form(&[
                ("license_key", license_key),
                ("instance_name", &full_instance_name),
            ])
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Error al activar licencia: {}", error_text));
        }

        let activation_response: LemonSqueezyActivateResponse = response.json().await?;

        // Verificar que la licencia sea para nuestro producto
        if activation_response.meta.store_id != self.config.store_id
            || activation_response.meta.product_id != self.config.product_id
        {
            return Err(anyhow!("Esta licencia no es válida para este producto"));
        }

        // Verificar que la variante sea una de las permitidas
        let is_valid_variant = self
            .config
            .variants
            .iter()
            .any(|v| v.id == activation_response.meta.variant_id);

        if !is_valid_variant {
            return Err(anyhow!(
                "Esta licencia no es válida para ninguna de las variantes de este producto"
            ));
        }

        // Verificar email del cliente
        if activation_response.meta.customer_email != customer_email {
            return Err(anyhow!(
                "El email no coincide con el cliente de la licencia"
            ));
        }

        // Guardar localmente
        self.save_license_info(
            &activation_response.license_key.key,
            &activation_response.instance.id,
            customer_email,
            None,
        )?;

        Ok(activation_response)
    }

    // Validar licencia
    pub async fn validate_license(&self) -> Result<LicenseStatus> {
        // Primero intentar obtener info local
        let local_info = self.get_local_license_info()?;

        if let Some(info) = local_info {
            // Intentar validar online
            match self
                .validate_license_online(&info.license_key, &info.instance_id)
                .await
            {
                Ok(validate_response) => {
                    // Actualizar cache
                    self.update_cached_response(&info.license_key, &validate_response)?;

                    return Ok(self.build_license_status(&validate_response, &info, false));
                }
                Err(_) => {
                    // Modo offline - usar cache si está disponible
                    if let Some(cached_json) = &info.cached_response {
                        if let Ok(cached_response) =
                            serde_json::from_str::<LemonSqueezyValidateResponse>(cached_json)
                        {
                            // Verificar que no haya pasado mucho tiempo desde la última validación
                            let last_validation =
                                DateTime::parse_from_rfc3339(&info.last_validation)?;
                            let now = Utc::now();
                            let days_since = (now - last_validation.with_timezone(&Utc)).num_days();

                            if days_since < 7 {
                                // Período de gracia de 7 días
                                return Ok(self.build_license_status(
                                    &cached_response,
                                    &info,
                                    true,
                                ));
                            }
                        }
                    }
                }
            }
        }

        // Si no hay licencia, verificar trial
        self.get_trial_status()
    }

    async fn validate_license_online(
        &self,
        license_key: &str,
        instance_id: &str,
    ) -> Result<LemonSqueezyValidateResponse> {
        let client = reqwest::Client::new();

        let response = client
            .post(format!("{}/licenses/validate", LEMON_SQUEEZY_API_BASE))
            .header("Accept", "application/json")
            .form(&[("license_key", license_key), ("instance_id", instance_id)])
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Error al validar licencia: {}", error_text));
        }

        let validate_response: LemonSqueezyValidateResponse = response.json().await?;
        Ok(validate_response)
    }

    pub async fn deactivate_license(&self) -> Result<LemonSqueezyDeactivateResponse> {
        let local_info = self
            .get_local_license_info()?
            .ok_or_else(|| anyhow!("No hay licencia para desactivar"))?;

        let client = reqwest::Client::new();

        let response = client
            .post(format!("{}/licenses/deactivate", LEMON_SQUEEZY_API_BASE))
            .header("Accept", "application/json")
            .form(&[
                ("license_key", &local_info.license_key),
                ("instance_id", &local_info.instance_id),
            ])
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Error al desactivar licencia: {}", error_text));
        }

        let deactivate_response: LemonSqueezyDeactivateResponse = response.json().await?;

        // Eliminar info local
        self.remove_license_info()?;

        Ok(deactivate_response)
    }

    fn save_license_info(
        &self,
        license_key: &str,
        instance_id: &str,
        customer_email: &str,
        cached_response: Option<&LemonSqueezyValidateResponse>,
    ) -> Result<()> {
        let conn = self.get_conn()?;
        let now = Utc::now().to_rfc3339();
        let activated_at = Utc::now().to_rfc3339();

        let cached_json = cached_response
            .map(|r| serde_json::to_string(r).ok())
            .flatten();

        conn.execute(
            "INSERT OR REPLACE INTO license_info (id, license_key, instance_id, customer_email, last_validation, cached_response, activated_at) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6)",
            params![license_key, instance_id, customer_email, now, cached_json, activated_at],
        )?;

        Ok(())
    }

    fn get_local_license_info(&self) -> Result<Option<LocalLicenseInfo>> {
        let conn = self.get_conn()?;

        let mut stmt = conn.prepare(
            "SELECT license_key, instance_id, customer_email, last_validation, cached_response, activated_at FROM license_info WHERE id = 1",
        )?;

        let result = stmt.query_row([], |row| {
            Ok(LocalLicenseInfo {
                license_key: row.get(0)?,
                instance_id: row.get(1)?,
                customer_email: row.get(2)?,
                last_validation: row.get(3)?,
                cached_response: row.get(4)?,
                activated_at: row.get(5)?,
            })
        });

        match result {
            Ok(info) => Ok(Some(info)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn update_cached_response(
        &self,
        license_key: &str,
        validate_response: &LemonSqueezyValidateResponse,
    ) -> Result<()> {
        let conn = self.get_conn()?;
        let now = Utc::now().to_rfc3339();
        let cached_json = serde_json::to_string(validate_response)?;

        conn.execute(
            "UPDATE license_info SET last_validation = ?1, cached_response = ?2 WHERE license_key = ?3",
            params![now, cached_json, license_key],
        )?;

        Ok(())
    }

    fn remove_license_info(&self) -> Result<()> {
        let conn = self.get_conn()?;
        conn.execute("DELETE FROM license_info WHERE id = 1", [])?;
        Ok(())
    }

    // Trial management
    pub fn start_trial(&self) -> Result<()> {
        let conn = self.get_conn()?;
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT OR IGNORE INTO trial_info (id, trial_started_at) VALUES (1, ?1)",
            params![now],
        )?;

        Ok(())
    }

    fn get_trial_info(&self) -> Result<Option<String>> {
        let conn = self.get_conn()?;

        let mut stmt = conn.prepare("SELECT trial_started_at FROM trial_info WHERE id = 1")?;

        let result = stmt.query_row([], |row| row.get(0));

        match result {
            Ok(started_at) => Ok(Some(started_at)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn get_trial_status(&self) -> Result<LicenseStatus> {
        // Primero verificar si hay una licencia activa guardada localmente
        if let Ok(Some(local_info)) = self.get_local_license_info() {
            // Si hay info de licencia, verificar si tiene cached_response
            if let Some(cached_json) = &local_info.cached_response {
                if let Ok(cached_response) =
                    serde_json::from_str::<LemonSqueezyValidateResponse>(cached_json)
                {
                    // Usar la respuesta cacheada para construir el estado
                    return Ok(self.build_license_status(&cached_response, &local_info, false));
                }
            }
            // Si no hay cached_response válido pero hay license_key, asumir que está activa
            // pero necesita validación online
            return Ok(LicenseStatus {
                is_licensed: true,
                is_active: true,
                is_trial: false,
                trial_days_remaining: 0,
                trial_expired: false,
                trial_used: false,
                license_key: Some(local_info.license_key.clone()),
                customer_email: Some(local_info.customer_email.clone()),
                status: "active".to_string(),
                last_check: Some(Utc::now().to_rfc3339()),
                offline_mode: true, // Marcar como offline porque no tenemos respuesta válida
                cached_response: None,
            });
        }

        // Si no hay licencia, verificar si hay trial
        let trial_started = self.get_trial_info()?;

        if let Some(started_at) = trial_started {
            let started = DateTime::parse_from_rfc3339(&started_at)?;
            let now = Utc::now();
            let days_elapsed = (now - started.with_timezone(&Utc)).num_days();
            let days_remaining = 30 - days_elapsed;

            let trial_expired = days_remaining <= 0;

            Ok(LicenseStatus {
                is_licensed: false,
                is_active: !trial_expired,
                is_trial: true,
                trial_days_remaining: days_remaining.max(0),
                trial_expired,
                trial_used: true, // El trial fue iniciado
                license_key: None,
                customer_email: None,
                status: if trial_expired {
                    "expired".to_string()
                } else {
                    "trial".to_string()
                },
                last_check: Some(Utc::now().to_rfc3339()),
                offline_mode: false,
                cached_response: None,
            })
        } else {
            // No hay trial ni licencia - nunca se ha iniciado un trial
            Ok(LicenseStatus {
                is_licensed: false,
                is_active: false,
                is_trial: false,
                trial_days_remaining: 0,
                trial_expired: false, // false porque nunca se inició un trial
                trial_used: false,    // Nunca se usó el trial
                license_key: None,
                customer_email: None,
                status: "unlicensed".to_string(),
                last_check: Some(Utc::now().to_rfc3339()),
                offline_mode: false,
                cached_response: None,
            })
        }
    }

    fn build_license_status(
        &self,
        validate_response: &LemonSqueezyValidateResponse,
        local_info: &LocalLicenseInfo,
        offline_mode: bool,
    ) -> LicenseStatus {
        let is_active = validate_response.valid && validate_response.license_key.status == "active";

        LicenseStatus {
            is_licensed: true,
            is_active,
            is_trial: false,
            trial_days_remaining: 0,
            trial_expired: false,
            trial_used: false, // No relevante cuando hay licencia activa
            license_key: Some(local_info.license_key.clone()),
            customer_email: Some(local_info.customer_email.clone()),
            status: if is_active {
                "active".to_string()
            } else {
                validate_response.license_key.status.clone()
            },
            last_check: Some(Utc::now().to_rfc3339()),
            offline_mode,
            cached_response: Some(validate_response.clone()),
        }
    }
}
