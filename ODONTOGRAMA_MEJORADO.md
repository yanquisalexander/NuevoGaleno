# Mejoras al Sistema de Odontograma - Galeno 2000

## Resumen de Cambios

Se ha implementado un sistema completo de odontograma mejorado que incluye:

### 1. Catálogo de Tratamientos Dentales

#### Base de Datos (src-tauri/src/db/)
- **treatment_catalog.rs**: Módulo para gestionar el catálogo de tratamientos principales
  - CRUD completo para tratamientos
  - Soporte para categorías, costos predefinidos y colores
  - Soft delete para mantener historial

- **treatment_catalog_items**: Sub-tratamientos asociados a cada tratamiento
  - Permite definir variantes de tratamientos con costos específicos
  - Orden de visualización personalizable

#### Migración v5
- `treatment_catalog`: Tabla principal de tratamientos
- `treatment_catalog_items`: Sub-tratamientos
- Datos precargados:
  - Obturación (simple, compuesta)
  - Endodoncia (uni, bi, multirradicular)
  - Corona (porcelana, zirconio)
  - Extracción (simple, compleja)
  - Limpieza, Caries

### 2. Odontograma Avanzado con Superficies Dentales

#### Base de Datos
- **odontogram_surfaces.rs**: Gestión de caras dentales individuales
  - Tabla `odontogram_surfaces` para registrar tratamientos por superficie
  - Superficies soportadas: mesial, distal, vestibular, palatina/lingual, oclusal
  - Vinculación con catálogo de tratamientos

#### Frontend (src/components/odontogram/)
- **OdontogramAdvanced.tsx**: Componente completamente rediseñado
  - Visualización de dientes con 5 superficies diferenciadas
  - Colores por superficie según tratamiento asignado
  - Alternancia entre dentición permanente (FDI) y decidua (niños)
  - Panel de edición interactivo por superficie

### 3. Aplicación de Gestión de Catálogo

#### Nueva App: TreatmentCatalog.tsx
- Interface tipo master-detail
- Lista lateral de tratamientos con categorías
- Panel principal para gestionar sub-tratamientos
- Formularios modales para creación/edición
- Integración completa con el sistema de ventanas

### 4. Hooks de TypeScript

#### useTreatmentCatalog.ts
```typescript
- getAllTreatmentCatalog()
- getTreatmentCatalogById()
- createTreatmentCatalog()
- updateTreatmentCatalog()
- deleteTreatmentCatalog()
- getTreatmentCatalogItems()
- createTreatmentCatalogItem()
- updateTreatmentCatalogItem()
- deleteTreatmentCatalogItem()
```

#### useOdontogram.ts (ampliado)
```typescript
- getOdontogramSurfacesByPatient()
- getToothSurfaces()
- updateToothSurface()
- deleteToothSurface()
- clearToothSurfaces()
```

### 5. Comandos Tauri Registrados

#### Catálogo de Tratamientos
- `get_all_treatment_catalog`
- `get_treatment_catalog_by_id`
- `create_treatment_catalog`
- `update_treatment_catalog`
- `delete_treatment_catalog`
- `get_treatment_catalog_items`
- `get_treatment_catalog_item_by_id`
- `create_treatment_catalog_item`
- `update_treatment_catalog_item`
- `delete_treatment_catalog_item`

#### Superficies del Odontograma
- `get_odontogram_surfaces_by_patient`
- `get_tooth_surfaces`
- `update_tooth_surface`
- `delete_tooth_surface`
- `clear_tooth_surfaces`

## Flujo de Uso

### 1. Configurar Catálogo de Tratamientos
1. Abrir app "Catálogo de Tratamientos" (📋)
2. Crear tratamientos principales (ej: "Obturación")
3. Agregar sub-tratamientos con costos específicos
4. Asignar colores para identificación visual

### 2. Trabajar con el Odontograma
1. Abrir ficha del paciente
2. Ir a pestaña "Odontograma"
3. Seleccionar tipo de dentición (permanente/decidua)
4. Hacer clic en un diente
5. Seleccionar la superficie específica (mesial, distal, etc.)
6. Elegir tratamiento y sub-tratamiento del catálogo
7. Agregar observaciones
8. Guardar

### 3. Visualización
- Cada superficie se colorea según el tratamiento asignado
- Vista clara de toda la dentadura con estado por superficie
- Historial completo de cambios

## Notación Dental

### Dentición Permanente (FDI)
- Superior: 18-11, 21-28
- Inferior: 48-41, 31-38

### Dentición Decidua (Niños)
- Superior: 55-51, 61-65
- Inferior: 85-81, 71-75

## Estructura de Archivos Creados/Modificados

### Backend (Rust)
```
src-tauri/src/
├── db/
│   ├── mod.rs                      [modificado]
│   ├── treatment_catalog.rs        [nuevo]
│   ├── odontogram_surfaces.rs      [nuevo]
│   └── migrations.rs               [modificado - v5]
└── lib.rs                          [modificado]
```

### Frontend (TypeScript/React)
```
src/
├── apps/
│   ├── index.tsx                   [modificado]
│   ├── TreatmentCatalog.tsx        [nuevo]
│   └── PatientRecord.tsx           [modificado]
├── components/
│   └── odontogram/
│       ├── Odontogram.tsx          [legacy]
│       └── OdontogramAdvanced.tsx  [nuevo]
└── hooks/
    ├── useOdontogram.ts            [modificado]
    └── useTreatmentCatalog.ts      [nuevo]
```

## Base de Datos

### Tablas Nuevas

#### treatment_catalog
```sql
- id: INTEGER PRIMARY KEY
- name: TEXT (nombre del tratamiento)
- description: TEXT (opcional)
- default_cost: REAL (costo predeterminado)
- category: TEXT (categoría, ej: "Operatoria")
- color: TEXT (color hex para visualización)
- is_active: INTEGER (soft delete)
- created_at, updated_at: TEXT
```

#### treatment_catalog_items
```sql
- id: INTEGER PRIMARY KEY
- treatment_catalog_id: INTEGER FK
- name: TEXT (nombre del sub-tratamiento)
- description: TEXT (opcional)
- default_cost: REAL (costo específico)
- color: TEXT (opcional, hereda del padre)
- is_active: INTEGER
- display_order: INTEGER
- created_at, updated_at: TEXT
```

#### odontogram_surfaces
```sql
- id: INTEGER PRIMARY KEY
- patient_id: INTEGER FK
- tooth_number: TEXT (notación FDI)
- surface: TEXT (mesial|distal|vestibular|palatina|oclusal)
- treatment_catalog_id: INTEGER FK (opcional)
- treatment_catalog_item_id: INTEGER FK (opcional)
- condition: TEXT (healthy|treatment)
- notes: TEXT (opcional)
- created_at, updated_at: TEXT
- UNIQUE(patient_id, tooth_number, surface)
```

## Características Destacadas

✅ **Interfaz Visual Intuitiva**: Dientes con superficies diferenciadas por color
✅ **Soporte Pediátrico**: Alternancia entre dentición permanente y decidua
✅ **Catálogo Extensible**: Fácil agregar nuevos tratamientos
✅ **Costos Predefinidos**: Facilita facturación posterior
✅ **Historial Completo**: Se mantiene registro de todos los cambios
✅ **Integración Total**: Con el sistema de ventanas y menús de Galeno

## Próximas Mejoras Sugeridas

1. **Exportación de Odontograma**: PDF/Imagen del estado actual
2. **Historial por Diente**: Ver evolución temporal de cada pieza
3. **Plantillas de Tratamiento**: Aplicar planes predefinidos
4. **Estadísticas**: Reportes de tratamientos más comunes
5. **Integración con Tratamientos**: Auto-crear tratamiento al marcar superficie
6. **Vista de Radiografías**: Vincular imágenes con dientes específicos

## Validación

✅ Compilación Rust exitosa (solo warnings menores)
✅ TypeScript sin errores críticos
✅ Base de datos con migración v5
✅ Todos los comandos Tauri registrados
✅ Hooks y componentes integrados

---

**Versión**: 1.0.0  
**Fecha**: 5 de febrero de 2026  
**Migración DB**: v5
