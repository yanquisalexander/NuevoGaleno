# Sistema de Conversión de Historias Clínicas .DOC

## Resumen

Este sistema detecta archivos `.doc` de Word en el directorio de historias clínicas y ofrece convertirlos automáticamente a `.txt` usando Microsoft Word COM automation en Windows, antes de importarlos a la base de datos.

## Flujo de Importación

### 1. Detección de Archivos .DOC

Cuando el usuario inicia una importación desde `ImportReviewScreen`, el sistema:

1. **Muestra el componente `DocConversionDialog`** antes de iniciar la importación
2. **Escanea el directorio** `GALENO~1/Historias Clinicas` buscando archivos `.doc`
3. **Presenta al usuario**:
   - Cantidad de archivos `.doc` encontrados
   - Tamaño total
   - Nombres de ejemplo (primeros 5)
   - Advertencia sobre el uso de PowerShell/Word

### 2. Opciones del Usuario

El usuario puede:

- **Convertir archivos ahora**: Ejecuta la conversión automática usando Word COM
- **Omitir (continuar sin convertir)**: Los archivos `.doc` serán rechazados durante la importación con un mensaje de error en anomalías

### 3. Proceso de Conversión

Si el usuario acepta convertir:

1. **Se crea un script de PowerShell temporal** que:
   - Abre Microsoft Word (invisible, sin alertas)
   - Procesa cada archivo `.doc`
   - Lo guarda como `.txt` en el mismo directorio
   - Retorna estadísticas (éxitos, errores)

2. **Progreso en tiempo real**:
   - "Iniciando conversión de X archivos .doc..."
   - "Ejecutando Microsoft Word para conversión..."
   - "✅ Conversión completada: X exitosos, Y errores"

3. **Resultado**:
   - Archivos `.txt` generados junto a los `.doc` originales
   - Los `.doc` originales NO se eliminan (quedan como respaldo)

### 4. Importación con Prioridad .TXT

Cuando se procesa el directorio de historias clínicas:

```rust
// Para cada archivo .doc encontrado:
if extension == "doc" {
    let txt_path = file_path.with_extension("txt");
    if txt_path.exists() {
        // ✅ Usar el .txt (convertido)
        actual_file_path = txt_path
    } else {
        // ⚠️ Usar el .doc (probablemente fallará)
        actual_file_path = file_path
    }
}
```

**Lógica de prioridad**:
- Si existe `PACIENTE123.txt` → se usa ese archivo
- Si solo existe `PACIENTE123.doc` → se intenta leer (fallará con mensaje de error)
- Archivos `.txt` nativos → se leen directamente sin conversión

## Componentes

### Backend (Rust)

#### `doc_converter.rs`
- **`detect_doc_files()`**: Escanea directorio y retorna lista de archivos `.doc`
- **`get_doc_files_info()`**: Retorna estadísticas (count, size, samples)
- **`convert_doc_to_txt()`**: Ejecuta conversión usando PowerShell + Word COM

#### `commands.rs`
- **`detect_doc_files_in_import`**: Comando Tauri para detectar archivos
- **`convert_doc_files_to_txt`**: Comando Tauri para convertir con progreso

#### `transformer.rs` (Modificado)
- **Lógica de prioridad**: Busca `.txt` antes de usar `.doc`
- **Metadata actualizado**: Registra el archivo real usado (`.txt` o `.doc`)

### Frontend (React/TypeScript)

#### `DocConversionDialog.tsx`
- Diálogo modal con confirmación del usuario
- Muestra información sobre archivos detectados
- Barra de progreso durante conversión
- Resultados con errores detallados

#### `ImportReviewScreen.tsx` (Modificado)
- Nueva etapa `checking-docs` antes de `loading`
- Integra `DocConversionDialog` en el flujo
- Callbacks: `handleDocConversionComplete()`, `handleSkipDocConversion()`

## Script de PowerShell

```powershell
# Crea instancia de Word COM
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0  # Sin alertas

# Para cada archivo:
$doc = $word.Documents.Open($filePath, $false, $true)  # ReadOnly
$txtPath = [System.IO.Path]::ChangeExtension($filePath, ".txt")
$doc.SaveAs([ref]$txtPath, [ref]2)  # wdFormatText
$doc.Close($false)

# Retorna JSON con resultados
```

## Mensajes de Progreso

### Durante detección:
- "Verificando archivos..."
- "Detectando archivos de historias clínicas"

### Durante conversión:
- "Iniciando conversión de X archivos .doc..."
- "Ejecutando Microsoft Word para conversión (esto puede tardar)..."
- "✅ Conversión completada: X exitosos, Y errores"

### Durante importación:
- "📄 Usando versión .txt convertida de PACIENTE123.doc"
- "📄 Historia clínica PACIENTE123.txt asociada a Juan Pérez"

## Manejo de Errores

### Archivos .doc sin convertir:
```
Anomalía (warning): "Formato .doc binario no soportado. Use .docx o .txt"
```

### Errores de conversión:
```json
{
  "success_count": 45,
  "errors": [
    "Error en C:\\...\\PACIENTE1.doc : El documento está protegido",
    "Error en C:\\...\\PACIENTE2.doc : Archivo corrupto"
  ]
}
```

### Archivo demasiado grande:
```
Anomalía (warning): "Historia clínica muy grande (2.5 MB). Se omitió."
```

## Requisitos

- **Sistema Operativo**: Windows (usa Word COM automation)
- **Software**: Microsoft Word instalado
- **Permisos**: Ejecución de PowerShell (ExecutionPolicy Bypass)

## Ventajas de este Enfoque

1. ✅ **Sin dependencias externas**: Usa Word que ya está instalado
2. ✅ **Confirmación previa**: Usuario sabe que se abrirá Word/PowerShell
3. ✅ **Respaldo automático**: Archivos `.doc` originales se mantienen
4. ✅ **Prioridad inteligente**: Usa `.txt` si existe, `.doc` si no
5. ✅ **Feedback detallado**: Progreso y errores reportados al usuario
6. ✅ **Manejo de errores robusto**: Archivos problemáticos no bloquean importación

## Alternativas Consideradas

- **Opción 2 - docx-rs**: Solo para `.docx` modernos, no `.doc` legacy
- **Opción 3 - antiword CLI**: Dependencia externa, complicado de distribuir
- **Opción 4 - Manual**: Usuario convierte antes (más trabajo, menos integrado)
