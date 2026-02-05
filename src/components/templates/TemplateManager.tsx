import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, Star, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTemplates } from '@/hooks/useTemplates';
import { Template, TemplateType, TEMPLATE_VARIABLES, DEFAULT_RECEIPT_TEMPLATE } from '@/types/templates';
import { TemplateEditor } from './TemplateEditor';
import { toast } from 'sonner';

const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
    receipt: 'Recibo',
    invoice: 'Factura',
    prescription: 'Receta',
    report: 'Reporte',
    other: 'Otro',
};

export function TemplateManager() {
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
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div>
                    <h2 className="text-xl font-semibold">Gestión de Plantillas</h2>
                    <p className="text-sm text-white/60">Administre plantillas para recibos, facturas y más</p>
                </div>
                <Button onClick={startCreate} className="bg-blue-600 hover:bg-blue-500">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Plantilla
                </Button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Lista de Plantillas */}
                <div className="w-80 border-r border-white/10 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 text-center text-white/60">Cargando...</div>
                    ) : templates.length === 0 ? (
                        <div className="p-4 text-center text-white/60">
                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No hay plantillas creadas</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/10">
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    className={`p-4 cursor-pointer hover:bg-white/5 transition-colors ${selectedTemplate?.id === template.id ? 'bg-white/10' : ''
                                        }`}
                                    onClick={() => {
                                        setSelectedTemplate(template);
                                        setIsEditing(false);
                                        setIsCreating(false);
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium">{template.name}</h3>
                                                {template.is_default && (
                                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                )}
                                            </div>
                                            <p className="text-xs text-white/60 mt-1">
                                                {TEMPLATE_TYPE_LABELS[template.type]}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(template);
                                            }}
                                        >
                                            <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDuplicate(template);
                                            }}
                                        >
                                            <Copy className="w-3 h-3" />
                                        </Button>
                                        {!template.is_default && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSetDefault(template.id, template.type);
                                                }}
                                            >
                                                <Star className="w-3 h-3" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(template.id);
                                            }}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Área de Edición/Vista */}
                <div className="flex-1 overflow-y-auto">
                    {isCreating || isEditing ? (
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">
                                {isCreating ? 'Crear Nueva Plantilla' : 'Editar Plantilla'}
                            </h3>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nombre</label>
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        className="w-full px-3 py-2 bg-[#1e1e1e] border border-white/10 rounded"
                                        placeholder="Nombre de la plantilla"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Tipo</label>
                                    <select
                                        value={editingType}
                                        onChange={(e) => setEditingType(e.target.value as TemplateType)}
                                        className="w-full px-3 py-2 bg-[#1e1e1e] border border-white/10 rounded"
                                        disabled={isEditing}
                                    >
                                        {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Contenido</label>
                                <TemplateEditor
                                    content={editingContent}
                                    onChange={setEditingContent}
                                    availableVariables={availableVariables}
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                                <Button
                                    onClick={isCreating ? handleCreate : handleUpdate}
                                    className="bg-blue-600 hover:bg-blue-500"
                                >
                                    {isCreating ? 'Crear' : 'Guardar Cambios'}
                                </Button>
                                <Button variant="ghost" onClick={cancelEdit}>
                                    Cancelar
                                </Button>
                            </div>

                            {/* Variables Reference */}
                            {availableVariables.length > 0 && (
                                <div className="mt-6 p-4 bg-white/5 rounded border border-white/10">
                                    <h4 className="font-medium mb-2">Variables Disponibles</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {availableVariables.map((variable) => (
                                            <div key={variable.key} className="flex items-start gap-2">
                                                <code className="text-blue-400">{`{{${variable.key}}}`}</code>
                                                <span className="text-white/60">{variable.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : selectedTemplate ? (
                        <div className="p-6">
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            {selectedTemplate.name}
                                            {selectedTemplate.is_default && (
                                                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                            )}
                                        </h3>
                                        <p className="text-sm text-white/60">
                                            {TEMPLATE_TYPE_LABELS[selectedTemplate.type]}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => startEdit(selectedTemplate)}
                                        className="bg-blue-600 hover:bg-blue-500"
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Editar
                                    </Button>
                                </div>
                            </div>

                            <div className="border border-white/10 rounded-lg p-4 bg-white">
                                <div
                                    className="prose prose-sm max-w-none text-black"
                                    dangerouslySetInnerHTML={{ __html: selectedTemplate.content }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-white/60">
                            <div className="text-center">
                                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>Seleccione una plantilla o cree una nueva</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
