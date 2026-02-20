use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

/// PermissionManager handles access control for the filesystem.
/// 
/// This component provides:
/// - User-based access control
/// - Permission checking (read, write, delete)
/// - User folder isolation
/// - Shared folder management
/// 
/// Default behavior:
/// - Users have full access to G:\Users\{username}
/// - Users have no access to other users' folders
/// - Shared folders can be configured via grant_access()
#[derive(Debug, Clone)]
pub struct PermissionManager;

/// Represents the permissions a user has for a specific path.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilePermissions {
    pub can_read: bool,
    pub can_write: bool,
    pub can_delete: bool,
}

impl PermissionManager {
    /// Creates a new PermissionManager instance.
    pub fn new() -> Self {
        Self
    }
    
    /// Checks if a user can access a given virtual path.
    /// 
    /// Access rules:
    /// 1. Admin users have full access to all paths
    /// 2. Users have full access to their own folder (G:\Users\{username})
    /// 3. Users have no access to other users' folders by default
    /// 4. Shared folders can be accessed if explicit permissions exist
    /// 
    /// # Arguments
    /// - `username`: The username to check permissions for
    /// - `virtual_path`: The virtual path to check access to
    /// 
    /// # Returns
    /// - `Ok(bool)` - true if the user can access the path, false otherwise
    /// - `Err(String)` if the check fails
    /// 
    /// # Requirements
    /// Validates: Requirements 9.3, 9.4, 9.5
    pub fn can_access(&self, username: &str, virtual_path: &str) -> Result<bool, String> {
        // Check if user is admin
        if self.is_admin(username)? {
            return Ok(true);
        }
        
        // Check if this is the user's own folder
        let user_root = self.get_user_root(username);
        if virtual_path.starts_with(&user_root) {
            return Ok(true);
        }
        
        // Check if this is a shared path with explicit permissions
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;
        
        self.check_explicit_permission(&conn, username, virtual_path, "read")
    }
    
    /// Checks if a user can read from a given virtual path.
    /// 
    /// # Arguments
    /// - `username`: The username to check permissions for
    /// - `virtual_path`: The virtual path to check read access to
    /// 
    /// # Returns
    /// - `Ok(bool)` - true if the user can read from the path, false otherwise
    /// - `Err(String)` if the check fails
    /// 
    /// # Requirements
    /// Validates: Requirements 9.4, 9.5
    pub fn can_read(&self, username: &str, virtual_path: &str) -> Result<bool, String> {
        // Check if user is admin
        if self.is_admin(username)? {
            return Ok(true);
        }
        
        // Check if this is the user's own folder
        let user_root = self.get_user_root(username);
        if virtual_path.starts_with(&user_root) {
            return Ok(true);
        }
        
        // Check if this is a shared path with explicit read permissions
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;
        
        self.check_explicit_permission(&conn, username, virtual_path, "read")
    }
    
    /// Checks if a user can write to a given virtual path.
    /// 
    /// # Arguments
    /// - `username`: The username to check permissions for
    /// - `virtual_path`: The virtual path to check write access to
    /// 
    /// # Returns
    /// - `Ok(bool)` - true if the user can write to the path, false otherwise
    /// - `Err(String)` if the check fails
    /// 
    /// # Requirements
    /// Validates: Requirements 9.4, 9.5
    pub fn can_write(&self, username: &str, virtual_path: &str) -> Result<bool, String> {
        // Check if user is admin
        if self.is_admin(username)? {
            return Ok(true);
        }
        
        // Check if this is the user's own folder
        let user_root = self.get_user_root(username);
        if virtual_path.starts_with(&user_root) {
            return Ok(true);
        }
        
        // Check if this is a shared path with explicit write permissions
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;
        
        self.check_explicit_permission(&conn, username, virtual_path, "write")
    }
    
    /// Checks if a user can delete a given virtual path.
    /// 
    /// # Arguments
    /// - `username`: The username to check permissions for
    /// - `virtual_path`: The virtual path to check delete access to
    /// 
    /// # Returns
    /// - `Ok(bool)` - true if the user can delete the path, false otherwise
    /// - `Err(String)` if the check fails
    /// 
    /// # Requirements
    /// Validates: Requirements 9.4, 9.5
    pub fn can_delete(&self, username: &str, virtual_path: &str) -> Result<bool, String> {
        // Check if user is admin
        if self.is_admin(username)? {
            return Ok(true);
        }
        
        // Check if this is the user's own folder
        let user_root = self.get_user_root(username);
        if virtual_path.starts_with(&user_root) {
            return Ok(true);
        }
        
        // Check if this is a shared path with explicit delete permissions
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;
        
        self.check_explicit_permission(&conn, username, virtual_path, "delete")
    }
    
    /// Returns the virtual path to a user's root folder.
    /// 
    /// # Arguments
    /// - `username`: The username to get the root folder for
    /// 
    /// # Returns
    /// The virtual path to the user's folder (e.g., "G:\Users\dr_smith")
    /// 
    /// # Requirements
    /// Validates: Requirements 9.1, 9.2
    pub fn get_user_root(&self, username: &str) -> String {
        format!("G:\\Users\\{}", username)
    }
    
    /// Checks if a user has admin role.
    /// 
    /// # Arguments
    /// - `username`: The username to check
    /// 
    /// # Returns
    /// - `Ok(bool)` - true if the user is an admin, false otherwise
    /// - `Err(String)` if the check fails
    fn is_admin(&self, username: &str) -> Result<bool, String> {
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;
        
        let mut stmt = conn
            .prepare("SELECT role FROM users WHERE username = ?1")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        
        let result = stmt.query_row(params![username], |row| {
            let role: String = row.get(0)?;
            Ok(role == "admin")
        });
        
        match result {
            Ok(is_admin) => Ok(is_admin),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(false),
            Err(e) => Err(format!("Failed to check admin status: {}", e)),
        }
    }
    
    /// Checks if a virtual path is in a shared directory.
    /// 
    /// A path is considered shared if:
    /// 1. It's not in any user's personal folder (G:\Users\{username})
    /// 2. OR it has explicit permissions granted to other users
    /// 
    /// # Arguments
    /// - `virtual_path`: The virtual path to check
    /// 
    /// # Returns
    /// - `Ok(bool)` - true if the path is in a shared directory, false otherwise
    /// - `Err(String)` if the check fails
    /// 
    /// # Requirements
    /// Validates: Requirements 9.5, 9.6
    pub fn is_shared_path(&self, virtual_path: &str) -> Result<bool, String> {
        // Check if the path is in the Users directory
        if virtual_path.starts_with("G:\\Users\\") || virtual_path.starts_with("GALENO:\\Users\\") {
            // Extract the username from the path
            let parts: Vec<&str> = virtual_path.split('\\').collect();
            if parts.len() >= 3 {
                // This is a user's personal folder, not shared
                return Ok(false);
            }
        }
        
        // Check if there are any explicit permissions for this path
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;
        
        let mut stmt = conn
            .prepare("SELECT COUNT(*) FROM filesystem_permissions WHERE virtual_path = ?1")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        
        let count: i64 = stmt
            .query_row(params![virtual_path], |row| row.get(0))
            .map_err(|e| format!("Failed to check shared path: {}", e))?;
        
        Ok(count > 0)
    }
    
    /// Grants access permissions to a user for a specific virtual path.
    /// 
    /// This creates or updates an entry in the filesystem_permissions table.
    /// 
    /// # Arguments
    /// - `username`: The username to grant permissions to
    /// - `virtual_path`: The virtual path to grant access to
    /// - `permissions`: The permissions to grant (read, write, delete)
    /// 
    /// # Returns
    /// - `Ok(())` if the permissions were granted successfully
    /// - `Err(String)` if the operation fails
    /// 
    /// # Requirements
    /// Validates: Requirements 9.5, 9.6
    pub fn grant_access(
        &self,
        username: &str,
        virtual_path: &str,
        permissions: FilePermissions,
    ) -> Result<(), String> {
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;
        
        let now = chrono::Utc::now().to_rfc3339();
        
        // Use INSERT OR REPLACE to handle both new grants and updates
        conn.execute(
            r#"
            INSERT OR REPLACE INTO filesystem_permissions (
                virtual_path, username, can_read, can_write, can_delete, 
                granted_at, granted_by
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                virtual_path,
                username,
                permissions.can_read,
                permissions.can_write,
                permissions.can_delete,
                now,
                "system", // TODO: Get current admin user from session
            ],
        )
        .map_err(|e| format!("Failed to grant access: {}", e))?;
        
        Ok(())
    }
    
    /// Revokes access permissions for a user on a specific virtual path.
    /// 
    /// # Arguments
    /// - `username`: The username to revoke permissions from
    /// - `virtual_path`: The virtual path to revoke access to
    /// 
    /// # Returns
    /// - `Ok(())` if the permissions were revoked successfully
    /// - `Err(String)` if the operation fails
    pub fn revoke_access(&self, username: &str, virtual_path: &str) -> Result<(), String> {
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;
        
        conn.execute(
            "DELETE FROM filesystem_permissions WHERE username = ?1 AND virtual_path = ?2",
            params![username, virtual_path],
        )
        .map_err(|e| format!("Failed to revoke access: {}", e))?;
        
        Ok(())
    }
    
    /// Gets the permissions a user has for a specific virtual path.
    /// 
    /// # Arguments
    /// - `username`: The username to get permissions for
    /// - `virtual_path`: The virtual path to check
    /// 
    /// # Returns
    /// - `Ok(FilePermissions)` containing the user's permissions
    /// - `Err(String)` if the operation fails
    pub fn get_permissions(
        &self,
        username: &str,
        virtual_path: &str,
    ) -> Result<FilePermissions, String> {
        // Check if user is admin - admins have full permissions everywhere
        if self.is_admin(username)? {
            return Ok(FilePermissions {
                can_read: true,
                can_write: true,
                can_delete: true,
            });
        }
        
        // Check if this is the user's own folder
        let user_root = self.get_user_root(username);
        if virtual_path.starts_with(&user_root) {
            return Ok(FilePermissions {
                can_read: true,
                can_write: true,
                can_delete: true,
            });
        }
        
        // Check explicit permissions
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;
        
        let mut stmt = conn
            .prepare(
                r#"
                SELECT can_read, can_write, can_delete
                FROM filesystem_permissions
                WHERE username = ?1 AND virtual_path = ?2
                "#,
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        
        let result = stmt.query_row(params![username, virtual_path], |row| {
            Ok(FilePermissions {
                can_read: row.get(0)?,
                can_write: row.get(1)?,
                can_delete: row.get(2)?,
            })
        });
        
        match result {
            Ok(permissions) => Ok(permissions),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                // No explicit permissions, return no access
                Ok(FilePermissions {
                    can_read: false,
                    can_write: false,
                    can_delete: false,
                })
            }
            Err(e) => Err(format!("Failed to get permissions: {}", e)),
        }
    }
    
    /// Helper function to check explicit permissions in the database.
    /// 
    /// # Arguments
    /// - `conn`: Database connection
    /// - `username`: The username to check
    /// - `virtual_path`: The virtual path to check
    /// - `permission_type`: The type of permission to check ("read", "write", or "delete")
    /// 
    /// # Returns
    /// - `Ok(bool)` - true if the user has the specified permission, false otherwise
    /// - `Err(String)` if the check fails
    fn check_explicit_permission(
        &self,
        conn: &Connection,
        username: &str,
        virtual_path: &str,
        permission_type: &str,
    ) -> Result<bool, String> {
        let column = match permission_type {
            "read" => "can_read",
            "write" => "can_write",
            "delete" => "can_delete",
            _ => return Err(format!("Invalid permission type: {}", permission_type)),
        };
        
        let query = format!(
            "SELECT {} FROM filesystem_permissions WHERE username = ?1 AND virtual_path = ?2",
            column
        );
        
        let mut stmt = conn
            .prepare(&query)
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        
        let result = stmt.query_row(params![username, virtual_path], |row| row.get::<_, bool>(0));
        
        match result {
            Ok(has_permission) => Ok(has_permission),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(false),
            Err(e) => Err(format!("Failed to check permission: {}", e)),
        }
    }
}

impl Default for PermissionManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    
    fn setup_test_db() -> Connection {
        let conn = db::get_connection().expect("Failed to get test database connection");
        
        // Create test users if they don't exist
        let _ = conn.execute(
            r#"
            INSERT OR IGNORE INTO users (username, password_hash, name, role, created_at, updated_at)
            VALUES ('test_user1', 'hash', 'Test User 1', 'user', datetime('now'), datetime('now'))
            "#,
            [],
        );
        
        let _ = conn.execute(
            r#"
            INSERT OR IGNORE INTO users (username, password_hash, name, role, created_at, updated_at)
            VALUES ('test_user2', 'hash', 'Test User 2', 'user', datetime('now'), datetime('now'))
            "#,
            [],
        );
        
        conn
    }
    
    #[test]
    fn test_get_user_root() {
        let manager = PermissionManager::new();
        
        assert_eq!(manager.get_user_root("dr_smith"), "G:\\Users\\dr_smith");
        assert_eq!(manager.get_user_root("admin"), "G:\\Users\\admin");
    }
    
    #[test]
    fn test_can_access_own_folder() {
        let manager = PermissionManager::new();
        
        // User should have access to their own folder
        let result = manager.can_access("test_user1", "G:\\Users\\test_user1\\documents");
        assert!(result.is_ok());
        assert!(result.unwrap());
        
        // User should have access to root of their folder
        let result = manager.can_access("test_user1", "G:\\Users\\test_user1");
        assert!(result.is_ok());
        assert!(result.unwrap());
    }
    
    #[test]
    fn test_cannot_access_other_user_folder() {
        let manager = PermissionManager::new();
        
        // User should NOT have access to another user's folder
        let result = manager.can_access("test_user1", "G:\\Users\\test_user2\\documents");
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }
    
    #[test]
    fn test_can_read_own_folder() {
        let manager = PermissionManager::new();
        
        let result = manager.can_read("test_user1", "G:\\Users\\test_user1\\file.txt");
        assert!(result.is_ok());
        assert!(result.unwrap());
    }
    
    #[test]
    fn test_can_write_own_folder() {
        let manager = PermissionManager::new();
        
        let result = manager.can_write("test_user1", "G:\\Users\\test_user1\\file.txt");
        assert!(result.is_ok());
        assert!(result.unwrap());
    }
    
    #[test]
    fn test_can_delete_own_folder() {
        let manager = PermissionManager::new();
        
        let result = manager.can_delete("test_user1", "G:\\Users\\test_user1\\file.txt");
        assert!(result.is_ok());
        assert!(result.unwrap());
    }
    
    #[test]
    fn test_grant_and_check_access() {
        setup_test_db();
        let manager = PermissionManager::new();
        
        let shared_path = "G:\\Shared\\documents";
        
        // Initially, test_user1 should not have access
        let result = manager.can_access("test_user1", shared_path);
        assert!(result.is_ok());
        assert!(!result.unwrap());
        
        // Grant read access
        let permissions = FilePermissions {
            can_read: true,
            can_write: false,
            can_delete: false,
        };
        
        let grant_result = manager.grant_access("test_user1", shared_path, permissions);
        assert!(grant_result.is_ok());
        
        // Now test_user1 should have read access
        let result = manager.can_read("test_user1", shared_path);
        assert!(result.is_ok());
        assert!(result.unwrap());
        
        // But not write access
        let result = manager.can_write("test_user1", shared_path);
        assert!(result.is_ok());
        assert!(!result.unwrap());
        
        // Cleanup
        let _ = manager.revoke_access("test_user1", shared_path);
    }
    
    #[test]
    fn test_get_permissions() {
        setup_test_db();
        let manager = PermissionManager::new();
        
        // Test own folder - should have full permissions
        let result = manager.get_permissions("test_user1", "G:\\Users\\test_user1\\file.txt");
        assert!(result.is_ok());
        
        let permissions = result.unwrap();
        assert!(permissions.can_read);
        assert!(permissions.can_write);
        assert!(permissions.can_delete);
        
        // Test other user's folder - should have no permissions
        let result = manager.get_permissions("test_user1", "G:\\Users\\test_user2\\file.txt");
        assert!(result.is_ok());
        
        let permissions = result.unwrap();
        assert!(!permissions.can_read);
        assert!(!permissions.can_write);
        assert!(!permissions.can_delete);
    }
    
    #[test]
    fn test_is_shared_path() {
        setup_test_db();
        let manager = PermissionManager::new();
        
        // User folder should not be shared
        let result = manager.is_shared_path("G:\\Users\\test_user1\\documents");
        assert!(result.is_ok());
        assert!(!result.unwrap());
        
        // Grant permissions to make a path shared
        let shared_path = "G:\\Shared\\public";
        let permissions = FilePermissions {
            can_read: true,
            can_write: false,
            can_delete: false,
        };
        
        manager.grant_access("test_user1", shared_path, permissions).unwrap();
        
        // Now it should be considered shared
        let result = manager.is_shared_path(shared_path);
        assert!(result.is_ok());
        assert!(result.unwrap());
        
        // Cleanup
        let _ = manager.revoke_access("test_user1", shared_path);
    }
    
    #[test]
    fn test_revoke_access() {
        setup_test_db();
        let manager = PermissionManager::new();
        
        let shared_path = "G:\\Shared\\temp";
        
        // Grant access
        let permissions = FilePermissions {
            can_read: true,
            can_write: true,
            can_delete: true,
        };
        
        manager.grant_access("test_user1", shared_path, permissions).unwrap();
        
        // Verify access
        assert!(manager.can_read("test_user1", shared_path).unwrap());
        
        // Revoke access
        let result = manager.revoke_access("test_user1", shared_path);
        assert!(result.is_ok());
        
        // Verify no access
        assert!(!manager.can_read("test_user1", shared_path).unwrap());
    }
    
    #[test]
    fn test_update_permissions() {
        setup_test_db();
        let manager = PermissionManager::new();
        
        let shared_path = "G:\\Shared\\update_test";
        
        // Grant read-only access
        let permissions = FilePermissions {
            can_read: true,
            can_write: false,
            can_delete: false,
        };
        
        manager.grant_access("test_user1", shared_path, permissions).unwrap();
        
        // Verify read-only
        assert!(manager.can_read("test_user1", shared_path).unwrap());
        assert!(!manager.can_write("test_user1", shared_path).unwrap());
        
        // Update to full access
        let permissions = FilePermissions {
            can_read: true,
            can_write: true,
            can_delete: true,
        };
        
        manager.grant_access("test_user1", shared_path, permissions).unwrap();
        
        // Verify full access
        assert!(manager.can_read("test_user1", shared_path).unwrap());
        assert!(manager.can_write("test_user1", shared_path).unwrap());
        assert!(manager.can_delete("test_user1", shared_path).unwrap());
        
        // Cleanup
        let _ = manager.revoke_access("test_user1", shared_path);
    }
}
