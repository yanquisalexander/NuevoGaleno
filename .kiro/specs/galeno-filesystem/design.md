# Galeno Filesystem - Design Document

## Overview

El Galeno Filesystem es un sistema de archivos virtual integrado en la aplicación Galeno que proporciona una experiencia de gestión de archivos similar a un explorador de archivos tradicional, pero optimizado para el contexto médico. El sistema permite a los usuarios organizar, almacenar y gestionar documentos médicos de manera segura y eficiente dentro de la aplicación.

### Key Design Goals

1. **Familiaridad**: Interfaz tipo explorador de archivos (Windows Explorer/Finder) para reducir la curva de aprendizaje
2. **Aislamiento**: Sistema de archivos virtual completamente separado del sistema operativo
3. **Seguridad**: Control de acceso basado en usuarios con aislamiento de datos
4. **Integración**: Vinculación directa con registros de pacientes y otros módulos de Galeno
5. **Rendimiento**: Manejo eficiente de grandes volúmenes de archivos sin degradación
6. **Auditoría**: Registro completo de operaciones para cumplimiento normativo médico

### Virtual Path System

El sistema utiliza un prefijo distintivo (`G:\` o `GALENO:\`) para todas las rutas virtuales, lo que proporciona:
- Clara separación visual del sistema de archivos del SO
- Prevención de confusión entre rutas virtuales y físicas
- Facilidad para implementar validación y seguridad

Ejemplo de mapeo:
```
Virtual:  G:\Users\dr_smith\Pacientes\Juan_Perez\radiografia.jpg
Physical: {app_data}/galeno_files/Users/dr_smith/Pacientes/Juan_Perez/radiografia.jpg
```

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/TypeScript)              │
├─────────────────────────────────────────────────────────────┤
│  FileManagerUI Component                                     │
│  ├─ Navigation (Breadcrumbs, Back/Forward)                  │
│  ├─ File List (Grid/List View)                              │
│  ├─ Context Menu & Shortcuts                                │
│  ├─ Upload/Download Progress                                │
│  └─ Search & Filter Interface                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Tauri IPC
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Rust/Tauri)                       │
├─────────────────────────────────────────────────────────────┤
│  Filesystem Module                                           │
│  ├─ Path Resolver (Virtual ↔ Physical)                      │
│  ├─ File Operations Handler                                 │
│  ├─ Permission Manager                                      │
│  ├─ Metadata Manager                                        │
│  ├─ Storage Backend                                         │
│  ├─ Quota Manager                                           │
│  ├─ Audit Logger                                            │
│  └─ Lock Manager (Concurrent Access)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Physical Storage & Database                     │
├─────────────────────────────────────────────────────────────┤
│  galeno_files/                                               │
│  └─ Users/                                                   │
│      └─ {username}/                                          │
│          └─ ... (user files)                                 │
│                                                              │
│  SQLite Database                                             │
│  ├─ filesystem_metadata (files/folders metadata)            │
│  ├─ filesystem_permissions (access control)                 │
│  ├─ filesystem_locks (concurrent access)                    │
│  ├─ filesystem_audit_log (operations log)                   │
│  ├─ filesystem_patient_links (file-patient associations)    │
│  └─ filesystem_trash (deleted items)                        │
└─────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

#### Frontend Layer

**FileManagerUI Component**
- Renders the file explorer interface
- Handles user interactions (clicks, drag-drop, keyboard shortcuts)
- Manages local UI state (selection, view mode, sorting)
- Displays progress indicators for async operations
- Implements virtual scrolling for large directories

**State Management**
- Current directory path
- File/folder selection state
- Upload/download progress tracking
- Search results and filters
- User preferences (view mode, sort order)

#### Backend Layer

**Path Resolver**
- Translates virtual paths (G:\...) to physical paths
- Validates path structure and prevents traversal attacks
- Ensures all operations stay within galeno_files/
- Handles path normalization across platforms

**File Operations Handler**
- Implements CRUD operations for files and folders
- Coordinates with Permission Manager for access control
- Updates metadata after operations
- Triggers audit logging
- Handles error cases gracefully

**Permission Manager**
- Enforces user-based access control
- Manages user folders and shared directories
- Validates permissions before operations
- Integrates with session management

**Metadata Manager**
- Stores and retrieves file/folder metadata
- Calculates folder sizes recursively
- Tracks creation and modification timestamps
- Manages file type information

**Storage Backend**
- Direct filesystem I/O operations
- Async file operations to prevent UI blocking
- Handles file streaming for large files
- Implements atomic operations where possible

**Quota Manager**
- Tracks storage usage per user
- Enforces configurable quotas
- Provides usage statistics
- Triggers warnings at thresholds

**Audit Logger**
- Records all filesystem operations
- Stores tamper-proof logs
- Provides query interface for admins
- Implements log retention policies

**Lock Manager**
- Manages file locks for concurrent access
- Implements timeout mechanisms
- Provides lock status information
- Handles lock cleanup on errors

### Integration Points

**Session Management**
- Uses existing `session::get_current_user()` to identify user
- Automatically navigates to user's folder on login
- Enforces permissions based on user role

**Patient Records**
- Stores file-patient associations in database
- Provides API for linking files to patient IDs
- Displays linked files in patient views
- Maintains links when files are moved

**Plugin System**
- Exposes filesystem API to plugins with permissions
- New permission: `filesystem:read`, `filesystem:write`
- Allows plugins to access user's filesystem
- Sandboxed access (plugins can't access other users' files)

**Database Integration**
- Extends existing SQLite database with new tables
- Uses existing `db::get_connection()` pattern
- Follows established migration system

## Components and Interfaces

### Rust Backend Components

#### Core Types

```rust
// src-tauri/src/filesystem/mod.rs
pub mod types;
pub mod path_resolver;
pub mod operations;
pub mod permissions;
pub mod metadata;
pub mod storage;
pub mod quota;
pub mod audit;
pub mod locks;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualPath(String);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhysicalPath(PathBuf);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub id: i64,
    pub name: String,
    pub virtual_path: String,
    pub entry_type: EntryType,
    pub size: i64,
    pub created_at: String,
    pub modified_at: String,
    pub owner_username: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EntryType {
    File,
    Folder,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryListing {
    pub path: String,
    pub entries: Vec<FileEntry>,
    pub total_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub name: String,
    pub size: i64,
    pub file_type: String,
    pub mime_type: Option<String>,
    pub created_at: String,
    pub modified_at: String,
    pub owner: String,
    pub permissions: FilePermissions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilePermissions {
    pub can_read: bool,
    pub can_write: bool,
    pub can_delete: bool,
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
```

#### Path Resolver

```rust
// src-tauri/src/filesystem/path_resolver.rs

pub struct PathResolver {
    root_prefix: String,
    physical_root: PathBuf,
}

impl PathResolver {
    pub fn new() -> Result<Self, String>;
    
    pub fn virtual_to_physical(&self, virtual_path: &str) -> Result<PathBuf, String>;
    
    pub fn physical_to_virtual(&self, physical_path: &Path) -> Result<String, String>;
    
    pub fn validate_virtual_path(&self, path: &str) -> Result<(), String>;
    
    pub fn get_user_root(&self, username: &str) -> String;
    
    fn is_within_root(&self, path: &Path) -> bool;
}
```

#### File Operations

```rust
// src-tauri/src/filesystem/operations.rs

pub struct FileOperations {
    resolver: PathResolver,
    permissions: PermissionManager,
    metadata: MetadataManager,
    audit: AuditLogger,
}

impl FileOperations {
    pub fn new() -> Result<Self, String>;
    
    pub async fn list_directory(&self, virtual_path: &str, username: &str) 
        -> Result<DirectoryListing, String>;
    
    pub async fn create_folder(&self, virtual_path: &str, folder_name: &str, username: &str) 
        -> Result<FileEntry, String>;
    
    pub async fn delete_entry(&self, virtual_path: &str, username: &str) 
        -> Result<(), String>;
    
    pub async fn rename_entry(&self, virtual_path: &str, new_name: &str, username: &str) 
        -> Result<FileEntry, String>;
    
    pub async fn move_entry(&self, source_path: &str, dest_path: &str, username: &str) 
        -> Result<FileEntry, String>;
    
    pub async fn upload_file(&self, virtual_dir: &str, file_data: Vec<u8>, 
        filename: &str, username: &str) -> Result<FileEntry, String>;
    
    pub async fn download_file(&self, virtual_path: &str, username: &str) 
        -> Result<Vec<u8>, String>;
    
    pub async fn get_metadata(&self, virtual_path: &str, username: &str) 
        -> Result<FileMetadata, String>;
    
    pub async fn search(&self, query: &str, root_path: &str, username: &str) 
        -> Result<Vec<FileEntry>, String>;
}
```

#### Permission Manager

```rust
// src-tauri/src/filesystem/permissions.rs

pub struct PermissionManager;

impl PermissionManager {
    pub fn new() -> Self;
    
    pub fn can_access(&self, username: &str, virtual_path: &str) -> Result<bool, String>;
    
    pub fn can_read(&self, username: &str, virtual_path: &str) -> Result<bool, String>;
    
    pub fn can_write(&self, username: &str, virtual_path: &str) -> Result<bool, String>;
    
    pub fn can_delete(&self, username: &str, virtual_path: &str) -> Result<bool, String>;
    
    pub fn get_user_root(&self, username: &str) -> String;
    
    pub fn is_shared_path(&self, virtual_path: &str) -> Result<bool, String>;
    
    pub fn grant_access(&self, username: &str, virtual_path: &str, 
        permissions: FilePermissions) -> Result<(), String>;
}
```

#### Tauri Commands

```rust
// src-tauri/src/filesystem/commands.rs

#[tauri::command]
pub async fn fs_list_directory(virtual_path: String) -> Result<DirectoryListing, String>;

#[tauri::command]
pub async fn fs_create_folder(virtual_path: String, folder_name: String) 
    -> Result<FileEntry, String>;

#[tauri::command]
pub async fn fs_delete_entry(virtual_path: String) -> Result<(), String>;

#[tauri::command]
pub async fn fs_rename_entry(virtual_path: String, new_name: String) 
    -> Result<FileEntry, String>;

#[tauri::command]
pub async fn fs_move_entry(source_path: String, dest_path: String) 
    -> Result<FileEntry, String>;

#[tauri::command]
pub async fn fs_upload_file(virtual_dir: String, file_data: Vec<u8>, filename: String) 
    -> Result<FileEntry, String>;

#[tauri::command]
pub async fn fs_download_file(virtual_path: String) -> Result<Vec<u8>, String>;

#[tauri::command]
pub async fn fs_get_metadata(virtual_path: String) -> Result<FileMetadata, String>;

#[tauri::command]
pub async fn fs_search(query: String, root_path: String) -> Result<Vec<FileEntry>, String>;

#[tauri::command]
pub async fn fs_get_storage_quota() -> Result<StorageQuota, String>;

#[tauri::command]
pub async fn fs_link_to_patient(file_path: String, patient_id: i64) -> Result<(), String>;

#[tauri::command]
pub async fn fs_get_patient_files(patient_id: i64) -> Result<Vec<FileEntry>, String>;

#[tauri::command]
pub async fn fs_get_audit_logs(limit: Option<i64>, offset: Option<i64>) 
    -> Result<Vec<AuditLogEntry>, String>;

#[tauri::command]
pub async fn fs_move_to_trash(virtual_path: String) -> Result<(), String>;

#[tauri::command]
pub async fn fs_restore_from_trash(trash_id: i64) -> Result<FileEntry, String>;

#[tauri::command]
pub async fn fs_empty_trash() -> Result<(), String>;

#[tauri::command]
pub async fn fs_get_file_lock_status(virtual_path: String) -> Result<Option<FileLock>, String>;
```

### Frontend Components

#### FileManager Component

```typescript
// src/components/FileManager/FileManager.tsx

interface FileManagerProps {
  initialPath?: string;
  onFileSelect?: (file: FileEntry) => void;
  mode?: 'explorer' | 'picker';
}

export const FileManager: React.FC<FileManagerProps> = ({
  initialPath,
  onFileSelect,
  mode = 'explorer'
}) => {
  const [currentPath, setCurrentPath] = useState<string>(initialPath || 'G:\\');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Component implementation
};
```

#### Navigation Component

```typescript
// src/components/FileManager/Navigation.tsx

interface NavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
  canGoBack: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPath,
  onNavigate,
  onBack,
  canGoBack
}) => {
  // Breadcrumb navigation implementation
};
```

#### FileList Component

```typescript
// src/components/FileManager/FileList.tsx

interface FileListProps {
  entries: FileEntry[];
  selectedEntries: Set<string>;
  viewMode: 'list' | 'grid';
  onSelect: (entry: FileEntry, multi: boolean) => void;
  onOpen: (entry: FileEntry) => void;
  onContextMenu: (entry: FileEntry, position: { x: number; y: number }) => void;
}

export const FileList: React.FC<FileListProps> = ({
  entries,
  selectedEntries,
  viewMode,
  onSelect,
  onOpen,
  onContextMenu
}) => {
  // Virtual scrolling list/grid implementation
};
```

#### Context Menu Component

```typescript
// src/components/FileManager/ContextMenu.tsx

interface ContextMenuProps {
  entry: FileEntry | null;
  position: { x: number; y: number };
  onClose: () => void;
  actions: {
    onRename: () => void;
    onDelete: () => void;
    onMove: () => void;
    onDownload: () => void;
    onLinkToPatient: () => void;
    onProperties: () => void;
  };
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  entry,
  position,
  onClose,
  actions
}) => {
  // Context menu implementation
};
```

#### Upload/Download Progress Component

```typescript
// src/components/FileManager/ProgressIndicator.tsx

interface ProgressIndicatorProps {
  operations: Array<{
    id: string;
    type: 'upload' | 'download';
    filename: string;
    progress: number;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
  }>;
  onCancel: (id: string) => void;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  operations,
  onCancel
}) => {
  // Progress tracking UI
};
```

### API Hooks

```typescript
// src/hooks/useFileSystem.ts

export const useFileSystem = () => {
  const listDirectory = async (path: string): Promise<DirectoryListing> => {
    return await invoke('fs_list_directory', { virtualPath: path });
  };
  
  const createFolder = async (path: string, name: string): Promise<FileEntry> => {
    return await invoke('fs_create_folder', { virtualPath: path, folderName: name });
  };
  
  const deleteEntry = async (path: string): Promise<void> => {
    return await invoke('fs_delete_entry', { virtualPath: path });
  };
  
  const uploadFile = async (
    dir: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<FileEntry> => {
    const data = await file.arrayBuffer();
    return await invoke('fs_upload_file', {
      virtualDir: dir,
      fileData: Array.from(new Uint8Array(data)),
      filename: file.name
    });
  };
  
  const downloadFile = async (path: string): Promise<Blob> => {
    const data: number[] = await invoke('fs_download_file', { virtualPath: path });
    return new Blob([new Uint8Array(data)]);
  };
  
  const search = async (query: string, rootPath: string): Promise<FileEntry[]> => {
    return await invoke('fs_search', { query, rootPath });
  };
  
  const getStorageQuota = async (): Promise<StorageQuota> => {
    return await invoke('fs_get_storage_quota');
  };
  
  const linkToPatient = async (filePath: string, patientId: number): Promise<void> => {
    return await invoke('fs_link_to_patient', { filePath, patientId });
  };
  
  return {
    listDirectory,
    createFolder,
    deleteEntry,
    uploadFile,
    downloadFile,
    search,
    getStorageQuota,
    linkToPatient,
  };
};
```

## Data Models

### Database Schema

```sql
-- Metadata table for files and folders
CREATE TABLE IF NOT EXISTS filesystem_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    virtual_path TEXT NOT NULL UNIQUE,
    physical_path TEXT NOT NULL,
    name TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK(entry_type IN ('file', 'folder')),
    size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT,
    owner_username TEXT NOT NULL,
    created_at TEXT NOT NULL,
    modified_at TEXT NOT NULL,
    parent_path TEXT,
    FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX idx_filesystem_metadata_virtual_path ON filesystem_metadata(virtual_path);
CREATE INDEX idx_filesystem_metadata_parent_path ON filesystem_metadata(parent_path);
CREATE INDEX idx_filesystem_metadata_owner ON filesystem_metadata(owner_username);

-- Permissions table
CREATE TABLE IF NOT EXISTS filesystem_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    virtual_path TEXT NOT NULL,
    username TEXT NOT NULL,
    can_read BOOLEAN NOT NULL DEFAULT 0,
    can_write BOOLEAN NOT NULL DEFAULT 0,
    can_delete BOOLEAN NOT NULL DEFAULT 0,
    granted_at TEXT NOT NULL,
    granted_by TEXT NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
    UNIQUE(virtual_path, username)
);

CREATE INDEX idx_filesystem_permissions_path ON filesystem_permissions(virtual_path);
CREATE INDEX idx_filesystem_permissions_user ON filesystem_permissions(username);

-- File locks for concurrent access control
CREATE TABLE IF NOT EXISTS filesystem_locks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    virtual_path TEXT NOT NULL UNIQUE,
    locked_by TEXT NOT NULL,
    locked_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (locked_by) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX idx_filesystem_locks_path ON filesystem_locks(virtual_path);
CREATE INDEX idx_filesystem_locks_expires ON filesystem_locks(expires_at);

-- Audit log for all operations
CREATE TABLE IF NOT EXISTS filesystem_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    username TEXT NOT NULL,
    operation TEXT NOT NULL,
    virtual_path TEXT NOT NULL,
    target_path TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    metadata TEXT,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE SET NULL
);

CREATE INDEX idx_filesystem_audit_timestamp ON filesystem_audit_log(timestamp);
CREATE INDEX idx_filesystem_audit_user ON filesystem_audit_log(username);
CREATE INDEX idx_filesystem_audit_operation ON filesystem_audit_log(operation);

-- Patient file associations
CREATE TABLE IF NOT EXISTS filesystem_patient_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    virtual_path TEXT NOT NULL,
    patient_id INTEGER NOT NULL,
    linked_at TEXT NOT NULL,
    linked_by TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (linked_by) REFERENCES users(username) ON DELETE SET NULL,
    UNIQUE(virtual_path, patient_id)
);

CREATE INDEX idx_filesystem_patient_links_path ON filesystem_patient_links(virtual_path);
CREATE INDEX idx_filesystem_patient_links_patient ON filesystem_patient_links(patient_id);

-- Trash/Recycle bin
CREATE TABLE IF NOT EXISTS filesystem_trash (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_virtual_path TEXT NOT NULL,
    original_parent_path TEXT NOT NULL,
    name TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK(entry_type IN ('file', 'folder')),
    size INTEGER NOT NULL,
    owner_username TEXT NOT NULL,
    deleted_at TEXT NOT NULL,
    deleted_by TEXT NOT NULL,
    physical_backup_path TEXT NOT NULL,
    FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY (deleted_by) REFERENCES users(username) ON DELETE SET NULL
);

CREATE INDEX idx_filesystem_trash_owner ON filesystem_trash(owner_username);
CREATE INDEX idx_filesystem_trash_deleted_at ON filesystem_trash(deleted_at);

-- Storage quotas
CREATE TABLE IF NOT EXISTS filesystem_quotas (
    username TEXT PRIMARY KEY,
    quota_bytes INTEGER NOT NULL,
    used_bytes INTEGER NOT NULL DEFAULT 0,
    last_calculated TEXT NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- File type restrictions (whitelist)
CREATE TABLE IF NOT EXISTS filesystem_allowed_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extension TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT 1
);

-- Insert default allowed types for medical documents
INSERT OR IGNORE INTO filesystem_allowed_types (extension, mime_type, description) VALUES
    ('pdf', 'application/pdf', 'PDF Document'),
    ('jpg', 'image/jpeg', 'JPEG Image'),
    ('jpeg', 'image/jpeg', 'JPEG Image'),
    ('png', 'image/png', 'PNG Image'),
    ('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Word Document'),
    ('doc', 'application/msword', 'Word Document (Legacy)'),
    ('txt', 'text/plain', 'Text File'),
    ('dcm', 'application/dicom', 'DICOM Medical Image'),
    ('xml', 'application/xml', 'XML Document'),
    ('csv', 'text/csv', 'CSV File');
```

### TypeScript Interfaces

```typescript
// src/types/filesystem.ts

export interface FileEntry {
  id: number;
  name: string;
  virtualPath: string;
  entryType: 'file' | 'folder';
  size: number;
  createdAt: string;
  modifiedAt: string;
  ownerUsername: string;
}

export interface DirectoryListing {
  path: string;
  entries: FileEntry[];
  totalCount: number;
}

export interface FileMetadata {
  name: string;
  size: number;
  fileType: string;
  mimeType?: string;
  createdAt: string;
  modifiedAt: string;
  owner: string;
  permissions: FilePermissions;
}

export interface FilePermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface StorageQuota {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  percentageUsed: number;
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  username: string;
  operation: string;
  path: string;
  success: boolean;
  errorMessage?: string;
}

export interface FileLock {
  filePath: string;
  lockedBy: string;
  lockedAt: string;
  expiresAt: string;
}

export interface PatientFileLink {
  id: number;
  virtualPath: string;
  patientId: number;
  linkedAt: string;
  linkedBy: string;
  notes?: string;
}

export interface TrashEntry {
  id: number;
  originalVirtualPath: string;
  originalParentPath: string;
  name: string;
  entryType: 'file' | 'folder';
  size: number;
  ownerUsername: string;
  deletedAt: string;
  deletedBy: string;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Virtual Path Prefix Consistency

*For any* virtual path in the system, it must start with either "G:\" or "GALENO:\" prefix.

**Validates: Requirements 1.1**

### Property 2: Physical Storage Containment

*For any* file operation (create, upload, move), the resulting physical path must be within the galeno_files/ directory.

**Validates: Requirements 1.2, 4.2, 10.3**

### Property 3: Path Mapping Preservation

*For any* virtual path, converting to physical and back to virtual should preserve the hierarchical structure and path components.

**Validates: Requirements 1.5, 1.6**

### Property 4: User Folder Creation on Authentication

*For any* authenticated user, a user-specific folder at G:\Users\{username} must exist after authentication.

**Validates: Requirements 1.4, 9.2**

### Property 5: Directory Traversal Prevention

*For any* path containing traversal attempts (../, ..\, or similar), the system must reject the path and return an error.

**Validates: Requirements 10.2, 10.4**

### Property 6: Folder Creation Idempotency

*For any* valid folder name and path, creating a folder should result in exactly one folder with that name at that location.

**Validates: Requirements 3.1, 3.4**

### Property 7: Invalid Character Rejection

*For any* folder or file name containing invalid path characters (/, \, :, *, ?, ", <, >, |), the system must reject the operation with a descriptive error.

**Validates: Requirements 3.2, 3.3**

### Property 8: Folder Rename Content Preservation

*For any* folder with contents, renaming the folder must preserve all contained files and subdirectories with their relative paths intact.

**Validates: Requirements 3.5**

### Property 9: Deletion Consistency

*For any* file or folder deletion, the entry must be removed from both virtual metadata and physical storage, or moved to trash if trash is enabled.

**Validates: Requirements 3.6, 6.2, 15.2**

### Property 10: Upload-Download Round Trip

*For any* file uploaded to the system, downloading it should produce a file with identical name, extension, and content.

**Validates: Requirements 4.1, 4.3, 5.1, 5.3**

### Property 11: File Move Consistency

*For any* file moved from source to destination, the file must exist at the destination with updated physical path and must not exist at the source.

**Validates: Requirements 6.3, 6.4**

### Property 12: Move Target Validation

*For any* move operation to a non-existent target directory, the operation must fail with a validation error and the file must remain at its original location.

**Validates: Requirements 6.5, 6.6**

### Property 13: Metadata Completeness

*For any* file or folder entry, metadata must include name, size, type, creation timestamp, and modification timestamp.

**Validates: Requirements 7.1, 7.5**

### Property 14: Folder Size Calculation

*For any* folder, the calculated size must equal the sum of all contained files recursively.

**Validates: Requirements 7.3**

### Property 15: Timestamp Update on Modification

*For any* file modification operation (rename, content change), the modification timestamp must be updated to a value greater than the previous timestamp.

**Validates: Requirements 7.6**

### Property 16: Search Case Insensitivity

*For any* search query string, results should be identical regardless of the case of the query (uppercase, lowercase, or mixed).

**Validates: Requirements 8.3**

### Property 17: Search Result Path Completeness

*For any* search result, the returned entry must include the complete virtual path from root to the file.

**Validates: Requirements 8.4**

### Property 18: User Folder Isolation

*For any* user attempting to access another user's folder (G:\Users\{other_username}), the operation must be denied unless explicit shared permissions exist.

**Validates: Requirements 9.3**

### Property 19: Own Folder Full Access

*For any* user operating within their own folder (G:\Users\{username}), all read and write operations must be permitted.

**Validates: Requirements 9.4**

### Property 20: Shared Folder Access

*For any* user with permissions to a shared folder, operations within that folder must succeed according to their permission level.

**Validates: Requirements 9.5**

### Property 21: File Type Validation

*For any* file upload with an extension not in the allowed types list, the upload must be rejected with an error message indicating the file type is not allowed.

**Validates: Requirements 14.2**

### Property 22: MIME Type Verification

*For any* uploaded file, the MIME type must match the expected MIME type for its extension to prevent spoofing.

**Validates: Requirements 14.3**

### Property 23: Trash Restoration Round Trip

*For any* file or folder moved to trash, restoring it must place it back at its original virtual path with all contents and metadata intact.

**Validates: Requirements 15.4, 15.7**

### Property 24: Storage Quota Enforcement

*For any* user at or above their storage quota limit, new file upload operations must be rejected with a quota exceeded error.

**Validates: Requirements 13.2, 13.4**

### Property 25: Quota Warning Threshold

*For any* user whose storage usage reaches 90% of their quota, a warning notification must be displayed.

**Validates: Requirements 13.3**

### Property 26: Patient Link Preservation on Move

*For any* file linked to a patient ID, moving the file to a different virtual path must preserve the patient link association.

**Validates: Requirements 18.6**

### Property 27: Patient File Filtering

*For any* patient ID, filtering files by that patient ID must return exactly the set of files that have been linked to that patient.

**Validates: Requirements 18.4**

### Property 28: File Lock Write Prevention

*For any* file locked by another user, write operations must be rejected while read operations must succeed.

**Validates: Requirements 19.2, 19.6**

### Property 29: Lock Release on Completion

*For any* file operation that acquires a lock, the lock must be released when the operation completes (success or failure).

**Validates: Requirements 19.3**

### Property 30: Audit Log Completeness

*For any* file operation (create, read, update, delete, move), an audit log entry must be created containing username, timestamp, operation type, and affected path.

**Validates: Requirements 20.1, 20.2**

### Property 31: Error Message Descriptiveness

*For any* failed operation, the error message must indicate the cause of the failure and be returned without executing the operation.

**Validates: Requirements 17.1, 17.4**

### Property 32: Error Logging

*For any* error that occurs, an entry must be written to the application log with error details.

**Validates: Requirements 17.5**

### Property 33: Input Validation Before Execution

*For any* user input (path, filename, etc.), validation must occur and reject invalid inputs before any filesystem operation is attempted.

**Validates: Requirements 17.3**

## Error Handling

### Error Categories

The filesystem implements comprehensive error handling across several categories:

#### Path Validation Errors
- **Invalid Path Format**: Virtual path doesn't start with G:\ or GALENO:\
- **Directory Traversal Attempt**: Path contains ../ or similar traversal sequences
- **Path Outside Root**: Resolved physical path is outside galeno_files/
- **Invalid Characters**: Path contains forbidden characters

**Handling**: Return descriptive error immediately, log to audit log, do not attempt operation.

#### Permission Errors
- **Access Denied**: User lacks permission to access the path
- **Quota Exceeded**: User has reached storage limit
- **File Locked**: File is locked by another user for write operations

**Handling**: Return permission error with details, log to audit log, suggest corrective action.

#### File System Errors
- **File Not Found**: Requested file or folder doesn't exist
- **File Already Exists**: Attempting to create duplicate
- **Disk Full**: Physical storage is full
- **I/O Error**: Low-level filesystem error

**Handling**: Return filesystem error with cause, log to application log and audit log, preserve system state.

#### Validation Errors
- **Invalid File Type**: File extension not in allowed list
- **MIME Type Mismatch**: File content doesn't match extension
- **Invalid Name**: Filename contains invalid characters
- **Target Not Found**: Move/copy destination doesn't exist

**Handling**: Return validation error with specific issue, log to audit log, provide actionable suggestion.

### Error Recovery Strategies

#### Atomic Operations
All file operations are designed to be atomic where possible:
- Create operations: Either fully succeed or leave no trace
- Delete operations: Move to trash first, then remove (two-phase)
- Move operations: Copy to destination, verify, then remove source
- Rename operations: Update metadata and physical path together

#### Transaction Rollback
For operations involving multiple steps:
1. Record initial state
2. Perform operation steps
3. If any step fails, rollback to initial state
4. Log the failure and return error

#### Lock Cleanup
File locks are automatically cleaned up:
- On successful operation completion
- On operation failure
- On timeout expiration
- On application shutdown

#### Audit Trail
All errors are logged to audit log with:
- Timestamp
- Username
- Operation attempted
- Error type and message
- System state before error

### User-Facing Error Messages

Error messages follow these principles:
1. **Clear**: Explain what went wrong in plain language
2. **Actionable**: Suggest how to fix the problem when possible
3. **Specific**: Provide relevant details (filename, path, etc.)
4. **Non-technical**: Avoid implementation details

Examples:
```
❌ "Cannot create folder: A folder named 'Reports' already exists in this location."
✅ Suggestion: "Choose a different name or delete the existing folder first."

❌ "Cannot upload file: File type '.exe' is not allowed."
✅ Suggestion: "Allowed file types: PDF, DOCX, JPG, PNG, DICOM. Please select a different file."

❌ "Cannot access folder: You don't have permission to view this folder."
✅ Suggestion: "Contact your administrator to request access."

❌ "Cannot save file: Storage quota exceeded (5.2 GB / 5.0 GB used)."
✅ Suggestion: "Delete some files or contact your administrator to increase your quota."
```

## Testing Strategy

### Dual Testing Approach

The Galeno Filesystem will be validated using both unit tests and property-based tests, as they serve complementary purposes:

**Unit Tests** focus on:
- Specific examples and edge cases
- Integration points with existing Galeno systems (session, database, plugins)
- UI component rendering and interactions
- Error handling for specific scenarios
- Setup and initialization sequences

**Property-Based Tests** focus on:
- Universal properties that must hold for all inputs
- Comprehensive input coverage through randomization
- Invariants that must be maintained across operations
- Round-trip properties (upload/download, trash/restore, etc.)
- Consistency between virtual and physical storage

### Property-Based Testing Configuration

**Library Selection**: 
- Rust backend: Use `proptest` crate for property-based testing
- TypeScript frontend: Use `fast-check` library for property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `// Feature: galeno-filesystem, Property {number}: {property_text}`

**Example Property Test Structure** (Rust):
```rust
#[cfg(test)]
mod property_tests {
    use proptest::prelude::*;
    
    // Feature: galeno-filesystem, Property 1: Virtual Path Prefix Consistency
    proptest! {
        #[test]
        fn virtual_paths_have_correct_prefix(
            path_components in prop::collection::vec("[a-zA-Z0-9_-]+", 1..10)
        ) {
            let virtual_path = create_virtual_path(&path_components);
            assert!(virtual_path.starts_with("G:\\") || virtual_path.starts_with("GALENO:\\"));
        }
    }
    
    // Feature: galeno-filesystem, Property 3: Path Mapping Preservation
    proptest! {
        #[test]
        fn path_mapping_round_trip(
            path_components in prop::collection::vec("[a-zA-Z0-9_-]+", 1..10)
        ) {
            let resolver = PathResolver::new().unwrap();
            let virtual_path = create_virtual_path(&path_components);
            let physical_path = resolver.virtual_to_physical(&virtual_path).unwrap();
            let back_to_virtual = resolver.physical_to_virtual(&physical_path).unwrap();
            assert_eq!(virtual_path, back_to_virtual);
        }
    }
}
```

**Example Property Test Structure** (TypeScript):
```typescript
import fc from 'fast-check';

describe('Galeno Filesystem Properties', () => {
  // Feature: galeno-filesystem, Property 10: Upload-Download Round Trip
  it('uploaded files can be downloaded with identical content', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 255 }), // filename
        fc.uint8Array({ minLength: 0, maxLength: 10000 }), // file content
        async (filename, content) => {
          const file = new File([content], filename);
          const uploaded = await uploadFile('G:\\test', file);
          const downloaded = await downloadFile(uploaded.virtualPath);
          const downloadedContent = new Uint8Array(await downloaded.arrayBuffer());
          
          expect(downloadedContent).toEqual(content);
          expect(downloaded.name).toBe(filename);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: galeno-filesystem, Property 16: Search Case Insensitivity
  it('search results are case-insensitive', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (query) => {
          const resultsLower = await search(query.toLowerCase(), 'G:\\');
          const resultsUpper = await search(query.toUpperCase(), 'G:\\');
          const resultsMixed = await search(query, 'G:\\');
          
          expect(resultsLower).toEqual(resultsUpper);
          expect(resultsLower).toEqual(resultsMixed);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Strategy

**Backend Unit Tests** (Rust):
- Test each module independently (path_resolver, operations, permissions, etc.)
- Mock filesystem operations for deterministic testing
- Test error conditions with specific invalid inputs
- Test integration with database (metadata, audit logs, etc.)
- Test session integration (user authentication, permissions)

**Frontend Unit Tests** (TypeScript/React):
- Test component rendering with various props
- Test user interactions (clicks, keyboard shortcuts, drag-drop)
- Test state management and updates
- Mock Tauri IPC calls
- Test error display and user feedback

**Integration Tests**:
- Test complete workflows (upload → list → download)
- Test cross-module interactions (filesystem + patient records)
- Test plugin API integration
- Test concurrent access scenarios
- Test quota enforcement across operations

### Test Coverage Goals

- **Backend Code Coverage**: Minimum 80% line coverage
- **Frontend Code Coverage**: Minimum 75% line coverage
- **Property Tests**: All 33 correctness properties implemented
- **Integration Tests**: All major workflows covered
- **Edge Cases**: All error conditions tested

### Continuous Testing

- Run unit tests on every commit
- Run property tests on every pull request
- Run integration tests nightly
- Monitor test execution time and optimize slow tests
- Track flaky tests and fix root causes

### Test Data Management

**Generators for Property Tests**:
- Valid filenames (alphanumeric, spaces, common punctuation)
- Invalid filenames (forbidden characters)
- Virtual paths (various depths and structures)
- File contents (various sizes, binary and text)
- User credentials (usernames, roles)
- Patient IDs (valid and invalid)

**Fixtures for Unit Tests**:
- Sample file structures
- User accounts with different permissions
- Pre-populated metadata
- Mock filesystem responses
- Sample audit log entries

### Performance Testing

While not part of the correctness properties, performance tests should verify:
- Directory listing with 10,000 files completes in < 1 second
- File upload/download throughput meets minimum requirements
- Search across large directory trees completes in reasonable time
- UI remains responsive during file operations
- Memory usage stays within acceptable bounds

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready for Implementation
