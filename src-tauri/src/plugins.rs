use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

fn default_api_version() -> String {
    "1.0.0".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginDeveloper {
    pub id: Option<String>,
    pub name: String,
    pub verified: Option<bool>,
}

/// Plugin manifest structure matching plugin.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub icon: String,
    pub entry: String, // Now points to index.html
    pub permissions: Vec<String>,
    #[serde(default = "default_api_version", alias = "apiVersion")]
    pub api_version: String,
    #[serde(default, alias = "targetVersion")]
    pub target_version: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub developer: Option<PluginDeveloper>,
    #[serde(default)]
    pub signature: Option<String>,
    pub hooks: Option<HashMap<String, String>>,
    #[serde(default, alias = "menuItems")]
    pub menu_items: Option<Vec<MenuItem>>,
    #[serde(default, alias = "defaultSize")]
    pub default_size: Option<WindowSize>,
    #[serde(default, alias = "allowMultipleInstances")]
    pub allow_multiple_instances: Option<bool>,
    #[serde(default, alias = "minVersion")]
    pub min_version: Option<String>,
    pub repository: Option<String>,
    pub homepage: Option<String>,
    pub license: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuItem {
    pub label: String,
    pub icon: String,
    pub action: String,
    pub shortcut: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSize {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledPlugin {
    pub manifest: PluginManifest,
    pub enabled: bool,
    pub installed_at: String,
    pub updated_at: Option<String>,
    pub requested_permissions: Vec<String>,
    pub granted_permissions: Vec<String>,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorePlugin {
    pub manifest: PluginManifest,
    pub downloads: u64,
    pub rating: f32,
    pub reviews: u32,
    pub verified: bool,
    pub price: Option<f32>,
    pub screenshots: Option<Vec<String>>,
    pub changelog: Option<String>,
    pub package_path: Option<String>,
}

fn get_store_catalog_path() -> PathBuf {
    PathBuf::from("src-tauri/resources/plugin_store_catalog.json")
}

fn read_store_catalog() -> Result<Option<Vec<StorePlugin>>, String> {
    let catalog_path = get_store_catalog_path();
    if !catalog_path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(&catalog_path).map_err(|e| {
        format!(
            "Failed to read store catalog '{}': {}",
            catalog_path.display(),
            e
        )
    })?;

    let plugins: Vec<StorePlugin> = serde_json::from_str(&raw).map_err(|e| {
        format!(
            "Failed to parse store catalog '{}': {}",
            catalog_path.display(),
            e
        )
    })?;

    Ok(Some(plugins))
}

pub fn get_plugins_dir() -> Result<PathBuf, String> {
    let app_data = crate::db::path::get_app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let plugins_dir = app_data.join("plugins");

    if !plugins_dir.exists() {
        fs::create_dir_all(&plugins_dir)
            .map_err(|e| format!("Failed to create plugins directory: {}", e))?;
    }

    Ok(plugins_dir)
}

pub fn get_installed_plugins() -> Result<Vec<InstalledPlugin>, String> {
    let plugins_dir = get_plugins_dir()?;
    let mut plugins = Vec::new();

    if let Ok(entries) = fs::read_dir(&plugins_dir) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                let manifest_path = entry.path().join("plugin.json");
                if manifest_path.exists() {
                    if let Ok(manifest_str) = fs::read_to_string(&manifest_path) {
                        if let Ok(manifest) = serde_json::from_str::<PluginManifest>(&manifest_str)
                        {
                            // Load plugin metadata
                            let meta_path = entry.path().join(".meta.json");
                            let requested_permissions = manifest.permissions.clone();
                            let (enabled, installed_at, updated_at, granted_permissions) =
                                if meta_path.exists() {
                                    if let Ok(meta_str) = fs::read_to_string(&meta_path) {
                                        if let Ok(meta) =
                                            serde_json::from_str::<serde_json::Value>(&meta_str)
                                        {
                                            let granted_permissions = meta
                                                .get("granted_permissions")
                                                .and_then(|v| v.as_array())
                                                .map(|arr| {
                                                    arr.iter()
                                                        .filter_map(|v| {
                                                            v.as_str().map(|s| s.to_string())
                                                        })
                                                        .collect::<Vec<String>>()
                                                })
                                                .unwrap_or_default();

                                            (
                                                meta.get("enabled")
                                                    .and_then(|v| v.as_bool())
                                                    .unwrap_or(true),
                                                meta.get("installed_at")
                                                    .and_then(|v| v.as_str())
                                                    .unwrap_or("")
                                                    .to_string(),
                                                meta.get("updated_at")
                                                    .and_then(|v| v.as_str())
                                                    .map(|s| s.to_string()),
                                                granted_permissions,
                                            )
                                        } else {
                                            (
                                                true,
                                                chrono::Utc::now().to_rfc3339(),
                                                None,
                                                Vec::new(),
                                            )
                                        }
                                    } else {
                                        (true, chrono::Utc::now().to_rfc3339(), None, Vec::new())
                                    }
                                } else {
                                    (true, chrono::Utc::now().to_rfc3339(), None, Vec::new())
                                };

                            plugins.push(InstalledPlugin {
                                manifest,
                                enabled,
                                installed_at,
                                updated_at,
                                requested_permissions,
                                granted_permissions,
                                path: entry.path().to_string_lossy().to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(plugins)
}

pub fn load_plugin_manifest(plugin_path: &str) -> Result<PluginManifest, String> {
    let manifest_path = PathBuf::from(plugin_path).join("plugin.json");
    let manifest_str = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;

    serde_json::from_str(&manifest_str).map_err(|e| format!("Failed to parse manifest: {}", e))
}

pub fn get_plugin_manifest(plugin_id: &str) -> Result<PluginManifest, String> {
    let plugin_dir = resolve_plugin_dir(plugin_id)?;
    let manifest_path = plugin_dir.join("plugin.json");

    if !manifest_path.exists() {
        return Err(format!("Plugin manifest not found for '{}'", plugin_id));
    }

    let manifest_str = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;

    serde_json::from_str(&manifest_str).map_err(|e| format!("Failed to parse manifest: {}", e))
}

fn resolve_plugin_dir(plugin_id: &str) -> Result<PathBuf, String> {
    let plugins_dir = get_plugins_dir()?;
    let direct_dir = plugins_dir.join(plugin_id);

    if direct_dir.exists() && direct_dir.join("plugin.json").exists() {
        return Ok(direct_dir);
    }

    if let Ok(entries) = fs::read_dir(&plugins_dir) {
        for entry in entries.flatten() {
            let candidate_dir = entry.path();
            if !candidate_dir.is_dir() {
                continue;
            }

            let manifest_path = candidate_dir.join("plugin.json");
            if !manifest_path.exists() {
                continue;
            }

            let Ok(manifest_raw) = fs::read_to_string(&manifest_path) else {
                continue;
            };

            let Ok(manifest) = serde_json::from_str::<PluginManifest>(&manifest_raw) else {
                continue;
            };

            if manifest.id == plugin_id {
                return Ok(candidate_dir);
            }
        }
    }

    Err("Plugin not found".to_string())
}

fn normalize_granted_permissions(
    available_permissions: &[String],
    granted_permissions: Option<Vec<String>>,
) -> Vec<String> {
    let Some(granted) = granted_permissions else {
        return available_permissions.to_vec();
    };

    available_permissions
        .iter()
        .filter(|permission| granted.contains(permission))
        .cloned()
        .collect()
}

fn read_plugin_meta(plugin_id: &str) -> Result<serde_json::Value, String> {
    let plugin_dir = resolve_plugin_dir(plugin_id)?;
    let meta_path = plugin_dir.join(".meta.json");

    if !meta_path.exists() {
        return Ok(serde_json::json!({}));
    }

    let raw = fs::read_to_string(&meta_path)
        .map_err(|e| format!("Failed to read plugin metadata: {}", e))?;

    serde_json::from_str::<serde_json::Value>(&raw)
        .map_err(|e| format!("Failed to parse plugin metadata: {}", e))
}

fn write_plugin_meta(plugin_id: &str, mut meta: serde_json::Value) -> Result<(), String> {
    let plugin_dir = resolve_plugin_dir(plugin_id)?;
    let meta_path = plugin_dir.join(".meta.json");

    meta["updated_at"] = serde_json::json!(chrono::Utc::now().to_rfc3339());

    fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap())
        .map_err(|e| format!("Failed to write plugin metadata: {}", e))
}

fn update_plugin_permissions_metadata(
    plugin_id: &str,
    granted_permissions: &[String],
) -> Result<(), String> {
    let mut meta = read_plugin_meta(plugin_id)?;
    meta["granted_permissions"] = serde_json::json!(granted_permissions);
    write_plugin_meta(plugin_id, meta)
}

pub fn request_plugin_permissions(
    plugin_id: &str,
    requested_permissions: Vec<String>,
) -> Result<Vec<String>, String> {
    let manifest = get_plugin_manifest(plugin_id)?;
    let mut meta = read_plugin_meta(plugin_id)?;

    let allowed_permissions = manifest.permissions.clone();

    let existing_granted: Vec<String> = meta
        .get("granted_permissions")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let newly_requested =
        normalize_granted_permissions(&allowed_permissions, Some(requested_permissions));

    let mut updated_granted = existing_granted;
    for permission in newly_requested {
        if !updated_granted.contains(&permission) {
            updated_granted.push(permission);
        }
    }

    meta["enabled"] = meta
        .get("enabled")
        .cloned()
        .unwrap_or(serde_json::json!(true));
    if meta.get("installed_at").is_none() {
        meta["installed_at"] = serde_json::json!(chrono::Utc::now().to_rfc3339());
    }
    meta["granted_permissions"] = serde_json::json!(updated_granted.clone());
    write_plugin_meta(plugin_id, meta)?;

    Ok(updated_granted)
}

pub fn set_plugin_permissions(
    plugin_id: &str,
    granted_permissions: Vec<String>,
) -> Result<Vec<String>, String> {
    let manifest = get_plugin_manifest(plugin_id)?;
    let mut meta = read_plugin_meta(plugin_id)?;

    let allowed_permissions = manifest.permissions.clone();

    let normalized = normalize_granted_permissions(&allowed_permissions, Some(granted_permissions));

    meta["enabled"] = meta
        .get("enabled")
        .cloned()
        .unwrap_or(serde_json::json!(true));
    meta["granted_permissions"] = serde_json::json!(normalized.clone());
    if meta.get("installed_at").is_none() {
        meta["installed_at"] = serde_json::json!(chrono::Utc::now().to_rfc3339());
    }
    write_plugin_meta(plugin_id, meta)?;

    Ok(normalized)
}

pub fn install_plugin(plugin_path: &str, manifest: &PluginManifest) -> Result<(), String> {
    let plugins_dir = get_plugins_dir()?;
    let dest_dir = plugins_dir.join(&manifest.id);

    if dest_dir.exists() {
        return Err("Plugin already installed".to_string());
    }

    // Copy plugin files
    copy_dir_all(plugin_path, &dest_dir)
        .map_err(|e| format!("Failed to copy plugin files: {}", e))?;

    // Create metadata file
    let meta = serde_json::json!({
        "enabled": true,
        "installed_at": chrono::Utc::now().to_rfc3339(),
        "granted_permissions": manifest.permissions,
    });

    let meta_path = dest_dir.join(".meta.json");
    fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap())
        .map_err(|e| format!("Failed to write metadata: {}", e))?;

    Ok(())
}

pub fn uninstall_plugin(plugin_id: &str) -> Result<(), String> {
    let plugin_dir = resolve_plugin_dir(plugin_id)?;

    fs::remove_dir_all(&plugin_dir).map_err(|e| format!("Failed to remove plugin: {}", e))?;

    Ok(())
}

pub fn update_plugin_status(plugin_id: &str, enabled: bool) -> Result<(), String> {
    let plugin_dir = resolve_plugin_dir(plugin_id)?;
    let meta_path = plugin_dir.join(".meta.json");

    let mut meta: serde_json::Value = if meta_path.exists() {
        serde_json::from_str(
            &fs::read_to_string(&meta_path)
                .map_err(|e| format!("Failed to read metadata: {}", e))?,
        )
        .map_err(|e| format!("Failed to parse metadata: {}", e))?
    } else {
        serde_json::json!({
            "enabled": true,
            "installed_at": chrono::Utc::now().to_rfc3339(),
            "granted_permissions": Vec::<String>::new(),
        })
    };

    meta["enabled"] = serde_json::json!(enabled);
    meta["updated_at"] = serde_json::json!(chrono::Utc::now().to_rfc3339());

    fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap())
        .map_err(|e| format!("Failed to write metadata: {}", e))?;

    Ok(())
}

// Plugin storage (key-value store per plugin) - Now using database
pub fn plugin_storage_get(plugin_id: &str, key: &str) -> Result<Option<serde_json::Value>, String> {
    let conn = crate::db::get_connection()?;

    match crate::db::plugin_data::get_plugin_data(&conn, plugin_id, key) {
        Ok(Some(entry)) => {
            // Parse the value based on type
            let value: serde_json::Value = match entry.value_type.as_str() {
                "json" => serde_json::from_str(&entry.value)
                    .map_err(|e| format!("Failed to parse JSON: {}", e))?,
                "number" => {
                    if let Ok(num) = entry.value.parse::<i64>() {
                        serde_json::json!(num)
                    } else if let Ok(num) = entry.value.parse::<f64>() {
                        serde_json::json!(num)
                    } else {
                        serde_json::json!(entry.value)
                    }
                }
                "boolean" => serde_json::json!(entry.value == "true"),
                _ => serde_json::json!(entry.value),
            };
            Ok(Some(value))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(format!("Failed to get plugin data: {}", e)),
    }
}

pub fn plugin_storage_set(
    plugin_id: &str,
    key: &str,
    value: serde_json::Value,
) -> Result<(), String> {
    let conn = crate::db::get_connection()?;

    // Determine value type and serialize
    let (value_str, value_type) = match &value {
        serde_json::Value::String(s) => (s.clone(), "string"),
        serde_json::Value::Number(_) => (value.to_string(), "number"),
        serde_json::Value::Bool(b) => (b.to_string(), "boolean"),
        serde_json::Value::Null => ("null".to_string(), "null"),
        _ => (
            serde_json::to_string(&value)
                .map_err(|e| format!("Failed to serialize value: {}", e))?,
            "json",
        ),
    };

    crate::db::plugin_data::set_plugin_data(&conn, plugin_id, key, &value_str, value_type)
        .map_err(|e| format!("Failed to set plugin data: {}", e))
}

pub fn plugin_storage_remove(plugin_id: &str, key: &str) -> Result<(), String> {
    let conn = crate::db::get_connection()?;
    crate::db::plugin_data::remove_plugin_data(&conn, plugin_id, key)
        .map_err(|e| format!("Failed to remove plugin data: {}", e))
}

pub fn plugin_storage_clear(plugin_id: &str) -> Result<(), String> {
    let conn = crate::db::get_connection()?;
    crate::db::plugin_data::clear_plugin_data(&conn, plugin_id)
        .map_err(|e| format!("Failed to clear plugin data: {}", e))
}

// Helper function to copy directories recursively
fn copy_dir_all(
    src: impl AsRef<std::path::Path>,
    dst: impl AsRef<std::path::Path>,
) -> std::io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

/// Installs a plugin from a .galeno file (zip archive)
pub fn install_plugin_from_zip(zip_path: &str) -> Result<String, String> {
    let file = fs::File::open(zip_path).map_err(|e| format!("Failed to open zip file: {}", e))?;

    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip archive: {}", e))?;

    // Extract to temp directory first
    let temp_dir = std::env::temp_dir().join(format!("galeno_plugin_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp directory: {}", e))?;

    // Extract all files
    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read file from archive: {}", e))?;

        let outpath = temp_dir.join(file.name());

        if file.is_dir() {
            fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            if let Some(p) = outpath.parent() {
                fs::create_dir_all(p)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }
            let mut outfile =
                fs::File::create(&outpath).map_err(|e| format!("Failed to create file: {}", e))?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to extract file: {}", e))?;
        }
    }

    // Read and validate manifest
    let manifest = load_plugin_manifest(&temp_dir.to_string_lossy())?;

    // Validate required files
    let entry_path = temp_dir.join(&manifest.entry);
    if !entry_path.exists() {
        fs::remove_dir_all(&temp_dir).ok();
        return Err(format!(
            "Entry file '{}' not found in plugin",
            manifest.entry
        ));
    }

    // Move to plugins directory
    let plugins_dir = get_plugins_dir()?;
    let dest_dir = plugins_dir.join(&manifest.id);

    if dest_dir.exists() {
        fs::remove_dir_all(&temp_dir).ok();
        return Err("Plugin already installed".to_string());
    }

    fs::rename(&temp_dir, &dest_dir).map_err(|e| {
        fs::remove_dir_all(&temp_dir).ok();
        format!("Failed to install plugin: {}", e)
    })?;

    // Create metadata file
    let meta = serde_json::json!({
        "enabled": true,
        "installed_at": chrono::Utc::now().to_rfc3339(),
        "source": "file",
        "granted_permissions": manifest.permissions,
    });

    let meta_path = dest_dir.join(".meta.json");
    fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap())
        .map_err(|e| format!("Failed to write metadata: {}", e))?;

    Ok(manifest.id)
}

/// Gets the asset URL for a plugin file
pub fn get_plugin_asset_url(plugin_id: &str, file_path: &str) -> Result<String, String> {
    let plugin_dir = resolve_plugin_dir(plugin_id)?;

    let file_full_path = plugin_dir.join(file_path);
    if !file_full_path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    // Return the path that will be converted by convertFileSrc on the frontend
    Ok(file_full_path.to_string_lossy().to_string())
}

// Mock store API (in production, this would fetch from a real API)
pub fn get_store_plugins() -> Result<Vec<StorePlugin>, String> {
    if let Some(catalog) = read_store_catalog()? {
        return Ok(catalog);
    }

    // Include first-party plugins
    let plugins = vec![
        StorePlugin {
            manifest: PluginManifest {
                id: "com.nuevogaleno.backup".to_string(),
                name: "Backup & Restore".to_string(),
                version: "1.0.0".to_string(),
                author: "Nuevo Galeno".to_string(),
                description: "Sistema de respaldo y restauración de datos de la clínica"
                    .to_string(),
                icon: "💾".to_string(),
                entry: "index.tsx".to_string(),
                permissions: vec![
                    "patients:read".to_string(),
                    "treatments:read".to_string(),
                    "appointments:read".to_string(),
                    "payments:read".to_string(),
                    "system:commands".to_string(),
                ],
                hooks: None,
                menu_items: Some(vec![MenuItem {
                    label: "Backup & Restore".to_string(),
                    icon: "💾".to_string(),
                    action: "openMainWindow".to_string(),
                    shortcut: None,
                }]),
                default_size: Some(WindowSize {
                    width: 800,
                    height: 600,
                }),
                allow_multiple_instances: Some(false),
                min_version: Some("1.0.0".to_string()),
                repository: None,
                homepage: None,
                api_version: "1.0.0".to_string(),
                target_version: None,
                category: Some("system".to_string()),
                developer: Some(PluginDeveloper {
                    id: Some("com.nuevogaleno".to_string()),
                    name: "Nuevo Galeno".to_string(),
                    verified: Some(true),
                }),
                signature: None,
                license: Some("Proprietary".to_string()),
            },
            downloads: 0,
            rating: 5.0,
            reviews: 0,
            verified: true,
            price: None,
            screenshots: None,
            changelog: None,
            package_path: None,
        },
        StorePlugin {
            manifest: PluginManifest {
                id: "com.nuevogaleno.analytics".to_string(),
                name: "Analytics Dashboard".to_string(),
                version: "1.0.0".to_string(),
                author: "Nuevo Galeno".to_string(),
                description: "Panel de análisis y estadísticas avanzadas de tu clínica dental"
                    .to_string(),
                icon: "📊".to_string(),
                entry: "index.tsx".to_string(),
                permissions: vec![
                    "patients:read".to_string(),
                    "treatments:read".to_string(),
                    "appointments:read".to_string(),
                    "payments:read".to_string(),
                ],
                hooks: None,
                menu_items: Some(vec![MenuItem {
                    label: "Analytics".to_string(),
                    icon: "📊".to_string(),
                    action: "openMainWindow".to_string(),
                    shortcut: None,
                }]),
                default_size: Some(WindowSize {
                    width: 1200,
                    height: 800,
                }),
                allow_multiple_instances: Some(false),
                min_version: Some("1.0.0".to_string()),
                repository: None,
                homepage: None,
                api_version: "1.0.0".to_string(),
                target_version: None,
                category: Some("analytics".to_string()),
                developer: Some(PluginDeveloper {
                    id: Some("com.nuevogaleno".to_string()),
                    name: "Nuevo Galeno".to_string(),
                    verified: Some(true),
                }),
                signature: None,
                license: Some("Proprietary".to_string()),
            },
            downloads: 0,
            rating: 5.0,
            reviews: 0,
            verified: true,
            price: None,
            screenshots: None,
            changelog: None,
            package_path: None,
        },
    ];

    // In production, fetch additional plugins from remote API
    // let remote_plugins = fetch_from_api().await?;
    // plugins.extend(remote_plugins);

    Ok(plugins)
}

pub fn install_plugin_from_store(
    plugin_id: &str,
    granted_permissions: Option<Vec<String>>,
) -> Result<(), String> {
    let store_plugins = get_store_plugins()?;
    let plugin = store_plugins
        .iter()
        .find(|p| p.manifest.id == plugin_id)
        .ok_or_else(|| format!("Plugin '{}' not found in store", plugin_id))?;

    let effective_permissions =
        normalize_granted_permissions(&plugin.manifest.permissions, granted_permissions.clone());
    let effective_permissions_for_third_party = effective_permissions.clone();

    // Check if it's a first-party plugin
    let first_party_plugins = vec!["com.nuevogaleno.backup", "com.nuevogaleno.analytics"];

    if first_party_plugins.contains(&plugin_id) {
        // First-party plugins are bundled, just mark as installed
        let plugins_dir = get_plugins_dir()?;
        let plugin_dir = plugins_dir.join(plugin_id);

        if plugin_dir.exists() {
            return Err("Plugin already installed".to_string());
        }

        // Create plugin directory
        fs::create_dir_all(&plugin_dir)
            .map_err(|e| format!("Failed to create plugin directory: {}", e))?;

        let dest_manifest = plugin_dir.join("plugin.json");

        // Always build manifest from store payload to keep schema stable.
        let manifest = plugin.manifest.clone();

        let manifest_str = serde_json::to_string_pretty(&manifest)
            .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
        fs::write(&dest_manifest, manifest_str)
            .map_err(|e| format!("Failed to write manifest: {}", e))?;

        // Create metadata
        let meta = serde_json::json!({
            "enabled": true,
            "installed_at": chrono::Utc::now().to_rfc3339(),
            "first_party": true,
            "granted_permissions": effective_permissions.clone(),
        });

        let meta_path = plugin_dir.join(".meta.json");
        fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap())
            .map_err(|e| format!("Failed to write metadata: {}", e))?;

        return Ok(());
    }

    // Offline catalog mode: install third-party from a local .galeno package path.
    let package_path = plugin.package_path.as_ref().ok_or_else(|| {
        "Store plugin package_path is required for offline installation".to_string()
    })?;

    let package_full_path = PathBuf::from(package_path);
    if !package_full_path.exists() {
        return Err(format!(
            "Store package not found: {}",
            package_full_path.to_string_lossy()
        ));
    }

    let installed_plugin_id = install_plugin_from_zip(&package_full_path.to_string_lossy())?;

    if installed_plugin_id != plugin_id {
        return Err(format!(
            "Package plugin id '{}' does not match store id '{}'",
            installed_plugin_id, plugin_id
        ));
    }

    update_plugin_permissions_metadata(plugin_id, &effective_permissions_for_third_party)?;

    Ok(())
}
