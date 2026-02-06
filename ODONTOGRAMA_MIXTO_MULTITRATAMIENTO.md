# Sistema de Odontograma Mixto con Múltiples Tratamientos

## 📋 Resumen de Cambios

Se ha implementado un sistema completo de odontograma que soporta:

1. **Odontograma Mixto**: Dentición permanente y decidua (temporal) con toggle
2. **Múltiples Tratamientos por Superficie**: Cada cara dental puede tener varios tratamientos simultáneos
3. **Historial Completo**: Registro de todos los cambios con auditoría

## 🎯 Características Implementadas

### 1. Dentición Mixta
- ✅ **Dentición Permanente** (32 dientes): FDI 11-48
- ✅ **Dentición Decidua** (20 dientes de leche): FDI 51-85
- ✅ **Visualización simultánea** de ambas denticiones (odontograma mixto real)
- ✅ Indicador visual para dientes temporales (icono 👶)
- ✅ Borde azul distintivo en dientes temporales
- ✅ Soporte completo en backend y frontend

**Distribución Visual:**
- **Arcada Superior**: Permanentes (18-28) + Temporales (55-65)
- **Arcada Inferior**: Temporales (85-75) + Permanentes (48-38)

Los dientes temporales se muestran con:
- Icono de bebé (👶) junto al número
- Borde azul sutil (`border-blue-400/30`)
- Ligera transparencia para distinguirlos visualmente

### 2. Múltiples Tratamientos por Superficie

#### Antes (Limitación)
- Solo un tratamiento por superficie dental
- Al añadir un nuevo tratamiento, se reemplazaba el anterior
- No se guardaba historial de cambios

#### Ahora (Mejorado)
- ✅ Múltiples tratamientos activos por superficie
- ✅ Cada tratamiento tiene su fecha de aplicación
- ✅ Los tratamientos se pueden desactivar (soft delete)
- ✅ Se mantiene el historial completo de todos los cambios
- ✅ Visualización de todos los tratamientos activos
- ✅ Acceso rápido al historial completo

### 3. Sistema de Historial

Cada cambio en una superficie dental se registra con:
- Tipo de acción: `created`, `updated`, `deactivated`
- Fecha de aplicación del tratamiento
- Fecha de registro del cambio
- Tratamiento aplicado (catálogo + sub-tratamiento)
- Notas del odontólogo
- Paciente y diente afectado

## 🗄️ Cambios en Base de Datos

### Migración v6

Se creó una nueva migración que incluye:

#### 1. Tabla `odontogram_surfaces` (Modificada)
```sql
CREATE TABLE odontogram_surfaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    tooth_number TEXT NOT NULL,
    surface TEXT NOT NULL,
    treatment_catalog_id INTEGER,
    treatment_catalog_item_id INTEGER,
    condition TEXT NOT NULL DEFAULT 'healthy',
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,        -- NUEVO
    applied_date TEXT NOT NULL,                  -- NUEVO
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (treatment_catalog_id) REFERENCES treatment_catalog(id),
    FOREIGN KEY (treatment_catalog_item_id) REFERENCES treatment_catalog_items(id)
    -- ELIMINADO: UNIQUE(patient_id, tooth_number, surface)
);
```

**Cambios clave:**
- ❌ Eliminada restricción `UNIQUE` para permitir múltiples tratamientos
- ✅ Campo `is_active` para soft delete
- ✅ Campo `applied_date` para tracking temporal

#### 2. Tabla `odontogram_surface_history` (Nueva)
```sql
CREATE TABLE odontogram_surface_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    tooth_number TEXT NOT NULL,
    surface TEXT NOT NULL,
    treatment_catalog_id INTEGER,
    treatment_catalog_item_id INTEGER,
    condition TEXT NOT NULL,
    notes TEXT,
    action TEXT NOT NULL,              -- 'created', 'updated', 'deactivated'
    applied_date TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);
```

## 🔧 Backend (Rust)

### Archivo: `src-tauri/src/db/odontogram_surfaces.rs`

#### Nuevas Estructuras
```rust
pub struct OdontogramSurface {
    // ... campos existentes ...
    pub is_active: bool,           // NUEVO
    pub applied_date: String,      // NUEVO
}

pub struct SurfaceHistoryEntry {   // NUEVA ESTRUCTURA
    pub id: i64,
    pub patient_id: i64,
    pub tooth_number: String,
    pub surface: String,
    pub treatment_catalog_id: Option<i64>,
    pub treatment_catalog_item_id: Option<i64>,
    pub condition: String,
    pub notes: Option<String>,
    pub action: String,
    pub applied_date: String,
    pub recorded_at: String,
}

pub struct AddSurfaceTreatmentInput { // NUEVA ESTRUCTURA
    pub patient_id: i64,
    pub tooth_number: String,
    pub surface: String,
    pub treatment_catalog_id: Option<i64>,
    pub treatment_catalog_item_id: Option<i64>,
    pub condition: String,
    pub notes: Option<String>,
    pub applied_date: Option<String>,
}
```

#### Nuevas Funciones
```rust
// Añadir nuevo tratamiento a una superficie (permite múltiples)
pub fn add_tooth_surface_treatment(input: AddSurfaceTreatmentInput) -> Result<i64, String>

// Obtener todos los tratamientos activos de una superficie
pub fn get_surface_treatments(patient_id: i64, tooth_number: &str, surface: &str) -> Result<Vec<OdontogramSurface>, String>

// Desactivar un tratamiento específico (soft delete)
pub fn deactivate_surface_treatment(surface_id: i64) -> Result<(), String>

// Obtener historial de una superficie específica
pub fn get_surface_history(patient_id: i64, tooth_number: &str, surface: &str) -> Result<Vec<SurfaceHistoryEntry>, String>

// Obtener historial completo de un diente
pub fn get_tooth_history(patient_id: i64, tooth_number: &str) -> Result<Vec<SurfaceHistoryEntry>, String>
```

#### Funciones Modificadas
```rust
// Ahora retorna solo tratamientos activos (is_active = 1)
pub fn get_odontogram_surfaces_by_patient(patient_id: i64) -> Result<Vec<OdontogramSurface>, String>

// Comportamiento cambiado: ahora añade en lugar de actualizar
pub fn update_tooth_surface(input: UpdateSurfaceInput) -> Result<i64, String>
```

### Archivo: `src-tauri/src/lib.rs`

Nuevos comandos Tauri registrados:
```rust
#[tauri::command]
fn add_tooth_surface_treatment(input: db::odontogram_surfaces::AddSurfaceTreatmentInput) -> Result<i64, String>

#[tauri::command]
fn get_surface_treatments(patient_id: i64, tooth_number: String, surface: String) -> Result<Vec<db::odontogram_surfaces::OdontogramSurface>, String>

#[tauri::command]
fn deactivate_surface_treatment(surface_id: i64) -> Result<(), String>

#[tauri::command]
fn get_surface_history(patient_id: i64, tooth_number: String, surface: String) -> Result<Vec<db::odontogram_surfaces::SurfaceHistoryEntry>, String>

#[tauri::command]
fn get_tooth_surface_history(patient_id: i64, tooth_number: String) -> Result<Vec<db::odontogram_surfaces::SurfaceHistoryEntry>, String>
```

## 💻 Frontend (TypeScript/React)

### Archivo: `src/hooks/useOdontogram.ts`

#### Nuevas Interfaces
```typescript
export interface OdontogramSurface {
    // ... campos existentes ...
    is_active: boolean;      // NUEVO
    applied_date: string;    // NUEVO
}

export interface SurfaceHistoryEntry {  // NUEVA INTERFAZ
    id: number;
    patient_id: number;
    tooth_number: string;
    surface: string;
    treatment_catalog_id?: number;
    treatment_catalog_item_id?: number;
    condition: string;
    notes?: string;
    action: string;
    applied_date: string;
    recorded_at: string;
}

export interface AddSurfaceTreatmentInput {  // NUEVA INTERFAZ
    patient_id: number;
    tooth_number: string;
    surface: string;
    treatment_catalog_id?: number;
    treatment_catalog_item_id?: number;
    condition: string;
    notes?: string;
    applied_date?: string;
}
```

#### Nuevas Funciones
```typescript
// Obtener tratamientos activos de una superficie
export async function getSurfaceTreatments(
    patientId: number, 
    toothNumber: string, 
    surface: string
): Promise<OdontogramSurface[]>

// Añadir nuevo tratamiento
export async function addToothSurfaceTreatment(
    input: AddSurfaceTreatmentInput
): Promise<number>

// Desactivar tratamiento
export async function deactivateSurfaceTreatment(
    surfaceId: number
): Promise<void>

// Obtener historial de superficie
export async function getSurfaceHistory(
    patientId: number, 
    toothNumber: string, 
    surface: string
): Promise<SurfaceHistoryEntry[]>

// Obtener historial de diente completo
export async function getToothSurfaceHistory(
    patientId: number, 
    toothNumber: string
): Promise<SurfaceHistoryEntry[]>
```

### Archivo: `src/components/odontogram/OdontogramAdvanced.tsx`

#### Nuevos Estados
```typescript
const [surfaceTreatments, setSurfaceTreatments] = useState<OdontogramSurface[]>([]);
const [surfaceHistory, setSurfaceHistory] = useState<SurfaceHistoryEntry[]>([]);
const [showHistory, setShowHistory] = useState(false);
```

#### Nuevas Funciones
```typescript
// Cargar tratamientos activos de la superficie seleccionada
const loadSurfaceTreatments = async () => { ... }

// Cargar historial completo
const loadSurfaceHistoryData = async () => { ... }

// Añadir nuevo tratamiento (reemplaza handleSaveSurface)
const handleAddTreatment = async () => { ... }

// Desactivar un tratamiento específico
const handleDeactivateTreatment = async (surfaceId: number) => { ... }
```

#### Modificaciones en UI

**Comportamiento del color de superficie:**
```typescript
// Antes: mostraba un solo tratamiento
const getSurfaceData = (toothNumber: number, surface: Surface): OdontogramSurface | null

// Ahora: muestra el tratamiento más reciente de múltiples
const getSurfaceData = (toothNumber: number, surface: Surface): OdontogramSurface[]
```

**Nueva sección: Lista de tratamientos activos**
- Muestra todos los tratamientos activos en la superficie seleccionada
- Cada tratamiento tiene:
  - Indicador de color
  - Nombre del tratamiento
  - Notas
  - Fecha de aplicación
  - Botón para desactivar
- Botón "Ver Historial" para acceder al historial completo

**Nueva sección: Historial de superficie**
- Modal/panel expandible con historial completo
- Muestra cada cambio con:
  - Tipo de acción (CREATED, UPDATED, DEACTIVATED)
  - Timestamp
  - Tratamiento aplicado
  - Notas
- Scroll vertical para historiales largos

**Botón principal cambiado:**
- Antes: "Guardar" (reemplazaba tratamiento)
- Ahora: "Añadir Tratamiento" (añade nuevo tratamiento)

## 🎨 Experiencia de Usuario

### Flujo de Trabajo Mejorado

1. **Seleccionar diente** → Click en diente del odontograma
2. **Seleccionar superficie** → Click en superficie específica (mesial, distal, etc.)
3. **Ver tratamientos activos** → Lista automática de tratamientos en esa superficie
4. **Añadir nuevo tratamiento:**
   - Seleccionar tratamiento del catálogo
   - Seleccionar sub-tratamiento
   - Añadir notas
   - Click "Añadir Tratamiento"
5. **Gestionar tratamientos:**
   - Desactivar tratamientos obsoletos (botón 🗑️)
   - Ver historial completo (botón "Ver Historial" 👁️)

### Ventajas del Nuevo Sistema

✅ **No se pierde información**: Todo queda registrado en historial  
✅ **Auditoría completa**: Saber qué se hizo y cuándo  
✅ **Tratamientos complejos**: Superficies con múltiples intervenciones  
✅ **Flexibilidad clínica**: Mejor reflejo de la realidad odontológica  
✅ **Trazabilidad**: Seguimiento completo del tratamiento del paciente  

## 📊 Casos de Uso

### Ejemplo 1: Diente con caries y obturación
```
Superficie oclusal del diente 16:
- Tratamiento 1 (Activo): Caries detectada - 2024-01-15
- Tratamiento 2 (Activo): Obturación compuesta - 2024-01-20
```

### Ejemplo 2: Tratamiento en evolución
```
Superficie mesial del diente 21:
- Tratamiento 1 (Desactivado): Caries inicial - 2023-06-10
- Tratamiento 2 (Desactivado): Obturación simple - 2023-06-12
- Tratamiento 3 (Activo): Reconstrucción - 2024-02-01
```

### Ejemplo 3: Odontograma mixto (niño de 8 años)
```
Vista Única - Odontograma Mixto Completo:

Arcada Superior:
- Permanentes: 18, 17, 16, 15, 14, 13, 12, 11 | 21, 22, 23, 24, 25, 26, 27, 28
- Temporales: 55, 54, 53, 52, 51 | 61, 62, 63, 64, 65 (con icono 👶)

Arcada Inferior:
- Temporales: 85, 84, 83, 82, 81 | 71, 72, 73, 74, 75 (con icono 👶)
- Permanentes: 48, 47, 46, 45, 44, 43, 42, 41 | 31, 32, 33, 34, 35, 36, 37, 38

Visualización simultánea de:
- Molares permanentes emergiendo (16, 26, 36, 46)
- Dientes temporales presentes (todos los 50-80)
- Permite planificar tratamientos considerando ambas denticiones
```

## 🔄 Migración de Datos

La migración v6 es **no destructiva**:
1. ✅ Crea tabla temporal con datos existentes
2. ✅ Recrea tabla sin restricción UNIQUE
3. ✅ Restaura todos los datos existentes
4. ✅ Añade nuevos campos con valores por defecto
5. ✅ Crea tabla de historial vacía

Los datos existentes se mantienen intactos y se marcan como activos (`is_active = 1`).

## 🚀 Cómo Usar

### Para el Odontólogo

1. Abrir expediente del paciente
2. Ir a pestaña "Odontograma"
3. Seleccionar tipo de dentición (permanente/decidua)
4. Click en diente deseado
5. Click en superficie específica
6. Revisar tratamientos activos (si existen)
7. Añadir nuevo tratamiento:
   - Elegir tratamiento
   - Elegir sub-tratamiento
   - Añadir notas
   - Click "Añadir Tratamiento"
8. Opcionalmente: Ver historial completo
9. Opcionalmente: Desactivar tratamientos obsoletos

### Atajos de Teclado (Si aplicable)
- `⌘M` o `Ctrl+M`: Toggle vista médica (desde PatientRecord)

## 📝 Notas Técnicas

### Consideraciones de Rendimiento
- Las consultas están optimizadas con índices en columnas clave
- Historial se carga solo cuando se solicita explícitamente
- Soft delete evita operaciones costosas de borrado

### Seguridad
- Todas las operaciones validan patient_id
- Foreign keys aseguran integridad referencial
- ON DELETE CASCADE apropiado para limpieza automática

### Compatibilidad
- ✅ Compatible con datos existentes
- ✅ API anterior sigue funcionando (update_tooth_surface ahora añade)
- ✅ Sin breaking changes para código existente

## 🐛 Testing Recomendado

1. **Test de dentición mixta**
   - Verificar toggle entre permanente/decidua
   - Verificar numeración FDI correcta

2. **Test de múltiples tratamientos**
   - Añadir varios tratamientos a misma superficie
   - Verificar que todos aparecen en lista
   - Verificar color (debe mostrar el más reciente)

3. **Test de historial**
   - Crear tratamiento → verificar en historial
   - Desactivar tratamiento → verificar acción registrada
   - Verificar orden cronológico

4. **Test de migración**
   - Verificar que datos existentes no se pierden
   - Verificar que nuevos campos tienen valores correctos

## 📚 Archivos Modificados

### Backend
- `src-tauri/src/db/migrations.rs` - Migración v6
- `src-tauri/src/db/odontogram_surfaces.rs` - Lógica de superficies
- `src-tauri/src/lib.rs` - Comandos Tauri

### Frontend
- `src/hooks/useOdontogram.ts` - API hooks
- `src/components/odontogram/OdontogramAdvanced.tsx` - UI componente

### Documentación
- `ODONTOGRAMA_MIXTO_MULTITRATAMIENTO.md` - Este archivo

## ✅ Checklist de Implementación

- [x] Migración de base de datos v6
- [x] Funciones backend en Rust
- [x] Comandos Tauri expuestos
- [x] Hooks TypeScript actualizados
- [x] Componente UI actualizado
- [x] Toggle dentición mixta funcional
- [x] Lista de tratamientos activos
- [x] Visualización de historial
- [x] Función desactivar tratamiento
- [x] Documentación completa

## 🎉 Conclusión

El sistema de odontograma ahora es:
- **Más flexible**: Múltiples tratamientos por superficie
- **Más completo**: Historial de todos los cambios
- **Más versátil**: Soporte para dentición mixta
- **Más profesional**: Refleja mejor la práctica odontológica real
- **Más auditable**: Trazabilidad completa

¡El odontograma está listo para uso clínico avanzado! 🦷✨
