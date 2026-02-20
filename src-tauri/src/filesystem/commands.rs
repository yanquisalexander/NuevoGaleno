use serde::{Deserialize, Serialize};
use tauri::State;

use super::{DirectoryListing, FileEntry, FileOperations};

/// Shared state for filesystem operations.
pub struct FilesystemState {
    pub operations: FileOperations,
}

impl FilesystemState {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            operations: FileOperations::new()?,
        })
    }
}

/// Gets the current username from the session.
/// Returns "system" if no session is active (for initialization tasks).
fn get_current_username() -> String {
    match crate::session::get_session() {
        Ok(Some(session)) => session.user.username,
        _ => "system".to_string(),
    }
}

/// Lists all entries in a directory.
///
/// # Arguments
/// - `virtual_path`: The virtual path of the directory to list
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(DirectoryListing)` containing all entries
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_list_directory(
    virtual_path: String,
    state: State<'_, FilesystemState>,
) -> Result<DirectoryListing, String> {
    let username = get_current_username();
    
    state
        .operations
        .list_directory(&virtual_path, &username)
        .await
}

/// Creates a new folder.
///
/// # Arguments
/// - `virtual_path`: The parent directory path
/// - `folder_name`: The name of the folder to create
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(FileEntry)` containing the created folder metadata
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_create_folder(
    virtual_path: String,
    folder_name: String,
    state: State<'_, FilesystemState>,
) -> Result<FileEntry, String> {
    let username = get_current_username();
    
    state
        .operations
        .create_folder(&virtual_path, &folder_name, &username)
        .await
}

/// Deletes a file or folder.
///
/// # Arguments
/// - `virtual_path`: The path of the entry to delete
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(())` if successful
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_delete_entry(
    virtual_path: String,
    state: State<'_, FilesystemState>,
) -> Result<(), String> {
    let username = get_current_username();
    
    state
        .operations
        .delete_entry(&virtual_path, &username)
        .await
}

/// Renames a file or folder.
///
/// # Arguments
/// - `virtual_path`: The path of the entry to rename
/// - `new_name`: The new name
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(FileEntry)` containing the updated metadata
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_rename_entry(
    virtual_path: String,
    new_name: String,
    state: State<'_, FilesystemState>,
) -> Result<FileEntry, String> {
    let username = get_current_username();
    
    state
        .operations
        .rename_entry(&virtual_path, &new_name, &username)
        .await
}

/// Moves a file or folder to a different directory.
///
/// # Arguments
/// - `source_path`: The current path of the entry
/// - `dest_path`: The destination directory path
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(FileEntry)` containing the updated metadata
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_move_entry(
    source_path: String,
    dest_path: String,
    state: State<'_, FilesystemState>,
) -> Result<FileEntry, String> {
    let username = get_current_username();
    
    state
        .operations
        .move_entry(&source_path, &dest_path, &username)
        .await
}

/// Uploads a file to the filesystem.
///
/// # Arguments
/// - `virtual_dir`: The directory to upload to
/// - `file_data`: The file content as bytes
/// - `filename`: The name of the file
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(FileEntry)` containing the uploaded file metadata
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_upload_file(
    virtual_dir: String,
    file_data: Vec<u8>,
    filename: String,
    _state: State<'_, FilesystemState>,
) -> Result<FileEntry, String> {
    // TODO: Implement file upload
    // This will be implemented in task 7
    Err("File upload not yet implemented".to_string())
}

/// Downloads a file from the filesystem.
///
/// # Arguments
/// - `virtual_path`: The path of the file to download
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(Vec<u8>)` containing the file content
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_download_file(
    virtual_path: String,
    _state: State<'_, FilesystemState>,
) -> Result<Vec<u8>, String> {
    // TODO: Implement file download
    // This will be implemented in task 7
    Err("File download not yet implemented".to_string())
}

/// Gets metadata for a file or folder.
///
/// # Arguments
/// - `virtual_path`: The path of the entry
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(FileMetadata)` containing the metadata
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_get_metadata(
    virtual_path: String,
    _state: State<'_, FilesystemState>,
) -> Result<FileMetadata, String> {
    // TODO: Implement get metadata
    // This will be implemented in task 7
    Err("Get metadata not yet implemented".to_string())
}

/// Searches for files and folders.
///
/// # Arguments
/// - `query`: The search query
/// - `root_path`: The root path to search from
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(Vec<FileEntry>)` containing matching entries
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_search(
    query: String,
    root_path: String,
    _state: State<'_, FilesystemState>,
) -> Result<Vec<FileEntry>, String> {
    // TODO: Implement search
    // This will be implemented in task 12
    Err("Search not yet implemented".to_string())
}

/// Gets storage quota information for the current user.
///
/// # Returns
/// - `Ok(StorageQuota)` containing quota information
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_get_storage_quota(
    _state: State<'_, FilesystemState>,
) -> Result<StorageQuota, String> {
    // TODO: Implement storage quota
    // This will be implemented in task 8
    Err("Storage quota not yet implemented".to_string())
}

/// Links a file to a patient record.
///
/// # Arguments
/// - `file_path`: The path of the file
/// - `patient_id`: The ID of the patient
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(())` if successful
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_link_to_patient(
    file_path: String,
    patient_id: i64,
    _state: State<'_, FilesystemState>,
) -> Result<(), String> {
    // TODO: Implement patient linking
    // This will be implemented in task 13
    Err("Patient linking not yet implemented".to_string())
}

/// Gets all files linked to a patient.
///
/// # Arguments
/// - `patient_id`: The ID of the patient
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(Vec<FileEntry>)` containing linked files
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_get_patient_files(
    patient_id: i64,
    _state: State<'_, FilesystemState>,
) -> Result<Vec<FileEntry>, String> {
    // TODO: Implement get patient files
    // This will be implemented in task 13
    Err("Get patient files not yet implemented".to_string())
}

/// Gets audit log entries.
///
/// # Arguments
/// - `limit`: Maximum number of entries to return
/// - `offset`: Number of entries to skip
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(Vec<AuditLogEntry>)` containing log entries
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_get_audit_logs(
    limit: Option<i64>,
    offset: Option<i64>,
    _state: State<'_, FilesystemState>,
) -> Result<Vec<AuditLogEntry>, String> {
    // TODO: Implement audit logs
    // This will be implemented in task 9
    Err("Audit logs not yet implemented".to_string())
}

/// Moves a file or folder to trash.
///
/// # Arguments
/// - `virtual_path`: The path of the entry to trash
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(())` if successful
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_move_to_trash(
    virtual_path: String,
    state: State<'_, FilesystemState>,
) -> Result<(), String> {
    // For now, this just deletes the entry
    // Full trash implementation will be in task 11
    let username = get_current_username();
    
    state
        .operations
        .delete_entry(&virtual_path, &username)
        .await
}

/// Restores a file or folder from trash.
///
/// # Arguments
/// - `trash_id`: The ID of the trash entry
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(FileEntry)` containing the restored entry
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_restore_from_trash(
    trash_id: i64,
    _state: State<'_, FilesystemState>,
) -> Result<FileEntry, String> {
    // TODO: Implement restore from trash
    // This will be implemented in task 11
    Err("Restore from trash not yet implemented".to_string())
}

/// Empties the trash (permanently deletes all trashed items).
///
/// # Returns
/// - `Ok(())` if successful
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_empty_trash(
    _state: State<'_, FilesystemState>,
) -> Result<(), String> {
    // TODO: Implement empty trash
    // This will be implemented in task 11
    Err("Empty trash not yet implemented".to_string())
}

/// Gets the lock status of a file.
///
/// # Arguments
/// - `virtual_path`: The path of the file
/// - `state`: Shared filesystem state
///
/// # Returns
/// - `Ok(Option<FileLock>)` containing lock info if locked, None if not locked
/// - `Err(String)` if the operation fails
#[tauri::command]
pub async fn fs_get_file_lock_status(
    virtual_path: String,
    _state: State<'_, FilesystemState>,
) -> Result<Option<FileLock>, String> {
    // TODO: Implement file locking
    // This will be implemented in task 10
    Err("File locking not yet implemented".to_string())
}

// Placeholder types for commands that will be implemented later

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub name: String,
    pub size: i64,
    pub file_type: String,
    pub mime_type: Option<String>,
    pub created_at: String,
    pub modified_at: String,
    pub owner: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageQuota {
    pub total_bytes: i64,
    pub used_bytes: i64,
    pub available_bytes: i64,
    pub percentage_used: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub id: i64,
    pub timestamp: String,
    pub username: String,
    pub operation: String,
    pub path: String,
    pub success: bool,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileLock {
    pub file_path: String,
    pub locked_by: String,
    pub locked_at: String,
    pub expires_at: String,
}
