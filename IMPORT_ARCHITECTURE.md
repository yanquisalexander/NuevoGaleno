# 🏗️ Arquitectura del Pipeline de Importación

## 📋 Visión General

Sistema robusto de importación de datos médicos desde Galeno 2000 (Paradox DB) hacia SQLite, diseñado con seguridad transaccional y validación exhaustiva.

---

## 🎯 Principios de Diseño

### 1. **Separación de Responsabilidades**
Cada módulo tiene una única responsabilidad clara:
- **Reader**: Extrae datos raw de Paradox
- **Transformer**: Normaliza y limpia datos
- **Validator**: Detecta inconsistencias y errores
- **Previewer**: Prepara resumen para el usuario
- **Persister**: Guarda transaccionalmente en SQLite

### 2. **Inmutabilidad Hasta Confirmación**
Los datos nunca se modifican en la base de datos hasta que el usuario confirma explícitamente después de revisar la previsualización.

### 3. **Transaccionalidad Total**
Todo o nada: si un registro falla, toda la importación hace rollback automático.

### 4. **Trazabilidad Completa**
Cada registro guarda sus datos raw originales en formato JSON para auditoría.

---

## 📊 Flujo de Importación

```
┌─────────────────────────────────────────────────────────────────┐
│                   1. EXTRACCIÓN (.gln → temp)                   │
│                    [Ya implementado: extract_gln]               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              2. LECTURA (Paradox → RawParadoxData)              │
│  • Lee todos los archivos .DB                                   │
│  • Identifica tablas (pacientes, tratamientos, pagos)          │
│  • Sin transformación, datos crudos                             │
│                                                                 │
│  Comando: start_import_session(extracted_dir)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           3. TRANSFORMACIÓN (Raw → DTOs normalizados)           │
│  • Mapeo dinámico de columnas legacy                           │
│  • Normalización de textos, documentos, teléfonos              │
│  • Construcción de relaciones (paciente → tratamientos → pagos)│
│  • Conversión de estados legacy a enums conocidos              │
│                                                                 │
│  Salida: Vec<PatientDto> con toda su jerarquía                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     4. VALIDACIÓN                               │
│  • Campos obligatorios (nombre, apellido)                       │
│  • Formato de email, documento, teléfono                        │
│  • Consistencia financiera (pagos vs costos)                    │
│  • Detección de duplicados                                      │
│  • Balance de tratamientos                                      │
│                                                                 │
│  Severidades: Info | Warning | Error | Critical                │
│  Comando: validate_import_data()                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         5. PREVISUALIZACIÓN (Usuario revisa los datos)          │
│  • Resumen ejecutivo (totales, estadísticas)                    │
│  • Muestra de primeros 50 pacientes                             │
│  • Reporte de validación detallado                              │
│  • Indicador: "¿Se puede proceder?"                             │
│                                                                 │
│  Comando: generate_import_preview()                             │
│  ⚠️  USUARIO DEBE REVISAR Y CONFIRMAR AQUÍ                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                        [CONFIRMACIÓN]
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           6. PERSISTENCIA (DTOs → SQLite transaccional)         │
│  • Inicia transacción SQLite                                    │
│  • Crea schema si no existe                                     │
│  • Inserta pacientes → tratamientos → pagos                     │
│  • Si hay error: ROLLBACK automático                            │
│  • Si todo OK: COMMIT                                           │
│                                                                 │
│  Comando: confirm_and_persist_import()                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Estructura de Datos

### DTOs (Data Transfer Objects)

#### PatientDto
```rust
{
    temp_id: "PAT_1234567890",  // ID temporal para tracking
    legacy_id: "42",             // ID original de Galeno 2000
    first_name: "Juan",
    last_name: "Pérez",
    document_number: "12345678",
    phone: "+54911234567",
    email: "juan@example.com",
    birth_date: "1980-05-15",
    treatments: [TreatmentDto, ...],
    raw_data: { ... }            // JSON con datos originales
}
```

#### TreatmentDto
```rust
{
    temp_id: "TRX_1234567891",
    patient_temp_id: "PAT_1234567890",
    legacy_id: "100",
    name: "Endodoncia",
    tooth_number: "18",
    status: "InProgress",        // Pending | InProgress | Completed | Cancelled
    total_cost: 15000.0,
    paid_amount: 5000.0,
    balance: 10000.0,
    payments: [PaymentDto, ...],
    raw_data: { ... }
}
```

#### PaymentDto
```rust
{
    temp_id: "PAY_1234567892",
    treatment_temp_id: "TRX_1234567891",
    amount: 5000.0,
    payment_date: "2025-01-15",
    payment_method: "Efectivo",
    raw_data: { ... }
}
```

---

## ⚠️ Manejo de Inconsistencias

### 1. **Datos Faltantes**

| Campo Faltante | Estrategia |
|----------------|------------|
| Nombre/Apellido | ❌ ERROR - No se puede importar |
| Documento | ⚠️ WARNING - Se importa pero se notifica |
| Teléfono | ℹ️ INFO - Campo opcional |
| Email | ℹ️ INFO - Campo opcional |
| Fecha nacimiento | ℹ️ INFO - Campo opcional |

### 2. **Estados Inconsistentes**

**Problema**: Tratamiento marcado como "completado" pero tiene saldo pendiente.

**Solución**:
- ⚠️ WARNING: Se notifica al usuario
- Se importa tal cual
- El usuario decide en la previsualización si corregir manualmente después

**Código**:
```rust
if treatment.status == TreatmentStatus::Completed && treatment.balance > 0.01 {
    issues.push(ValidationIssue::warning(
        "treatment",
        &treatment.temp_id,
        "status",
        format!("Completado pero tiene saldo: ${}", treatment.balance)
    ));
}
```

### 3. **Pagos que No Cuadran**

**Problema**: Suma de pagos ≠ `paid_amount` registrado.

**Solución**:
- ⚠️ WARNING: Se registra la diferencia
- Se importa usando el valor de `paid_amount` (fuente de verdad)
- Se guardan todos los pagos detallados
- El usuario revisa y ajusta manualmente si es crítico

**Código**:
```rust
let payments_sum: f64 = treatment.payments.iter().map(|p| p.amount).sum();
if (payments_sum - treatment.paid_amount).abs() > 0.01 {
    issues.push(ValidationIssue::warning(
        "treatment",
        &treatment.temp_id,
        "payments",
        format!("Diferencia: ${:.2}", (payments_sum - treatment.paid_amount).abs())
    ));
}
```

### 4. **Duplicados**

**Detección**: Por número de documento.

**Solución**:
- ⚠️ WARNING: Se notifica
- Ambos registros se importan (el sistema no decide cuál es válido)
- El usuario consolida después en la aplicación

---

## 🎨 Implementación del UI (Frontend)

### Paso 1: Selección e Extracción
```typescript
// Ya implementado en FirstRunWizard
const jobId = await invoke("extract_gln", { glnPath: selectedFile });
```

### Paso 2: Iniciar Importación
```typescript
const session = await invoke("start_import_session", { 
    extractedDir: "/path/to/temp" 
});
// session.patients_found, session.status
```

### Paso 3: Validar
```typescript
const validation = await invoke("validate_import_data");
// validation.summary, validation.can_proceed
```

### Paso 4: Previsualizar
```typescript
const preview = await invoke("generate_import_preview");
// preview.summary, preview.sample_patients, preview.validation_report
```

### Paso 5: Mostrar Pantalla de Revisión

**Componente sugerido**: `<ImportReviewScreen />`

```tsx
<div className="import-review">
  {/* Resumen Ejecutivo */}
  <Card>
    <h2>Resumen</h2>
    <div className="stats-grid">
      <Stat label="Pacientes" value={preview.summary.total_patients} />
      <Stat label="Tratamientos" value={preview.summary.total_treatments} />
      <Stat label="Pagos" value={preview.summary.total_payments} />
      <Stat label="Recaudación Total" value={formatCurrency(preview.summary.total_revenue)} />
      <Stat label="Saldo Adeudado" value={formatCurrency(preview.summary.total_outstanding)} />
    </div>
  </Card>

  {/* Reporte de Validación */}
  <Card className={preview.can_proceed ? "success" : "error"}>
    <h2>Validación</h2>
    {preview.validation_report.critical_issues.length > 0 && (
      <Alert variant="error">
        <h3>Errores Críticos ({preview.validation_report.critical_issues.length})</h3>
        <ul>
          {preview.validation_report.critical_issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      </Alert>
    )}
    
    {preview.validation_report.warnings.length > 0 && (
      <Alert variant="warning">
        <h3>Advertencias ({preview.validation_report.warnings.length})</h3>
        <ul>
          {preview.validation_report.warnings.slice(0, 10).map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
        {preview.validation_report.warnings.length > 10 && (
          <p>... y {preview.validation_report.warnings.length - 10} más</p>
        )}
      </Alert>
    )}
  </Card>

  {/* Muestra de Pacientes */}
  <Card>
    <h2>Vista Previa de Pacientes (primeros 50)</h2>
    <table>
      <thead>
        <tr>
          <th>Nombre Completo</th>
          <th>Documento</th>
          <th>Teléfono</th>
          <th>Tratamientos</th>
          <th>Total Facturado</th>
          <th>Total Pagado</th>
          <th>Saldo</th>
        </tr>
      </thead>
      <tbody>
        {preview.sample_patients.map(patient => (
          <tr key={patient.temp_id} className={patient.has_issues ? "warning" : ""}>
            <td>{patient.full_name}</td>
            <td>{patient.document || "—"}</td>
            <td>{patient.phone || "—"}</td>
            <td>{patient.treatments_count}</td>
            <td>{formatCurrency(patient.total_billed)}</td>
            <td>{formatCurrency(patient.total_paid)}</td>
            <td className={patient.balance > 0 ? "outstanding" : ""}>
              {formatCurrency(patient.balance)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </Card>

  {/* Botones de Acción */}
  <div className="actions">
    <Button 
      variant="secondary" 
      onClick={() => invoke("cancel_import_session")}
    >
      Cancelar
    </Button>
    
    <Button 
      variant="primary" 
      disabled={!preview.can_proceed}
      onClick={handleConfirm}
    >
      {preview.can_proceed 
        ? "Confirmar e Importar" 
        : "No se puede importar (errores críticos)"}
    </Button>
  </div>
</div>
```

### Paso 6: Confirmar e Importar
```typescript
async function handleConfirm() {
  setLoading(true);
  try {
    const result = await invoke("confirm_and_persist_import");
    toast.success(`Importados: ${result.patients_inserted} pacientes, 
                   ${result.treatments_inserted} tratamientos, 
                   ${result.payments_inserted} pagos`);
    onImportComplete();
  } catch (error) {
    toast.error(`Error: ${error}`);
  } finally {
    setLoading(false);
  }
}
```

---

## 🔒 Seguridad y Protecciones

### 1. **Transacciones SQLite**
```rust
let mut tx = conn.transaction()?;
// ... inserciones ...
tx.commit()?;  // Solo se aplica si todo salió bien
// Si hay error antes del commit, rollback automático
```

### 2. **Prevención de Duplicados**
```rust
pub fn check_existing_imports(conn: &Connection) -> Result<bool, String> {
    // Verifica si ya hay registros con legacy_id
}
```

### 3. **Limpieza Controlada**
```rust
// Solo elimina registros que vinieron de importación (tienen legacy_id)
DELETE FROM patients WHERE legacy_id IS NOT NULL;
```

### 4. **Validación Multi-Nivel**
- Por campo individual
- Por entidad (paciente, tratamiento, pago)
- Por consistencia relacional (pagos vs totales)
- Por duplicados globales

---

## 🧪 Testing Recomendado

### Casos de Prueba Críticos

1. **Datos Perfectos**: Todos los campos completos, sin errores
   - ✅ Debe importarse sin warnings

2. **Paciente Sin Documento**: 
   - ⚠️ Debe generar WARNING pero importarse

3. **Tratamiento con Pagos Inconsistentes**:
   - ⚠️ Debe generar WARNING y usar `paid_amount`

4. **Error en Medio de Transacción**:
   - ❌ Debe hacer ROLLBACK completo
   - Base de datos debe quedar en estado anterior

5. **Importación Duplicada**:
   - ❌ Debe rechazar si ya hay datos con `legacy_id`

---

## 📈 Estadísticas y Monitoreo

### Logs de Importación

Crear tabla de auditoría:
```sql
CREATE TABLE import_logs (
    id INTEGER PRIMARY KEY,
    session_id TEXT,
    started_at TEXT,
    completed_at TEXT,
    status TEXT,  -- 'success' | 'failed' | 'cancelled'
    patients_imported INTEGER,
    treatments_imported INTEGER,
    payments_imported INTEGER,
    validation_issues TEXT,  -- JSON
    error_message TEXT
);
```

---

## 🚀 Mejoras Futuras

1. **Parser de Fechas Robusto**
   - Usar crate `chrono`
   - Detectar automáticamente formatos legacy

2. **Corrección Automática de Inconsistencias**
   - Modo "auto-fix" para casos comunes
   - Ejemplo: recalcular balances automáticamente

3. **Importación Incremental**
   - Detectar cambios desde última importación
   - Solo importar registros nuevos/modificados

4. **Mapeo de Campos Configurable**
   - Archivo YAML/JSON con reglas de mapeo
   - Adaptable a diferentes versiones de Galeno

5. **Exportación de Reporte**
   - PDF con resumen de importación
   - Excel con datos completos

---

## 📞 Uso de los Comandos

### Frontend (TypeScript/React)
```typescript
import { invoke } from '@tauri-apps/api/core';

// 1. Iniciar sesión
const session = await invoke('start_import_session', { 
    extractedDir: '/tmp/galeno_extract' 
});

// 2. Validar
const validation = await invoke('validate_import_data');

// 3. Preview
const preview = await invoke('generate_import_preview');

// 4. Confirmar
const result = await invoke('confirm_and_persist_import');

// Cancelar en cualquier momento
await invoke('cancel_import_session');

// Verificar estado
const status = await invoke('get_import_session_status');

// Limpiar datos importados (re-importar)
await invoke('clear_imported_data');
```

### Backend (Rust)
```rust
// Los comandos están en src-tauri/src/import_pipeline/commands.rs
// Se registran automáticamente en lib.rs
```

---

## 🎓 Conclusión

Este sistema está diseñado para **NUNCA perder datos** y **SIEMPRE dar visibilidad** al usuario sobre qué se va a importar antes de hacerlo.

**Flujo mental**: 
1. "Léeme los datos"
2. "Limpia y organiza"
3. "Encuentra problemas"
4. "Muéstrame un resumen"
5. **[Usuario revisa y decide]**
6. "OK, guarda todo o no guardes nada"

Es **transaccional**, **auditable** y **recuperable**.
