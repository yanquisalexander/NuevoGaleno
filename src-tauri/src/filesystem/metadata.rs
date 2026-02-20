use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

/// MetadataManager handles all database operations for file and folder metadata.
/// 
/// This component provides:
/// - CRUD operations for filesystem metadata
/// - Directory listing functionality
/// - Recursive folder size calculation
/// - Timestamp management for creation and modification
/// 
/// All operations interact with the filesystem_metadata table in SQLite.
#[derive(Debug, Clone)]
pub struct MetadataManager;

/// Represents a file or folder entry in the filesystem.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub id: i64,
    pub virtual_path: String,
    pub physical_path: String,
    pub name: String,
    pub entry_type: EntryType,
    pub size: i64,
    pub mime_type: Option<String>,
    pub owner_username: String,
    pub created_at: String,
    pub modified_at: String,
    pub parent_path: Option<String>,
}

/// Type of filesystem entry.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum EntryType {
    File,
    Folder,
}

impl EntryType {
    /// Converts EntryType to database string representation.
    pub fn to_db_string(&self) -> &str {
        match self {
            EntryType::File => "file",
            EntryType::Folder => "folder",
        }
    }
    
    /// Parses EntryType from database string.
    pub fn from_db_string(s: &str) -> Result<Self, String> {
        match s {
            "file" => Ok(EntryType::File),
            "folder" => Ok(EntryType::Folder),
            _ => Err(format!("Invalid entry type: {}", s)),
        }
    }
}

impl MetadataManager {
    /// Creates a new MetadataManager instance.
    pub fn new() -> Self {
        Self
    }
    
    /// Inserts a new file or folder entry into the metadata table.
    /// 
    /// # Arguments
    /// - `conn`: Database connection
    /// - `virtual_path`: The virtual path (e.g., "G:\Users\dr_smith\file.pdf")
    /// - `physical_path`: The physical path on disk
    /// - `name`: The file or folder name
    /// - `entry_type`: Whether this is a file or folder
    /// - `size`: Size in bytes (0 for folders)
    /// - `mime_type`: MIME type for files (None for folders)
    /// - `owner_username`: Username of the owner
    /// - `parent_path`: Virtual path of the parent directory (None for root)
    /// 
    /// # Returns
    /// - `Ok(i64)` containing the ID of the inserted entry
    /// - `Err(String)` if the insertion fails
    /// 
    /// # Requirements
    /// Validates: Requirements 7.1, 7.5
    pub fn insert_entry(
        &self,
        conn: &Connection,
        virtual_path: &str,
        physical_path: &str,
        name: &str,
        entry_type: EntryType,
        size: i64,
        mime_type: Option<&str>,
        owner_username: &str,
        parent_path: Option<&str>,
    ) -> Result<i64, String> {
        let now = chrono::Utc::now().to_rfc3339();
        
        conn.execute(
            r#"
            INSERT INTO filesystem_metadata (
                virtual_path, physical_path, name, entry_type, size, 
                mime_type, owner_username, created_at, modified_at, parent_path
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            "#,
            params![
                virtual_path,
                physical_path,
                name,
                entry_type.to_db_string(),
                size,
                mime_type,
                owner_username,
                now,
                now,
                parent_path,
            ],
        )
        .map_err(|e| format!("Failed to insert metadata entry: {}", e))?;
        
        let id = conn.last_insert_rowid();
        Ok(id)
    }
    
    /// Retrieves a file or folder entry by its virtual path.
    /// 
    /// # Arguments
    /// - `conn`: Database connection
    /// - `virtual_path`: The virtual path to look up
    /// 
    /// # Returns
    /// - `Ok(Some(FileEntry))` if the entry exists
    /// - `Ok(None)` if the entry doesn't exist
    /// - `Err(String)` if the query fails
    /// 
    /// # Requirements
    /// Validates: Requirements 7.1, 7.2
    pub fn get_entry(
        &self,
        conn: &Connection,
        virtual_path: &str,
    ) -> Result<Option<FileEntry>, String> {
        let mut stmt = conn
            .prepare(
                r#"
                SELECT id, virtual_path, physical_path, name, entry_type, size, 
                       mime_type, owner_username, created_at, modified_at, parent_path
                FROM filesystem_metadata
                WHERE virtual_path = ?1
                "#,
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        
        let result = stmt
            .query_row(params![virtual_path], |row| {
                let entry_type_str: String = row.get(4)?;
                let entry_type = EntryType::from_db_string(&entry_type_str)
                    .map_err(|e| rusqlite::Error::InvalidQuery)?;
                
                Ok(FileEntry {
                    id: row.get(0)?,
                    virtual_path: row.get(1)?,
                    physical_path: row.get(2)?,
                    name: row.get(3)?,
                    entry_type,
                    size: row.get(5)?,
                    mime_type: row.get(6)?,
                    owner_username: row.get(7)?,
                    created_at: row.get(8)?,
                    modified_at: row.get(9)?,
                    parent_path: row.get(10)?,
                })
            });
        
        match result {
            Ok(entry) => Ok(Some(entry)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(format!("Failed to get entry: {}", e)),
        }
    }
    
    /// Updates an existing entry's metadata.
    /// 
    /// Currently supports updating:
    /// - name: The file or folder name
    /// - modified_at: Automatically set to current timestamp
    /// 
    /// # Arguments
    /// - `conn`: Database connection
    /// - `virtual_path`: The virtual path of the entry to update
    /// - `new_name`: The new name for the entry
    /// 
    /// # Returns
    /// - `Ok(())` if the update succeeds
    /// - `Err(String)` if the update fails or entry doesn't exist
    /// 
    /// # Requirements
    /// Validates: Requirements 7.6
    pub fn update_entry(
        &self,
        conn: &Connection,
        virtual_path: &str,
        new_name: &str,
    ) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();
        
        let rows_affected = conn
            .execute(
                r#"
                UPDATE filesystem_metadata
                SET name = ?1, modified_at = ?2
                WHERE virtual_path = ?3
                "#,
                params![new_name, now, virtual_path],
            )
            .map_err(|e| format!("Failed to update entry: {}", e))?;
        
        if rows_affected == 0 {
            return Err(format!("Entry not found: '{}'", virtual_path));
        }
        
        Ok(())
    }
    
    /// Updates the size of a file entry.
    /// 
    /// # Arguments
    /// - `conn`: Database connection
    /// - `virtual_path`: The virtual path of the file
    /// - `new_size`: The new size in bytes
    /// 
    /// # Returns
    /// - `Ok(())` if the update succeeds
    /// - `Err(String)` if the update fails or entry doesn't exist
    /// 
    /// # Requirements
    /// Validates: Requirements 7.1, 7.6
    pub fn update_size(
        &self,
        conn: &Connection,
        virtual_path: &str,
        new_size: i64,
    ) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();
        
        let rows_affected = conn
            .execute(
                r#"
                UPDATE filesystem_metadata
                SET size = ?1, modified_at = ?2
                WHERE virtual_path = ?3
                "#,
                params![new_size, now, virtual_path],
            )
            .map_err(|e| format!("Failed to update size: {}", e))?;
        
        if rows_affected == 0 {
            return Err(format!("Entry not found: '{}'", virtual_path));
        }
        
        Ok(())
    }
    
    /// Updates the virtual and physical paths of an entry (used for move/rename operations).
    /// 
    /// # Arguments
    /// - `conn`: Database connection
    /// - `old_virtual_path`: The current virtual path
    /// - `new_virtual_path`: The new virtual path
    /// - `new_physical_path`: The new physical path
    /// - `new_name`: The new name (if changed)
    /// - `new_parent_path`: The new parent path (if changed)
    /// 
    /// # Returns
    /// - `Ok(())` if the update succeeds
    /// - `Err(String)` if the update fails or entry doesn't exist
    /// 
    /// # Requirements
    /// Validates: Requirements 7.6
    pub fn update_paths(
        &self,
        conn: &Connection,
        old_virtual_path: &str,
        new_virtual_path: &str,
        new_physical_path: &str,
        new_name: &str,
        new_parent_path: Option<&str>,
    ) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();
        
        let rows_affected = conn
            .execute(
                r#"
                UPDATE filesystem_metadata
                SET virtual_path = ?1, physical_path = ?2, name = ?3, 
                    parent_path = ?4, modified_at = ?5
                WHERE virtual_path = ?6
                "#,
                params![
                    new_virtual_path,
                    new_physical_path,
                    new_name,
                    new_parent_path,
                    now,
                    old_virtual_path
                ],
            )
            .map_err(|e| format!("Failed to update paths: {}", e))?;
        
        if rows_affected == 0 {
            return Err(format!("Entry not found: '{}'", old_virtual_path));
        }
        
        Ok(())
    }
    
    /// Deletes an entry from the metadata table.
    /// 
    /// # Arguments
    /// - `conn`: Database connection
    /// - `virtual_path`: The virtual path of the entry to delete
    /// 
    /// # Returns
    /// - `Ok(())` if the deletion succeeds
    /// - `Err(String)` if the deletion fails
    /// 
    /// # Requirements
    /// Validates: Requirements 7.1
    pub fn delete_entry(
        &self,
        conn: &Connection,
        virtual_path: &str,
    ) -> Result<(), String> {
        let rows_affected = conn
            .execute(
                "DELETE FROM filesystem_metadata WHERE virtual_path = ?1",
                params![virtual_path],
            )
            .map_err(|e| format!("Failed to delete entry: {}", e))?;
        
        if rows_affected == 0 {
            return Err(format!("Entry not found: '{}'", virtual_path));
        }
        
        Ok(())
    }
    
    /// Lists all entries in a directory.
    /// 
    /// # Arguments
    /// - `conn`: Database connection
    /// - `parent_virtual_path`: The virtual path of the parent directory
    /// 
    /// # Returns
    /// - `Ok(Vec<FileEntry>)` containing all entries in the directory
    /// - `Err(String)` if the query fails
    /// 
    /// # Requirements
    /// Validates: Requirements 7.1, 7.2
    pub fn list_entries(
        &self,
        conn: &Connection,
        parent_virtual_path: &str,
    ) -> Result<Vec<FileEntry>, String> {
        let mut stmt = conn
            .prepare(
                r#"
                SELECT id, virtual_path, physical_path, name, entry_type, size, 
                       mime_type, owner_username, created_at, modified_at, parent_path
                FROM filesystem_metadata
                WHERE parent_path = ?1
                ORDER BY entry_type DESC, name ASC
                "#,
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        
        let entries = stmt
            .query_map(params![parent_virtual_path], |row| {
                let entry_type_str: String = row.get(4)?;
                let entry_type = EntryType::from_db_string(&entry_type_str)
                    .map_err(|_| rusqlite::Error::InvalidQuery)?;
                
                Ok(FileEntry {
                    id: row.get(0)?,
                    virtual_path: row.get(1)?,
                    physical_path: row.get(2)?,
                    name: row.get(3)?,
                    entry_type,
                    size: row.get(5)?,
                    mime_type: row.get(6)?,
                    owner_username: row.get(7)?,
                    created_at: row.get(8)?,
                    modified_at: row.get(9)?,
                    parent_path: row.get(10)?,
                })
            })
            .map_err(|e| format!("Failed to query entries: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect entries: {}", e))?;
        
        Ok(entries)
    }
    
    /// Calculates the total size of a folder recursively.
    /// 
    /// This includes:
    /// - All files directly in the folder
    /// - All files in subfolders (recursively)
    /// 
    /// # Arguments
    /// - `conn`: Database connection
    /// - `folder_virtual_path`: The virtual path of the folder
    /// 
    /// # Returns
    /// - `Ok(i64)` containing the total size in bytes
    /// - `Err(String)` if the calculation fails
    /// 
    /// # Requirements
    /// Validates: Requirements 7.3
    pub fn calculate_folder_size(
        &self,
        conn: &Connection,
        folder_virtual_path: &str,
    ) -> Result<i64, String> {
        // Use a recursive CTE (Common Table Expression) to calculate total size
        // This traverses the entire folder tree and sums all file sizes
        let mut stmt = conn
            .prepare(
                r#"
                WITH RECURSIVE folder_tree AS (
                    -- Base case: the folder itself
                    SELECT virtual_path, entry_type, size
                    FROM filesystem_metadata
                    WHERE virtual_path = ?1
                    
                    UNION ALL
                    
                    -- Recursive case: all children
                    SELECT m.virtual_path, m.entry_type, m.size
                    FROM filesystem_metadata m
                    INNER JOIN folder_tree ft ON m.parent_path = ft.virtual_path
                )
                SELECT COALESCE(SUM(size), 0) as total_size
                FROM folder_tree
                WHERE entry_type = 'file'
                "#,
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        
        let total_size: i64 = stmt
            .query_row(params![folder_virtual_path], |row| row.get(0))
            .map_err(|e| format!("Failed to calculate folder size: {}", e))?;
        
        Ok(total_size)
    }
    
    /// Checks if an entry exists at the given virtual path.
    /// 
    /// # Arguments
    /// - `conn`: Database connection
    /// - `virtual_path`: The virtual path to check
    /// 
    /// # Returns
    /// - `Ok(bool)` - true if the entry exists, false otherwise
    /// - `Err(String)` if the query fails
    pub fn exists(
        &self,
        conn: &Connection,
        virtual_path: &str,
    ) -> Result<bool, String> {
        let mut stmt = conn
            .prepare("SELECT COUNT(*) FROM filesystem_metadata WHERE virtual_path = ?1")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        
        let count: i64 = stmt
            .query_row(params![virtual_path], |row| row.get(0))
            .map_err(|e| format!("Failed to check existence: {}", e))?;
        
        Ok(count > 0)
    }
    
    /// Gets all entries owned by a specific user.
    /// 
    /// # Arguments
    /// - `conn`: Database connection
    /// - `username`: The username to filter by
    /// 
    /// # Returns
    /// - `Ok(Vec<FileEntry>)` containing all entries owned by the user
    /// - `Err(String)` if the query fails
    pub fn get_entries_by_owner(
        &self,
        conn: &Connection,
        username: &str,
    ) -> Result<Vec<FileEntry>, String> {
        let mut stmt = conn
            .prepare(
                r#"
                SELECT id, virtual_path, physical_path, name, entry_type, size, 
                       mime_type, owner_username, created_at, modified_at, parent_path
                FROM filesystem_metadata
                WHERE owner_username = ?1
                ORDER BY created_at DESC
                "#,
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        
        let entries = stmt
            .query_map(params![username], |row| {
                let entry_type_str: String = row.get(4)?;
                let entry_type = EntryType::from_db_string(&entry_type_str)
                    .map_err(|_| rusqlite::Error::InvalidQuery)?;
                
                Ok(FileEntry {
                    id: row.get(0)?,
                    virtual_path: row.get(1)?,
                    physical_path: row.get(2)?,
                    name: row.get(3)?,
                    entry_type,
                    size: row.get(5)?,
                    mime_type: row.get(6)?,
                    owner_username: row.get(7)?,
                    created_at: row.get(8)?,
                    modified_at: row.get(9)?,
                    parent_path: row.get(10)?,
                })
            })
            .map_err(|e| format!("Failed to query entries: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect entries: {}", e))?;
        
        Ok(entries)
    }
}

impl Default for MetadataManager {
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
        
        // Create a test user if it doesn't exist
        let _ = conn.execute(
            r#"
            INSERT OR IGNORE INTO users (username, password_hash, name, role, created_at, updated_at)
            VALUES ('test_user', 'hash', 'Test User', 'user', datetime('now'), datetime('now'))
            "#,
            [],
        );
        
        conn
    }
    
    #[test]
    fn test_insert_and_get_entry() {
        let conn = setup_test_db();
        let manager = MetadataManager::new();
        
        let virtual_path = format!("G:\\test_insert_file_{}.txt", chrono::Utc::now().timestamp_millis());
        let physical_path = "/path/to/physical/test_insert_file.txt";
        let name = "test_insert_file.txt";
        let owner = "test_user";
        
        // Insert entry
        let result = manager.insert_entry(
            &conn,
            &virtual_path,
            physical_path,
            name,
            EntryType::File,
            1024,
            Some("text/plain"),
            owner,
            Some("G:\\"),
        );
        
        assert!(result.is_ok(), "Failed to insert entry: {:?}", result.err());
        let id = result.unwrap();
        assert!(id > 0);
        
        // Get entry
        let get_result = manager.get_entry(&conn, &virtual_path);
        assert!(get_result.is_ok());
        
        let entry = get_result.unwrap();
        assert!(entry.is_some());
        
        let entry = entry.unwrap();
        assert_eq!(entry.id, id);
        assert_eq!(entry.virtual_path, virtual_path);
        assert_eq!(entry.name, name);
        assert_eq!(entry.entry_type, EntryType::File);
        assert_eq!(entry.size, 1024);
        assert_eq!(entry.owner_username, owner);
        
        // Cleanup
        let _ = manager.delete_entry(&conn, &virtual_path);
    }
    
    #[test]
    fn test_update_entry() {
        let conn = setup_test_db();
        let manager = MetadataManager::new();
        
        let virtual_path = format!("G:\\test_update_file_{}.txt", chrono::Utc::now().timestamp_millis());
        let physical_path = "/path/to/physical/test_update_file.txt";
        let name = "test_update_file.txt";
        let new_name = "renamed_file.txt";
        
        // Insert entry
        manager
            .insert_entry(
                &conn,
                &virtual_path,
                physical_path,
                name,
                EntryType::File,
                512,
                Some("text/plain"),
                "test_user",
                Some("G:\\"),
            )
            .unwrap();
        
        // Update entry
        let result = manager.update_entry(&conn, &virtual_path, new_name);
        assert!(result.is_ok());
        
        // Verify update
        let entry = manager.get_entry(&conn, &virtual_path).unwrap().unwrap();
        assert_eq!(entry.name, new_name);
        
        // Cleanup
        let _ = manager.delete_entry(&conn, &virtual_path);
    }
    
    #[test]
    fn test_delete_entry() {
        let conn = setup_test_db();
        let manager = MetadataManager::new();
        
        let virtual_path = format!("G:\\test_delete_file_{}.txt", chrono::Utc::now().timestamp_millis());
        let physical_path = "/path/to/physical/test_delete_file.txt";
        let name = "test_delete_file.txt";
        
        // Insert entry
        manager
            .insert_entry(
                &conn,
                &virtual_path,
                physical_path,
                name,
                EntryType::File,
                256,
                Some("text/plain"),
                "test_user",
                Some("G:\\"),
            )
            .unwrap();
        
        // Verify exists
        assert!(manager.exists(&conn, &virtual_path).unwrap());
        
        // Delete entry
        let result = manager.delete_entry(&conn, &virtual_path);
        assert!(result.is_ok());
        
        // Verify doesn't exist
        assert!(!manager.exists(&conn, &virtual_path).unwrap());
    }
    
    #[test]
    fn test_list_entries() {
        let conn = setup_test_db();
        let manager = MetadataManager::new();
        
        let timestamp = chrono::Utc::now().timestamp_millis();
        let parent_path = format!("G:\\test_list_dir_{}", timestamp);
        
        // Insert multiple entries
        manager
            .insert_entry(
                &conn,
                &format!("{}\\file1.txt", parent_path),
                "/path/file1.txt",
                "file1.txt",
                EntryType::File,
                100,
                Some("text/plain"),
                "test_user",
                Some(&parent_path),
            )
            .unwrap();
        
        manager
            .insert_entry(
                &conn,
                &format!("{}\\file2.txt", parent_path),
                "/path/file2.txt",
                "file2.txt",
                EntryType::File,
                200,
                Some("text/plain"),
                "test_user",
                Some(&parent_path),
            )
            .unwrap();
        
        manager
            .insert_entry(
                &conn,
                &format!("{}\\subfolder", parent_path),
                "/path/subfolder",
                "subfolder",
                EntryType::Folder,
                0,
                None,
                "test_user",
                Some(&parent_path),
            )
            .unwrap();
        
        // List entries
        let result = manager.list_entries(&conn, &parent_path);
        assert!(result.is_ok());
        
        let entries = result.unwrap();
        assert_eq!(entries.len(), 3);
        
        // Cleanup
        let _ = manager.delete_entry(&conn, &format!("{}\\file1.txt", parent_path));
        let _ = manager.delete_entry(&conn, &format!("{}\\file2.txt", parent_path));
        let _ = manager.delete_entry(&conn, &format!("{}\\subfolder", parent_path));
    }
    
    #[test]
    fn test_calculate_folder_size() {
        let conn = setup_test_db();
        let manager = MetadataManager::new();
        
        let timestamp = chrono::Utc::now().timestamp_millis();
        let root_path = format!("G:\\test_size_calc_{}", timestamp);
        let subfolder_path = format!("{}\\subfolder", root_path);
        
        // Create folder structure
        manager
            .insert_entry(
                &conn,
                &root_path,
                "/path/root",
                "test_size_calc",
                EntryType::Folder,
                0,
                None,
                "test_user",
                Some("G:\\"),
            )
            .unwrap();
        
        manager
            .insert_entry(
                &conn,
                &subfolder_path,
                "/path/root/subfolder",
                "subfolder",
                EntryType::Folder,
                0,
                None,
                "test_user",
                Some(&root_path),
            )
            .unwrap();
        
        // Add files
        manager
            .insert_entry(
                &conn,
                &format!("{}\\file1.txt", root_path),
                "/path/root/file1.txt",
                "file1.txt",
                EntryType::File,
                1000,
                Some("text/plain"),
                "test_user",
                Some(&root_path),
            )
            .unwrap();
        
        manager
            .insert_entry(
                &conn,
                &format!("{}\\file2.txt", subfolder_path),
                "/path/root/subfolder/file2.txt",
                "file2.txt",
                EntryType::File,
                2000,
                Some("text/plain"),
                "test_user",
                Some(&subfolder_path),
            )
            .unwrap();
        
        // Calculate size
        let result = manager.calculate_folder_size(&conn, &root_path);
        assert!(result.is_ok());
        
        let total_size = result.unwrap();
        assert_eq!(total_size, 3000); // 1000 + 2000
        
        // Cleanup
        let _ = manager.delete_entry(&conn, &format!("{}\\file1.txt", root_path));
        let _ = manager.delete_entry(&conn, &format!("{}\\file2.txt", subfolder_path));
        let _ = manager.delete_entry(&conn, &subfolder_path);
        let _ = manager.delete_entry(&conn, &root_path);
    }
    
    #[test]
    fn test_entry_type_conversion() {
        assert_eq!(EntryType::File.to_db_string(), "file");
        assert_eq!(EntryType::Folder.to_db_string(), "folder");
        
        assert_eq!(EntryType::from_db_string("file").unwrap(), EntryType::File);
        assert_eq!(EntryType::from_db_string("folder").unwrap(), EntryType::Folder);
        assert!(EntryType::from_db_string("invalid").is_err());
    }
}
