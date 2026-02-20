// Filesystem module for Galeno
//
// This module implements a virtual filesystem with the following components:
// - PathResolver: Translates virtual paths (G:\) to physical paths
// - StorageBackend: Low-level async file I/O operations
// - MetadataManager: Database operations for file/folder metadata
// - PermissionManager: Access control and user isolation
// - FileOperations: High-level operations coordinating all components
// - Commands: Tauri command handlers for frontend integration

mod path_resolver;
mod storage;
mod metadata;
mod permissions;
mod operations;
pub mod commands;

// Re-export main types
pub use path_resolver::PathResolver;
pub use storage::StorageBackend;
pub use metadata::{MetadataManager, FileEntry, EntryType};
pub use permissions::PermissionManager;
pub use operations::{FileOperations, DirectoryListing};
pub use commands::FilesystemState;

/// Initializes the filesystem module.
///
/// This should be called on application startup to:
/// - Create the galeno_files directory if it doesn't exist
/// - Initialize the filesystem state
/// - Ensure system user exists for initialization tasks
///
/// # Returns
/// - `Ok(FilesystemState)` if initialization succeeds
/// - `Err(String)` if initialization fails
pub fn initialize() -> Result<FilesystemState, String> {
    // Ensure system user exists for initialization tasks
    ensure_system_user()?;
    
    // Create the filesystem state
    let state = FilesystemState::new()?;
    
    // Ensure the galeno_files directory exists
    let resolver = PathResolver::new()?;
    let root_physical = resolver.virtual_to_physical("G:\\")?;
    
    std::fs::create_dir_all(&root_physical)
        .map_err(|e| format!("Failed to create galeno_files directory: {}", e))?;
    
    // Create Users directory
    let users_physical = resolver.virtual_to_physical("G:\\Users")?;
    std::fs::create_dir_all(&users_physical)
        .map_err(|e| format!("Failed to create Users directory: {}", e))?;
    
    Ok(state)
}

/// Ensures the system user exists in the database.
/// This user is used for initialization tasks and system operations.
fn ensure_system_user() -> Result<(), String> {
    let conn = crate::db::get_connection()
        .map_err(|e| format!("Failed to get database connection: {}", e))?;
    
    // Check if system user exists
    let exists: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM users WHERE username = 'system'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check system user: {}", e))?;
    
    if !exists {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            r#"
            INSERT INTO users (username, password_hash, name, role, created_at, updated_at, active)
            VALUES ('system', '', 'System User', 'admin', ?1, ?2, 1)
            "#,
            rusqlite::params![now, now],
        )
        .map_err(|e| format!("Failed to create system user: {}", e))?;
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_initialize() {
        let result = initialize();
        assert!(result.is_ok(), "Failed to initialize filesystem: {:?}", result.err());
    }
}
