import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, Star, Copy, ArrowLeft, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useTemplates } from '@/hooks/useTemplates';
import { Template, TemplateType, TEMPLATE_VARIABLES, DEFAULT_RECEIPT_TEMPLATE } from '@/types/templates';
import { TemplateEditor } from './TemplateEditor';

const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
    receipt: 'Recibo',
    invoice: 'Factura',
    prescription: 'Receta',
    report: 'Reporte',
    other: 'Otro',
};

// --- Estilos Fluent Reutilizables ---
const fluentInput = "bg-[#333333] border border-[#454545] border-b-[#888] hover:bg-[#3a3a3a] focus:bg-[#1f1f1f] focus:border-b-[#0078d4] text-white text-sm rounded-md px-3 py-1.5 outline-none transition-colors w-full";
const fluentSelect = "appearance-none bg-[#333333] border border-[#454545] border-b-[#888] hover:bg-[#3a3a3a] focus:bg-[#1f1f1f] focus:border-b-[#0078d4] text-white text-sm rounded-md pl-3 pr-8 py-1.5 outline-none transition-colors w-full cursor-pointer";
const fluentBtnPrimary = "bg-[#0078d4] hover:bg-[#006cc1] text-white text-sm font-medium px-4 py-1.5 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2";
const fluentBtnSecondary = "bg-[#333333] border border-[#454545] hover:bg-[#3a3a3a] text-white text-sm font-medium px-4 py-1.5 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2";

export function TemplateManager({ onBack }: { onBack?: () => void }) {
    const {
        templates,
        isLoading,
        loadTemplates,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        setDefaultTemplate,
    } = useTemplates();

    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editingContent, setEditingContent] = useState('');
    const [editingName, setEditingName] = useState('');
    const [editingType, setEditingType] = useState<TemplateType>('receipt');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const handleCreate = async () => {
        try {
            const newTemplate = await createTemplate({
                name: editingName || 'Nueva Plantilla',
                type: editingType,
                content: editingContent || DEFAULT_RECEIPT_TEMPLATE,
                variables: TEMPLATE_VARIABLES[editingType]?.map(v => v.key) || [],
            });
            toast.success('Plantilla creada exitosamente');
            setIsCreating(false);
            setSelectedTemplate(newTemplate);
            setEditingName('');
            setEditingContent('');
        } catch (error) {
            toast.error('Error al crear la plantilla');
        }
    };

    const handleUpdate = async () => {
        if (!selectedTemplate) return;
        try {
            await updateTemplate(selectedTemplate.id, {
                name: editingName,
                content: editingContent,
            });
            toast.success('Plantilla actualizada exitosamente');
            setIsEditing(false);
            loadTemplates();
        } catch (error) {
            toast.error('Error al actualizar la plantilla');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar esta plantilla?')) return;
        try {
            await deleteTemplate(id);
            toast.success('Plantilla eliminada');
            if (selectedTemplate?.id === id) {
                setSelectedTemplate(null);
            }
        } catch (error) {
            toast.error('Error al eliminar la plantilla');
        }
    };

    const handleSetDefault = async (id: number, type: TemplateType) => {
        try {
            await setDefaultTemplate(id, type);
            toast.success('Plantilla establecida como predeterminada');
            loadTemplates();
        } catch (error) {
            toast.error('Error al establecer plantilla predeterminada');
        }
    };

    const handleDuplicate = async (template: Template) => {
        try {
            await createTemplate({
                name: `${template.name} (Copia)`,
                type: template.type,
                content: template.content,
                variables: template.variables,
            });
            toast.success('Plantilla duplicada exitosamente');
            loadTemplates();
        } catch (error) {
            toast.error('Error al duplicar la plantilla');
        }
    };

    const startEdit = (template: Template) => {
        setSelectedTemplate(template);
        setEditingName(template.name);
        setEditingContent(template.content);
        setEditingType(template.type);
        setIsEditing(true);
        setIsCreating(false);
    };

    const startCreate = () => {
        setEditingName('');
        setEditingContent(DEFAULT_RECEIPT_TEMPLATE);
        setEditingType('receipt');
        setIsCreating(true);
        setIsEditing(false);
        setSelectedTemplate(null);
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setIsCreating(false);
        setEditingName('');
        setEditingContent('');
    };

    const availableVariables = editingType ? TEMPLATE_VARIABLES[editingType] || [] : [];

    return (
        <div className="h-full w-full flex flex-col bg-[#202020] text-white font-segoe select-none overflow-hidden">

            {/* Header / Navegación Superior */}
            <div className="flex-none pt-8 pb-4 px-8 border-b border-[#383838]">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-1.5 hover:bg-[#333333] rounded-md transition-colors text-white/80 hover:text-white"
                            title="Volver a Configuración"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <h2 className="text-2xl font-semibold">Plantillas de Documentos</h2>
                        <p className="text-sm text-white/60">Crea y administra formatos para recibos, facturas y reportes</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Panel Izquierdo: Lista de Plantillas */}
                <div className="w-[320px] flex-none bg-[#202020]/95 backdrop-blur-xl border-r border-[#383838] flex flex-col">
                    <div className="p-4">
                        <button onClick={startCreate} className={`w-full h-9 ${fluentBtnPrimary}`}>
                            <Plus className="w-4 h-4" />
                            Nueva Plantilla
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
                        {isLoading ? (
                            <div className="p-4 text-center text-sm text-white/60">Cargando plantillas...</div>
                        ) : templates.length === 0 ? (
                            <div className="p-8 text-center text-white/40 flex flex-col items-center">
                                <FileText className="w-10 h-10 mb-3 opacity-30" />
                                <p className="text-sm">No hay plantillas creadas</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {templates.map((template) => {
                                    const isSelected = selectedTemplate?.id === template.id;
                                    return (
                                        <div
                                            key={template.id}
                                            onClick={() => {
                                                setSelectedTemplate(template);
                                                setIsEditing(false);
                                                setIsCreating(false);
                                            }}
                                            className={`
                                                relative w-full text-left p-3 rounded-md cursor-pointer group transition-all duration-200
                                                ${isSelected ? 'bg-[#353535]' : 'hover:bg-[#2d2d2d]'}
                                            `}
                                        >
                                            {/* Indicador visual Fluent */}
                                            {isSelected && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 bg-[#0078d4] rounded-r-full" />
                                            )}

                                            <div className="flex flex-col gap-1 pl-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-white/90'}`}>
                                                            {template.name}
                                                        </span>
                                                        {template.is_default && (
                                                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" title="Predeterminada" />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#333333] text-white/60 border border-white/5">
                                                        {TEMPLATE_TYPE_LABELS[template.type]}
                                                    </span>

                                                    {/* Botones de acción rápidos (Visibles al hover o si está seleccionado) */}
                                                    <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''}`}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDuplicate(template); }}
                                                            className="p-1 hover:bg-[#444] rounded text-white/60 hover:text-white transition-colors"
                                                            title="Duplicar"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                        {!template.is_default && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleSetDefault(template.id, template.type); }}
                                                                className="p-1 hover:bg-[#444] rounded text-white/60 hover:text-white transition-colors"
                                                                title="Marcar como predeterminado"
                                                            >
                                                                <Star className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                                                            className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel Derecho: Área de Edición / Vista Previa */}
                <div className="flex-1 bg-[#202020] overflow-y-auto px-8 py-6 custom-scrollbar relative">
                    {isCreating || isEditing ? (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-[#333333] rounded-md border border-[#454545]">
                                    <Edit className="w-5 h-5 text-blue-400" />
                                </div>
                                <h3 className="text-xl font-semibold">
                                    {isCreating ? 'Crear Nueva Plantilla' : 'Editar Plantilla'}
                                </h3>
                            </div>

                            {/* Formulario Fluent */}
                            <div className="grid grid-cols-2 gap-6 bg-[#2c2c2c] p-5 rounded-lg border border-[#383838] shadow-sm">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/90">Nombre de la plantilla</label>
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        className={fluentInput}
                                        placeholder="Ej. Recibo de pago estándar"
                                    />
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-sm font-medium text-white/90">Tipo de documento</label>
                                    <select
                                        value={editingType}
                                        onChange={(e) => setEditingType(e.target.value as TemplateType)}
                                        className={fluentSelect}
                                        disabled={isEditing}
                                    >
                                        {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                                            <option key={value} value={value} className="bg-[#2d2d2d]">
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-[34px] w-4 h-4 text-white/50 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/90 px-1">Diseño (HTML/Texto)</label>
                                <div className="rounded-lg overflow-hidden border border-[#383838] shadow-sm">
                                    <TemplateEditor
                                        content={editingContent}
                                        onChange={setEditingContent}
                                        availableVariables={availableVariables}
                                    />
                                </div>
                            </div>

                            {/* Variables Reference */}
                            {availableVariables.length > 0 && (
                                <div className="p-4 bg-[#2c2c2c] rounded-lg border border-[#383838]">
                                    <h4 className="text-sm font-medium mb-3 text-white/90 flex items-center gap-2">
                                        <Copy className="w-4 h-4 text-white/50" />
                                        Variables Disponibles
                                    </h4>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4">
                                        {availableVariables.map((variable) => (
                                            <div key={variable.key} className="flex flex-col">
                                                <code className="text-xs text-[#4cc2ff] font-mono select-all">
                                                    {`{{${variable.key}}}`}
                                                </code>
                                                <span className="text-[11px] text-white/50 leading-tight">
                                                    {variable.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Barra de Acciones Fija (Simulación de barra inferior de Windows) */}
                            <div className="flex items-center gap-3 pt-4 pb-10">
                                <button onClick={isCreating ? handleCreate : handleUpdate} className={fluentBtnPrimary}>
                                    {isCreating ? 'Guardar Plantilla' : 'Guardar Cambios'}
                                </button>
                                <button onClick={cancelEdit} className={fluentBtnSecondary}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : selectedTemplate ? (
                        <div className="max-w-4xl mx-auto">
                            {/* Cabecera de la Vista Previa */}
                            <div className="flex items-start justify-between mb-6 bg-[#2c2c2c] p-5 rounded-lg border border-[#383838] shadow-sm">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-xl font-semibold text-white">
                                            {selectedTemplate.name}
                                        </h3>
                                        {selectedTemplate.is_default && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                                <Star className="w-3 h-3 fill-yellow-400" /> Predeterminada
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-white/50 flex items-center gap-2">
                                        Tipo: <span className="text-white/80">{TEMPLATE_TYPE_LABELS[selectedTemplate.type]}</span>
                                    </p>
                                </div>
                                <button onClick={() => startEdit(selectedTemplate)} className={fluentBtnSecondary}>
                                    <Edit className="w-4 h-4" />
                                    Modificar Plantilla
                                </button>
                            </div>

                            {/* Contenedor de Vista Previa simulando un folio de papel */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-white/60 px-1">Vista previa del documento</p>
                                <div className="bg-white text-black min-h-[500px] rounded-lg shadow-md border border-white/10 p-8 overflow-hidden relative">
                                    <div
                                        className="prose prose-sm max-w-none prose-headings:text-black prose-p:text-gray-800"
                                        dangerouslySetInnerHTML={{ __html: selectedTemplate.content }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-white/40 pb-20">
                            <FileText className="w-16 h-16 mb-6 opacity-20" />
                            <h3 className="text-lg font-medium text-white/60 mb-2">Ninguna plantilla seleccionada</h3>
                            <p className="text-sm max-w-sm text-center">
                                Selecciona una plantilla del menú lateral para visualizarla o presiona "Nueva Plantilla" para crear un documento desde cero.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}