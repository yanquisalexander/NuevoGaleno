# Plugins First-Party de Nuevo Galeno

Estos plugins vienen incluidos con Nuevo Galeno y están disponibles para instalación desde la tienda.

## 1. Backup & Restore (💾)

Sistema completo de respaldo y restauración de datos.

### Características:
- Creación de backups manuales
- Backups automáticos programados
- Restauración desde backup
- Historial de backups
- Compresión de datos
- Verificación de integridad

### Permisos:
- `patients:read`
- `treatments:read`
- `appointments:read`
- `payments:read`
- `system:commands`

### Uso:
1. Instalar desde la tienda de plugins
2. Abrir desde el menú "Backup & Restore"
3. Configurar backup automático (opcional)
4. Crear backup manual cuando sea necesario

## 2. Analytics Dashboard (📊)

Panel de análisis y estadísticas avanzadas.

### Características:
- Métricas en tiempo real
- Gráficos de ingresos mensuales
- Análisis de tratamientos por tipo
- Estadísticas de pacientes
- Tendencias y proyecciones
- Exportación de reportes

### Permisos:
- `patients:read`
- `treatments:read`
- `appointments:read`
- `payments:read`

### Métricas Disponibles:
- Total de pacientes
- Tratamientos activos
- Ingresos totales
- Citas pendientes
- Crecimiento mensual
- Distribución de tratamientos

### Uso:
1. Instalar desde la tienda de plugins
2. Abrir desde el menú "Analytics"
3. Visualizar estadísticas en tiempo real
4. Exportar reportes (próximamente)

## Instalación

Los plugins first-party están incluidos en la aplicación y solo necesitan ser activados:

1. Abrir la Tienda de Plugins
2. Buscar el plugin deseado
3. Hacer clic en "Instalar"
4. El plugin aparecerá en el menú principal

## Desarrollo de Nuevos Plugins First-Party

Para añadir un nuevo plugin first-party:

1. Crear carpeta en `src/plugins/[nombre-plugin]/`
2. Añadir `manifest.json` con la configuración
3. Crear `index.tsx` con las funciones `activate()` y `deactivate()`
4. Crear componentes en `components/`
5. Registrar en `src-tauri/src/plugins.rs` en la función `get_store_plugins()`
6. Añadir a la lista de `first_party_plugins` en `install_plugin_from_store()`

## Roadmap de Plugins

Próximos plugins first-party planeados:

- **Reportes Avanzados** - Generación de reportes personalizados
- **Recordatorios SMS** - Envío de recordatorios por SMS
- **Integración WhatsApp** - Comunicación con pacientes vía WhatsApp
- **Facturación Electrónica** - Generación de facturas electrónicas
- **Inventario** - Gestión de inventario de materiales
- **Marketing** - Campañas de marketing y seguimiento
- **Telemedicina** - Consultas virtuales con pacientes
