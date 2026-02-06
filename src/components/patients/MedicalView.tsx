import React from 'react';
import { Patient } from '@/hooks/usePatients';
import { MedicalWidget, WidgetType } from '@/types/medical-view';
import { MedicalWidgetCard } from './MedicalWidgets';
import { Plus, Save, RotateCcw, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}: MedicalViewProps) {
    const [showAddMenu, setShowAddMenu] = React.useState(false);

    const handleAddWidget = (type: WidgetType) => {
        const newWidget: MedicalWidget = {
            id: `${type}-${Date.now()}`,
            type,
            position: { x: 0, y: 0 },
            size: { width: 4, height: 2 },
        };
        onAddWidget(newWidget);
        setShowAddMenu(false);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Barra de herramientas */}
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

            {/* Grid de Widgets */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                    {widgets.map((widget) => (
                        <div
                            key={widget.id}
                            className={cn(
                                "min-h-[200px]",
                                widget.size.width === 6 && "md:col-span-2",
                                widget.size.width === 8 && "md:col-span-2 lg:col-span-3",
                                widget.size.width >= 10 && "md:col-span-2 lg:col-span-3 xl:col-span-4",
                                widget.size.height >= 4 && "row-span-2"
                            )}
                        >
                            <MedicalWidgetCard
                                widget={widget}
                                patient={patient}
                                isEditMode={isEditMode}
                                onRemove={onRemoveWidget}
                                onUpdate={onUpdateWidget}
                            />
                        </div>
                    ))}
                </div>

                {widgets.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-white/40">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <Settings2 className="w-10 h-10" />
                        </div>
                        <p className="text-lg font-medium">No hay widgets configurados</p>
                        <p className="text-sm mt-1">Haz clic en "Personalizar" para agregar widgets</p>
                    </div>
                )}
            </div>
        </div>
    );
}
