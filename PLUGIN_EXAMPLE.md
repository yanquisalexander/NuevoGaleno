# Ejemplo de Plugin para Nuevo Galeno

## Estructura del Plugin

```
mi-plugin-ejemplo/
├── manifest.json
├── icon.png
├── index.js
└── components/
    └── MainWindow.jsx
```

## manifest.json

```json
{
  "id": "com.miempresa.ejemplo",
  "name": "Plugin de Ejemplo",
  "version": "1.0.0",
  "author": "Mi Empresa",
  "description": "Un plugin de ejemplo que muestra cómo integrar con Nuevo Galeno",
  "icon": "🔌",
  "entry": "index.js",
  "permissions": [
    "patients:read",
    "ui:notifications"
  ],
  "hooks": {
    "onPatientOpen": "handlePatientOpen"
  },
  "menuItems": [
    {
      "label": "Mi Plugin",
      "icon": "🔌",
      "action": "openMainWindow",
      "shortcut": "Ctrl+Shift+P"
    }
  ],
  "defaultSize": {
    "width": 800,
    "height": 600
  },
  "allowMultipleInstances": false,
  "minVersion": "1.0.0",
  "repository": "https://github.com/miempresa/mi-plugin",
  "homepage": "https://miempresa.com/plugin",
  "license": "MIT"
}
```

## index.js

```javascript
// Punto de entrada del plugin
let context = null;

export async function activate(pluginContext) {
  context = pluginContext;
  
  console.log(`Plugin ${context.plugin.name} activado`);
  
  // Registrar hooks
  context.hooks.on('patient:open', handlePatientOpen);
  
  // Mostrar notificación de bienvenida
  context.api.ui.showNotification(
    `${context.plugin.name} está listo`,
    'success'
  );
}

export async function deactivate() {
  console.log('Plugin desactivado');
  
  // Limpiar recursos
  if (context) {
    context.hooks.off('patient:open', handlePatientOpen);
  }
}

async function handlePatientOpen(patient) {
  console.log('Paciente abierto:', patient);
  
  // Cargar datos del paciente
  const treatments = await context.api.treatments.getByPatient(patient.id);
  
  context.api.ui.showNotification(
    `Paciente ${patient.name} tiene ${treatments.length} tratamientos`,
    'info'
  );
}

// Acción del menú
export async function openMainWindow() {
  // Abrir ventana principal del plugin
  const MainWindow = (await import('./components/MainWindow.jsx')).default;
  
  context.api.ui.openWindow(
    'Mi Plugin',
    MainWindow,
    { context }
  );
}

// Comando personalizado
export async function buscarPacientes(query) {
  const patients = await context.api.patients.search(query);
  return patients;
}
```

## components/MainWindow.jsx

```jsx
import React, { useState, useEffect } from 'react';

export default function MainWindow({ data }) {
  const { context } = data;
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const result = await context.api.patients.getAll(10);
      setPatients(result);
    } catch (error) {
      console.error('Error loading patients:', error);
      context.api.ui.showNotification('Error al cargar pacientes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = async (patient) => {
    const confirmed = await context.api.ui.showDialog({
      title: 'Confirmar',
      message: `¿Abrir ficha de ${patient.name}?`,
      type: 'confirm',
    });

    if (confirmed) {
      // Emitir evento personalizado
      context.hooks.emit('plugin:patient-selected', patient);
    }
  };

  if (loading) {
    return <div className="p-4 text-white">Cargando...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl text-white mb-4">Pacientes Recientes</h1>
      
      <div className="space-y-2">
        {patients.map(patient => (
          <div
            key={patient.id}
            onClick={() => handlePatientClick(patient)}
            className="p-3 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
          >
            <div className="text-white font-medium">{patient.name}</div>
            <div className="text-white/50 text-sm">{patient.email}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Uso de Storage

```javascript
// Guardar configuración
await context.api.storage.set('theme', 'dark');
await context.api.storage.set('lastSync', new Date().toISOString());
await context.api.storage.set('config', { autoBackup: true, frequency: 'weekly' });

// Leer configuración
const theme = await context.api.storage.get('theme');
const lastSync = await context.api.storage.get('lastSync');
const config = await context.api.storage.get('config');

// Eliminar configuración
await context.api.storage.remove('theme');

// Limpiar todo
await context.api.storage.clear();
```

**Nota:** Los datos se almacenan en la base de datos SQLite de la aplicación, no en archivos JSON. Esto proporciona mejor rendimiento, transacciones ACID y se incluye automáticamente en los backups.

## Logging

```javascript
// Registrar eventos para debugging (próximamente)
await invoke('add_plugin_log', {
  pluginId: context.plugin.id,
  level: 'info',
  message: 'Backup completed',
  metadata: JSON.stringify({ size: '125MB' })
});

// Ver logs
const logs = await invoke('get_plugin_logs', {
  pluginId: context.plugin.id,
  limit: 100
});
```

## Uso de Network API

```javascript
// Hacer petición HTTP (requiere permiso api:network)
const response = await context.api.network.fetch('https://api.example.com/data');
const data = await response.json();
```

## Hooks Disponibles

- `patient:open` - Cuando se abre un paciente
- `patient:create` - Cuando se crea un paciente
- `patient:update` - Cuando se actualiza un paciente
- `treatment:create` - Cuando se crea un tratamiento
- `treatment:update` - Cuando se actualiza un tratamiento
- `appointment:create` - Cuando se crea una cita
- `appointment:update` - Cuando se actualiza una cita
- `payment:create` - Cuando se registra un pago
- `app:ready` - Cuando la aplicación está lista
- `app:shutdown` - Cuando la aplicación se cierra

## Instalación

1. Comprimir el plugin en un archivo .zip
2. Abrir Nuevo Galeno
3. Ir a la App Store
4. Hacer clic en "Instalar desde archivo"
5. Seleccionar el archivo .zip
6. Aceptar los permisos solicitados
7. El plugin estará disponible en el menú
