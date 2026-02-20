# Guía de Desarrollo de Plugins para Galeno

## Introducción

Galeno soporta plugins externos que se ejecutan en iframes aislados y se comunican con la aplicación principal mediante un sistema de mensajes seguro.

## Estructura de un Plugin

Un plugin de Galeno es un directorio que contiene:

```
mi-plugin/
├── plugin.json       # Manifiesto del plugin (requerido)
├── index.html        # Punto de entrada (requerido)
├── main.js           # Lógica del plugin (opcional)
├── styles.css        # Estilos (opcional)
└── assets/           # Recursos adicionales (opcional)
    ├── icon.png
    └── ...
```

## Manifiesto del Plugin (plugin.json)

```json
{
  "id": "com.example.miplugin",
  "name": "Mi Plugin",
  "version": "1.0.0",
  "author": "Tu Nombre",
  "description": "Descripción del plugin",
  "icon": "🔌",
  "entry": "index.html",
  "api_version": "1",
  "permissions": [
    "patients:read",
    "patients:write",
    "treatments:read",
    "appointments:read",
    "storage:read",
    "storage:write"
  ],
  "menu_items": [
    {
      "label": "Mi Plugin",
      "icon": "🔌",
      "action": "openMainWindow"
    }
  ],
  "default_size": {
    "width": 800,
    "height": 600
  },
  "allow_multiple_instances": false,
  "license": "MIT"
}
```

### Campos del Manifiesto

- **id** (requerido): Identificador único del plugin (formato: com.autor.nombre)
- **name** (requerido): Nombre visible del plugin
- **version** (requerido): Versión del plugin (semver)
- **author** (requerido): Nombre del autor
- **description** (requerido): Descripción breve
- **icon** (requerido): Emoji o ruta a icono
- **entry** (requerido): Archivo HTML de entrada
- **api_version** (requerido): Versión de la API de Galeno
- **permissions** (requerido): Lista de permisos necesarios
- **menu_items** (opcional): Items del menú
- **default_size** (opcional): Tamaño por defecto de la ventana
- **allow_multiple_instances** (opcional): Permitir múltiples instancias
- **license** (opcional): Licencia del plugin

## Permisos Disponibles

### Pacientes
- `patients:read` - Leer información de pacientes
- `patients:write` - Crear y modificar pacientes

### Tratamientos
- `treatments:read` - Leer tratamientos
- `treatments:write` - Crear y modificar tratamientos

### Citas
- `appointments:read` - Leer citas
- `appointments:write` - Crear, modificar y eliminar citas

### Pagos
- `payments:read` - Leer pagos
- `payments:write` - Crear y modificar pagos

### Almacenamiento
- `storage:read` - Leer del almacenamiento del plugin
- `storage:write` - Escribir en el almacenamiento del plugin

### Sistema
- `system:commands` - Ejecutar comandos del sistema (requiere aprobación del usuario)

## API del Plugin (GalenoAPI)

### Incluir el SDK

```html
<script src="../galeno-plugin-sdk.js"></script>
```

### Pacientes

```javascript
// Obtener lista de pacientes
const patients = await GalenoAPI.getPatients({ 
  search: 'García',
  limit: 10,
  offset: 0
});

// Obtener un paciente específico
const patient = await GalenoAPI.getPatient(patientId);

// Crear paciente
const newPatient = await GalenoAPI.createPatient({
  name: 'Juan García',
  email: 'juan@example.com',
  phone: '555-1234'
});

// Actualizar paciente
const updated = await GalenoAPI.updatePatient(patientId, {
  phone: '555-5678'
});
```

### Tratamientos

```javascript
// Obtener tratamientos
const treatments = await GalenoAPI.getTreatments({ patientId: 123 });

// Obtener un tratamiento
const treatment = await GalenoAPI.getTreatment(treatmentId);

// Crear tratamiento
const newTreatment = await GalenoAPI.createTreatment({
  patientId: 123,
  description: 'Limpieza dental',
  cost: 50.00
});
```

### Citas

```javascript
// Obtener citas
const appointments = await GalenoAPI.getAppointments({
  date: '2024-01-15'
});

// Crear cita
const appointment = await GalenoAPI.createAppointment({
  patientId: 123,
  date: '2024-01-15',
  time: '10:00',
  duration: 60
});

// Eliminar cita
await GalenoAPI.deleteAppointment(appointmentId);
```

### Almacenamiento

El plugin tiene su propio almacenamiento key-value aislado:

```javascript
// Guardar datos
await GalenoAPI.storageSet('config', {
  theme: 'dark',
  language: 'es'
});

// Leer datos
const config = await GalenoAPI.storageGet('config');

// Eliminar una clave
await GalenoAPI.storageRemove('config');

// Limpiar todo el almacenamiento
await GalenoAPI.storageClear();
```

### Notificaciones

```javascript
await GalenoAPI.showNotification({
  title: 'Éxito',
  message: 'Operación completada',
  type: 'success' // info, success, warning, error
});
```

## Ejemplo Completo

```html
<!DOCTYPE html>
<html>
<head>
  <title>Mi Plugin</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
    }
    button {
      padding: 10px 20px;
      margin: 5px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>Mi Plugin de Galeno</h1>
  <button onclick="loadPatients()">Cargar Pacientes</button>
  <div id="result"></div>

  <script src="../galeno-plugin-sdk.js"></script>
  <script>
    async function loadPatients() {
      try {
        const patients = await GalenoAPI.getPatients({ limit: 10 });
        document.getElementById('result').innerHTML = 
          `<pre>${JSON.stringify(patients, null, 2)}</pre>`;
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
  </script>
</body>
</html>
```

## Distribución

### Crear un archivo .galeno

Un archivo `.galeno` es simplemente un archivo ZIP con tu plugin:

```bash
# Comprimir tu plugin
zip -r mi-plugin.galeno mi-plugin/

# O en Windows
Compress-Archive -Path mi-plugin -DestinationPath mi-plugin.galeno
```

### Instalación

Los usuarios pueden instalar tu plugin:
1. Descargando el archivo `.galeno`
2. Abriendo Galeno
3. Yendo a Configuración > Plugins
4. Haciendo clic en "Instalar Plugin"
5. Seleccionando el archivo `.galeno`

## Mejores Prácticas

1. **Seguridad**: Nunca almacenes información sensible en el almacenamiento del plugin sin cifrar
2. **Permisos**: Solo solicita los permisos que realmente necesitas
3. **Rendimiento**: Minimiza las llamadas a la API, usa caché cuando sea posible
4. **UX**: Proporciona feedback visual durante operaciones largas
5. **Errores**: Maneja todos los errores de la API apropiadamente
6. **Responsive**: Diseña tu UI para funcionar en diferentes tamaños de ventana

## Debugging

Puedes usar las herramientas de desarrollo del navegador:
1. Click derecho en tu plugin
2. Selecciona "Inspeccionar elemento"
3. Usa la consola para ver logs y errores

## Soporte

Para preguntas y soporte:
- Documentación: https://docs.nuevogaleno.com/plugins
- Foro: https://forum.nuevogaleno.com
- Email: plugins@nuevogaleno.com

## Ejemplo de Plugin

Revisa el directorio `example-plugin/` para ver un plugin funcional completo.
