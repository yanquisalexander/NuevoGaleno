# Sistema de Plugins para Nuevo Galeno

## Arquitectura General

El sistema de plugins permite extender Nuevo Galeno con aplicaciones de terceros mediante:

1. **Manifest System**: Definición declarativa de plugins
2. **Plugin API**: Hooks y servicios accesibles para plugins
3. **App Store**: Marketplace para descubrir e instalar plugins
4. **Sandboxing**: Aislamiento y permisos controlados
5. **Hot Loading**: Carga dinámica sin reiniciar

## Estructura de un Plugin

```
my-plugin/
├── manifest.json          # Definición del plugin
├── icon.png              # Icono de la app
├── index.js              # Punto de entrada
├── components/           # Componentes React
└── assets/              # Recursos estáticos
```

## Manifest Schema

```json
{
  "id": "com.example.myplugin",
  "name": "Mi Plugin",
  "version": "1.0.0",
  "author": "Nombre del Autor",
  "description": "Descripción del plugin",
  "icon": "icon.png",
  "entry": "index.js",
  "permissions": [
    "patients:read",
    "treatments:write",
    "api:network"
  ],
  "hooks": {
    "onPatientOpen": "handlePatientOpen",
    "onTreatmentCreate": "handleTreatmentCreate"
  },
  "menuItems": [
    {
      "label": "Mi Plugin",
      "icon": "🔌",
      "action": "openMainWindow"
    }
  ],
  "defaultSize": {
    "width": 800,
    "height": 600
  },
  "allowMultipleInstances": false,
  "minVersion": "1.0.0"
}
```

## Plugin API

### Contexto Global
```typescript
interface PluginContext {
  // Información del plugin
  plugin: {
    id: string;
    name: string;
    version: string;
  };
  
  // APIs disponibles según permisos
  api: {
    patients: PatientsAPI;
    treatments: TreatmentsAPI;
    ui: UIApi;
    storage: StorageAPI;
    network: NetworkAPI;
  };
  
  // Hooks del sistema
  hooks: {
    on(event: string, handler: Function): void;
    off(event: string, handler: Function): void;
    emit(event: string, data: any): void;
  };
}
```

## Sistema de Permisos

- `patients:read` - Leer datos de pacientes
- `patients:write` - Modificar datos de pacientes
- `treatments:read` - Leer tratamientos
- `treatments:write` - Crear/modificar tratamientos
- `appointments:read` - Leer citas
- `appointments:write` - Gestionar citas
- `api:network` - Realizar peticiones HTTP
- `storage:local` - Almacenamiento local
- `ui:notifications` - Mostrar notificaciones
- `system:commands` - Ejecutar comandos del sistema

## App Store

### Estructura
- Catálogo de plugins verificados
- Sistema de ratings y reviews
- Actualizaciones automáticas
- Instalación con un clic
- Gestión de licencias

### API del Store
```
GET  /api/store/plugins          # Lista de plugins
GET  /api/store/plugins/:id      # Detalle de plugin
POST /api/store/plugins/:id/install
POST /api/store/plugins/:id/uninstall
GET  /api/store/plugins/:id/reviews
```
