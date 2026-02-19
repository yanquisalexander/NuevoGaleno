# Hello World Plugin

Un plugin de ejemplo para Nuevo Galeno que demuestra las capacidades básicas del sistema de plugins.

## Instalación

1. Copia esta carpeta completa a: `C:\Users\alexb\AppData\Roaming\dev.alexitoo.nuevogaleno\plugins\com.example.hello`
2. Abre Nuevo Galeno
3. Ve a la Tienda de Plugins → Instalados
4. Activa el plugin "Hello World"

## Características

- ✅ Muestra notificaciones
- ✅ Lee datos de pacientes
- ✅ Interfaz de usuario personalizada
- ✅ Manejo de eventos del sistema

## Estructura de Archivos

```
com.example.hello/
├── manifest.json          # Configuración del plugin
├── index.js              # Punto de entrada
├── components/
│   └── MainWindow.jsx    # Componente principal
├── .meta.json           # Metadatos (generado automáticamente)
└── README.md            # Este archivo
```

## Permisos

- `patients:read` - Para leer la lista de pacientes
- `ui:notifications` - Para mostrar notificaciones

## Personalización

Puedes modificar este plugin para crear tu propio plugin personalizado.

## Licencia

MIT License
