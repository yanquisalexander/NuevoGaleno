import { useState, useEffect, useRef } from 'react';
import { Printer, X, Eye, AlertCircle, FileText } from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';
import { Template, DEFAULT_RECEIPT_TEMPLATE } from '@/types/templates';
import { Payment } from '@/hooks/usePayments';
import { toast } from 'sonner';
import { fluentDarkCompact as F } from '@/consts/fluent-tokens';
import { createHtmlPdfBlob } from '@/lib/pdf/exportHtmlToPdf';
import { renderTemplateContent } from '@/lib/templates/renderTemplate';

interface PrintReceiptProps {
    payment: Payment;
    patientName: string;
    onClose?: () => void;
}

// ── Micro-components ─────────────────────────────────────────────────────────

function Divider({ vertical = false }: { vertical?: boolean }) {
    return (
        <div style={{
            flexShrink: 0,
            ...(vertical
                ? { width: '1px', alignSelf: 'stretch', background: F.border }
                : { height: '1px', width: '100%', background: F.border }),
        }} />
    );
}

function FluentButton({
    onClick, variant = 'secondary', children, disabled = false, title,
}: {
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    children: React.ReactNode;
    disabled?: boolean;
    title?: string;
}) {
    const [hov, setHov] = useState(false);

    const getStyles = () => {
        if (disabled) {
            return {
                background: F.bg,
                color: F.textDisabled,
                border: `1px solid ${F.border}`,
                cursor: 'not-allowed',
            };
        }

        switch (variant) {
            case 'primary':
                return {
                    background: hov ? F.brandHover : F.brandBg,
                    color: '#fff',
                    border: 'none',
                };
            case 'ghost':
                return {
                    background: hov ? F.hover : 'transparent',
                    color: hov ? F.textPrimary : F.textSecondary,
                    border: '1px solid transparent',
                };
            default:
                return {
                    background: hov ? F.hover : 'transparent',
                    color: F.textPrimary,
                    border: `1px solid ${hov ? F.borderMed : F.border}`,
                };
        }
    };

    return (
        <button
            title={title}
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: F.font,
                borderRadius: '6px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.12s',
                ...getStyles(),
            }}
        >
            {children}
        </button>
    );
}


export function PrintReceipt({ payment, patientName, onClose }: PrintReceiptProps) {
    const { getTemplatesByType, createTemplate } = useTemplates();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [renderedContent, setRenderedContent] = useState('');
    const [isPreview, setIsPreview] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const printContentRef = useRef<HTMLDivElement | null>(null);

    const getSafeTemplateContent = (template: Template) => {
        const raw = (template.content || '').trim();
        if (!raw) {
            return DEFAULT_RECEIPT_TEMPLATE;
        }

        // Some older/custom templates can be too minimal and end up showing only clinic header.
        const hasCoreFields = raw.includes('{{patient_name}}') && raw.includes('{{amount}}');
        return hasCoreFields ? raw : DEFAULT_RECEIPT_TEMPLATE;
    };

    const openPrintDialog = () => {
        if (!renderedContent.trim()) {
            throw new Error('No hay contenido renderizado para imprimir');
        }

        const printRootId = 'print-receipt-root';
        const printStyleId = 'print-receipt-styles';

        const existingRoot = document.getElementById(printRootId);
        if (existingRoot) {
            existingRoot.remove();
        }

        const existingStyles = document.getElementById(printStyleId);
        if (existingStyles) {
            existingStyles.remove();
        }

        const printRoot = document.createElement('div');
        printRoot.id = printRootId;
        printRoot.style.position = 'fixed';
        printRoot.style.inset = '0';
        printRoot.style.background = '#ffffff';
        printRoot.style.zIndex = '2147483647';
        printRoot.style.padding = '0';
        printRoot.style.margin = '0';
        printRoot.style.display = 'none';

        // Print from an isolated root outside the modal to avoid overflow clipping.
        printRoot.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 20px; color: #000; background: #fff;">
                ${renderedContent}
            </div>
        `;

        document.body.appendChild(printRoot);

        const printStyles = document.createElement('style');
        printStyles.id = printStyleId;
        printStyles.textContent = `
            @media print {
                body * {
                    visibility: hidden !important;
                }

                #${printRootId},
                #${printRootId} * {
                    visibility: visible !important;
                }

                #${printRootId} {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    display: block !important;
                }
            }
        `;

        const cleanupPrintStyles = () => {
            const styles = document.getElementById(printStyleId);
            const root = document.getElementById(printRootId);
            if (styles) {
                styles.remove();
            }
            if (root) {
                root.remove();
            }
            window.removeEventListener('afterprint', cleanupPrintStyles);
        };

        window.addEventListener('afterprint', cleanupPrintStyles);
        document.head.appendChild(printStyles);

        // Fallback cleanup in case afterprint is not fired by the webview.
        setTimeout(cleanupPrintStyles, 3000);
        window.print();
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    // Cerrar con ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

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
            patient_id: payment.treatment_id?.toString() || 'N/A',
            amount: `$${payment.amount.toFixed(2)}`,
            payment_method: payment.payment_method || 'No especificado',
            concept: payment.notes || 'Pago de tratamiento',
            notes: payment.notes || '',
            clinic_name: 'Clínica Dental Galeno', // Esto debería venir de la configuración
            clinic_address: 'Dirección de la clínica',
            clinic_phone: 'Teléfono de la clínica',
            doctor_name: 'Dr. Nombre',
        };

        const templateContent = getSafeTemplateContent(template);
        const content = renderTemplateContent(templateContent, variables);
        setRenderedContent(content);
    };

    const handlePrint = async () => {
        if (!printContentRef.current || !selectedTemplate) {
            return;
        }

        setIsPrinting(true);

        try {
            await createHtmlPdfBlob(printContentRef.current, {
                fileName: `recibo-${payment.id}`,
                format: 'a4',
            });

            openPrintDialog();
            toast.success('PDF generado. Abriendo diálogo de impresión...');
        } catch (err) {
            console.error('Error imprimiendo recibo:', err);
            toast.error('No se pudo abrir el diálogo de impresión');
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '12px',
            fontFamily: F.font,
        }} onClick={(e) => {
            if (e.target === e.currentTarget) {
                onClose?.();
            }
        }}>
            <div style={{
                background: F.surface,
                borderRadius: '12px',
                border: `1px solid ${F.border}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }} onClick={(e) => e.stopPropagation()}>
                {/* ── Toolbar ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    background: F.surfaceRaised,
                    borderBottom: `1px solid ${F.border}`,
                    flexShrink: 0,
                }}>
                    {/* Icon + Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '4px' }}>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: F.brandMuted,
                            border: `1px solid ${F.brandBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <FileText style={{ width: '14px', height: '14px', color: F.brand }} />
                        </div>
                        <div>
                            <div style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: F.textPrimary,
                                lineHeight: 1.2,
                            }}>
                                Imprimir Recibo
                            </div>
                            <div style={{
                                fontSize: '10px',
                                color: F.textDisabled,
                                lineHeight: 1.2,
                                marginTop: '1px',
                            }}>
                                Pago #{payment.id} · {patientName}
                            </div>
                        </div>
                    </div>

                    <Divider vertical />

                    {/* Template selector */}
                    {templates.length > 1 && (
                        <>
                            <select
                                value={selectedTemplate?.id || ''}
                                onChange={(e) => {
                                    const template = templates.find(t => t.id === Number(e.target.value));
                                    if (template) setSelectedTemplate(template);
                                }}
                                style={{
                                    padding: '5px 10px',
                                    fontSize: '12px',
                                    fontFamily: F.font,
                                    background: F.bg,
                                    color: F.textPrimary,
                                    border: `1px solid ${F.border}`,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    outline: 'none',
                                }}
                            >
                                {templates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                            <Divider vertical />
                        </>
                    )}

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Toggle Preview */}
                    <FluentButton
                        variant="secondary"
                        onClick={() => setIsPreview(!isPreview)}
                        title={isPreview ? 'Ocultar vista previa' : 'Mostrar vista previa'}
                    >
                        <Eye style={{ width: '16px', height: '16px' }} />
                        {isPreview ? 'Ocultar' : 'Mostrar'}
                    </FluentButton>

                    <Divider vertical />

                    {/* Close button */}
                    {onClose && (
                        <FluentButton variant="ghost" onClick={onClose} title="Cerrar (Esc)">
                            <X style={{ width: '16px', height: '16px' }} />
                        </FluentButton>
                    )}
                </div>

                {/* ── Content area ── */}
                <div style={{
                    flex: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    background: F.bg,
                }}>
                    {isLoading ? (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    border: `2px solid ${F.brandBorder}`,
                                    borderTopColor: F.brand,
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                    margin: '0 auto 8px',
                                }} />
                                <p style={{ fontSize: '12px', color: F.textSecondary }}>
                                    Cargando plantilla...
                                </p>
                            </div>
                        </div>
                    ) : error ? (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <div style={{ textAlign: 'center', color: '#f87171' }}>
                                <AlertCircle style={{ width: '36px', height: '36px', margin: '0 auto 10px' }} />
                                <p style={{ fontSize: '13px' }}>{error}</p>
                            </div>
                        </div>
                    ) : isPreview ? (
                        <div style={{
                            height: '100%',
                            overflowY: 'auto',
                            padding: '12px',
                        }}>
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                maxWidth: '620px',
                                margin: '0 auto',
                                padding: '24px',
                            }}>
                                <div
                                    ref={printContentRef}
                                    id="print-receipt-content"
                                    style={{ color: '#000000' }}
                                    dangerouslySetInnerHTML={{ __html: renderedContent }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <div style={{ textAlign: 'center', color: F.textDisabled }}>
                                <Eye style={{ width: '40px', height: '40px', margin: '0 auto 12px', opacity: 0.3 }} />
                                <p style={{ fontSize: '13px' }}>Vista previa oculta</p>
                                <p style={{ fontSize: '11px', marginTop: '6px' }}>
                                    Presione "Mostrar" para ver el recibo
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer/Actions ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    padding: '10px 14px',
                    background: F.surfaceRaised,
                    borderTop: `1px solid ${F.border}`,
                    flexShrink: 0,
                }}>
                    <FluentButton variant="secondary" onClick={onClose}>
                        Cancelar
                    </FluentButton>
                    <FluentButton
                        variant="primary"
                        onClick={handlePrint}
                        disabled={!selectedTemplate || isPrinting}
                        title="Imprimir recibo (Ctrl+P)"
                    >
                        <Printer style={{ width: '16px', height: '16px' }} />
                        {isPrinting ? 'Preparando PDF...' : 'Imprimir'}
                    </FluentButton>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
