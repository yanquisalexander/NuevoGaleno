import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Edit, Trash2, FileText, Star, Copy, ArrowLeft, ChevronDown, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useTemplates } from '@/hooks/useTemplates';
import { Template, TemplateType, TEMPLATE_VARIABLES, DEFAULT_RECEIPT_TEMPLATE } from '@/types/templates';
import { TemplateEditor } from './TemplateEditor';
import { buildTemplateExampleValues, renderTemplateContent } from '@/lib/templates/renderTemplate';
import { exportHtmlToPdf } from '@/lib/pdf/exportHtmlToPdf';

const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
    receipt: 'Recibo',
    invoice: 'Factura',
    prescription: 'Receta',
    report: 'Reporte',
    other: 'Otro',
};

const surfaceCard = 'rounded-[14px] border border-white/[0.08] bg-white/[0.04] overflow-hidden';
const fluentInput = 'bg-white/[0.06] border border-white/[0.10] focus:border-white/[0.22] text-white text-sm rounded-[8px] px-3 py-2 outline-none transition-colors w-full';
const fluentSelect = 'appearance-none bg-white/[0.06] border border-white/[0.10] focus:border-white/[0.22] text-white text-sm rounded-[8px] pl-3 pr-8 py-2 outline-none transition-colors w-full cursor-pointer';
const fluentBtnPrimary = 'bg-[#2997ff] hover:bg-[#1f8fff] text-white text-sm font-medium px-4 py-2 rounded-[8px] transition-colors flex items-center justify-center gap-2';
const fluentBtnSecondary = 'bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.08] text-white/90 text-sm font-medium px-4 py-2 rounded-[8px] transition-colors flex items-center justify-center gap-2';

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
    const previewRef = useRef<HTMLDivElement | null>(null);

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
    const renderedSelectedTemplate = useMemo(() => {
        if (!selectedTemplate) {
            return '';
        }

        return renderTemplateContent(
            selectedTemplate.content,
            buildTemplateExampleValues(selectedTemplate.type)
        );
    }, [selectedTemplate]);

    const handleExportPdf = async () => {
        if (!selectedTemplate || !previewRef.current) {
            return;
        }

        try {
            await exportHtmlToPdf(previewRef.current, {
                fileName: `${selectedTemplate.name}-preview`,
                format: 'a4',
            });
            toast.success('PDF generado correctamente');
        } catch (error) {
            console.error('Error exportando PDF:', error);
            toast.error('No se pudo generar el PDF');
        }
    };

    return (
        <div className="space-y-6 text-white select-none">
            <div>
                <div className="flex items-start gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="mt-0.5 rounded-md p-1.5 text-[#2997ff] transition-colors hover:bg-white/[0.06] hover:text-white"
                            title="Volver a Configuración"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-white">Plantillas</h1>
                        <p className="mt-1 text-[13px] text-white/45">
                            Crea, organiza y previsualiza formatos para recibos, facturas, recetas y reportes.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className={surfaceCard}>
                    <div className="border-b border-white/[0.08] p-4">
                        <button onClick={startCreate} className={`w-full ${fluentBtnPrimary}`}>
                            <Plus className="w-4 h-4" />
                            Nueva plantilla
                        </button>
                        <p className="mt-3 text-[12px] leading-relaxed text-white/40">
                            {templates.length} plantilla{templates.length === 1 ? '' : 's'} disponible{templates.length === 1 ? '' : 's'}.
                        </p>
                    </div>

                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-2">
                        {isLoading ? (
                            <div className="p-5 text-center text-sm text-white/60">Cargando plantillas...</div>
                        ) : templates.length === 0 ? (
                            <div className="p-8 text-center text-white/40">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.03]">
                                    <FileText className="w-5 h-5 opacity-60" />
                                </div>
                                <p className="text-sm text-white/70">No hay plantillas creadas</p>
                                <p className="mt-1 text-[12px] leading-relaxed text-white/40">
                                    Crea una nueva plantilla para empezar a definir tus documentos.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
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
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    setSelectedTemplate(template);
                                                    setIsEditing(false);
                                                    setIsCreating(false);
                                                }
                                            }}
                                            role="button"
                                            tabIndex={0}
                                            className={[
                                                'group relative w-full rounded-[10px] px-4 py-3 text-left transition-all',
                                                isSelected
                                                    ? 'bg-white/[0.09]'
                                                    : 'bg-transparent hover:bg-white/[0.05]'
                                            ].join(' ')}
                                        >
                                            {isSelected && (
                                                <div className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-[#2997ff]" />
                                            )}
                                            <div className="mb-2 flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate text-[13px] font-medium text-white/90">{template.name}</span>
                                                        {template.is_default && (
                                                            <span title="Predeterminada">
                                                                <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-[11px] text-white/40">{TEMPLATE_TYPE_LABELS[template.type]}</p>
                                                </div>

                                                <div className={`flex items-center gap-0.5 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleDuplicate(template);
                                                        }}
                                                        className="rounded-md p-1.5 text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white/90"
                                                        title="Duplicar"
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </button>
                                                    {!template.is_default && (
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleSetDefault(template.id, template.type);
                                                            }}
                                                            className="rounded-md p-1.5 text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white/90"
                                                            title="Marcar como predeterminada"
                                                        >
                                                            <Star className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleDelete(template.id);
                                                        }}
                                                        className="rounded-md p-1.5 text-red-300/70 transition-colors hover:bg-red-500/15 hover:text-red-300"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            {template.is_default && (
                                                <div className="inline-flex items-center gap-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-300">
                                                    Predeterminada
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </aside>

                <section className="min-w-0 space-y-5">
                    {isCreating || isEditing ? (
                        <>
                            <div className={`${surfaceCard} p-5`}>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/[0.07] text-white/70">
                                            <Edit className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-[18px] font-semibold text-white/95">
                                                {isCreating ? 'Crear nueva plantilla' : 'Editar plantilla'}
                                            </h3>
                                            <p className="mt-1 text-[13px] text-white/50">
                                                Define el tipo de documento y ajusta su contenido antes de guardarlo.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={isCreating ? handleCreate : handleUpdate} className={fluentBtnPrimary}>
                                            {isCreating ? 'Guardar plantilla' : 'Guardar cambios'}
                                        </button>
                                        <button onClick={cancelEdit} className={fluentBtnSecondary}>
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className={`${surfaceCard} grid gap-5 p-5 lg:grid-cols-2`}>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/85">Nombre</label>
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        className={fluentInput}
                                        placeholder="Ej. Recibo de pago estándar"
                                    />
                                </div>

                                <div className="relative space-y-2">
                                    <label className="text-sm font-medium text-white/85">Tipo de documento</label>
                                    <select
                                        value={editingType}
                                        onChange={(e) => setEditingType(e.target.value as TemplateType)}
                                        className={fluentSelect}
                                        disabled={isEditing}
                                    >
                                        {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                                            <option key={value} value={value} className="bg-[#202020]">
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 text-white/35" />
                                </div>
                            </div>

                            <div className={surfaceCard}>
                                <div className="border-b border-white/[0.08] px-5 py-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-white/85">
                                        Editor de contenido
                                    </div>
                                    <p className="mt-1 text-[12px] text-white/45">
                                        Escribe HTML o texto enriquecido y usa variables dinámicas para completar el documento.
                                    </p>
                                </div>
                                <TemplateEditor
                                    content={editingContent}
                                    onChange={setEditingContent}
                                    availableVariables={availableVariables}
                                />
                            </div>

                            {availableVariables.length > 0 && (
                                <div className={`${surfaceCard} p-5`}>
                                    <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-white/90">
                                        <Copy className="h-4 w-4 text-white/45" />
                                        Variables disponibles
                                    </h4>
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {availableVariables.map((variable) => (
                                            <div key={variable.key} className="rounded-[10px] border border-white/[0.08] bg-black/20 px-3 py-2">
                                                <code className="text-xs font-mono text-[#7dc2ff] select-all">{`{{${variable.key}}}`}</code>
                                                <div className="mt-1 text-[11px] leading-tight text-white/45">{variable.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : selectedTemplate ? (
                        <>
                            <div className={`${surfaceCard} p-5`}>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="mb-2 flex items-center gap-2">
                                            <h3 className="text-[18px] font-semibold text-white/95">{selectedTemplate.name}</h3>
                                            {selectedTemplate.is_default && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1 text-[11px] font-medium text-yellow-300">
                                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                    Predeterminada
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[13px] text-white/50">
                                            Tipo: <span className="text-white/80">{TEMPLATE_TYPE_LABELS[selectedTemplate.type]}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => startEdit(selectedTemplate)} className={fluentBtnSecondary}>
                                            <Edit className="w-4 h-4" />
                                            Editar
                                        </button>
                                        <button onClick={handleExportPdf} className={fluentBtnSecondary}>
                                            <Download className="w-4 h-4" />
                                            Exportar PDF
                                        </button>
                                        {!selectedTemplate.is_default && (
                                            <button onClick={() => handleSetDefault(selectedTemplate.id, selectedTemplate.type)} className={fluentBtnSecondary}>
                                                <Star className="w-4 h-4" />
                                                Usar como predeterminada
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={surfaceCard}>
                                <div className="border-b border-white/[0.08] px-5 py-4">
                                    <div className="text-sm font-medium text-white/85">Vista previa del documento</div>
                                    <p className="mt-1 text-[12px] text-white/45">
                                        Previsualización del contenido HTML tal como se renderizará al generar el archivo.
                                    </p>
                                </div>
                                <div className="bg-[#efefef] p-5 md:p-6">
                                    <div ref={previewRef} className="mx-auto min-h-[520px] max-w-[760px] rounded-[10px] border border-black/10 bg-white p-8 text-black shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
                                        <div
                                            className="prose prose-sm max-w-none prose-headings:text-black prose-p:text-gray-800"
                                            dangerouslySetInnerHTML={{ __html: renderedSelectedTemplate }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={`${surfaceCard} flex min-h-[420px] flex-col items-center justify-center px-8 py-16 text-center`}>
                            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[16px] border border-white/[0.08] bg-white/[0.03]">
                                <FileText className="h-7 w-7 text-white/35" />
                            </div>
                            <h3 className="text-lg font-medium text-white/75">Selecciona una plantilla</h3>
                            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/45">
                                Elige una plantilla de la biblioteca para revisar su vista previa o crea una nueva para empezar desde cero.
                            </p>
                            <button onClick={startCreate} className={`mt-6 ${fluentBtnPrimary}`}>
                                <Plus className="w-4 h-4" />
                                Crear plantilla
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}