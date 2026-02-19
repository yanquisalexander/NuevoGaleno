# Sistema de Vista Médica Personalizable

## Descripción

Sistema de vista médica personalizable que permite a los doctores configurar widgets informativos en el expediente del paciente, alternando entre la vista normal (con pestañas) y una vista médica con widgets configurables.

## Características Implementadas

### 1. Toggle de Vista Médica
- **Atajo de teclado**: `⌘M` (Ctrl+M en Windows)
- **Ubicación del menú**: Ver > Vista Médica / Vista Normal
- **Persistencia**: Las preferencias se guardan en localStorage

### 2. Widgets Disponibles

#### Alertas de Alergias (`allergies-alert`)
- Muestra alergias del paciente con estilo de alerta destacado
- Prioridad visual alta (borde rojo, fondo destacado)

#### Signos Vitales (`vital-signs`)
- Muestra presión arterial, pulso y temperatura
- Permite registrar lecturas rápidas y las guarda en el historial del paciente
- Layout compacto para información rápida

#### Notas Rápidas (`quick-notes`)
- Visualización y edición de notas clínicas
- **Persistencia**: las notas se guardan en `patient.medical_notes` (historial) y también en la configuración del widget
- Área de texto expandible

#### Tratamientos Recientes (`recent-treatments`)
- Lista de tratamientos recientes
- Acciones rápidas: marcar como terminado, abrir ficha del paciente y registrar pago

#### Pagos Pendientes (`pending-payments`)
- Balance y estado de cuenta
- Resumen financiero rápido

#### Próxima Cita (`next-appointment`)
- Información de la próxima cita programada
- Integración con sistema de citas (pendiente)

#### Historial Médico (`medical-history`)
- Resumen del historial médico del paciente

#### Vista Previa Odontograma (`odontogram-preview`)
- Muestra un resumen/contador de entradas del odontograma
- Botón rápido para abrir el odontograma del paciente en la ficha (navegación directa)

### 3. Modo de Edición

#### Personalización de Layout
- **Agregar widgets**: Botón "Agregar Widget" con catálogo completo
- **Eliminar widgets**: Botón X en cada widget (visible en modo edición)
- **Reorganizar**: Drag handles para mover widgets (visual implementado)
- **Guardar**: Botón "Guardar" para persistir cambios
- **Restaurar**: Botón "Restaurar" para volver al layout por defecto

#### Indicadores Visuales
- Ring azul alrededor de widgets en modo edición
- Badge "Modo Edición" en la barra de herramientas
- Badge "Vista Médica" en el header del paciente

### 4. Sistema de Preferencias

#### Estructura de Datos
```typescript
{
  enabled: boolean,           // Vista médica activada/desactivada
  layout: {
    gridColumns: 12,         // Columnas del grid
    gridRows: 8,             // Filas del grid
    widgets: [               // Array de widgets configurados
      {
        id: string,          // ID único del widget
        type: WidgetType,    // Tipo de widget
        position: { x, y },  // Posición en el grid
        size: { width, height }, // Tamaño del widget
        config: {}           // Configuración específica (extensible)
      }
    ]
  }
}
```

#### Almacenamiento
- **Medio**: localStorage
- **Clave**: `medical_view_preferences`
- **Scope**: Global (todos los pacientes comparten el mismo layout)

### 5. Layout por Defecto

El sistema viene con un layout pre-configurado:
- **Fila 1**: Alergias (izquierda) + Signos Vitales (derecha)
- **Fila 2-3**: Notas Rápidas (grande, izquierda) + Tratamientos Recientes (derecha)
- **Fila 4**: Pagos Pendientes (izquierda) + Próxima Cita (derecha)

## Archivos Creados

### Tipos
- `src/types/medical-view.ts` - Definiciones de tipos TypeScript

### Hooks
- `src/hooks/useMedicalView.ts` - Hook para gestionar estado de vista médica

### Componentes
- `src/components/patients/MedicalView.tsx` - Componente principal de la vista médica
- `src/components/patients/MedicalWidgets.tsx` - Componentes individuales de widgets

### Modificados
- `src/apps/PatientRecord.tsx` - Integración de la vista médica

## Uso

### Activar Vista Médica
1. Abrir expediente de un paciente
2. Menú: **Ver > Vista Médica** (o `⌘M`)
3. La interfaz cambia a la vista de widgets

### Personalizar Layout
1. Con vista médica activa, clic en "Personalizar"
2. Usar "Agregar Widget" para añadir nuevos widgets
3. Usar botón X para eliminar widgets
4. Hacer clic en "Guardar" para persistir cambios

### Restaurar Configuración
1. En modo edición, clic en "Restaurar"
2. Confirmar que desea volver al layout por defecto
3. Hacer clic en "Guardar"

### Volver a Vista Normal
1. Menú: **Ver > Vista Normal** (o `⌘M`)
2. La interfaz vuelve a las pestañas tradicionales

## Características Futuras (Sugeridas)

### 1. Drag & Drop
- Implementar arrastre de widgets para reorganizar
- Usar biblioteca como `react-grid-layout` o `dnd-kit`

### 2. Resize de Widgets
- Permitir cambiar tamaño de widgets
- Handles de resize en las esquinas

### 3. Layouts por Especialidad
- Guardar múltiples layouts (Endodoncia, Ortodoncia, etc.)
- Selector rápido de layout

### 4. Widgets Avanzados
- **Imágenes Radiográficas**: Gallery de radiografías recientes
- **Timeline**: Línea de tiempo de eventos médicos
- **Gráficas**: Evolución de signos vitales
- **Medicamentos**: Lista de medicamentos activos
- **Consentimientos**: Estado de documentos firmados

### 5. Widgets Interactivos
- Permitir acciones directas desde widgets
- Ej: Agregar nota desde widget de notas
- Ej: Registrar signos vitales desde widget

### 6. Exportar/Importar Configuración
- Exportar layout a archivo JSON
- Importar configuraciones de otros usuarios
- Compartir layouts en equipo

### 7. Widgets por Paciente
- Permitir layouts específicos por paciente
- Guardar en base de datos junto con datos del paciente

## Integración con Backend

Actualmente las preferencias se guardan en localStorage. Para persistencia en servidor:

```typescript
// En useMedicalView.ts
const savePreferences = useCallback(async (newPreferences: MedicalViewPreferences) => {
    try {
        // Guardar en backend
        await invoke('save_medical_view_preferences', { 
            userId: currentUserId,
            preferences: newPreferences 
        });
        
        // Actualizar estado local
        setPreferences(newPreferences);
        toast.success('Preferencias guardadas');
    } catch (error) {
        console.error('Error guardando preferencias:', error);
        toast.error('Error al guardar preferencias');
    }
}, [currentUserId]);
```

## Estilos y Diseño

### Paleta de Colores
- **Fondo principal**: `#202020`
- **Cards**: `#272727`
- **Bordes**: `white/5`
- **Texto primario**: `white/90`
- **Texto secundario**: `white/60`
- **Accent**: `blue-500`

### Efectos Visuales
- Backdrop blur en headers
- Transiciones suaves (0.3s ease-out)
- Shadows sutiles en modo edición
- Borders de 1px con opacidad baja

## Compatibilidad

- ✅ React 18+
- ✅ TypeScript 5+
- ✅ Tauri 2.x
- ✅ Responsive (Grid adaptativo)
- ✅ Dark mode nativo

## Notas de Desarrollo

### Performance
- Los widgets se renderizan solo cuando están visibles
- El estado se actualiza de forma incremental
- localStorage es sincrónico, considerar indexedDB para layouts grandes

### Accesibilidad
- Agregar ARIA labels a controles
- Soporte de navegación por teclado
- Focus trap en menú de agregar widgets

### Testing
Áreas recomendadas para testing:
1. Toggle entre vistas
2. Persistencia de preferencias
3. Agregar/eliminar widgets
4. Layout por defecto
5. Restaurar configuración
