# Sistema de MenuBar Dinámico

## Descripción

Sistema de MenuBar contextual que cambia según la aplicación enfocada, similar al comportamiento de macOS.

## Uso

### 1. Definir el MenuBar en tu aplicación

```typescript
import { useAppMenuBar } from '@/hooks/useAppMenuBar';
import { toast } from 'sonner';

export function PatientsApp({ windowId }: { windowId: string }) {
    // Definir el menubar de la aplicación
    useAppMenuBar({
        windowId,
        config: {
            appName: 'Pacientes',
            menus: [
                {
                    id: 'file',
                    label: 'Archivo',
                    items: [
                        {
                            id: 'new',
                            label: 'Nuevo Paciente',
                            type: 'item',
                            shortcut: '⌘N',
                            action: () => {
                                // Acción para crear nuevo paciente
                                toast.info('Crear nuevo paciente');
                            },
                        },
                        {
                            id: 'sep1',
                            label: '',
                            type: 'separator',
                        },
                        {
                            id: 'export',
                            label: 'Exportar Lista',
                            type: 'item',
                            action: () => {
                                toast.info('Exportar pacientes');
                            },
                        },
                        {
                            id: 'print',
                            label: 'Imprimir',
                            type: 'item',
                            shortcut: '⌘P',
                            disabled: true,
                        },
                    ],
                },
                {
                    id: 'edit',
                    label: 'Edición',
                    items: [
                        {
                            id: 'search',
                            label: 'Buscar',
                            type: 'item',
                            shortcut: '⌘F',
                            action: () => {
                                // Focus en campo de búsqueda
                            },
                        },
                    ],
                },
                {
                    id: 'view',
                    label: 'Ver',
                    items: [
                        {
                            id: 'grid',
                            label: 'Vista de Cuadrícula',
                            type: 'item',
                        },
                        {
                            id: 'list',
                            label: 'Vista de Lista',
                            type: 'item',
                        },
                    ],
                },
            ],
        },
    });

    return (
        <div>
            {/* Contenido de la app */}
        </div>
    );
}
```

### 2. Tipos Disponibles

```typescript
// Tipos de elementos del menú
type MenuBarItemType = 'item' | 'separator' | 'submenu';

interface MenuBarItem {
    id: string;
    label: string;
    type: MenuBarItemType;
    action?: () => void;       // Función a ejecutar al hacer clic
    shortcut?: string;         // Atajo de teclado (ej: '⌘N', 'Ctrl+S')
    disabled?: boolean;        // Si está deshabilitado
    submenu?: MenuBarItem[];   // Para submenús anidados
}

interface MenuBarMenu {
    id: string;
    label: string;
    items: MenuBarItem[];
}

interface MenuBarConfig {
    appName?: string;          // Nombre que aparece en la barra
    menus: MenuBarMenu[];      // Array de menús
}
```

### 3. Ejemplos de Elementos

#### Item Normal
```typescript
{
    id: 'save',
    label: 'Guardar',
    type: 'item',
    shortcut: '⌘S',
    action: () => handleSave(),
}
```

#### Separador
```typescript
{
    id: 'sep1',
    label: '',
    type: 'separator',
}
```

#### Item Deshabilitado
```typescript
{
    id: 'undo',
    label: 'Deshacer',
    type: 'item',
    shortcut: '⌘Z',
    disabled: true,
    action: () => handleUndo(),
}
```

### 4. Atajos de Teclado Comunes

- macOS: `⌘N`, `⌘S`, `⌘P`, `⌘Z`, etc.
- Windows: `Ctrl+N`, `Ctrl+S`, `Ctrl+P`, `Ctrl+Z`, etc.

### 5. MenuBar por Defecto

Si no se define un menubar, se usa uno por defecto:

```typescript
{
    appName: 'GalenoOS',
    menus: [
        { id: 'file', label: 'Archivo', items: [] },
        { id: 'edit', label: 'Edición', items: [] },
        { id: 'view', label: 'Ver', items: [] },
        { id: 'help', label: 'Ayuda', items: [] },
    ],
}
```

## Características

✅ **Dinámico**: Cambia automáticamente al enfocar diferentes ventanas
✅ **Separadores**: Soporte para líneas divisorias en menús
✅ **Atajos**: Muestra atajos de teclado visuales
✅ **Estados**: Soporte para items deshabilitados
✅ **Animaciones**: Transiciones suaves al abrir menús
✅ **Auto-cierre**: Los menús se cierran al hacer clic fuera

## Integración con Window Manager

El sistema se integra automáticamente cuando una ventana recibe el foco. Cada aplicación puede definir su propio menubar usando el hook `useAppMenuBar`.
