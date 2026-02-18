import React from 'react';
import { Patient } from '@/hooks/usePatients';
import { MedicalWidget, WidgetType } from '@/types/medical-view';
import * as Widgets from './MedicalWidgets';
import { Plus, Save, RotateCcw, Settings2 } from 'lucide-react';
import { WidthProvider, Responsive } from 'react-grid-layout/legacy'; // Asegúrate de importar de 'react-grid-layout' (no legacy si es posible, aunque legacy funciona)
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface MedicalViewProps {
    patient: Patient;
    widgets: MedicalWidget[];
    isEditMode: boolean;
    onEditModeToggle: () => void;
    onAddWidget: (widget: MedicalWidget) => void;
    onRemoveWidget: (widgetId: string) => void;
    onUpdateWidget: (widgetId: string, updates: Partial<MedicalWidget>) => void;
    onSaveLayout: () => void;
    onResetLayout: () => void;
    layoutColumns?: number;
    layoutRows?: number;
}

const WIDGET_CATALOG: { type: WidgetType; label: string; description: string }[] = [
    { type: 'allergies-alert', label: 'Alergias', description: 'Alertas de alergias del paciente' },
    { type: 'vital-signs', label: 'Signos Vitales', description: 'Presión, pulso, temperatura' },
    { type: 'quick-notes', label: 'Notas Rápidas', description: 'Notas clínicas del paciente' },
    { type: 'recent-treatments', label: 'Tratamientos', description: 'Tratamientos recientes' },
    { type: 'pending-payments', label: 'Pagos Pendientes', description: 'Estado de cuenta' },
    { type: 'next-appointment', label: 'Próxima Cita', description: 'Próxima cita programada' },
    { type: 'medical-history', label: 'Historial', description: 'Resumen del historial' },
    { type: 'odontogram-preview', label: 'Odontograma', description: 'Vista previa del odontograma' },
];

export function MedicalView({
    patient,
    widgets,
    isEditMode,
    onEditModeToggle,
    onAddWidget,
    onRemoveWidget,
    onUpdateWidget,
    onSaveLayout,
    onResetLayout,
    layoutColumns = 12,
    layoutRows = 8,
}: MedicalViewProps) {
    const [showAddMenu, setShowAddMenu] = React.useState(false);
    const containerRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

    const handleAddWidget = (type: WidgetType) => {
        const newWidget: MedicalWidget = {
            id: `${type}-${Date.now()}`,
            type,
            position: { x: 0, y: 0 },
            size: { width: 4, height: 2 },
            config: { order: Date.now() },
        };
        onAddWidget(newWidget);
        setShowAddMenu(false);
    };

    // Orden inicial basado en config, pero RGL manejará el layout visual
    const orderedWidgets = React.useMemo(() => {
        return [...widgets].sort((a, b) => (Number(a.config?.order ?? 0) - Number(b.config?.order ?? 0)) || 0);
    }, [widgets]);

    const handleRGLStop = (layout: readonly any[]) => {
        layout.forEach((item: any) => {
            const id = String(item.i);
            const widget = widgets.find(w => w.id === id);

            // Solo actualizamos si hubo un cambio real para evitar renders innecesarios
            if (widget && (
                widget.position.x !== item.x ||
                widget.position.y !== item.y ||
                widget.size.width !== item.w ||
                widget.size.height !== item.h
            )) {
                onUpdateWidget(id, {
                    position: { x: item.x ?? 0, y: item.y ?? 0 },
                    size: { width: item.w ?? widget.size.width, height: item.h ?? widget.size.height },
                    // Actualizamos el orden visual para consistencia futura
                    config: { ...widget.config, order: item.y * layoutColumns + item.x }
                });
            }
        });

        // Guardado opcional automático al soltar
        // try { onSaveLayout(); } catch { } 
    };

    // Workaround para tipos
    const AnyWidgetCard: any = (Widgets as any).MedicalWidgetCard;

    return (
        <div className="h-full flex flex-col">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#272727] border-b border-white/5">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-white/90">Vista Médica Personalizada</h2>
                    {isEditMode && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-md border border-blue-500/30">
                            Modo Edición
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {isEditMode ? (
                        <>
                            <button
                                onClick={onResetLayout}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-colors flex items-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Restaurar
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setShowAddMenu(!showAddMenu)}
                                    className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-sm text-green-400 transition-colors flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar Widget
                                </button>
                                {showAddMenu && (
                                    <div className="absolute top-full right-0 mt-2 w-64 bg-[#2a2a2a] border border-white/10 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                                        {WIDGET_CATALOG.map((item) => (
                                            <button
                                                key={item.type}
                                                onClick={() => handleAddWidget(item.type)}
                                                className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                            >
                                                <div className="text-sm font-medium text-white/90">{item.label}</div>
                                                <div className="text-xs text-white/50 mt-0.5">{item.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={onSaveLayout}
                                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Guardar
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onEditModeToggle}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <Settings2 className="w-4 h-4" />
                            Personalizar
                        </button>
                    )}
                </div>
            </div>

            {/* Grid de Widgets (react-grid-layout) */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#1a1a1a]">
                {widgets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/40">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <Settings2 className="w-10 h-10" />
                        </div>
                        <p className="text-lg font-medium">No hay widgets configurados</p>
                        <p className="text-sm mt-1">Haz clic en "Personalizar" para agregar widgets</p>
                    </div>
                ) : (
                    <ResponsiveGridLayout
                            className="layout"
                            cols={{ lg: layoutColumns, md: layoutColumns, sm: layoutColumns, xs: layoutColumns, xxs: layoutColumns }}
                            rowHeight={120}
                            // Usamos directamente el layout generado por los widgets
                            layouts={{
                                lg: orderedWidgets.map(w => ({
                                    i: w.id,
                                    x: w.position?.x ?? 0,
                                    y: w.position?.y ?? 0,
                                    w: w.size?.width ?? 4,
                                    h: w.size?.height ?? 2
                                }))
                            }}
                            measureBeforeMount={true}
                            useCSSTransforms={true} // Importante para rendimiento
                            isDraggable={isEditMode}
                            isResizable={isEditMode}
                            draggableHandle=".widget-grip" // Asegúrate de que tu MedicalWidgetCard tenga este className
                            onDragStop={handleRGLStop}
                            onResizeStop={handleRGLStop}
                            margin={[16, 16]} // Espacio entre widgets
                        >
                            {orderedWidgets.map((widget) => (
                                <div
                                    key={widget.id}
                                    ref={(el) => { containerRefs.current[widget.id] = el; }}
                                    // React-Grid-Layout inyecta estilos inline aquí, no los sobrescribas con clases que afecten posición
                                    className="relative transition-shadow"
                                >
                                    <AnyWidgetCard
                                        widget={widget}
                                        patient={patient}
                                        isEditMode={isEditMode}
                                        onRemove={onRemoveWidget}
                                        onUpdate={onUpdateWidget}
                                        layoutColumns={layoutColumns}
                                        layoutRows={layoutRows}
                                    // Eliminamos los props manuales de drag, ya no son necesarios
                                    />
                                </div>
                            ))}
                        </ResponsiveGridLayout>
                )}
            </div>
        </div>
    );
}