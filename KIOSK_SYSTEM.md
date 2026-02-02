# Sistema Kiosk de Nuevo Galeno

## 🏗️ Arquitectura

Nuevo Galeno ahora funciona como una aplicación tipo **kiosk fullscreen** con un sistema de ventanas integrado, inspirado en Material Design 3.

### Componentes Principales

#### 1. **Window Manager** (`src/contexts/WindowManagerContext.tsx`)
Sistema central de gestión de ventanas que maneja:
- Apertura/cierre de ventanas
- Minimizar/maximizar/restaurar
- Sistema de focus y z-index
- Control de múltiples instancias por app

#### 2. **Desktop** (`src/components/kiosk/Desktop.tsx`)
- Área principal con gradiente Material Design 3
- Iconos de aplicaciones disponibles
- Doble clic para abrir aplicaciones

#### 3. **Taskbar** (`src/components/kiosk/Taskbar.tsx`)
- Botón de inicio con menú de apps
- Búsqueda rápida
- Botones de ventanas abiertas
- Reloj y fecha del sistema

#### 4. **Window** (`src/components/kiosk/Window.tsx`)
Ventanas arrastrables y redimensionables con:
- Barra de título con controles
- Soporte para minimizar/maximizar
- Sistema de focus
- Resize handle

#### 5. **Apps** (`src/apps/index.tsx`)
Apps de ejemplo incluidas:
- **Panel de Control**: Dashboard con estadísticas (instancia única)
- **Ficha de Paciente**: Formulario de paciente (múltiples instancias permitidas)
- **Configuración**: Panel de ajustes (instancia única)

## 🎨 Material Design 3

### Paleta de Colores
La aplicación utiliza el sistema de colores de Material Design 3:

- **Primary**: `#6750A4` (Púrpura)
- **Secondary**: `#625B71` (Gris púrpura)
- **Tertiary**: `#7D5260` (Rosa)
- **Surface**: `#FFFBFE` (Blanco cálido)
- **Background**: `#FFFBFE`

### Elevaciones
- `shadow-md3-1` hasta `shadow-md3-5` para diferentes niveles de elevación
- Radios de borde: `rounded-md3-xs` hasta `rounded-md3-full`

### Tipografía
- Font: **Roboto** (cargado desde Google Fonts)
- Pesos: 300, 400, 500, 700

## 🚀 Cómo Crear una Nueva App

1. **Define tu componente de app** en `src/apps/`:

```tsx
export function MiNuevaApp({ windowId, data }: { windowId: WindowId; data?: any }) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-medium text-md3-on-surface">
        Mi Nueva App
      </h2>
      {/* Tu contenido aquí */}
    </div>
  );
}
```

2. **Agrega la definición** al array `APP_DEFINITIONS`:

```tsx
{
  id: 'mi-nueva-app',
  name: 'Mi Nueva App',
  icon: '🎯', // Emoji o componente
  allowMultipleInstances: false, // true para permitir múltiples ventanas
  defaultSize: { width: 800, height: 600 },
  component: MiNuevaApp,
}
```

3. **La app aparecerá automáticamente**:
   - En el desktop como icono
   - En el menú de inicio de la taskbar

## 🎯 Características

### Window Manager
- ✅ Múltiples ventanas simultáneas
- ✅ Arrastrar y redimensionar
- ✅ Minimizar/Maximizar/Cerrar
- ✅ Sistema de focus (z-index automático)
- ✅ Control de instancias múltiples por app
- ✅ Datos específicos por ventana (ej: ID de paciente)

### UI/UX
- ✅ Estilo Material Design 3
- ✅ Fullscreen kiosk mode
- ✅ Barra de tareas funcional
- ✅ Desktop con iconos
- ✅ Menú de inicio
- ✅ Reloj en tiempo real
- ✅ Transiciones suaves

## 🔧 Personalización

### Cambiar Colores MD3
Edita `tailwind.config.cjs` y modifica las variables de color en `theme.extend.colors`.

### Modificar Tamaño de Ventana
En la definición de tu app:
```tsx
{
  defaultSize: { width: 1000, height: 700 },
  minSize: { width: 400, height: 300 }, // Opcional
}
```

### Personalizar Taskbar
Edita `src/components/kiosk/Taskbar.tsx` para agregar más funcionalidad en el área de system tray.

## 📝 Notas Técnicas

- El sistema usa **React Context** para el state management
- Las ventanas usan **absolute positioning** con transforms para el arrastre
- El z-index se calcula automáticamente basándose en el orden de focus
- Los eventos de mouse se capturan a nivel de documento para drag/resize suave
- La barra de tareas tiene un z-index fijo de 50

## 🎮 Atajos de Teclado

- `Ctrl + Shift + D`: Abrir Command Palette (heredado)

## 📦 Estructura de Archivos

```
src/
├── apps/
│   └── index.tsx              # Definiciones de apps
├── components/
│   └── kiosk/
│       ├── Desktop.tsx        # Escritorio
│       ├── Taskbar.tsx        # Barra de tareas
│       ├── Window.tsx         # Componente de ventana
│       ├── WindowContainer.tsx # Contenedor de ventanas
│       └── index.ts
├── contexts/
│   └── WindowManagerContext.tsx # Context de gestión de ventanas
├── types/
│   └── window-manager.ts      # TypeScript types
└── App.tsx                    # App principal
```

## 🔮 Próximas Mejoras

- [ ] Sistema de notificaciones
- [ ] Workspace persistence (guardar estado de ventanas)
- [ ] Temas personalizables (light/dark)
- [ ] Snap zones para organizar ventanas
- [ ] Virtual desktops
- [ ] Búsqueda funcional en taskbar
