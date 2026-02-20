use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

use super::PathResolver;

/// StorageBackend handles low-level async file I/O operations.
/// 
/// This component provides:
/// - Async file and directory operations using tokio
/// - Path validation to ensure operations stay within galeno_files/
/// - File metadata retrieval
/// - Safe file operations with error handling
/// 
/// All operations validate paths before execution to prevent directory traversal.
#[derive(Debug, Clone)]
pub struct StorageBackend {
    resolver: PathResolver,
}

impl StorageBackend {
    /// Creates a new StorageBackend instance.
    /// 
    /// # Returns
    /// - `Ok(StorageBackend)` if initialization succeeds
    /// - `Err(String)` if the PathResolver cannot be created
    /// 
    /// # Requirements
    /// Validates: Requirements 1.2, 10.3
    pub fn new() -> Result<Self, String> {
        let resolver = PathResolver::new()?;
        Ok(Self { resolver })
    }
    
    /// Creates a directory at the specified virtual path.
    /// 
    /// Creates all parent directories if they don't exist (like mkdir -p).
    /// If the directory already exists, this operation succeeds silently.
    /// 
    /// # Arguments
    /// - `virtual_path`: The virtual path where the directory should be created
    /// 
    /// # Returns
    /// - `Ok(())` if the directory was created or already exists
    /// - `Err(String)` if path validation fails or directory creation fails
    /// 
    /// # Requirements
    /// Validates: Requirements 1.2, 4.2, 10.3
    pub async fn create_directory(&self, virtual_path: &str) -> Result<(), String> {
        // Validate and convert to physical path
        let physical_path = self.resolver.virtual_to_physical(virtual_path)?;
        
        // Create the directory and all parent directories
        fs::create_dir_all(&physical_path)
            .await
            .map_err(|e| format!("Failed to create directory '{}': {}", virtual_path, e))?;
        
        Ok(())
    }
    
    /// Writes file data to disk at the specified virtual path.
    /// 
    /// Creates parent directories if they don't exist.
    /// Overwrites the file if it already exists.
    /// 
    /// # Arguments
    /// - `virtual_path`: The virtual path where the file should be written
    /// - `data`: The file content as bytes
    /// 
    /// # Returns
    /// - `Ok(())` if the file was written successfully
    /// - `Err(String)` if path validation fails or write operation fails
    /// 
    /// # Requirements
    /// Validates: Requirements 4.2, 10.3, 10.6
    pub async fn write_file(&self, virtual_path: &str, data: &[u8]) -> Result<(), String> {
        // Validate and convert to physical path
        let physical_path = self.resolver.virtual_to_physical(virtual_path)?;
        
        // Ensure parent directory exists
        if let Some(parent) = physical_path.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
        
        // Write the file
        let mut file = fs::File::create(&physical_path)
            .await
            .map_err(|e| format!("Failed to create file '{}': {}", virtual_path, e))?;
        
        file.write_all(data)
            .await
            .map_err(|e| format!("Failed to write file '{}': {}", virtual_path, e))?;
        
        file.flush()
            .await
            .map_err(|e| format!("Failed to flush file '{}': {}", virtual_path, e))?;
        
        Ok(())
    }
    
    /// Reads file data from disk at the specified virtual path.
    /// 
    /// # Arguments
    /// - `virtual_path`: The virtual path of the file to read
    /// 
    /// # Returns
    /// - `Ok(Vec<u8>)` containing the file content
    /// - `Err(String)` if path validation fails, file doesn't exist, or read fails
    /// 
    /// # Requirements
    /// Validates: Requirements 10.3, 10.6
    pub async fn read_file(&self, virtual_path: &str) -> Result<Vec<u8>, String> {
        // Validate and convert to physical path
        let physical_path = self.resolver.virtual_to_physical(virtual_path)?;
        
        // Check if file exists
        if !physical_path.exists() {
            return Err(format!("File not found: '{}'", virtual_path));
        }
        
        if !physical_path.is_file() {
            return Err(format!("Path is not a file: '{}'", virtual_path));
        }
        
        // Read the file
        let mut file = fs::File::open(&physical_path)
            .await
            .map_err(|e| format!("Failed to open file '{}': {}", virtual_path, e))?;
        
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .await
            .map_err(|e| format!("Failed to read file '{}': {}", virtual_path, e))?;
        
        Ok(buffer)
    }
    
    /// Deletes a file at the specified virtual path.
    /// 
    /// # Arguments
    /// - `virtual_path`: The virtual path of the file to delete
    /// 
    /// # Returns
    /// - `Ok(())` if the file was deleted successfully
    /// - `Err(String)` if path validation fails, file doesn't exist, or deletion fails
    /// 
    /// # Requirements
    /// Validates: Requirements 10.3, 10.5
    pub async fn delete_file(&self, virtual_path: &str) -> Result<(), String> {
        // Validate and convert to physical path
        let physical_path = self.resolver.virtual_to_physical(virtual_path)?;
        
        // Check if file exists
        if !physical_path.exists() {
            return Err(format!("File not found: '{}'", virtual_path));
        }
        
        if !physical_path.is_file() {
            return Err(format!("Path is not a file: '{}'", virtual_path));
        }
        
        // Delete the file
        fs::remove_file(&physical_path)
            .await
            .map_err(|e| format!("Failed to delete file '{}': {}", virtual_path, e))?;
        
        Ok(())
    }
    
    /// Deletes a directory at the specified virtual path.
    /// 
    /// Removes the directory and all its contents recursively.
    /// 
    /// # Arguments
    /// - `virtual_path`: The virtual path of the directory to delete
    /// 
    /// # Returns
    /// - `Ok(())` if the directory was deleted successfully
    /// - `Err(String)` if path validation fails, directory doesn't exist, or deletion fails
    /// 
    /// # Requirements
    /// Validates: Requirements 10.3, 10.5
    pub async fn delete_directory(&self, virtual_path: &str) -> Result<(), String> {
        // Validate and convert to physical path
        let physical_path = self.resolver.virtual_to_physical(virtual_path)?;
        
        // Check if directory exists
        if !physical_path.exists() {
            return Err(format!("Directory not found: '{}'", virtual_path));
        }
        
        if !physical_path.is_dir() {
            return Err(format!("Path is not a directory: '{}'", virtual_path));
        }
        
        // Delete the directory and all contents
        fs::remove_dir_all(&physical_path)
            .await
            .map_err(|e| format!("Failed to delete directory '{}': {}", virtual_path, e))?;
        
        Ok(())
    }
    
    /// Moves a file from source to destination virtual path.
    /// 
    /// Creates parent directories at destination if they don't exist.
    /// Overwrites destination file if it exists.
    /// 
    /// # Arguments
    /// - `source_virtual_path`: The current virtual path of the file
    /// - `dest_virtual_path`: The target virtual path for the file
    /// 
    /// # Returns
    /// - `Ok(())` if the file was moved successfully
    /// - `Err(String)` if path validation fails, source doesn't exist, or move fails
    /// 
    /// # Requirements
    /// Validates: Requirements 10.3, 10.5
    pub async fn move_file(
        &self,
        source_virtual_path: &str,
        dest_virtual_path: &str,
    ) -> Result<(), String> {
        // Validate and convert both paths
        let source_physical = self.resolver.virtual_to_physical(source_virtual_path)?;
        let dest_physical = self.resolver.virtual_to_physical(dest_virtual_path)?;
        
        // Check if source exists
        if !source_physical.exists() {
            return Err(format!("Source file not found: '{}'", source_virtual_path));
        }
        
        if !source_physical.is_file() {
            return Err(format!("Source path is not a file: '{}'", source_virtual_path));
        }
        
        // Ensure destination parent directory exists
        if let Some(parent) = dest_physical.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("Failed to create destination directory: {}", e))?;
        }
        
        // Move the file
        fs::rename(&source_physical, &dest_physical)
            .await
            .map_err(|e| {
                format!(
                    "Failed to move file from '{}' to '{}': {}",
                    source_virtual_path, dest_virtual_path, e
                )
            })?;
        
        Ok(())
    }
    
    /// Gets the size of a file in bytes.
    /// 
    /// # Arguments
    /// - `virtual_path`: The virtual path of the file
    /// 
    /// # Returns
    /// - `Ok(u64)` containing the file size in bytes
    /// - `Err(String)` if path validation fails, file doesn't exist, or metadata read fails
    /// 
    /// # Requirements
    /// Validates: Requirements 10.3, 10.6
    pub async fn get_file_size(&self, virtual_path: &str) -> Result<u64, String> {
        // Validate and convert to physical path
        let physical_path = self.resolver.virtual_to_physical(virtual_path)?;
        
        // Check if file exists
        if !physical_path.exists() {
            return Err(format!("File not found: '{}'", virtual_path));
        }
        
        // Get metadata
        let metadata = fs::metadata(&physical_path)
            .await
            .map_err(|e| format!("Failed to get file size for '{}': {}", virtual_path, e))?;
        
        Ok(metadata.len())
    }
    
    /// Gets file or directory metadata.
    /// 
    /// Returns information about the file including:
    /// - Size in bytes
    /// - Whether it's a file or directory
    /// - Creation time (if available)
    /// - Modification time
    /// 
    /// # Arguments
    /// - `virtual_path`: The virtual path of the file or directory
    /// 
    /// # Returns
    /// - `Ok(FileMetadata)` containing the metadata
    /// - `Err(String)` if path validation fails, path doesn't exist, or metadata read fails
    /// 
    /// # Requirements
    /// Validates: Requirements 10.3, 10.6
    pub async fn get_metadata(&self, virtual_path: &str) -> Result<FileMetadata, String> {
        // Validate and convert to physical path
        let physical_path = self.resolver.virtual_to_physical(virtual_path)?;
        
        // Check if path exists
        if !physical_path.exists() {
            return Err(format!("Path not found: '{}'", virtual_path));
        }
        
        // Get metadata
        let metadata = fs::metadata(&physical_path)
            .await
            .map_err(|e| format!("Failed to get metadata for '{}': {}", virtual_path, e))?;
        
        // Extract file name
        let name = physical_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        
        Ok(FileMetadata {
            name,
            size: metadata.len(),
            is_file: metadata.is_file(),
            is_directory: metadata.is_dir(),
            created: metadata.created().ok(),
            modified: metadata.modified().ok(),
        })
    }
    
    /// Checks if a path exists (file or directory).
    /// 
    /// # Arguments
    /// - `virtual_path`: The virtual path to check
    /// 
    /// # Returns
    /// - `Ok(bool)` - true if the path exists, false otherwise
    /// - `Err(String)` if path validation fails
    /// 
    /// # Requirements
    /// Validates: Requirements 10.3
    pub async fn exists(&self, virtual_path: &str) -> Result<bool, String> {
        let physical_path = self.resolver.virtual_to_physical(virtual_path)?;
        Ok(physical_path.exists())
    }
    
    /// Checks if a path is a file.
    /// 
    /// # Arguments
    /// - `virtual_path`: The virtual path to check
    /// 
    /// # Returns
    /// - `Ok(bool)` - true if the path exists and is a file
    /// - `Err(String)` if path validation fails
    /// 
    /// # Requirements
    /// Validates: Requirements 10.3
    pub async fn is_file(&self, virtual_path: &str) -> Result<bool, String> {
        let physical_path = self.resolver.virtual_to_physical(virtual_path)?;
        Ok(physical_path.is_file())
    }
    
    /// Checks if a path is a directory.
    /// 
    /// # Arguments
    /// - `virtual_path`: The virtual path to check
    /// 
    /// # Returns
    /// - `Ok(bool)` - true if the path exists and is a directory
    /// - `Err(String)` if path validation fails
    /// 
    /// # Requirements
    /// Validates: Requirements 10.3
    pub async fn is_directory(&self, virtual_path: &str) -> Result<bool, String> {
        let physical_path = self.resolver.virtual_to_physical(virtual_path)?;
        Ok(physical_path.is_dir())
    }
}

/// Metadata information for a file or directory.
#[derive(Debug, Clone)]
pub struct FileMetadata {
    /// The name of the file or directory
    pub name: String,
    /// Size in bytes (0 for directories)
    pub size: u64,
    /// Whether this is a file
    pub is_file: bool,
    /// Whether this is a directory
    pub is_directory: bool,
    /// Creation time (if available on the platform)
    pub created: Option<std::time::SystemTime>,
    /// Last modification time
    pub modified: Option<std::time::SystemTime>,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_new_creates_storage_backend() {
        let backend = StorageBackend::new();
        assert!(backend.is_ok());
    }
    
    #[tokio::test]
    async fn test_create_directory() {
        let backend = StorageBackend::new().unwrap();
        let test_path = "G:\\test_create_dir";
        
        let result = backend.create_directory(test_path).await;
        assert!(result.is_ok());
        
        // Verify directory exists
        let exists = backend.exists(test_path).await.unwrap();
        assert!(exists);
        
        let is_dir = backend.is_directory(test_path).await.unwrap();
        assert!(is_dir);
        
        // Cleanup
        let _ = backend.delete_directory(test_path).await;
    }
    
    #[tokio::test]
    async fn test_write_and_read_file() {
        let backend = StorageBackend::new().unwrap();
        let test_path = "G:\\test_file.txt";
        let test_data = b"Hello, Galeno Filesystem!";
        
        // Write file
        let write_result = backend.write_file(test_path, test_data).await;
        assert!(write_result.is_ok());
        
        // Read file
        let read_result = backend.read_file(test_path).await;
        assert!(read_result.is_ok());
        
        let read_data = read_result.unwrap();
        assert_eq!(read_data, test_data);
        
        // Cleanup
        let _ = backend.delete_file(test_path).await;
    }
    
    #[tokio::test]
    async fn test_delete_file() {
        let backend = StorageBackend::new().unwrap();
        let test_path = "G:\\test_delete.txt";
        
        // Create file
        backend.write_file(test_path, b"test").await.unwrap();
        
        // Verify exists
        assert!(backend.exists(test_path).await.unwrap());
        
        // Delete file
        let result = backend.delete_file(test_path).await;
        assert!(result.is_ok());
        
        // Verify doesn't exist
        assert!(!backend.exists(test_path).await.unwrap());
    }
    
    #[tokio::test]
    async fn test_delete_directory() {
        let backend = StorageBackend::new().unwrap();
        let test_path = "G:\\test_delete_dir";
        
        // Create directory
        backend.create_directory(test_path).await.unwrap();
        
        // Verify exists
        assert!(backend.exists(test_path).await.unwrap());
        
        // Delete directory
        let result = backend.delete_directory(test_path).await;
        assert!(result.is_ok());
        
        // Verify doesn't exist
        assert!(!backend.exists(test_path).await.unwrap());
    }
    
    #[tokio::test]
    async fn test_move_file() {
        let backend = StorageBackend::new().unwrap();
        let source_path = "G:\\test_move_source.txt";
        let dest_path = "G:\\test_move_dest.txt";
        let test_data = b"move me";
        
        // Create source file
        backend.write_file(source_path, test_data).await.unwrap();
        
        // Move file
        let result = backend.move_file(source_path, dest_path).await;
        assert!(result.is_ok());
        
        // Verify source doesn't exist
        assert!(!backend.exists(source_path).await.unwrap());
        
        // Verify destination exists with correct content
        assert!(backend.exists(dest_path).await.unwrap());
        let read_data = backend.read_file(dest_path).await.unwrap();
        assert_eq!(read_data, test_data);
        
        // Cleanup
        let _ = backend.delete_file(dest_path).await;
    }
    
    #[tokio::test]
    async fn test_get_file_size() {
        let backend = StorageBackend::new().unwrap();
        let test_path = "G:\\test_size.txt";
        let test_data = b"12345";
        
        // Create file
        backend.write_file(test_path, test_data).await.unwrap();
        
        // Get size
        let result = backend.get_file_size(test_path).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 5);
        
        // Cleanup
        let _ = backend.delete_file(test_path).await;
    }
    
    #[tokio::test]
    async fn test_get_metadata() {
        let backend = StorageBackend::new().unwrap();
        let test_path = "G:\\test_metadata.txt";
        let test_data = b"metadata test";
        
        // Create file
        backend.write_file(test_path, test_data).await.unwrap();
        
        // Get metadata
        let result = backend.get_metadata(test_path).await;
        assert!(result.is_ok());
        
        let metadata = result.unwrap();
        assert_eq!(metadata.name, "test_metadata.txt");
        assert_eq!(metadata.size, test_data.len() as u64);
        assert!(metadata.is_file);
        assert!(!metadata.is_directory);
        assert!(metadata.modified.is_some());
        
        // Cleanup
        let _ = backend.delete_file(test_path).await;
    }
    
    #[tokio::test]
    async fn test_path_validation() {
        let backend = StorageBackend::new().unwrap();
        
        // Test invalid prefix
        let result = backend.create_directory("C:\\invalid").await;
        assert!(result.is_err());
        
        // Test directory traversal
        let result = backend.create_directory("G:\\..\\escape").await;
        assert!(result.is_err());
    }
    
    #[tokio::test]
    async fn test_read_nonexistent_file() {
        let backend = StorageBackend::new().unwrap();
        
        let result = backend.read_file("G:\\nonexistent.txt").await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }
    
    #[tokio::test]
    async fn test_delete_nonexistent_file() {
        let backend = StorageBackend::new().unwrap();
        
        let result = backend.delete_file("G:\\nonexistent.txt").await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }
    
    #[tokio::test]
    async fn test_move_nonexistent_file() {
        let backend = StorageBackend::new().unwrap();
        
        let result = backend.move_file("G:\\nonexistent.txt", "G:\\dest.txt").await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }
}
