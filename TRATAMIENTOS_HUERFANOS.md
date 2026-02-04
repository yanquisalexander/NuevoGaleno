# Tratamientos Huérfanos - Tratam.db

## Problema Identificado

La tabla **Tratam.db** del sistema legacy contiene un catálogo de tratamientos con la siguiente estructura:

```
"NOTRAT";"DESCRIPCIO";"TIPO";"PRECIO";"HONORARIOS";"REFERENCIA";"Categoria"
```

### Observación Crítica

**Esta tabla NO contiene ninguna columna que vincule los tratamientos con pacientes específicos**.

Esto significa que:
- NOTRAT = ID del tratamiento (catálogo)
- No hay columna "Clave", "ClavPac", o similar
- Son definiciones de tratamientos disponibles, no tratamientos realizados a pacientes

## Comportamiento del Importador

El transformer actualmente:

1. ✅ **Detecta correctamente** la tabla Tratam.db usando las columnas NOTRAT, DESCRIPCIO, PRECIO, etc.
2. ✅ **Procesa los registros** mapeando:
   - NOTRAT → `legacy_treatment_id`
   - DESCRIPCIO → `name` y `description`
   - PRECIO → `total_cost`
   - HONORARIOS → notas
   - REFERENCIA → `reference_code`
   - Categoria → `sector`
3. ⚠️ **Los marca como huérfanos** porque no tienen `legacy_patient_id`
4. ✅ **Los registra como anomalías** con severity "warning"

## Soluciones Posibles

### Opción 1: Importar como Catálogo de Tratamientos (Recomendado)
Crear una tabla separada `treatment_catalog` para almacenar estos registros:
- Útil para autocompletado en UI
- Referencia de precios históricos
- No se mezclan con tratamientos de pacientes reales

### Opción 2: Vincular Manualmente
Si existe otra tabla (por ejemplo, "PacTrat.db" o similar) que vincule NOTRAT con pacientes:
- Buscar esa tabla en el directorio extraído
- Agregar lógica de cruce en transformer

### Opción 3: Ignorar Tratam.db
Si estos datos no son necesarios:
- Configurar el importador para saltear esta tabla
- O simplemente aceptar que serán huérfanos

## Resolución del Error de Schema

El error:
```
"Error creando schema: no such column: source_run_id"
```

Indica que existe una base de datos previa sin las columnas nuevas. 

**Solución**: Ejecutar el comando `clear_imported_data` antes de importar:

```javascript
// En el frontend
await invoke('clear_imported_data');
```

Esto:
1. Elimina todas las tablas antiguas con DROP TABLE
2. Recrea el schema completo con ensure_schema()
3. Garantiza que todas las columnas nuevas existan

## Recomendación Final

1. **Ejecutar `clear_imported_data`** antes de iniciar la importación
2. **Revisar el directorio extraído** para buscar otras tablas que vinculen tratamientos con pacientes
3. **Decidir** si Tratam.db debe ir a una tabla de catálogo o simplemente ignorarse
4. Los tratamientos huérfanos se registrarán correctamente en `import_anomalies` para revisión posterior
