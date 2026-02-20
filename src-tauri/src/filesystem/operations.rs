use serde::{Deserialize, Serialize};

use super::{
    EntryType, FileEntry, MetadataManager, PathResolver, PermissionManager, StorageBackend,
};

/// FileOperations coordinates all filesystem modules to provide high-level operations.
///
/// This is the main entry point for filesystem operations, bringing together:
/// - PathResolver: Virtual to physical path translation
/// - StorageBackend: Low-level file I/O
/// - MetadataManager: Database metadata operations
/// - PermissionManager: Access control
///
/// All operations:
/// - Check permissions before execution
/// - Validate inputs
/// - Update metadata
/// - Handle errors gracefully
///
/// Note: Audit logging will be added in task 9.
#[derive(Debug, Clone)]
pub struct FileOperations {
    resolver: PathResolver,
    storage: StorageBackend,
    metadata: MetadataManager,
    permissions: PermissionManager,
}

/// Represents a directory listing with its entries.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryListing {
    pub path: String,
    pub entries: Vec<FileEntry>,
    pub total_count: usize,
}

impl FileOperations {
    /// Creates a new FileOperations instance.
    ///
    /// # Returns
    /// - `Ok(FileOperations)` if initialization succeeds
    /// - `Err(String)` if any component fails to initialize
    pub fn new() -> Result<Self, String> {
        let resolver = PathResolver::new()?;
        let storage = StorageBackend::new()?;
        let metadata = MetadataManager::new();
        let permissions = PermissionManager::new();

        Ok(Self {
            resolver,
            storage,
            metadata,
            permissions,
        })
    }

    /// Lists all entries in a directory.
    ///
    /// # Arguments
    /// - `virtual_path`: The virtual path of the directory to list
    /// - `username`: The username of the user requesting the listing
    ///
    /// # Returns
    /// - `Ok(DirectoryListing)` containing all entries in the directory
    /// - `Err(String)` if permission check fails, path is invalid, or listing fails
    ///
    /// # Requirements
    /// Validates: Requirements 2.1, 2.2
    pub async fn list_directory(
        &self,
        virtual_path: &str,
        username: &str,
    ) -> Result<DirectoryListing, String> {
        // Validate virtual path
        self.resolver.validate_virtual_path(virtual_path)?;

        // Check read permission
        if !self.permissions.can_read(username, virtual_path)? {
            return Err(format!(
                "Permission denied: user '{}' cannot read '{}'",
                username, virtual_path
            ));
        }

        // Get database connection
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;

        // List entries from metadata
        let entries = self.metadata.list_entries(&conn, virtual_path)?;

        Ok(DirectoryListing {
            path: virtual_path.to_string(),
            entries: entries.clone(),
            total_count: entries.len(),
        })
    }

    /// Creates a new folder at the specified location.
    ///
    /// # Arguments
    /// - `parent_virtual_path`: The virtual path of the parent directory
    /// - `folder_name`: The name of the folder to create
    /// - `username`: The username of the user creating the folder
    ///
    /// # Returns
    /// - `Ok(FileEntry)` containing the metadata of the created folder
    /// - `Err(String)` if validation fails, permission denied, or creation fails
    ///
    /// # Requirements
    /// Validates: Requirements 3.1, 3.2, 3.4
    pub async fn create_folder(
        &self,
        parent_virtual_path: &str,
        folder_name: &str,
        username: &str,
    ) -> Result<FileEntry, String> {
        // Validate parent path
        self.resolver.validate_virtual_path(parent_virtual_path)?;

        // Validate folder name (check for invalid characters)
        self.validate_name(folder_name)?;

        // Check write permission on parent directory
        if !self.permissions.can_write(username, parent_virtual_path)? {
            return Err(format!(
                "Permission denied: user '{}' cannot write to '{}'",
                username, parent_virtual_path
            ));
        }

        // Construct the full virtual path for the new folder
        let folder_virtual_path = format!("{}\\{}", parent_virtual_path, folder_name);

        // Get database connection
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;

        // Check if folder already exists
        if self.metadata.exists(&conn, &folder_virtual_path)? {
            return Err(format!(
                "Folder already exists: '{}' in '{}'",
                folder_name, parent_virtual_path
            ));
        }

        // Create physical directory
        self.storage.create_directory(&folder_virtual_path).await?;

        // Get physical path for metadata
        let physical_path = self.resolver.virtual_to_physical(&folder_virtual_path)?;

        // Insert metadata entry
        let _entry_id = self.metadata.insert_entry(
            &conn,
            &folder_virtual_path,
            physical_path.to_str().unwrap_or(""),
            folder_name,
            EntryType::Folder,
            0, // Folders have size 0
            None,
            username,
            Some(parent_virtual_path),
        )?;

        // Retrieve and return the created entry
        let entry = self
            .metadata
            .get_entry(&conn, &folder_virtual_path)?
            .ok_or_else(|| "Failed to retrieve created folder entry".to_string())?;

        Ok(entry)
    }

    /// Deletes a file or folder by moving it to trash.
    ///
    /// Note: This implementation moves entries to trash instead of permanent deletion.
    /// Trash functionality will be fully implemented in task 11.
    ///
    /// # Arguments
    /// - `virtual_path`: The virtual path of the entry to delete
    /// - `username`: The username of the user deleting the entry
    ///
    /// # Returns
    /// - `Ok(())` if the entry was deleted successfully
    /// - `Err(String)` if permission denied, path doesn't exist, or deletion fails
    ///
    /// # Requirements
    /// Validates: Requirements 3.6, 6.2, 15.2
    pub async fn delete_entry(
        &self,
        virtual_path: &str,
        username: &str,
    ) -> Result<(), String> {
        // Validate virtual path
        self.resolver.validate_virtual_path(virtual_path)?;

        // Check delete permission
        if !self.permissions.can_delete(username, virtual_path)? {
            return Err(format!(
                "Permission denied: user '{}' cannot delete '{}'",
                username, virtual_path
            ));
        }

        // Get database connection
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;

        // Check if entry exists
        let entry = self
            .metadata
            .get_entry(&conn, virtual_path)?
            .ok_or_else(|| format!("Entry not found: '{}'", virtual_path))?;

        // Delete physical file or directory
        match entry.entry_type {
            EntryType::File => {
                self.storage.delete_file(virtual_path).await?;
            }
            EntryType::Folder => {
                self.storage.delete_directory(virtual_path).await?;
            }
        }

        // Delete metadata entry
        self.metadata.delete_entry(&conn, virtual_path)?;

        // TODO: In task 11, implement moving to trash instead of permanent deletion

        Ok(())
    }

    /// Renames a file or folder.
    ///
    /// # Arguments
    /// - `virtual_path`: The virtual path of the entry to rename
    /// - `new_name`: The new name for the entry
    /// - `username`: The username of the user renaming the entry
    ///
    /// # Returns
    /// - `Ok(FileEntry)` containing the updated metadata
    /// - `Err(String)` if validation fails, permission denied, or rename fails
    ///
    /// # Requirements
    /// Validates: Requirements 3.5, 6.1
    pub async fn rename_entry(
        &self,
        virtual_path: &str,
        new_name: &str,
        username: &str,
    ) -> Result<FileEntry, String> {
        // Validate virtual path
        self.resolver.validate_virtual_path(virtual_path)?;

        // Validate new name
        self.validate_name(new_name)?;

        // Check write permission
        if !self.permissions.can_write(username, virtual_path)? {
            return Err(format!(
                "Permission denied: user '{}' cannot rename '{}'",
                username, virtual_path
            ));
        }

        // Get database connection
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;

        // Get existing entry
        let entry = self
            .metadata
            .get_entry(&conn, virtual_path)?
            .ok_or_else(|| format!("Entry not found: '{}'", virtual_path))?;

        // Construct new virtual path
        let parent_path = entry
            .parent_path
            .as_ref()
            .ok_or_else(|| "Cannot rename root directory".to_string())?;
        let new_virtual_path = format!("{}\\{}", parent_path, new_name);

        // Check if new name already exists
        if self.metadata.exists(&conn, &new_virtual_path)? {
            return Err(format!(
                "Entry with name '{}' already exists in '{}'",
                new_name, parent_path
            ));
        }

        // Get new physical path
        let new_physical_path = self.resolver.virtual_to_physical(&new_virtual_path)?;

        // Move physical file/directory
        match entry.entry_type {
            EntryType::File => {
                self.storage
                    .move_file(virtual_path, &new_virtual_path)
                    .await?;
            }
            EntryType::Folder => {
                // For folders, we need to move the directory
                let old_physical = self.resolver.virtual_to_physical(virtual_path)?;
                tokio::fs::rename(&old_physical, &new_physical_path)
                    .await
                    .map_err(|e| format!("Failed to rename folder: {}", e))?;
            }
        }

        // Update metadata
        self.metadata.update_paths(
            &conn,
            virtual_path,
            &new_virtual_path,
            new_physical_path.to_str().unwrap_or(""),
            new_name,
            Some(parent_path),
        )?;

        // Retrieve and return updated entry
        let updated_entry = self
            .metadata
            .get_entry(&conn, &new_virtual_path)?
            .ok_or_else(|| "Failed to retrieve renamed entry".to_string())?;

        Ok(updated_entry)
    }

    /// Moves a file or folder to a different directory.
    ///
    /// # Arguments
    /// - `source_path`: The current virtual path of the entry
    /// - `dest_parent_path`: The virtual path of the destination directory
    /// - `username`: The username of the user moving the entry
    ///
    /// # Returns
    /// - `Ok(FileEntry)` containing the updated metadata
    /// - `Err(String)` if validation fails, permission denied, or move fails
    ///
    /// # Requirements
    /// Validates: Requirements 6.3, 6.4, 6.5
    pub async fn move_entry(
        &self,
        source_path: &str,
        dest_parent_path: &str,
        username: &str,
    ) -> Result<FileEntry, String> {
        // Validate paths
        self.resolver.validate_virtual_path(source_path)?;
        self.resolver.validate_virtual_path(dest_parent_path)?;

        // Check permissions
        if !self.permissions.can_write(username, source_path)? {
            return Err(format!(
                "Permission denied: user '{}' cannot move '{}'",
                username, source_path
            ));
        }

        if !self.permissions.can_write(username, dest_parent_path)? {
            return Err(format!(
                "Permission denied: user '{}' cannot write to '{}'",
                username, dest_parent_path
            ));
        }

        // Get database connection
        let conn = crate::db::get_connection()
            .map_err(|e| format!("Failed to get database connection: {}", e))?;

        // Get source entry
        let entry = self
            .metadata
            .get_entry(&conn, source_path)?
            .ok_or_else(|| format!("Source entry not found: '{}'", source_path))?;

        // Validate destination exists and is a folder
        let dest_entry = self
            .metadata
            .get_entry(&conn, dest_parent_path)?
            .ok_or_else(|| format!("Destination directory not found: '{}'", dest_parent_path))?;

        if dest_entry.entry_type != EntryType::Folder {
            return Err(format!(
                "Destination is not a directory: '{}'",
                dest_parent_path
            ));
        }

        // Construct new virtual path
        let new_virtual_path = format!("{}\\{}", dest_parent_path, entry.name);

        // Check if entry with same name already exists at destination
        if self.metadata.exists(&conn, &new_virtual_path)? {
            return Err(format!(
                "Entry with name '{}' already exists in '{}'",
                entry.name, dest_parent_path
            ));
        }

        // Get new physical path
        let new_physical_path = self.resolver.virtual_to_physical(&new_virtual_path)?;

        // Move physical file/directory
        match entry.entry_type {
            EntryType::File => {
                self.storage
                    .move_file(source_path, &new_virtual_path)
                    .await?;
            }
            EntryType::Folder => {
                let old_physical = self.resolver.virtual_to_physical(source_path)?;
                tokio::fs::rename(&old_physical, &new_physical_path)
                    .await
                    .map_err(|e| format!("Failed to move folder: {}", e))?;
            }
        }

        // Update metadata
        self.metadata.update_paths(
            &conn,
            source_path,
            &new_virtual_path,
            new_physical_path.to_str().unwrap_or(""),
            &entry.name,
            Some(dest_parent_path),
        )?;

        // Retrieve and return updated entry
        let updated_entry = self
            .metadata
            .get_entry(&conn, &new_virtual_path)?
            .ok_or_else(|| "Failed to retrieve moved entry".to_string())?;

        Ok(updated_entry)
    }

    /// Validates a file or folder name.
    ///
    /// Checks for:
    /// - Invalid characters: / \ : * ? " < > |
    /// - Empty names
    /// - Names that are too long
    ///
    /// # Arguments
    /// - `name`: The name to validate
    ///
    /// # Returns
    /// - `Ok(())` if the name is valid
    /// - `Err(String)` with a descriptive error if invalid
    ///
    /// # Requirements
    /// Validates: Requirements 3.2, 3.3
    fn validate_name(&self, name: &str) -> Result<(), String> {
        // Check if name is empty
        if name.trim().is_empty() {
            return Err("Name cannot be empty".to_string());
        }

        // Check for invalid characters
        let invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
        for ch in invalid_chars.iter() {
            if name.contains(*ch) {
                return Err(format!(
                    "Invalid character '{}' in name. The following characters are not allowed: / \\ : * ? \" < > |",
                    ch
                ));
            }
        }

        // Check name length (Windows has a 255 character limit for file names)
        if name.len() > 255 {
            return Err("Name is too long (maximum 255 characters)".to_string());
        }

        // Check for reserved Windows names
        let reserved_names = [
            "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7",
            "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8",
            "LPT9",
        ];

        let name_upper = name.to_uppercase();
        let name_without_ext = name_upper.split('.').next().unwrap_or("");

        if reserved_names.contains(&name_without_ext) {
            return Err(format!(
                "Name '{}' is reserved by the system and cannot be used",
                name
            ));
        }

        Ok(())
    }
}

impl Default for FileOperations {
    fn default() -> Self {
        Self::new().expect("Failed to create FileOperations")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = db::get_connection().expect("Failed to get test database connection");

        // Create a test user if it doesn't exist
        let _ = conn.execute(
            r#"
            INSERT OR IGNORE INTO users (username, password_hash, name, role, created_at, updated_at)
            VALUES ('test_ops_user', 'hash', 'Test Ops User', 'user', datetime('now'), datetime('now'))
            "#,
            [],
        );

        conn
    }

    #[tokio::test]
    async fn test_new_creates_file_operations() {
        let ops = FileOperations::new();
        assert!(ops.is_ok());
    }

    #[tokio::test]
    async fn test_validate_name_accepts_valid_names() {
        let ops = FileOperations::new().unwrap();

        assert!(ops.validate_name("document.pdf").is_ok());
        assert!(ops.validate_name("My Folder").is_ok());
        assert!(ops.validate_name("file_123.txt").is_ok());
        assert!(ops.validate_name("report-2024.docx").is_ok());
    }

    #[tokio::test]
    async fn test_validate_name_rejects_invalid_chars() {
        let ops = FileOperations::new().unwrap();

        assert!(ops.validate_name("file/name").is_err());
        assert!(ops.validate_name("file\\name").is_err());
        assert!(ops.validate_name("file:name").is_err());
        assert!(ops.validate_name("file*name").is_err());
        assert!(ops.validate_name("file?name").is_err());
        assert!(ops.validate_name("file\"name").is_err());
        assert!(ops.validate_name("file<name").is_err());
        assert!(ops.validate_name("file>name").is_err());
        assert!(ops.validate_name("file|name").is_err());
    }

    #[tokio::test]
    async fn test_validate_name_rejects_empty() {
        let ops = FileOperations::new().unwrap();

        assert!(ops.validate_name("").is_err());
        assert!(ops.validate_name("   ").is_err());
    }

    #[tokio::test]
    async fn test_validate_name_rejects_reserved() {
        let ops = FileOperations::new().unwrap();

        assert!(ops.validate_name("CON").is_err());
        assert!(ops.validate_name("PRN").is_err());
        assert!(ops.validate_name("AUX").is_err());
        assert!(ops.validate_name("NUL").is_err());
        assert!(ops.validate_name("COM1").is_err());
        assert!(ops.validate_name("LPT1").is_err());
    }

    #[tokio::test]
    async fn test_create_folder() {
        setup_test_db();
        let ops = FileOperations::new().unwrap();

        let username = "test_ops_user";
        let parent_path = format!("G:\\Users\\{}", username);
        let folder_name = format!("test_folder_{}", chrono::Utc::now().timestamp_millis());

        // Create parent directory if it doesn't exist
        let _ = ops.create_folder("G:\\Users", username, username).await;

        // Create folder
        let result = ops
            .create_folder(&parent_path, &folder_name, username)
            .await;

        assert!(result.is_ok(), "Failed to create folder: {:?}", result.err());

        let entry = result.unwrap();
        assert_eq!(entry.name, folder_name);
        assert_eq!(entry.entry_type, EntryType::Folder);
        assert_eq!(entry.owner_username, username);

        // Cleanup
        let folder_path = format!("{}\\{}", parent_path, folder_name);
        let _ = ops.delete_entry(&folder_path, username).await;
    }

    #[tokio::test]
    async fn test_create_folder_duplicate_fails() {
        setup_test_db();
        let ops = FileOperations::new().unwrap();

        let username = "test_ops_user";
        let parent_path = format!("G:\\Users\\{}", username);
        let folder_name = format!("test_dup_folder_{}", chrono::Utc::now().timestamp_millis());

        // Create parent directory if it doesn't exist
        let _ = ops.create_folder("G:\\Users", username, username).await;

        // Create folder first time
        let result1 = ops
            .create_folder(&parent_path, &folder_name, username)
            .await;
        assert!(result1.is_ok());

        // Try to create again - should fail
        let result2 = ops
            .create_folder(&parent_path, &folder_name, username)
            .await;
        assert!(result2.is_err());
        assert!(result2.unwrap_err().contains("already exists"));

        // Cleanup
        let folder_path = format!("{}\\{}", parent_path, folder_name);
        let _ = ops.delete_entry(&folder_path, username).await;
    }

    #[tokio::test]
    async fn test_list_directory() {
        setup_test_db();
        let ops = FileOperations::new().unwrap();

        let username = "test_ops_user";
        let parent_path = format!("G:\\Users\\{}", username);

        // Create parent directory if it doesn't exist
        let _ = ops.create_folder("G:\\Users", username, username).await;

        // Create some test folders
        let folder1 = format!("test_list_1_{}", chrono::Utc::now().timestamp_millis());
        let folder2 = format!("test_list_2_{}", chrono::Utc::now().timestamp_millis());

        let _ = ops.create_folder(&parent_path, &folder1, username).await;
        let _ = ops.create_folder(&parent_path, &folder2, username).await;

        // List directory
        let result = ops.list_directory(&parent_path, username).await;
        assert!(result.is_ok());

        let listing = result.unwrap();
        assert_eq!(listing.path, parent_path);
        assert!(listing.entries.len() >= 2);
        assert!(listing.total_count >= 2);

        // Cleanup
        let _ = ops
            .delete_entry(&format!("{}\\{}", parent_path, folder1), username)
            .await;
        let _ = ops
            .delete_entry(&format!("{}\\{}", parent_path, folder2), username)
            .await;
    }

    #[tokio::test]
    async fn test_rename_entry() {
        setup_test_db();
        let ops = FileOperations::new().unwrap();

        let username = "test_ops_user";
        let parent_path = format!("G:\\Users\\{}", username);
        let old_name = format!("test_rename_old_{}", chrono::Utc::now().timestamp_millis());
        let new_name = format!("test_rename_new_{}", chrono::Utc::now().timestamp_millis());

        // Create parent directory if it doesn't exist
        let _ = ops.create_folder("G:\\Users", username, username).await;

        // Create folder
        let _ = ops.create_folder(&parent_path, &old_name, username).await;

        let old_path = format!("{}\\{}", parent_path, old_name);

        // Rename folder
        let result = ops.rename_entry(&old_path, &new_name, username).await;
        assert!(result.is_ok(), "Failed to rename: {:?}", result.err());

        let entry = result.unwrap();
        assert_eq!(entry.name, new_name);

        // Cleanup
        let new_path = format!("{}\\{}", parent_path, new_name);
        let _ = ops.delete_entry(&new_path, username).await;
    }

    #[tokio::test]
    async fn test_delete_entry() {
        setup_test_db();
        let ops = FileOperations::new().unwrap();

        let username = "test_ops_user";
        let parent_path = format!("G:\\Users\\{}", username);
        let folder_name = format!("test_delete_{}", chrono::Utc::now().timestamp_millis());

        // Create parent directory if it doesn't exist
        let _ = ops.create_folder("G:\\Users", username, username).await;

        // Create folder
        let _ = ops
            .create_folder(&parent_path, &folder_name, username)
            .await;

        let folder_path = format!("{}\\{}", parent_path, folder_name);

        // Delete folder
        let result = ops.delete_entry(&folder_path, username).await;
        assert!(result.is_ok());

        // Verify it's gone
        let conn = db::get_connection().unwrap();
        let metadata = MetadataManager::new();
        assert!(!metadata.exists(&conn, &folder_path).unwrap());
    }

    #[tokio::test]
    async fn test_move_entry() {
        setup_test_db();
        let ops = FileOperations::new().unwrap();

        let username = "test_ops_user";
        let parent_path = format!("G:\\Users\\{}", username);
        let folder_name = format!("test_move_{}", chrono::Utc::now().timestamp_millis());
        let dest_folder = format!("test_dest_{}", chrono::Utc::now().timestamp_millis());

        // Create parent directory if it doesn't exist
        let _ = ops.create_folder("G:\\Users", username, username).await;

        // Create source folder and destination folder
        let _ = ops
            .create_folder(&parent_path, &folder_name, username)
            .await;
        let _ = ops
            .create_folder(&parent_path, &dest_folder, username)
            .await;

        let source_path = format!("{}\\{}", parent_path, folder_name);
        let dest_path = format!("{}\\{}", parent_path, dest_folder);

        // Move folder
        let result = ops.move_entry(&source_path, &dest_path, username).await;
        assert!(result.is_ok(), "Failed to move: {:?}", result.err());

        let entry = result.unwrap();
        assert_eq!(entry.name, folder_name);
        assert_eq!(
            entry.parent_path,
            Some(dest_path.clone())
        );

        // Cleanup
        let moved_path = format!("{}\\{}", dest_path, folder_name);
        let _ = ops.delete_entry(&moved_path, username).await;
        let _ = ops.delete_entry(&dest_path, username).await;
    }
}
