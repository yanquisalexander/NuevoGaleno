# Sistema de Almacenamiento de Plugins en Base de Datos

Los plugins en Nuevo Galeno pueden almacenar datos de forma persistente usando tres tablas dedicadas en la base de datos SQLite.

## Tablas Disponibles

### 1. plugin_data

Almacenamiento key-value para datos del plugin.

```sql
CREATE TABLE plugin_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    value_type TEXT NOT NULL DEFAULT 'string',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(plugin_id, key)
);
```

**Tipos de valor soportados:**
- `string` - Texto simple
- `number` - Números (enteros o decimales)
- `boolean` - Valores true/false
- `json` - Objetos y arrays JSON
- `null` - Valor nulo

### 2. plugin_metadata

Metadatos de plugins instalados.

```sql
CREATE TABLE plugin_metadata (
    plugin_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    installed_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT,
    first_party INTEGER NOT NULL DEFAULT 0,
    settings TEXT
);
```

### 3. plugin_logs

Logs y eventos de plugins para debugging.

```sql
CREATE TABLE plugin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Niveles de log:**
- `debug` - Información de depuración
- `info` - Información general
- `warn` - Advertencias
- `error` - Errores

## API de Storage para Plugins

### Desde JavaScript/TypeScript

```typescript
// Guardar datos
await context.api.storage.set('lastSync', new Date().toISOString());
await context.api.storage.set('config', { theme: 'dark', autoBackup: true });
await context.api.storage.set('counter', 42);
await context.api.storage.set('enabled', true);

// Leer datos
const lastSync = await context.api.storage.get('lastSync');
const config = await context.api.storage.get('config');
const counter = await context.api.storage.get('counter');
const enabled = await context.api.storage.get('enabled');

// Eliminar datos
await context.api.storage.remove('lastSync');

// Limpiar todos los datos del plugin
await context.api.storage.clear();
```

### Desde Rust (Backend)

```rust
use crate::db::plugin_data;

// Obtener conexión
let conn = db::get_connection()?;

// Guardar datos
plugin_data::set_plugin_data(
    &conn,
    "com.example.myplugin",
    "config",
    r#"{"theme":"dark"}"#,
    "json"
)?;

// Leer datos
let entry = plugin_data::get_plugin_data(
    &conn,
    "com.example.myplugin",
    "config"
)?;

// Obtener todos los datos de un plugin
let all_data = plugin_data::get_all_plugin_data(
    &conn,
    "com.example.myplugin"
)?;

// Eliminar datos
plugin_data::remove_plugin_data(
    &conn,
    "com.example.myplugin",
    "config"
)?;

// Limpiar todos los datos
plugin_data::clear_plugin_data(
    &conn,
    "com.example.myplugin"
)?;
```

## Logging desde Plugins

Los plugins pueden registrar eventos para debugging:

```typescript
// Desde el plugin (próximamente)
context.api.log.debug('Iniciando sincronización');
context.api.log.info('Backup completado', { size: '125MB' });
context.api.log.warn('Conexión lenta detectada');
context.api.log.error('Falló la operación', { error: err.message });
```

```rust
// Desde Rust
use crate::db::plugin_data;

let conn = db::get_connection()?;

plugin_data::add_plugin_log(
    &conn,
    "com.example.myplugin",
    "info",
    "Backup completed successfully",
    Some(r#"{"size":"125MB","duration":"2.5s"}"#)
)?;
```

## Comandos Tauri Disponibles

```typescript
// Obtener todas las entradas de datos de un plugin
const entries = await invoke('get_plugin_data_entries', { 
  pluginId: 'com.example.myplugin' 
});

// Obtener logs de un plugin
const logs = await invoke('get_plugin_logs', { 
  pluginId: 'com.example.myplugin',
  limit: 100 
});

// Añadir log manualmente
await invoke('add_plugin_log', {
  pluginId: 'com.example.myplugin',
  level: 'info',
  message: 'Custom log entry',
  metadata: JSON.stringify({ custom: 'data' })
});
```

## Ventajas del Almacenamiento en Base de Datos

1. **Transaccional**: Operaciones ACID garantizadas
2. **Consultas SQL**: Búsquedas y filtros avanzados
3. **Backups**: Se incluye automáticamente en backups de la aplicación
4. **Performance**: Más rápido que archivos JSON para grandes volúmenes
5. **Integridad**: Constraints y validaciones a nivel de BD
6. **Auditoría**: Timestamps automáticos de creación/actualización
7. **Debugging**: Sistema de logs integrado

## Migración desde Archivos JSON

Si anteriormente usabas archivos `.storage.json`, los datos se migran automáticamente a la base de datos en la primera ejecución después de la actualización.

## Límites y Consideraciones

- **Tamaño máximo por valor**: 1MB recomendado
- **Logs**: Se mantienen los últimos 30 días por defecto
- **Limpieza**: Los logs antiguos se eliminan automáticamente
- **Índices**: Optimizados para búsquedas por plugin_id y key

## Ejemplo Completo: Plugin de Backup

```typescript
export async function activate(context: PluginContext) {
  // Cargar configuración
  const config = await context.api.storage.get('config') || {
    autoBackup: false,
    frequency: 'weekly',
    lastBackup: null
  };
  
  // Verificar último backup
  if (config.lastBackup) {
    const daysSince = Math.floor(
      (Date.now() - new Date(config.lastBackup).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSince > 7) {
      context.api.ui.showNotification(
        `Hace ${daysSince} días del último backup`,
        'warning'
      );
    }
  }
  
  // Guardar estadísticas
  await context.api.storage.set('stats', {
    totalBackups: (config.stats?.totalBackups || 0) + 1,
    lastCheck: new Date().toISOString()
  });
}

export async function createBackup(context: PluginContext) {
  try {
    // Realizar backup...
    
    // Actualizar configuración
    const config = await context.api.storage.get('config');
    config.lastBackup = new Date().toISOString();
    await context.api.storage.set('config', config);
    
    // Log del evento
    await invoke('add_plugin_log', {
      pluginId: context.plugin.id,
      level: 'info',
      message: 'Backup created successfully',
      metadata: JSON.stringify({ size: '125MB' })
    });
    
  } catch (error) {
    await invoke('add_plugin_log', {
      pluginId: context.plugin.id,
      level: 'error',
      message: 'Backup failed',
      metadata: JSON.stringify({ error: error.message })
    });
  }
}
```

## Consultas SQL Directas (Avanzado)

Para casos avanzados, los plugins pueden ejecutar consultas SQL directas (requiere permiso especial):

```rust
// Solo disponible en plugins con permiso 'database:direct'
let conn = db::get_connection()?;

let mut stmt = conn.prepare(
    "SELECT key, value FROM plugin_data 
     WHERE plugin_id = ?1 AND key LIKE ?2
     ORDER BY updated_at DESC"
)?;

let results = stmt.query_map(params!["com.example.myplugin", "backup_%"], |row| {
    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
})?;
```

## Mantenimiento

```sql
-- Ver todos los datos de un plugin
SELECT * FROM plugin_data WHERE plugin_id = 'com.example.myplugin';

-- Ver logs recientes
SELECT * FROM plugin_logs 
WHERE plugin_id = 'com.example.myplugin' 
ORDER BY created_at DESC 
LIMIT 50;

-- Limpiar logs antiguos (automático)
DELETE FROM plugin_logs 
WHERE created_at < datetime('now', '-30 days');

-- Ver plugins instalados
SELECT * FROM plugin_metadata ORDER BY name;
```
