import { useState, useEffect } from 'react';
import { Printer, X, Eye, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTemplates } from '@/hooks/useTemplates';
import { Template, DEFAULT_RECEIPT_TEMPLATE } from '@/types/templates';
import { Payment } from '@/hooks/usePayments';
import { toast } from 'sonner';

interface PrintReceiptProps {
    payment: Payment;
    patientName: string;
    onClose?: () => void;
}

export function PrintReceipt({ payment, patientName, onClose }: PrintReceiptProps) {
    const { getTemplatesByType, createTemplate } = useTemplates();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [renderedContent, setRenderedContent] = useState('');
    const [isPreview, setIsPreview] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setIsLoading(true);
        setError(null);
        try {
            console.log('Cargando plantillas de recibos...');
            const receiptTemplates = await getTemplatesByType('receipt');
            console.log('Plantillas encontradas:', receiptTemplates);

            // Si no hay plantillas, crear una por defecto
            if (receiptTemplates.length === 0) {
                console.log('No hay plantillas, creando una por defecto...');
                toast.info('Creando plantilla de recibo predeterminada...');
                const newTemplate = await createTemplate({
                    name: 'Recibo Estándar',
                    type: 'receipt',
                    content: DEFAULT_RECEIPT_TEMPLATE,
                    is_default: true,
                });
                console.log('Plantilla creada:', newTemplate);
                setTemplates([newTemplate]);
                setSelectedTemplate(newTemplate);
            } else {
                setTemplates(receiptTemplates);
                // Seleccionar el template por defecto o el primero
                const defaultTemplate = receiptTemplates.find(t => t.is_default) || receiptTemplates[0];
                setSelectedTemplate(defaultTemplate);
            }
        } catch (err) {
            console.error('Error cargando plantillas:', err);
            setError('Error al cargar las plantillas');
            toast.error('Error al cargar las plantillas');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedTemplate) {
            renderTemplate(selectedTemplate);
        }
    }, [selectedTemplate, payment]);

    const renderTemplate = (template: Template) => {
        // Objeto con todas las variables disponibles
        const variables: Record<string, string> = {
            receipt_number: payment.id.toString().padStart(5, '0'),
            receipt_date: new Date(payment.payment_date).toLocaleDateString('es-ES'),
            patient_name: patientName,
            patient_id: payment.treatment_id.toString(),
            amount: `$${payment.amount.toFixed(2)}`,
            payment_method: payment.payment_method || 'No especificado',
            concept: payment.notes || 'Pago de tratamiento',
            notes: payment.notes || '',
            clinic_name: 'Clínica Dental Galeno', // Esto debería venir de la configuración
            clinic_address: 'Dirección de la clínica',
            clinic_phone: 'Teléfono de la clínica',
            doctor_name: 'Dr. Nombre',
        };

        // Reemplazar variables en el template
        let content = template.content;
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            content = content.replace(regex, value);
        });

        setRenderedContent(content);
    };

    const handlePrint = () => {
        // Crear estilos de impresión temporales
        const printStyles = document.createElement('style');
        printStyles.id = 'print-receipt-styles';
        printStyles.textContent = `
            @media print {
                body * {
                    visibility: hidden;
                }
                #print-receipt-content,
                #print-receipt-content * {
                    visibility: visible;
                }
                #print-receipt-content {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(printStyles);

        // Imprimir
        window.print();

        // Limpiar estilos temporales después de imprimir
        setTimeout(() => {
            const styles = document.getElementById('print-receipt-styles');
            if (styles) {
                styles.remove();
            }
        }, 100);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1e1e] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-semibold">Imprimir Recibo</h2>
                        <p className="text-sm text-white/60">
                            Pago #{payment.id} - {patientName}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {templates.length > 1 && (
                            <select
                                value={selectedTemplate?.id || ''}
                                onChange={(e) => {
                                    const template = templates.find(t => t.id === Number(e.target.value));
                                    if (template) setSelectedTemplate(template);
                                }}
                                className="px-3 py-2 bg-[#252525] border border-white/10 rounded"
                            >
                                {templates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsPreview(!isPreview)}
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            {isPreview ? 'Ocultar Vista Previa' : 'Mostrar Vista Previa'}
                        </Button>
                        {onClose && (
                            <Button variant="ghost" size="sm" onClick={onClose}>
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Contenido */}
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-white/60">Cargando plantilla...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center text-red-400">
                            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                            <p>{error}</p>
                        </div>
                    </div>
                ) : isPreview ? (
                    <div className="flex-1 overflow-y-auto p-6 bg-[#252525]">
                        <div className="bg-white rounded shadow-lg max-w-2xl mx-auto p-8">
                            <div
                                id="print-receipt-content"
                                className="text-black"
                                dangerouslySetInnerHTML={{ __html: renderedContent }}
                            />
                        </div>
                    </div>
                ) : null}

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10">
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handlePrint}
                        className="bg-blue-600 hover:bg-blue-500"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                    </Button>
                </div>
            </div>
        </div>
    );
}
