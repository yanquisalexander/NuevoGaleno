# Implementation Plan: Galeno Filesystem

## Overview

El Galeno Filesystem se implementará como un sistema de archivos virtual integrado en la aplicación Galeno. La implementación seguirá un enfoque incremental, comenzando con la infraestructura backend en Rust (path resolver, operaciones básicas), luego la capa de datos (base de datos, metadata), seguido por las funcionalidades avanzadas (permisos, quotas, auditoría), y finalmente la interfaz de usuario en React/TypeScript.

El plan prioriza la validación temprana mediante tests de propiedades para cada componente crítico, asegurando que las invariantes del sistema se mantengan desde el inicio.

## Tasks

- [x] 1. Setup database schema and migrations
  - Create migration file for all filesystem tables (filesystem_metadata, filesystem_permissions, filesystem_locks, filesystem_audit_log, filesystem_patient_links, filesystem_trash, filesystem_quotas, filesystem_allowed_types)
  - Add default allowed file types to filesystem_allowed_types table
  - _Requirements: 1.2, 7.1, 9.6, 13.2, 14.4, 15.1, 19.1, 20.1_

- [x] 2. Implement Path Resolver module
  - [x] 2.1 Create core PathResolver struct with virtual-to-physical translation
    - Implement PathResolver::new() to initialize with G:\ prefix and galeno_files root
    - Implement virtual_to_physical() method with path validation
    - Implement physical_to_virtual() method for reverse mapping
    - Implement validate_virtual_path() to check prefix and invalid characters
    - Implement get_user_root() to generate user folder paths
    - Implement is_within_root() to prevent directory traversal
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 10.2, 10.3_
  
  - [ ]* 2.2 Write property test for Path Resolver
    - **Property 1: Virtual Path Prefix Consistency**
    - **Property 3: Path Mapping Preservation**
    - **Property 5: Directory Traversal Prevention**
    - **Validates: Requirements 1.1, 1.5, 1.6, 10.2**

- [x] 3. Implement Storage Backend module
  - [x] 3.1 Create StorageBackend with async file I/O operations
    - Implement create_directory() for physical folder creation
    - Implement write_file() for saving file data to disk
    - Implement read_file() for loading file data from disk
    - Implement delete_file() and delete_directory() for removal
    - Implement move_file() for relocating files
    - Implement get_file_size() and get_metadata() for file information
    - All operations must be async and validate paths are within galeno_files/
    - _Requirements: 1.2, 4.2, 10.3, 10.5, 10.6_
  
  - [ ]* 3.2 Write property test for Storage Backend
    - **Property 2: Physical Storage Containment**
    - **Validates: Requirements 1.2, 4.2, 10.3**

- [x] 4. Implement Metadata Manager module
  - [x] 4.1 Create MetadataManager for database operations
    - Implement insert_entry() to create metadata records
    - Implement get_entry() to retrieve metadata by virtual path
    - Implement update_entry() to modify metadata (name, modified_at)
    - Implement delete_entry() to remove metadata records
    - Implement list_entries() to get all entries in a directory
    - Implement calculate_folder_size() for recursive size calculation
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_
  
  - [ ]* 4.2 Write property test for Metadata Manager
    - **Property 13: Metadata Completeness**
    - **Property 14: Folder Size Calculation**
    - **Property 15: Timestamp Update on Modification**
    - **Validates: Requirements 7.1, 7.3, 7.6**

- [x] 5. Implement Permission Manager module
  - [x] 5.1 Create PermissionManager for access control
    - Implement can_access() to check if user can access a path
    - Implement can_read(), can_write(), can_delete() for specific permissions
    - Implement get_user_root() to return user's folder path
    - Implement is_shared_path() to check if path is in shared directories
    - Implement grant_access() to add permissions to database
    - Default behavior: users have full access to G:\Users\{username}, no access to other users' folders
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ]* 5.2 Write property test for Permission Manager
    - **Property 18: User Folder Isolation**
    - **Property 19: Own Folder Full Access**
    - **Property 20: Shared Folder Access**
    - **Validates: Requirements 9.3, 9.4, 9.5**

- [ ] 6. Implement File Operations Handler
  - [ ] 6.1 Create FileOperations struct coordinating all modules
    - Implement list_directory() using MetadataManager and PermissionManager
    - Implement create_folder() with validation, metadata creation, and physical folder creation
    - Implement delete_entry() moving to trash instead of permanent deletion
    - Implement rename_entry() updating both metadata and physical path
    - Implement move_entry() with target validation and path updates
    - All operations must check permissions, validate inputs, and log to audit
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.4, 3.5, 3.6, 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 6.2 Write property tests for File Operations
    - **Property 6: Folder Creation Idempotency**
    - **Property 7: Invalid Character Rejection**
    - **Property 8: Folder Rename Content Preservation**
    - **Property 9: Deletion Consistency**
    - **Property 11: File Move Consistency**
    - **Property 12: Move Target Validation**
    - **Validates: Requirements 3.1, 3.2, 3.4, 3.5, 3.6, 6.2, 6.3, 6.5, 6.6**

- [ ] 7. Implement file upload and download operations
  - [ ] 7.1 Add upload_file() and download_file() to FileOperations
    - Implement upload_file() to save file data, create metadata, check quota
    - Implement download_file() to read file data and return bytes
    - Handle duplicate filename conflicts (prompt user to rename/replace/skip)
    - Validate file types against filesystem_allowed_types table
    - Verify MIME type matches extension
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.3, 14.2, 14.3_
  
  - [ ]* 7.2 Write property tests for upload/download
    - **Property 10: Upload-Download Round Trip**
    - **Property 21: File Type Validation**
    - **Property 22: MIME Type Verification**
    - **Validates: Requirements 4.1, 4.3, 5.1, 5.3, 14.2, 14.3**

- [ ] 8. Implement Quota Manager module
  - [-] 8.1 Create QuotaManager for storage limits
    - Implement calculate_user_usage() to sum all user's file sizes
    - Implement check_quota() to verify if operation would exceed limit
    - Implement get_storage_quota() to return quota information
    - Implement update_usage() to increment/decrement used_bytes
    - Default quota: 5 GB per user (configurable)
    - _Requirements: 13.1, 13.2, 13.4, 13.5_
  
  - [ ]* 8.2 Write property test for Quota Manager
    - **Property 24: Storage Quota Enforcement**
    - **Property 25: Quota Warning Threshold**
    - **Validates: Requirements 13.2, 13.3, 13.4**

- [ ] 9. Implement Audit Logger module
  - [-] 9.1 Create AuditLogger for operation logging
    - Implement log_operation() to insert audit log entries
    - Record username, timestamp, operation type, path, success/failure
    - Implement get_audit_logs() with pagination for admin interface
    - Implement export_audit_logs() for CSV/JSON export
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.6_
  
  - [ ]* 9.2 Write property test for Audit Logger
    - **Property 30: Audit Log Completeness**
    - **Validates: Requirements 20.1, 20.2**

- [ ] 10. Implement Lock Manager module
  - [ ] 10.1 Create LockManager for concurrent access control
    - Implement acquire_lock() to create file lock with timeout
    - Implement release_lock() to remove lock
    - Implement check_lock() to get lock status
    - Implement cleanup_expired_locks() to remove timed-out locks
    - Default lock timeout: 5 minutes
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
  
  - [ ]* 10.2 Write property tests for Lock Manager
    - **Property 28: File Lock Write Prevention**
    - **Property 29: Lock Release on Completion**
    - **Validates: Requirements 19.2, 19.3, 19.6**

- [ ] 11. Implement Trash/Recycle Bin functionality
  - [ ] 11.1 Add trash operations to FileOperations
    - Implement move_to_trash() to move entry to trash table and backup location
    - Implement restore_from_trash() to restore entry to original path
    - Implement empty_trash() to permanently delete trash entries
    - Implement cleanup_old_trash() to delete entries older than 30 days
    - Track original_virtual_path for proper restoration
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_
  
  - [ ]* 11.2 Write property test for Trash operations
    - **Property 23: Trash Restoration Round Trip**
    - **Validates: Requirements 15.4, 15.7**

- [ ] 12. Implement Search functionality
  - [ ] 12.1 Add search() method to FileOperations
    - Implement case-insensitive partial matching on file/folder names
    - Search recursively in current directory and subdirectories
    - Return results with complete virtual paths
    - Filter by file type, size, and date ranges (optional parameters)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 8.7_
  
  - [ ]* 12.2 Write property tests for Search
    - **Property 16: Search Case Insensitivity**
    - **Property 17: Search Result Path Completeness**
    - **Validates: Requirements 8.3, 8.4**

- [ ] 13. Implement Patient File Linking
  - [ ] 13.1 Add patient linking methods to FileOperations
    - Implement link_to_patient() to create file-patient association
    - Implement get_patient_files() to retrieve all files for a patient
    - Implement unlink_from_patient() to remove association
    - Update links when files are moved (preserve associations)
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_
  
  - [ ]* 13.2 Write property tests for Patient Linking
    - **Property 26: Patient Link Preservation on Move**
    - **Property 27: Patient File Filtering**
    - **Validates: Requirements 18.4, 18.6**

- [ ] 14. Implement Tauri commands
  - [ ] 14.1 Create all Tauri command handlers
    - Implement fs_list_directory command
    - Implement fs_create_folder command
    - Implement fs_delete_entry command
    - Implement fs_rename_entry command
    - Implement fs_move_entry command
    - Implement fs_upload_file command
    - Implement fs_download_file command
    - Implement fs_get_metadata command
    - Implement fs_search command
    - Implement fs_get_storage_quota command
    - Implement fs_link_to_patient command
    - Implement fs_get_patient_files command
    - Implement fs_get_audit_logs command
    - Implement fs_move_to_trash command
    - Implement fs_restore_from_trash command
    - Implement fs_empty_trash command
    - Implement fs_get_file_lock_status command
    - All commands must get current user from session and handle errors gracefully
    - _Requirements: 10.1, 10.4, 10.5_
  
  - [ ]* 14.2 Write unit tests for Tauri commands
    - Test each command with valid inputs
    - Test error handling for invalid inputs
    - Test permission checks
    - Mock FileOperations for isolated testing

- [ ] 15. Register filesystem module in Tauri app
  - [ ] 15.1 Wire filesystem module into main Tauri application
    - Add filesystem module to src-tauri/src/lib.rs
    - Register all Tauri commands in main.rs
    - Initialize galeno_files/ directory on app startup
    - Run database migrations for filesystem tables
    - _Requirements: 1.2, 10.1_

- [ ] 16. Checkpoint - Backend complete, verify all tests pass
  - Run all property tests and unit tests
  - Verify database schema is correct
  - Test basic operations manually via Tauri commands
  - Ensure all tests pass, ask the user if questions arise

- [ ] 17. Implement TypeScript types and interfaces
  - [ ] 17.1 Create filesystem type definitions
    - Create src/types/filesystem.ts with all interfaces
    - Define FileEntry, DirectoryListing, FileMetadata, FilePermissions
    - Define StorageQuota, AuditLogEntry, FileLock, PatientFileLink, TrashEntry
    - Match Rust types exactly for proper serialization
    - _Requirements: 7.1, 7.2, 13.5, 20.1_

- [ ] 18. Implement useFileSystem hook
  - [ ] 18.1 Create React hook for filesystem operations
    - Create src/hooks/useFileSystem.ts
    - Implement listDirectory() invoking fs_list_directory
    - Implement createFolder() invoking fs_create_folder
    - Implement deleteEntry() invoking fs_delete_entry
    - Implement renameEntry() invoking fs_rename_entry
    - Implement moveEntry() invoking fs_move_entry
    - Implement uploadFile() invoking fs_upload_file with progress tracking
    - Implement downloadFile() invoking fs_download_file
    - Implement search() invoking fs_search
    - Implement getStorageQuota() invoking fs_get_storage_quota
    - Implement linkToPatient() invoking fs_link_to_patient
    - Implement getMetadata() invoking fs_get_metadata
    - Handle errors and return user-friendly messages
    - _Requirements: 2.1, 3.1, 4.1, 4.6, 5.1, 6.1, 8.1, 13.1, 18.3_
  
  - [ ]* 18.2 Write unit tests for useFileSystem hook
    - Mock Tauri invoke calls
    - Test each method with valid inputs
    - Test error handling

- [ ] 19. Implement FileManager main component
  - [ ] 19.1 Create FileManager component with state management
    - Create src/components/FileManager/FileManager.tsx
    - Manage state: currentPath, entries, selectedEntries, viewMode, sortBy, searchQuery
    - Implement navigation logic (forward, back, breadcrumb clicks)
    - Implement file/folder selection (single, multi-select with Ctrl/Shift)
    - Implement view mode toggle (list/grid)
    - Implement sorting (by name, date, size)
    - Load directory contents on mount and path changes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 12.4_
  
  - [ ]* 19.2 Write unit tests for FileManager component
    - Test rendering with different props
    - Test navigation interactions
    - Test selection logic
    - Mock useFileSystem hook

- [ ] 20. Implement Navigation component
  - [ ] 20.1 Create Navigation component with breadcrumbs
    - Create src/components/FileManager/Navigation.tsx
    - Display current path as breadcrumb segments
    - Implement back button with disabled state when at root
    - Handle breadcrumb segment clicks to navigate to that level
    - Display address bar with editable path input
    - _Requirements: 2.1, 2.3, 2.4, 2.5_
  
  - [ ]* 20.2 Write unit tests for Navigation component
    - Test breadcrumb rendering
    - Test navigation callbacks
    - Test back button state

- [ ] 21. Implement FileList component with virtual scrolling
  - [ ] 21.1 Create FileList component for displaying entries
    - Create src/components/FileManager/FileList.tsx
    - Implement virtual scrolling for large directories (>100 items)
    - Support list and grid view modes
    - Display file icons based on file type
    - Display file metadata (name, size, date)
    - Handle click events for selection and opening
    - Handle double-click to open files/folders
    - Handle right-click for context menu
    - Support drag-and-drop for moving files
    - _Requirements: 2.2, 2.6, 2.7, 6.7, 7.4, 12.3, 16.1_
  
  - [ ]* 21.2 Write unit tests for FileList component
    - Test rendering in list and grid modes
    - Test selection interactions
    - Test double-click behavior
    - Mock callbacks

- [ ] 22. Implement ContextMenu component
  - [ ] 22.1 Create ContextMenu component for file operations
    - Create src/components/FileManager/ContextMenu.tsx
    - Display context menu at mouse position
    - Show available operations: Rename, Delete, Move, Download, Link to Patient, Properties
    - Display keyboard shortcuts in menu items
    - Handle batch operations when multiple items selected
    - Close menu on click outside or action selection
    - _Requirements: 12.1, 12.2, 12.3, 12.5_
  
  - [ ]* 22.2 Write unit tests for ContextMenu component
    - Test menu rendering
    - Test action callbacks
    - Test positioning

- [ ] 23. Implement keyboard shortcuts
  - [ ] 23.1 Add keyboard shortcut handling to FileManager
    - Implement Ctrl+C for copy (store in clipboard state)
    - Implement Ctrl+V for paste (move/copy from clipboard)
    - Implement Delete key for delete operation
    - Implement F2 for rename operation
    - Implement Ctrl+A for select all
    - Implement Escape to clear selection
    - _Requirements: 12.2, 12.3, 12.6_
  
  - [ ]* 23.2 Write unit tests for keyboard shortcuts
    - Test each shortcut triggers correct action
    - Test shortcuts work with selection state

- [ ] 24. Implement file upload UI
  - [ ] 24.1 Create upload functionality with progress tracking
    - Add file input button to FileManager toolbar
    - Support drag-and-drop files onto FileList
    - Support multiple file selection
    - Display upload progress for each file
    - Handle duplicate filename conflicts with dialog
    - Show error messages for failed uploads
    - Update directory listing after successful uploads
    - _Requirements: 4.1, 4.4, 4.5, 4.6, 4.7_
  
  - [ ]* 24.2 Write unit tests for upload UI
    - Test file selection
    - Test drag-and-drop
    - Test progress display
    - Mock upload operations

- [ ] 25. Implement file download UI
  - [ ] 25.1 Create download functionality
    - Add download action to context menu
    - Show file picker dialog for save location
    - Display download progress for large files
    - Show success notification on completion
    - Show error message on failure with retry option
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 25.2 Write unit tests for download UI
    - Test download action
    - Test progress display
    - Mock download operations

- [ ] 26. Implement folder creation dialog
  - [ ] 26.1 Create dialog for new folder creation
    - Add "New Folder" button to toolbar
    - Show dialog with folder name input
    - Validate folder name (no invalid characters)
    - Display error message for invalid names or duplicates
    - Update directory listing after successful creation
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 26.2 Write unit tests for folder creation dialog
    - Test dialog rendering
    - Test validation logic
    - Mock createFolder operation

- [ ] 27. Implement rename dialog
  - [ ] 27.1 Create dialog for renaming files/folders
    - Show dialog with current name pre-filled
    - Validate new name (no invalid characters)
    - Display error message for invalid names
    - Update entry in file list after successful rename
    - _Requirements: 3.5, 6.1_
  
  - [ ]* 27.2 Write unit tests for rename dialog
    - Test dialog rendering
    - Test validation logic
    - Mock renameEntry operation

- [ ] 28. Implement delete confirmation dialog
  - [ ] 28.1 Create confirmation dialog for deletion
    - Show confirmation dialog before deleting
    - Display different message for non-empty folders
    - Explain that items will be moved to trash (not permanent)
    - Update directory listing after successful deletion
    - _Requirements: 3.6, 3.7, 6.2, 15.2_
  
  - [ ]* 28.2 Write unit tests for delete confirmation dialog
    - Test dialog rendering
    - Test confirmation flow
    - Mock deleteEntry operation

- [ ] 29. Implement search UI
  - [ ] 29.1 Create search interface in toolbar
    - Add search input field to toolbar
    - Implement debounced search (wait 300ms after typing stops)
    - Display search results with full paths
    - Allow clicking result to navigate to containing folder
    - Show "no results" message when appropriate
    - Add filter options for file type, size, date ranges
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6, 8.7_
  
  - [ ]* 29.2 Write unit tests for search UI
    - Test search input
    - Test result display
    - Test navigation from results
    - Mock search operation

- [ ] 30. Implement storage quota display
  - [ ] 30.1 Create quota indicator in UI
    - Display storage usage bar in FileManager footer
    - Show used/total storage with percentage
    - Display warning when usage > 90%
    - Update quota display after file operations
    - _Requirements: 13.3, 13.5_
  
  - [ ]* 30.2 Write unit tests for quota display
    - Test rendering with different quota values
    - Test warning display at threshold
    - Mock getStorageQuota operation

- [ ] 31. Implement file preview functionality
  - [ ] 31.1 Create file preview modal
    - Show preview modal on double-click for supported file types
    - Implement image preview for jpg, png, gif
    - Implement PDF viewer using pdf.js or similar
    - Implement text viewer for txt files
    - Show "download to view" message for unsupported types
    - Add "Open with system default" button
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [ ]* 31.2 Write unit tests for file preview
    - Test preview modal rendering
    - Test different file type handling
    - Mock file content loading

- [ ] 32. Implement patient linking UI
  - [ ] 32.1 Create patient linking dialog
    - Add "Link to Patient" option in context menu
    - Show dialog with patient search/select
    - Display success message after linking
    - Show linked patient badge on file entries
    - Add filter to show only files for specific patient
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
  
  - [ ]* 32.2 Write unit tests for patient linking UI
    - Test dialog rendering
    - Test patient selection
    - Mock linkToPatient operation

- [ ] 33. Implement trash/recycle bin UI
  - [ ] 33.1 Create trash folder view
    - Add "Trash" item in sidebar navigation
    - Display trash contents with deletion date
    - Add "Restore" button for each trash entry
    - Add "Empty Trash" button to permanently delete all
    - Show confirmation before emptying trash
    - _Requirements: 15.1, 15.3, 15.4, 15.6_
  
  - [ ]* 33.2 Write unit tests for trash UI
    - Test trash view rendering
    - Test restore action
    - Test empty trash action
    - Mock trash operations

- [ ] 34. Implement error handling and user feedback
  - [ ] 34.1 Create error display components
    - Create toast notification system for success/error messages
    - Display user-friendly error messages from backend
    - Show actionable suggestions in error messages
    - Implement retry mechanism for failed operations
    - Log errors to console for debugging
    - _Requirements: 17.1, 17.2, 17.4, 17.6_
  
  - [ ]* 34.2 Write property tests for error handling
    - **Property 31: Error Message Descriptiveness**
    - **Property 33: Input Validation Before Execution**
    - **Validates: Requirements 17.1, 17.3, 17.4**

- [ ] 35. Implement file lock indicators
  - [ ] 35.1 Add lock status display to file entries
    - Check lock status when loading directory
    - Display lock icon on locked files
    - Show tooltip with lock owner and time
    - Disable write operations on locked files
    - Show error message when attempting to modify locked file
    - _Requirements: 19.2, 19.5_
  
  - [ ]* 35.2 Write unit tests for lock indicators
    - Test lock icon rendering
    - Test tooltip display
    - Mock lock status checks

- [ ] 36. Implement admin audit log viewer
  - [ ] 36.1 Create audit log interface for administrators
    - Create src/components/FileManager/AuditLogViewer.tsx
    - Display audit log entries with pagination
    - Show username, timestamp, operation, path, success/failure
    - Add search/filter by user, operation type, date range
    - Add export button for CSV/JSON download
    - Restrict access to admin users only
    - _Requirements: 20.1, 20.2, 20.4, 20.6_
  
  - [ ]* 36.2 Write unit tests for audit log viewer
    - Test log entry rendering
    - Test pagination
    - Test filtering
    - Mock audit log data

- [ ] 37. Integrate with session management
  - [ ] 37.1 Connect filesystem to user authentication
    - Get current user from session on FileManager mount
    - Navigate to user's folder (G:\Users\{username}) on login
    - Create user folder if it doesn't exist on first login
    - Handle session expiration gracefully
    - _Requirements: 1.4, 9.1, 9.2_
  
  - [ ]* 37.2 Write property test for user folder creation
    - **Property 4: User Folder Creation on Authentication**
    - **Validates: Requirements 1.4, 9.2**

- [ ] 38. Add filesystem to main application navigation
  - [ ] 38.1 Integrate FileManager into Galeno app
    - Add "Files" menu item to main navigation
    - Create route for FileManager component
    - Add file icon to navigation sidebar
    - Ensure FileManager is accessible from main app
    - _Requirements: 2.1_

- [ ] 39. Implement plugin API for filesystem access
  - [ ] 39.1 Expose filesystem API to plugins
    - Add filesystem:read and filesystem:write permissions to plugin system
    - Create plugin API methods for file operations
    - Restrict plugin access to user's own folder only
    - Document plugin filesystem API
    - _Requirements: 9.3, 9.4_
  
  - [ ]* 39.2 Write unit tests for plugin API
    - Test permission checks
    - Test sandboxed access
    - Mock plugin calls

- [ ] 40. Performance optimization
  - [ ] 40.1 Optimize for large directories
    - Verify virtual scrolling works correctly with 10,000+ items
    - Implement directory listing cache with invalidation
    - Add loading indicators for slow operations
    - Optimize metadata queries with proper indexes
    - Test performance with large file structures
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.6_
  
  - [ ]* 40.2 Write performance tests
    - Test directory listing with 10,000 files
    - Measure search performance across large trees
    - Verify UI responsiveness during operations

- [ ] 41. Final integration testing
  - [ ] 41.1 Test complete workflows end-to-end
    - Test upload → list → download workflow
    - Test create folder → navigate → upload → search workflow
    - Test delete → trash → restore workflow
    - Test link to patient → filter by patient workflow
    - Test quota enforcement across operations
    - Test concurrent access scenarios
    - Test error recovery and rollback
    - _Requirements: All_
  
  - [ ]* 41.2 Write integration tests
    - Test cross-module interactions
    - Test filesystem + patient records integration
    - Test plugin API integration

- [ ] 42. Final checkpoint - Complete system verification
  - Run all unit tests, property tests, and integration tests
  - Verify all 33 correctness properties pass
  - Test manually with real user scenarios
  - Check performance meets requirements
  - Verify error handling works correctly
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and UI interactions
- Implementation uses Rust for backend (Tauri) and TypeScript/React for frontend
- All file operations are async to prevent UI blocking
- Security is enforced through path validation, permission checks, and input validation
- The system maintains audit logs for all operations for medical compliance
