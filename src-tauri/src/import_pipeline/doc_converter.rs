use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

/// Obtiene el script de PowerShell para conversión concurrente
pub fn get_conversion_script() -> &'static str {
    r#"
param (
    [Parameter(Mandatory=$true)]
    [string]$PathsFile
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$successCount = 0
$errors = @()
$processed = 0

# Leer lista de archivos
$filePaths = Get-Content -Path $PathsFile -Encoding UTF8 | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
$totalFiles = $filePaths.Count

# Funcion para convertir un archivo
function Convert-DocToTxt {
    param(
        [string]$FilePath,
        [int]$FileNumber,
        [int]$Total
    )
    
    $result = @{
        success = $false
        error = $null
        file = $FilePath
        txtPath = $null
    }
    
    try {
        $fileName = [System.IO.Path]::GetFileName($FilePath)
        Write-Host "PROGRESS|$FileNumber|$Total|Convirtiendo $fileName"
        
        # Crear instancia de Word para este archivo
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $word.DisplayAlerts = 0
        
        # Abrir documento
        $doc = $word.Documents.Open($FilePath, $false, $true)
        
        # Generar ruta de salida .txt
        $txtPath = [System.IO.Path]::ChangeExtension($FilePath, ".txt")
        
        # Guardar como texto plano (formato 2 = wdFormatText)
        $doc.SaveAs([ref]$txtPath, [ref]2)
        
        # Cerrar documento
        $doc.Close($false)
        $word.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
        
        # Eliminar .doc original si la conversion fue exitosa
        if (Test-Path $txtPath) {
            Remove-Item -Path $FilePath -Force
            Write-Host "PROGRESS|$FileNumber|$Total|[OK] $fileName -> eliminado original"
        }
        
        $result.success = $true
        $result.txtPath = $txtPath
    } catch {
        $result.error = $_.Exception.Message
        Write-Host "PROGRESS|$FileNumber|$Total|[ERROR] Error en $fileName"
        
        # Cerrar Word si quedo abierto
        try {
            if ($word) {
                $word.Quit()
                [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
            }
        } catch {}
    }
    
    return $result
}

# Procesar archivos con throttling (maximo 3 instancias de Word en paralelo)
$throttleLimit = 3
$jobs = @()

for ($i = 0; $i -lt $filePaths.Count; $i++) {
    $filePath = $filePaths[$i]
    $fileNumber = $i + 1
    
    # Iniciar job
    $job = Start-Job -ScriptBlock ${function:Convert-DocToTxt} -ArgumentList $filePath, $fileNumber, $totalFiles
    $jobs += $job
    
    # Limitar concurrencia
    while (($jobs | Where-Object { $_.State -eq 'Running' }).Count -ge $throttleLimit) {
        Start-Sleep -Milliseconds 100
        
        # Recibir progreso de jobs completados
        $completedJobs = $jobs | Where-Object { $_.State -eq 'Completed' }
        foreach ($completedJob in $completedJobs) {
            $jobResult = Receive-Job -Job $completedJob
            if ($jobResult.success) {
                $successCount++
            } else {
                $errors += "Error en $($jobResult.file): $($jobResult.error)"
            }
            Remove-Job -Job $completedJob
        }
        $jobs = $jobs | Where-Object { $_.State -ne 'Completed' }
    }
}

# Esperar a que terminen todos los jobs
Wait-Job -Job $jobs | Out-Null

# Recoger resultados finales
foreach ($job in $jobs) {
    $jobResult = Receive-Job -Job $job
    if ($jobResult.success) {
        $successCount++
    } else {
        $errors += "Error en $($jobResult.file): $($jobResult.error)"
    }
    Remove-Job -Job $job
}

Write-Host "COMPLETE|$successCount|$($errors.Count)"

# Salida JSON
$result = @{
    success = $successCount
    errors = $errors
    total = $totalFiles
}
$result | ConvertTo-Json
"#
}

/// Detecta archivos .doc en el directorio de historias clínicas
pub fn detect_doc_files(source_root: &str) -> Result<Vec<PathBuf>, String> {
    let root = PathBuf::from(source_root);
    let history_dir = root.join("GALENO~1").join("Historias Clinicas");

    if !history_dir.exists() {
        return Ok(Vec::new());
    }

    let mut doc_files = Vec::new();

    for entry in WalkDir::new(&history_dir)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();
        if let Some(ext) = path.extension() {
            if ext.eq_ignore_ascii_case("doc") {
                // Verificar que no sea un archivo temporal de Word
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    if !file_name.starts_with("~$") {
                        doc_files.push(path.to_path_buf());
                    }
                }
            }
        }
    }

    Ok(doc_files)
}

/// Convierte archivos .doc a .txt usando Word COM automation (Windows)
///
/// Retorna: (convertidos_ok, errores)
pub fn convert_doc_to_txt(doc_files: &[PathBuf]) -> Result<(usize, Vec<String>), String> {
    if doc_files.is_empty() {
        return Ok((0, Vec::new()));
    }

    // Crear script de PowerShell con procesamiento concurrente, progreso y eliminación
    let script = r#"
param (
    [Parameter(Mandatory=$true)]
    [string]$PathsFile
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$successCount = 0
$errors = @()
$processed = 0

# Leer lista de archivos
$filePaths = Get-Content -Path $PathsFile -Encoding UTF8 | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
$totalFiles = $filePaths.Count

# Función para convertir un archivo
function Convert-DocToTxt {
    param(
        [string]$FilePath,
        [int]$FileNumber,
        [int]$Total
    )
    
    $result = @{
        success = $false
        error = $null
        file = $FilePath
        txtPath = $null
    }
    
    try {
        $fileName = [System.IO.Path]::GetFileName($FilePath)
        Write-Host "PROGRESS|$FileNumber|$Total|Convirtiendo $fileName"
        
        # Crear instancia de Word para este archivo
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $word.DisplayAlerts = 0
        
        # Abrir documento
        $doc = $word.Documents.Open($FilePath, $false, $true)
        
        # Generar ruta de salida .txt
        $txtPath = [System.IO.Path]::ChangeExtension($FilePath, ".txt")
        
        # Guardar como texto plano (formato 2 = wdFormatText)
        $doc.SaveAs([ref]$txtPath, [ref]2)
        
        # Cerrar documento
        $doc.Close($false)
        $word.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
        
        # Eliminar .doc original si la conversión fue exitosa
        if (Test-Path $txtPath) {
            Remove-Item -Path $FilePath -Force
            Write-Host "PROGRESS|$FileNumber|$Total|✓ $fileName → eliminado original"
        }
        
        $result.success = $true
        $result.txtPath = $txtPath
    } catch {
        $result.error = $_.Exception.Message
        Write-Host "PROGRESS|$FileNumber|$Total|✗ Error en $fileName"
        
        # Cerrar Word si quedó abierto
        try {
            if ($word) {
                $word.Quit()
                [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
            }
        } catch {}
    }
    
    return $result
}

# Procesar archivos con throttling (máximo 3 instancias de Word en paralelo)
$throttleLimit = 3
$jobs = @()

for ($i = 0; $i -lt $filePaths.Count; $i++) {
    $filePath = $filePaths[$i]
    $fileNumber = $i + 1
    
    # Iniciar job
    $job = Start-Job -ScriptBlock ${function:Convert-DocToTxt} -ArgumentList $filePath, $fileNumber, $totalFiles
    $jobs += $job
    
    # Limitar concurrencia
    while (($jobs | Where-Object { $_.State -eq 'Running' }).Count -ge $throttleLimit) {
        Start-Sleep -Milliseconds 100
        
        # Recibir progreso de jobs completados
        $completedJobs = $jobs | Where-Object { $_.State -eq 'Completed' }
        foreach ($completedJob in $completedJobs) {
            $jobResult = Receive-Job -Job $completedJob
            if ($jobResult.success) {
                $successCount++
            } else {
                $errors += "Error en $($jobResult.file): $($jobResult.error)"
            }
            Remove-Job -Job $completedJob
        }
        $jobs = $jobs | Where-Object { $_.State -ne 'Completed' }
    }
}

# Esperar a que terminen todos los jobs
Wait-Job -Job $jobs | Out-Null

# Recoger resultados finales
foreach ($job in $jobs) {
    $jobResult = Receive-Job -Job $job
    if ($jobResult.success) {
        $successCount++
    } else {
        $errors += "Error en $($jobResult.file): $($jobResult.error)"
    }
    Remove-Job -Job $job
}

Write-Host "COMPLETE|$successCount|$($errors.Count)"

# Salida JSON
$result = @{
    success = $successCount
    errors = $errors
    total = $totalFiles
}
$result | ConvertTo-Json
"#;

    // Guardar script temporal
    let temp_dir = std::env::temp_dir();
    let script_path = temp_dir.join("convert_doc_to_txt.ps1");
    std::fs::write(&script_path, script)
        .map_err(|e| format!("Error creando script temporal: {}", e))?;

    // Guardar lista de paths en archivo temporal (una línea por archivo)
    let paths_file = temp_dir.join("doc_files_to_convert.txt");
    let paths_content = doc_files
        .iter()
        .map(|p| p.display().to_string())
        .collect::<Vec<_>>()
        .join("\n");
    std::fs::write(&paths_file, paths_content)
        .map_err(|e| format!("Error creando archivo de paths: {}", e))?;

    // Ejecutar PowerShell con captura de salida en tiempo real
    let child = Command::new("powershell.exe")
        .args(&[
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            script_path.to_str().unwrap(),
            "-PathsFile",
            paths_file.to_str().unwrap(),
        ])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Error ejecutando PowerShell: {}", e))?;

    // Capturar salida en tiempo real (nota: en esta implementación simplificada esperamos el output completo)
    let output = child
        .wait_with_output()
        .map_err(|e| format!("Error esperando PowerShell: {}", e))?;

    // Limpiar archivos temporales
    let _ = std::fs::remove_file(&script_path);
    let _ = std::fs::remove_file(&paths_file);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("PowerShell falló: {}", stderr));
    }

    // Parsear resultado JSON
    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Error parseando resultado: {} - Output: {}", e, stdout))?;

    let success = result["success"].as_u64().unwrap_or(0) as usize;
    let errors = result["errors"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect()
        })
        .unwrap_or_default();

    Ok((success, errors))
}

/// Información sobre archivos .doc encontrados
#[derive(Debug, serde::Serialize)]
pub struct DocFilesInfo {
    pub count: usize,
    pub total_size_mb: f64,
    pub sample_files: Vec<String>,
}

/// Obtiene información resumida sobre archivos .doc
pub fn get_doc_files_info(doc_files: &[PathBuf]) -> DocFilesInfo {
    let count = doc_files.len();
    let total_size: u64 = doc_files
        .iter()
        .filter_map(|p| std::fs::metadata(p).ok())
        .map(|m| m.len())
        .sum();

    let total_size_mb = (total_size as f64) / (1024.0 * 1024.0);

    let sample_files: Vec<String> = doc_files
        .iter()
        .take(5)
        .filter_map(|p| p.file_name())
        .filter_map(|n| n.to_str())
        .map(|s| s.to_string())
        .collect();

    DocFilesInfo {
        count,
        total_size_mb,
        sample_files,
    }
}
