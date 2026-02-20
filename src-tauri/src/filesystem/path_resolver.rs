use std::path::{Path, PathBuf};

/// PathResolver handles translation between virtual paths (G:\ or GALENO:\) 
/// and physical paths in the galeno_files directory.
/// 
/// This component ensures:
/// - All virtual paths use the correct prefix (G:\ or GALENO:\)
/// - All physical paths remain within the galeno_files root directory
/// - Directory traversal attacks are prevented
/// - Path validation and sanitization
#[derive(Debug, Clone)]
pub struct PathResolver {
    /// The virtual root prefix (e.g., "G:\" or "GALENO:\")
    root_prefix: String,
    /// The physical root directory where all files are stored
    physical_root: PathBuf,
}

impl PathResolver {
    /// Creates a new PathResolver instance.
    /// 
    /// Initializes with:
    /// - Virtual prefix: "G:\"
    /// - Physical root: {app_data}/galeno_files
    /// 
    /// # Returns
    /// - `Ok(PathResolver)` if initialization succeeds
    /// - `Err(String)` if the app data directory cannot be determined or created
    /// 
    /// # Requirements
    /// Validates: Requirements 1.1, 1.2
    pub fn new() -> Result<Self, String> {
        // Get the application data directory
        let app_data_dir = crate::db::path::get_app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;
        
        // Create the galeno_files directory path
        let physical_root = app_data_dir.join("galeno_files");
        
        // Ensure the directory exists
        if !physical_root.exists() {
            std::fs::create_dir_all(&physical_root)
                .map_err(|e| format!("Failed to create galeno_files directory: {}", e))?;
        }
        
        Ok(Self {
            root_prefix: "G:\\".to_string(),
            physical_root,
        })
    }
    
    /// Translates a virtual path to its corresponding physical path.
    /// 
    /// # Arguments
    /// - `virtual_path`: A path starting with G:\ or GALENO:\
    /// 
    /// # Returns
    /// - `Ok(PathBuf)` containing the physical path within galeno_files/
    /// - `Err(String)` if the path is invalid or contains traversal attempts
    /// 
    /// # Examples
    /// ```
    /// // G:\Users\dr_smith\file.pdf -> {app_data}/galeno_files/Users/dr_smith/file.pdf
    /// ```
    /// 
    /// # Requirements
    /// Validates: Requirements 1.5, 1.6, 10.2, 10.3
    pub fn virtual_to_physical(&self, virtual_path: &str) -> Result<PathBuf, String> {
        // Validate the virtual path format
        self.validate_virtual_path(virtual_path)?;
        
        // Remove the prefix (G:\ or GALENO:\)
        let relative_path = self.strip_prefix(virtual_path)?;
        
        // Build the physical path
        let physical_path = self.physical_root.join(relative_path);
        
        // Ensure the path is within the root (prevent directory traversal)
        if !self.is_within_root(&physical_path) {
            return Err(format!(
                "Path traversal detected: path '{}' is outside galeno_files directory",
                virtual_path
            ));
        }
        
        Ok(physical_path)
    }
    
    /// Translates a physical path back to its virtual representation.
    /// 
    /// # Arguments
    /// - `physical_path`: A path within the galeno_files directory
    /// 
    /// # Returns
    /// - `Ok(String)` containing the virtual path with G:\ prefix
    /// - `Err(String)` if the path is not within galeno_files/
    /// 
    /// # Examples
    /// ```
    /// // {app_data}/galeno_files/Users/dr_smith/file.pdf -> G:\Users\dr_smith\file.pdf
    /// ```
    /// 
    /// # Requirements
    /// Validates: Requirements 1.5, 1.6
    pub fn physical_to_virtual(&self, physical_path: &Path) -> Result<String, String> {
        // Ensure the physical path is within the root
        if !self.is_within_root(physical_path) {
            return Err(format!(
                "Physical path is outside galeno_files directory: {}",
                physical_path.display()
            ));
        }
        
        // Get the relative path from the physical root
        let relative_path = physical_path
            .strip_prefix(&self.physical_root)
            .map_err(|e| format!("Failed to strip prefix: {}", e))?;
        
        // Convert to string and normalize separators to backslash
        let relative_str = relative_path
            .to_str()
            .ok_or_else(|| "Path contains invalid UTF-8 characters".to_string())?
            .replace('/', "\\");
        
        // Combine with the virtual prefix
        Ok(format!("{}{}", self.root_prefix, relative_str))
    }
    
    /// Validates that a virtual path has the correct format.
    /// 
    /// Checks:
    /// - Path starts with G:\ or GALENO:\
    /// - Path doesn't contain invalid characters
    /// - Path doesn't contain directory traversal sequences
    /// 
    /// # Arguments
    /// - `path`: The virtual path to validate
    /// 
    /// # Returns
    /// - `Ok(())` if the path is valid
    /// - `Err(String)` with a descriptive error message if invalid
    /// 
    /// # Requirements
    /// Validates: Requirements 1.1, 10.2
    pub fn validate_virtual_path(&self, path: &str) -> Result<(), String> {
        // Check if path starts with valid prefix
        if !path.starts_with("G:\\") && !path.starts_with("GALENO:\\") {
            return Err(format!(
                "Invalid virtual path: must start with 'G:\\' or 'GALENO:\\', got '{}'",
                path
            ));
        }
        
        // Check for invalid characters (these are forbidden in Windows paths)
        let invalid_chars = ['<', '>', '"', '|', '\0', '\x01', '\x02', '\x03', '\x04', 
                            '\x05', '\x06', '\x07', '\x08', '\x09', '\x0A', '\x0B', 
                            '\x0C', '\x0D', '\x0E', '\x0F', '\x10', '\x11', '\x12', 
                            '\x13', '\x14', '\x15', '\x16', '\x17', '\x18', '\x19', 
                            '\x1A', '\x1B', '\x1C', '\x1D', '\x1E', '\x1F'];
        
        for ch in invalid_chars.iter() {
            if path.contains(*ch) {
                return Err(format!(
                    "Invalid virtual path: contains forbidden character '{}'",
                    ch
                ));
            }
        }
        
        // Check for directory traversal attempts
        let path_lower = path.to_lowercase();
        if path_lower.contains("..\\") || path_lower.contains("../") || path_lower.contains("..") {
            return Err(
                "Invalid virtual path: directory traversal sequences (..) are not allowed"
                    .to_string()
            );
        }
        
        Ok(())
    }
    
    /// Generates the virtual path for a user's root folder.
    /// 
    /// # Arguments
    /// - `username`: The username to generate the path for
    /// 
    /// # Returns
    /// The virtual path to the user's folder (e.g., "G:\Users\dr_smith")
    /// 
    /// # Requirements
    /// Validates: Requirements 1.3, 1.4
    pub fn get_user_root(&self, username: &str) -> String {
        format!("{}Users\\{}", self.root_prefix, username)
    }
    
    /// Checks if a physical path is within the galeno_files root directory.
    /// 
    /// This prevents directory traversal attacks by ensuring all operations
    /// stay within the designated storage area.
    /// 
    /// # Arguments
    /// - `path`: The physical path to check
    /// 
    /// # Returns
    /// - `true` if the path is within the root directory
    /// - `false` if the path is outside the root directory
    /// 
    /// # Requirements
    /// Validates: Requirements 10.2, 10.3
    fn is_within_root(&self, path: &Path) -> bool {
        // Canonicalize both paths to resolve any .. or . components
        // If canonicalization fails, the path doesn't exist yet, so we check the parent
        let canonical_path = match path.canonicalize() {
            Ok(p) => p,
            Err(_) => {
                // Path doesn't exist yet, check if parent is within root
                // or if the path itself starts with root
                match path.parent() {
                    Some(parent) => {
                        // Try to canonicalize parent
                        match parent.canonicalize() {
                            Ok(p) => p,
                            Err(_) => {
                                // Parent doesn't exist either, just check if path starts with root
                                return path.starts_with(&self.physical_root);
                            }
                        }
                    }
                    None => return false,
                }
            }
        };
        
        let canonical_root = match self.physical_root.canonicalize() {
            Ok(p) => p,
            Err(_) => {
                // Root doesn't exist yet (shouldn't happen after new()), use as-is
                return canonical_path.starts_with(&self.physical_root);
            }
        };
        
        canonical_path.starts_with(canonical_root)
    }
    
    /// Strips the virtual prefix from a path.
    /// 
    /// # Arguments
    /// - `virtual_path`: A path starting with G:\ or GALENO:\
    /// 
    /// # Returns
    /// - `Ok(String)` containing the path without the prefix
    /// - `Err(String)` if the path doesn't have a valid prefix
    fn strip_prefix(&self, virtual_path: &str) -> Result<String, String> {
        if let Some(stripped) = virtual_path.strip_prefix("G:\\") {
            Ok(stripped.to_string())
        } else if let Some(stripped) = virtual_path.strip_prefix("GALENO:\\") {
            Ok(stripped.to_string())
        } else {
            Err(format!(
                "Path does not start with valid prefix: {}",
                virtual_path
            ))
        }
    }
    
    /// Gets the physical root directory path.
    /// 
    /// # Returns
    /// A reference to the physical root PathBuf
    pub fn get_physical_root(&self) -> &PathBuf {
        &self.physical_root
    }
    
    /// Gets the virtual root prefix.
    /// 
    /// # Returns
    /// A reference to the root prefix string
    pub fn get_root_prefix(&self) -> &str {
        &self.root_prefix
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_new_creates_resolver() {
        let resolver = PathResolver::new();
        assert!(resolver.is_ok());
        
        let resolver = resolver.unwrap();
        assert_eq!(resolver.get_root_prefix(), "G:\\");
        assert!(resolver.get_physical_root().ends_with("galeno_files"));
    }
    
    #[test]
    fn test_validate_virtual_path_accepts_valid_paths() {
        let resolver = PathResolver::new().unwrap();
        
        assert!(resolver.validate_virtual_path("G:\\Users\\test").is_ok());
        assert!(resolver.validate_virtual_path("GALENO:\\Users\\test").is_ok());
        assert!(resolver.validate_virtual_path("G:\\").is_ok());
    }
    
    #[test]
    fn test_validate_virtual_path_rejects_invalid_prefix() {
        let resolver = PathResolver::new().unwrap();
        
        assert!(resolver.validate_virtual_path("C:\\Users\\test").is_err());
        assert!(resolver.validate_virtual_path("/Users/test").is_err());
        assert!(resolver.validate_virtual_path("Users\\test").is_err());
    }
    
    #[test]
    fn test_validate_virtual_path_rejects_traversal() {
        let resolver = PathResolver::new().unwrap();
        
        assert!(resolver.validate_virtual_path("G:\\Users\\..\\test").is_err());
        assert!(resolver.validate_virtual_path("G:\\..\\test").is_err());
        assert!(resolver.validate_virtual_path("G:\\Users\\..").is_err());
    }
    
    #[test]
    fn test_validate_virtual_path_rejects_invalid_chars() {
        let resolver = PathResolver::new().unwrap();
        
        assert!(resolver.validate_virtual_path("G:\\Users\\<test>").is_err());
        assert!(resolver.validate_virtual_path("G:\\Users\\test|file").is_err());
        assert!(resolver.validate_virtual_path("G:\\Users\\\"test\"").is_err());
    }
    
    #[test]
    fn test_get_user_root() {
        let resolver = PathResolver::new().unwrap();
        
        assert_eq!(resolver.get_user_root("dr_smith"), "G:\\Users\\dr_smith");
        assert_eq!(resolver.get_user_root("admin"), "G:\\Users\\admin");
    }
    
    #[test]
    fn test_virtual_to_physical() {
        let resolver = PathResolver::new().unwrap();
        
        let result = resolver.virtual_to_physical("G:\\Users\\test\\file.pdf");
        assert!(result.is_ok());
        
        let physical = result.unwrap();
        assert!(physical.to_string_lossy().contains("galeno_files"));
        assert!(physical.to_string_lossy().contains("Users"));
        assert!(physical.to_string_lossy().contains("test"));
        assert!(physical.to_string_lossy().contains("file.pdf"));
    }
    
    #[test]
    fn test_virtual_to_physical_rejects_traversal() {
        let resolver = PathResolver::new().unwrap();
        
        let result = resolver.virtual_to_physical("G:\\Users\\..\\..\\etc\\passwd");
        assert!(result.is_err());
    }
    
    #[test]
    fn test_physical_to_virtual() {
        let resolver = PathResolver::new().unwrap();
        
        let physical = resolver.get_physical_root().join("Users").join("test").join("file.pdf");
        let result = resolver.physical_to_virtual(&physical);
        
        assert!(result.is_ok());
        let virtual_path = result.unwrap();
        assert!(virtual_path.starts_with("G:\\"));
        assert!(virtual_path.contains("Users"));
        assert!(virtual_path.contains("test"));
        assert!(virtual_path.contains("file.pdf"));
    }
    
    #[test]
    fn test_round_trip_conversion() {
        let resolver = PathResolver::new().unwrap();
        
        let original_virtual = "G:\\Users\\dr_smith\\documents\\report.pdf";
        let physical = resolver.virtual_to_physical(original_virtual).unwrap();
        let back_to_virtual = resolver.physical_to_virtual(&physical).unwrap();
        
        assert_eq!(original_virtual, back_to_virtual);
    }
}
