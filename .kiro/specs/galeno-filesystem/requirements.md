# Requirements Document

## Introduction

El Galeno Filesystem es un sistema de archivos virtual interno para la aplicación Galeno que permite a los usuarios gestionar archivos médicos y documentos de manera organizada. Similar a un explorador de archivos tradicional (como Windows Explorer), proporciona una interfaz familiar para navegar, crear, modificar y organizar archivos dentro del contexto de la aplicación médica.

El sistema utiliza un prefijo de ruta personalizado (G:\ o GALENO:\) para distinguir claramente el sistema de archivos virtual del sistema de archivos del sistema operativo, y almacena todos los datos en una carpeta dedicada dentro del directorio de la aplicación.

## Glossary

- **Galeno_Filesystem**: El sistema de archivos virtual que gestiona archivos y carpetas dentro de la aplicación Galeno

- **Virtual_Path**: Ruta dentro del sistema de archivos virtual usando el prefijo G:\ o GALENO:\

- **Physical_Path**: Ruta real en el sistema de archivos del sistema operativo (dentro de galeno_files/)

- **File_Manager_UI**: Interfaz de usuario tipo explorador de archivos para navegar el sistema virtual

- **User_Folder**: Carpeta personal del usuario autenticado dentro del sistema de archivos virtual

- **Root_Directory**: Directorio raíz del sistema de archivos virtual (G:\ o GALENO:\)

- **File_Entry**: Representación de un archivo o carpeta en el sistema virtual

- **Path_Resolver**: Componente que traduce rutas virtuales a rutas físicas

- **Storage_Backend**: Capa de almacenamiento que gestiona operaciones de archivos en galeno_files/

## Requirements

### Requirement 1: Virtual Filesystem Structure

**User Story:** Como usuario de Galeno, quiero que el sistema tenga un sistema de archivos virtual con estructura clara, para poder organizar mis documentos médicos de manera intuitiva.

#### Acceptance Criteria

1. THE Galeno_Filesystem SHALL use "G:\" or "GALENO:\" as the root prefix for all virtual paths

2. THE Galeno_Filesystem SHALL store all physical files in a "galeno_files" directory within the application data folder

3. THE Galeno_Filesystem SHALL create a "Users" folder at the root level (G:\Users or GALENO:\Users)

4. WHEN a user authenticates, THE Galeno_Filesystem SHALL create or access a user-specific folder at G:\Users\{username}

5. THE Path_Resolver SHALL translate virtual paths to physical paths maintaining the directory structure

6. THE Galeno_Filesystem SHALL preserve the hierarchical structure when mapping virtual to physical paths

### Requirement 2: File and Folder Navigation

**User Story:** Como usuario, quiero navegar por carpetas y archivos usando una interfaz familiar, para poder encontrar y acceder a mis documentos fácilmente.

#### Acceptance Criteria

1. THE File_Manager_UI SHALL display the current virtual path in the address bar

2. WHEN a user clicks on a folder, THE File_Manager_UI SHALL navigate into that folder and update the display

3. THE File_Manager_UI SHALL provide a "back" button to navigate to the parent directory

4. THE File_Manager_UI SHALL display a breadcrumb navigation showing the current path hierarchy

5. WHEN a user clicks on a breadcrumb segment, THE File_Manager_UI SHALL navigate to that directory level

6. THE File_Manager_UI SHALL display files and folders in a list or grid view with icons

7. THE File_Manager_UI SHALL show file metadata including name, size, type, and modification date

### Requirement 3: Folder Creation and Management

**User Story:** Como usuario, quiero crear y gestionar carpetas, para poder organizar mis archivos de manera estructurada.

#### Acceptance Criteria

1. WHEN a user requests to create a new folder, THE Galeno_Filesystem SHALL create the folder at the current virtual path

2. THE Galeno_Filesystem SHALL validate folder names to prevent invalid characters in paths

3. WHEN a folder name contains invalid characters, THE Galeno_Filesystem SHALL return a descriptive error message

4. THE Galeno_Filesystem SHALL prevent creation of folders with duplicate names in the same directory

5. WHEN a user requests to rename a folder, THE Galeno_Filesystem SHALL update the folder name and preserve its contents

6. WHEN a user requests to delete a folder, THE Galeno_Filesystem SHALL remove the folder and all its contents from both virtual and physical storage

7. THE Galeno_Filesystem SHALL provide a confirmation dialog before deleting non-empty folders

### Requirement 4: File Upload and Storage

**User Story:** Como usuario, quiero subir archivos desde mi computadora al sistema virtual, para poder almacenar documentos médicos en la aplicación.

#### Acceptance Criteria

1. WHEN a user selects files to upload, THE Galeno_Filesystem SHALL copy the files to the current virtual directory

2. THE Storage_Backend SHALL store uploaded files in the corresponding physical path within galeno_files/

3. THE Galeno_Filesystem SHALL preserve the original filename and extension of uploaded files

4. WHEN a file with the same name exists, THE Galeno_Filesystem SHALL prompt the user to rename, replace, or skip the upload

5. THE Galeno_Filesystem SHALL support multiple file uploads simultaneously

6. THE File_Manager_UI SHALL display upload progress for each file being uploaded

7. WHEN an upload fails, THE Galeno_Filesystem SHALL display an error message and allow retry

### Requirement 5: File Download and Export

**User Story:** Como usuario, quiero descargar archivos del sistema virtual a mi computadora, para poder compartir o usar documentos fuera de la aplicación.

#### Acceptance Criteria

1. WHEN a user requests to download a file, THE Galeno_Filesystem SHALL copy the file from physical storage to the user's selected location

2. THE File_Manager_UI SHALL provide a file picker dialog for selecting the download destination

3. THE Galeno_Filesystem SHALL preserve the original filename and extension during download

4. THE File_Manager_UI SHALL display download progress for large files

5. WHEN a download completes successfully, THE Galeno_Filesystem SHALL notify the user

6. WHEN a download fails, THE Galeno_Filesystem SHALL display an error message and allow retry

### Requirement 6: File Operations

**User Story:** Como usuario, quiero realizar operaciones básicas con archivos (renombrar, eliminar, mover), para poder gestionar mis documentos eficientemente.

#### Acceptance Criteria

1. WHEN a user requests to rename a file, THE Galeno_Filesystem SHALL update the filename in both virtual and physical storage

2. WHEN a user requests to delete a file, THE Galeno_Filesystem SHALL remove the file from both virtual and physical storage

3. WHEN a user requests to move a file, THE Galeno_Filesystem SHALL transfer the file to the target virtual directory

4. THE Galeno_Filesystem SHALL update physical storage paths when files are moved between virtual directories

5. THE Galeno_Filesystem SHALL validate that target directories exist before moving files

6. WHEN a move operation fails, THE Galeno_Filesystem SHALL preserve the original file location and display an error

7. THE File_Manager_UI SHALL provide drag-and-drop support for moving files between folders

### Requirement 7: File Metadata and Information

**User Story:** Como usuario, quiero ver información detallada sobre archivos y carpetas, para poder identificar y gestionar mis documentos correctamente.

#### Acceptance Criteria

1. THE Galeno_Filesystem SHALL store metadata for each File_Entry including name, size, type, created date, and modified date

2. WHEN a user requests file properties, THE File_Manager_UI SHALL display all available metadata

3. THE Galeno_Filesystem SHALL calculate and display folder sizes including all contained files

4. THE File_Manager_UI SHALL display file type icons based on file extensions

5. THE Galeno_Filesystem SHALL track the creation timestamp for all files and folders

6. THE Galeno_Filesystem SHALL update the modification timestamp whenever a file is changed

### Requirement 8: Search and Filtering

**User Story:** Como usuario, quiero buscar archivos por nombre, para poder encontrar documentos rápidamente sin navegar manualmente.

#### Acceptance Criteria

1. THE File_Manager_UI SHALL provide a search input field in the toolbar

2. WHEN a user enters a search query, THE Galeno_Filesystem SHALL search for files and folders matching the query in the current directory and subdirectories

3. THE Galeno_Filesystem SHALL perform case-insensitive partial matching on file and folder names

4. THE File_Manager_UI SHALL display search results with their full virtual paths

5. WHEN a user clicks on a search result, THE File_Manager_UI SHALL navigate to the containing folder and highlight the file

6. THE File_Manager_UI SHALL provide filter options for file type, size, and date ranges

7. WHEN no results are found, THE File_Manager_UI SHALL display a "no results" message

### Requirement 9: User Isolation and Permissions

**User Story:** Como administrador del sistema, quiero que cada usuario tenga su propia carpeta personal, para mantener la privacidad y organización de los documentos.

#### Acceptance Criteria

1. WHEN a user logs in, THE Galeno_Filesystem SHALL automatically navigate to their User_Folder at G:\Users\{username}

2. THE Galeno_Filesystem SHALL create the User_Folder if it doesn't exist on first login

3. THE Galeno_Filesystem SHALL restrict users from accessing other users' folders by default

4. THE Galeno_Filesystem SHALL allow users full read and write access to their own User_Folder

5. WHERE shared folders are configured, THE Galeno_Filesystem SHALL allow access to designated shared directories

6. THE Galeno_Filesystem SHALL maintain a permissions system for controlling folder access

### Requirement 10: Integration with Tauri Backend

**User Story:** Como desarrollador, quiero que el sistema de archivos use comandos Tauri para operaciones de archivos, para mantener la seguridad y consistencia con la arquitectura de la aplicación.

#### Acceptance Criteria

1. THE Storage_Backend SHALL implement all file operations as Tauri commands in Rust

2. THE Storage_Backend SHALL validate all file paths to prevent directory traversal attacks

3. THE Storage_Backend SHALL ensure all physical paths remain within the galeno_files directory

4. WHEN a path validation fails, THE Storage_Backend SHALL return an error and prevent the operation

5. THE Storage_Backend SHALL handle file system errors gracefully and return descriptive error messages

6. THE Storage_Backend SHALL use async operations for all file I/O to prevent blocking the UI

### Requirement 11: File Preview and Opening

**User Story:** Como usuario, quiero previsualizar y abrir archivos directamente desde el explorador, para poder ver el contenido sin descargar.

#### Acceptance Criteria

1. WHEN a user double-clicks a file, THE File_Manager_UI SHALL attempt to open or preview the file

2. WHERE the file is an image (jpg, png, gif, etc.), THE File_Manager_UI SHALL display an image preview

3. WHERE the file is a PDF, THE File_Manager_UI SHALL display a PDF viewer

4. WHERE the file is a text file, THE File_Manager_UI SHALL display a text viewer

5. WHERE the file type is not supported for preview, THE File_Manager_UI SHALL prompt to download the file

6. THE File_Manager_UI SHALL provide a "Open with system default" option for all file types

### Requirement 12: Context Menu and Shortcuts

**User Story:** Como usuario, quiero usar menús contextuales y atajos de teclado, para realizar operaciones comunes más rápidamente.

#### Acceptance Criteria

1. WHEN a user right-clicks on a file or folder, THE File_Manager_UI SHALL display a context menu with available operations

2. THE File_Manager_UI SHALL support keyboard shortcuts for common operations (Ctrl+C for copy, Ctrl+V for paste, Delete for delete, F2 for rename)

3. THE File_Manager_UI SHALL display keyboard shortcuts in the context menu

4. THE File_Manager_UI SHALL support multi-selection using Ctrl+Click and Shift+Click

5. WHEN multiple items are selected, THE File_Manager_UI SHALL enable batch operations (delete, move, download)

6. THE File_Manager_UI SHALL provide a "Select All" option (Ctrl+A)

### Requirement 13: Storage Quota and Limits

**User Story:** Como administrador, quiero establecer límites de almacenamiento por usuario, para gestionar el espacio en disco de manera eficiente.

#### Acceptance Criteria

1. THE Galeno_Filesystem SHALL track the total storage used by each user

2. THE Galeno_Filesystem SHALL enforce a configurable storage quota per user

3. WHEN a user approaches their storage limit (90%), THE Galeno_Filesystem SHALL display a warning notification

4. WHEN a user reaches their storage limit, THE Galeno_Filesystem SHALL prevent new file uploads and display an error message

5. THE File_Manager_UI SHALL display current storage usage and available space in the interface

6. THE Galeno_Filesystem SHALL provide an admin interface for configuring user quotas

### Requirement 14: File Type Restrictions

**User Story:** Como administrador, quiero controlar qué tipos de archivos pueden subirse, para mantener la seguridad y relevancia del contenido.

#### Acceptance Criteria

1. THE Galeno_Filesystem SHALL maintain a configurable list of allowed file extensions

2. WHEN a user attempts to upload a file with a disallowed extension, THE Galeno_Filesystem SHALL reject the upload and display an error message

3. THE Galeno_Filesystem SHALL validate file MIME types in addition to extensions to prevent spoofing

4. THE Galeno_Filesystem SHALL provide a default whitelist of common medical document formats (PDF, DOCX, JPG, PNG, DICOM)

5. THE Galeno_Filesystem SHALL allow administrators to customize the allowed file types list

6. THE File_Manager_UI SHALL display the allowed file types when prompting for uploads

### Requirement 15: Backup and Recovery

**User Story:** Como usuario, quiero que mis archivos estén protegidos contra pérdida accidental, para poder recuperar documentos importantes si es necesario.

#### Acceptance Criteria

1. THE Galeno_Filesystem SHALL maintain a trash/recycle bin for deleted files

2. WHEN a user deletes a file or folder, THE Galeno_Filesystem SHALL move it to the trash instead of permanent deletion

3. THE File_Manager_UI SHALL provide access to the trash folder

4. THE Galeno_Filesystem SHALL allow users to restore files from the trash to their original locations

5. THE Galeno_Filesystem SHALL permanently delete files from trash after a configurable retention period (default 30 days)

6. THE File_Manager_UI SHALL provide an "Empty Trash" option for manual permanent deletion

7. THE Galeno_Filesystem SHALL track original file locations for proper restoration

### Requirement 16: Performance and Scalability

**User Story:** Como usuario, quiero que el explorador de archivos responda rápidamente incluso con muchos archivos, para poder trabajar eficientemente.

#### Acceptance Criteria

1. THE File_Manager_UI SHALL implement virtual scrolling for directories with more than 100 items

2. THE Galeno_Filesystem SHALL load directory contents incrementally to avoid blocking

3. THE File_Manager_UI SHALL display loading indicators during file operations

4. THE Galeno_Filesystem SHALL cache directory listings to improve navigation performance

5. WHEN a directory changes, THE Galeno_Filesystem SHALL invalidate the cache and reload

6. THE Galeno_Filesystem SHALL handle directories with up to 10,000 files without performance degradation

### Requirement 17: Error Handling and Validation

**User Story:** Como usuario, quiero recibir mensajes de error claros cuando algo falla, para poder entender y resolver problemas.

#### Acceptance Criteria

1. WHEN a file operation fails, THE Galeno_Filesystem SHALL return a descriptive error message indicating the cause

2. THE File_Manager_UI SHALL display error messages in a user-friendly format

3. THE Galeno_Filesystem SHALL validate all user inputs before performing operations

4. WHEN a path is invalid, THE Galeno_Filesystem SHALL return an error without attempting the operation

5. THE Galeno_Filesystem SHALL log all errors to the application log for debugging

6. THE File_Manager_UI SHALL provide actionable suggestions in error messages when possible

### Requirement 18: Integration with Patient Records

**User Story:** Como usuario médico, quiero vincular archivos a registros de pacientes, para mantener toda la información médica organizada y accesible.

#### Acceptance Criteria

1. THE Galeno_Filesystem SHALL support tagging files with patient IDs

2. WHEN a file is tagged with a patient ID, THE Galeno_Filesystem SHALL create a reference in the patient record

3. THE File_Manager_UI SHALL provide an option to "Link to Patient" in the context menu

4. THE Galeno_Filesystem SHALL allow filtering files by patient ID

5. WHEN viewing a patient record, THE application SHALL display all linked files from the filesystem

6. THE Galeno_Filesystem SHALL maintain file links even when files are moved within the virtual filesystem

### Requirement 19: Concurrent Access and Locking

**User Story:** Como usuario en un entorno multi-usuario, quiero que el sistema maneje correctamente el acceso simultáneo a archivos, para evitar conflictos y pérdida de datos.

#### Acceptance Criteria

1. THE Galeno_Filesystem SHALL detect when a file is being modified by another user

2. WHEN a file is locked by another user, THE Galeno_Filesystem SHALL prevent modifications and display a notification

3. THE Galeno_Filesystem SHALL automatically release file locks when operations complete

4. THE Galeno_Filesystem SHALL implement a timeout for file locks to prevent indefinite locking

5. THE File_Manager_UI SHALL display lock status indicators on locked files

6. THE Galeno_Filesystem SHALL allow read access to locked files while preventing writes

### Requirement 20: Audit Trail and Activity Logging

**User Story:** Como administrador, quiero un registro de todas las operaciones de archivos, para auditoría y cumplimiento de regulaciones médicas.

#### Acceptance Criteria

1. THE Galeno_Filesystem SHALL log all file operations including create, read, update, delete, and move

2. THE Galeno_Filesystem SHALL record the user, timestamp, operation type, and affected file path for each operation

3. THE Galeno_Filesystem SHALL store audit logs in a secure, tamper-proof format

4. THE Galeno_Filesystem SHALL provide an admin interface for viewing and searching audit logs

5. THE Galeno_Filesystem SHALL retain audit logs for a configurable period (default 7 years for medical compliance)

6. THE Galeno_Filesystem SHALL support exporting audit logs in standard formats (CSV, JSON)
