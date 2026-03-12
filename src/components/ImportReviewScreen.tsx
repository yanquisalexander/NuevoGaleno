// Componente React para la pantalla de revisión de importación
// Estilo Fluent Windows 11 Dark Mode

import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Button } from './ui/button';
import { AlertCircle, CheckCircle, XCircle, Database, Users, CreditCard, DollarSign, RefreshCw } from 'lucide-react';
import { DocConversionDialog } from './DocConversionDialog';

interface ImportPreview {
    summary: PreviewSummary;
    sample_patients: PatientPreview[];
    validation_report: ValidationReport;
    can_proceed: boolean;
}

interface PreviewSummary {
    total_patients: number;
    patients_with_data: number;
    patients_empty: number;
    total_treatments: number;
    treatments_pending: number;
    treatments_in_progress: number;
    treatments_completed: number;
    total_payments: number;
    total_revenue: number;
    total_outstanding: number;
}

interface PatientPreview {
    temp_id: string;
    full_name: string;
    document: string | null;
    phone: string | null;
    treatments_count: number;
    total_billed: number;
    total_paid: number;
    balance: number;
    has_issues: boolean;
}

interface ValidationReport {
    is_valid: boolean;
    critical_issues: string[];
    errors: string[];
    warnings: string[];
    total_issues: number;
}

interface ImportReviewScreenProps {
    extractedDir: string;
    onComplete: () => void;
    onCancel: () => void;
    embedded?: boolean;
}

function stageEmoji(stage: string): string {
    switch (stage) {
        case 'reading': return '📖';
        case 'transforming': return '🔄';
        case 'persisting': return '💾';
        case 'patients': return '👤';
        case 'treatments': return '🦷';
        case 'payments': return '💳';
        case 'history': return '📄';
        case 'orphans': return '🔗';
        default: return '⚙️';
    }
}

export default function ImportReviewScreen({ extractedDir, onComplete, onCancel, embedded = false }: ImportReviewScreenProps) {
    const [stage, setStage] = useState<'checking-docs' | 'loading' | 'preview' | 'loading-full' | 'importing' | 'complete' | 'error'>('checking-docs');
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<any>(null);
    const [isPreviewOnly, setIsPreviewOnly] = useState(true);
    const [progressMessage, setProgressMessage] = useState<string>('Verificando archivos...');
    const [progressStage, setProgressStage] = useState<string>('checking');
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    useEffect(() => {
        // Listener para eventos de progreso
        const setupListener = async () => {
            const unlistenProgress = await listen<any>('import:progress', (event) => {
                const msg: string = event.payload.message || 'Procesando...';
                const stg: string = event.payload.stage || 'reading';
                setProgressMessage(msg);
                setProgressStage(stg);
                if (msg && msg !== 'Procesando...') {
                    setLogs(prev => [...prev, `${stageEmoji(stg)} ${msg}`].slice(-300));
                }
            });
            const unlistenLog = await listen<any>('import:log', (event) => {
                const msg: string = event.payload?.message || '';
                if (msg) setLogs(prev => [...prev, msg].slice(-300));
            });
            return () => { unlistenProgress(); unlistenLog(); };
        };

        const cleanupPromise = setupListener();

        // NO iniciar automáticamente - esperar a DocConversionDialog
        // runImportPipeline(true);

        // Cleanup
        return () => {
            cleanupPromise.then(cleanup => cleanup());
        };
    }, [extractedDir]);

    const handleDocConversionComplete = (success: boolean) => {
        console.log(`✅ Conversión de .doc completada. Éxito: ${success}`);
        setStage('loading');
        runImportPipeline(true);
    };

    const handleSkipDocConversion = () => {
        console.log('⏭️ Conversión de .doc omitida');
        setStage('loading');
        runImportPipeline(true);
    };

    async function runImportPipeline(previewOnly: boolean = false) {
        try {
            setStage(previewOnly ? 'loading' : 'loading-full');
            setIsPreviewOnly(previewOnly);

            // Paso 1: Iniciar sesión de importación
            console.log(`📁 Iniciando sesión de importación (preview: ${previewOnly})...`);
            const session: any = await invoke('start_import_session', {
                extractedDir,
                previewOnly
            });
            console.log(`✅ Sesión iniciada: ${session.patients_found} pacientes encontrados`);

            // Paso 2: Validar datos
            console.log('🔍 Validando datos...');
            const validation: any = await invoke('validate_import_data');
            console.log(`✅ Validación completada: ${validation.summary}`);

            // Paso 3: Generar preview
            console.log('📊 Generando previsualización...');
            const previewData: any = await invoke('generate_import_preview');
            console.log('✅ Previsualización lista');

            setPreview(previewData.preview);
            setStage('preview');
        } catch (err: any) {
            console.error('❌ Error en pipeline:', err);
            setError(err.toString());
            setStage('error');
        }
    }

    async function handleLoadFullData() {
        // Cargar todos los datos de forma asíncrona
        await runImportPipeline(false);
    }

    async function handleConfirmImport() {
        if (!preview?.can_proceed) return;

        try {
            setStage('importing');
            setProgressMessage('Iniciando persistencia...');
            console.log('💾 Iniciando persistencia...');

            const result: any = await invoke('confirm_and_persist_import');

            console.log('✅ Importación completada:', result);
            setImportResult(result);
            setStage('complete');

            setTimeout(() => {
                onComplete();
            }, 3000);
        } catch (err: any) {
            console.error('❌ Error persistiendo:', err);
            setError(err.toString());
            setStage('error');
        }
    }

    async function handleCancel() {
        await invoke('cancel_import_session');
        onCancel();
    }

    // --- RENDERIZADO ESTILO WINDOWS 11 FLUENT DARK ---

    // Renderizar diálogo de conversión de .doc si es necesario
    if (stage === 'checking-docs') {
        return (
            <>
                <DocConversionDialog
                    sourcePath={extractedDir}
                    onConversionComplete={handleDocConversionComplete}
                    onSkip={handleSkipDocConversion}
                />
                {embedded ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500" style={{ flex: 1, minHeight: 0 }}>
                        <div className="mb-6 relative">
                            <div className="absolute inset-0 bg-[#0078d4] blur-[30px] opacity-20 rounded-full"></div>
                            <RefreshCw className="w-12 h-12 text-[#0078d4] animate-spin relative z-10" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Verificando archivos...</h2>
                        <p className="text-[#a0a0a0] text-sm">Detectando archivos de historias clínicas</p>
                    </div>
                ) : (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans select-none">
                        <div className="w-[500px] bg-[#202020] text-[#ffffff] rounded-[8px] border border-[#333] shadow-[0_32px_64px_rgba(0,0,0,0.5),0_2px_21px_rgba(0,0,0,0.4)] overflow-hidden ring-1 ring-white/5 p-8 flex flex-col items-center text-center">
                            <div className="mb-6 relative">
                                <div className="absolute inset-0 bg-[#0078d4] blur-[30px] opacity-20 rounded-full"></div>
                                <RefreshCw className="w-12 h-12 text-[#0078d4] animate-spin relative z-10" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">Verificando archivos...</h2>
                            <p className="text-[#a0a0a0] text-sm">Detectando archivos de historias clínicas</p>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Si está embebido, NO mostramos el contenedor fixed ni el backdrop, solo el contenido.
    // Ajustaremos el estilo para que fluya dentro del FirstRunWizard.

    if (stage === 'loading' || stage === 'loading-full') {
        const progressValue = stage === 'loading' ? 45 : 70;

        if (embedded) {
            return (
                <div className="animate-in fade-in duration-500" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 24px 14px', textAlign: 'center' }}>
                        <div style={{ position: 'relative', marginBottom: 10 }}>
                            <div style={{ position: 'absolute', inset: 0, background: '#0078d4', filter: 'blur(30px)', opacity: 0.2, borderRadius: '50%' }} />
                            <RefreshCw className="w-9 h-9 text-[#0078d4] animate-spin relative z-10" />
                        </div>
                        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                            {stage === 'loading' ? 'Preparando vista previa...' : 'Analizando base de datos completa...'}
                        </h2>
                        <p style={{ color: '#a0a0a0', fontSize: 12, marginBottom: 12 }}>{progressMessage}</p>
                        <div style={{ width: '100%', maxWidth: 320 }}>
                            <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progressValue}%`, background: '#0078d4', transition: 'width 0.4s ease-out' }} />
                            </div>
                        </div>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, margin: '0 16px 16px', background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 6, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Cascadia Code','Consolas',monospace" }}>
                        <div style={{ padding: '5px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: 'rgba(255,255,255,0.28)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Log de proceso</div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontSize: 11 }}>
                            {logs.length === 0 ? (
                                <span style={{ color: '#444' }}>Esperando datos del pipeline...</span>
                            ) : logs.map((log, i) => (
                                <div key={i} style={{ color: '#ccc', padding: '1px 0', display: 'flex', gap: 8 }}>
                                    <span style={{ color: '#60cdff', flexShrink: 0 }}>›</span>
                                    <span>{log}</span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans select-none">
                <div className="w-[500px] bg-[#202020] text-[#ffffff] rounded-[8px] border border-[#333] shadow-[0_32px_64px_rgba(0,0,0,0.5),0_2px_21px_rgba(0,0,0,0.4)] overflow-hidden ring-1 ring-white/5 p-8 flex flex-col items-center text-center">
                    <div className="mb-6 relative">
                        <div className="absolute inset-0 bg-[#0078d4] blur-[30px] opacity-20 rounded-full"></div>
                        <RefreshCw className="w-12 h-12 text-[#0078d4] animate-spin relative z-10" />
                    </div>

                    <h2 className="text-xl font-semibold mb-2">
                        {stage === 'loading' ? 'Preparando vista previa...' : 'Analizando base de datos completa'}
                    </h2>

                    <p className="text-[#a0a0a0] text-sm mb-8 leading-relaxed max-w-[80%]">
                        {progressStage === 'reading' && 'Leyendo tablas y registros...'}
                        {progressStage === 'transforming' && 'Transformando estructura de datos...'}
                        <br />
                        <span className="text-xs opacity-70 mt-1 block font-mono">{progressMessage}</span>
                    </p>

                    <div className="w-full space-y-2 mb-4">
                        <div className="h-1 w-full bg-[#333] rounded-full overflow-hidden">
                            <div className="h-full bg-[#0078d4] transition-all duration-500 ease-out" style={{ width: `${progressValue}%` }} />
                        </div>
                    </div>

                    <p className="text-xs text-[#666]">
                        Esto puede tomar unos momentos. Por favor no cierre la ventana.
                    </p>
                </div>
            </div>
        );
    }

    if (stage === 'error') {
        if (embedded) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-300" style={{ flex: 1, minHeight: 0 }}>
                    <div className="mb-6 bg-[#3b1717] p-4 rounded-full border border-[#442222]">
                        <XCircle className="w-10 h-10 text-[#ff4b4b]" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2 text-[#ff4b4b]">Error</h2>
                    <p className="text-[#a0a0a0] max-w-md mb-6">{error}</p>
                    <Button onClick={onCancel} variant="secondary">Volver</Button>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
                <div className="w-[500px] bg-[#202020] text-[#ffffff] rounded-[8px] border border-[#333] shadow-[0_32px_64px_rgba(0,0,0,0.5),0_2px_21px_rgba(0,0,0,0.4)] overflow-hidden ring-1 ring-white/5 p-8 flex flex-col items-center text-center">
                    <div className="mb-6 bg-[#3b1717] p-4 rounded-full border border-[#442222]">
                        <XCircle className="w-10 h-10 text-[#ff4b4b]" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2 text-[#ff4b4b]">Error en la importación</h2>
                    <div className="bg-[#2b1b1b] border border-[#442222] p-4 rounded-[6px] w-full mb-6 max-h-[150px] overflow-y-auto custom-scrollbar text-left">
                        <p className="text-sm font-mono text-[#ff9999] break-words">{error}</p>
                    </div>
                    <Button onClick={handleCancel} className="bg-[#333] hover:bg-[#3d3d3d] text-white border border-white/10 px-6 py-2 h-[36px] min-w-[120px]">
                        Cerrar
                    </Button>
                </div>
            </div>
        );
    }

    if (stage === 'importing') {
        if (embedded) {
            return (
                <div className="animate-in fade-in duration-500" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 24px 14px', textAlign: 'center' }}>
                        <div style={{ position: 'relative', marginBottom: 10 }}>
                            <div style={{ position: 'absolute', inset: 0, background: '#107c10', filter: 'blur(40px)', opacity: 0.2, borderRadius: '50%' }} />
                            <Database className="w-12 h-12 text-[#107c10] animate-pulse relative z-10" />
                        </div>
                        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>Escribiendo en base de datos...</h2>
                        <p style={{ color: '#a0a0a0', fontSize: 12, marginBottom: 12 }}>{progressMessage}</p>
                        <div style={{ width: '100%', maxWidth: 320, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: '#107c10', width: '100%' }} />
                        </div>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, margin: '0 16px 16px', background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 6, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Cascadia Code','Consolas',monospace" }}>
                        <div style={{ padding: '5px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: 'rgba(255,255,255,0.28)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Log de importación</div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontSize: 11 }}>
                            {logs.length === 0 ? (
                                <span style={{ color: '#444' }}>Iniciando motor de importación...</span>
                            ) : logs.map((log, i) => (
                                <div key={i} style={{ color: '#ccc', padding: '1px 0', display: 'flex', gap: 8 }}>
                                    <span style={{ color: '#6ccb5f', flexShrink: 0 }}>›</span>
                                    <span>{log}</span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
                <div className="w-[500px] bg-[#202020] text-[#ffffff] rounded-[8px] border border-[#333] shadow-[0_32px_64px_rgba(0,0,0,0.5),0_2px_21px_rgba(0,0,0,0.4)] overflow-hidden ring-1 ring-white/5 p-10 flex flex-col items-center text-center">
                    <div className="mb-8 relative">
                        <div className="absolute inset-0 bg-[#107c10] blur-[40px] opacity-20 rounded-full"></div>
                        <Database className="w-16 h-16 text-[#107c10] animate-pulse relative z-10" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">Importando Datos</h2>
                    <p className="text-[#a0a0a0] mb-2">Escribiendo registros en la base de datos local...</p>
                    <p className="text-xs text-[#666] mb-8 font-mono">{progressMessage}</p>
                    <div className="w-full h-1 bg-[#333] rounded-full overflow-hidden">
                        <div className="h-full bg-[#107c10] w-full animate-[shimmer_2s_infinite_linear] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)]" />
                    </div>
                </div>
            </div>
        );
    }

    if (stage === 'complete') {
        if (embedded) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-500" style={{ flex: 1, minHeight: 0 }}>
                    <div className="mb-6 bg-[#162916] p-4 rounded-full border border-[#1b3d1b]">
                        <CheckCircle className="w-12 h-12 text-[#6ccb5f]" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">¡Listo!</h2>
                    <p className="text-[#a0a0a0] mb-8">Importación finalizada correctamente.</p>
                    <Button onClick={onComplete} className="bg-[#107c10] hover:bg-[#0f700f] text-white px-8">Continuar</Button>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
                <div className="w-[600px] bg-[#202020] text-[#ffffff] rounded-[8px] border border-[#333] shadow-[0_32px_64px_rgba(0,0,0,0.5),0_2px_21px_rgba(0,0,0,0.4)] overflow-hidden ring-1 ring-white/5 p-8 flex flex-col items-center text-center">
                    <div className="mb-6 bg-[#162916] p-4 rounded-full border border-[#1b3d1b]">
                        <CheckCircle className="w-12 h-12 text-[#6ccb5f]" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">Importación Exitosa</h2>
                    <p className="text-[#a0a0a0] mb-8">Todos los datos han sido migrados correctamente.</p>

                    {importResult && (
                        <div className="grid grid-cols-3 gap-3 w-full mb-8">
                            <div className="bg-[#2b2b2b] p-4 rounded-[6px] border border-[#333]">
                                <Users className="w-6 h-6 mx-auto text-[#60cdff] mb-2" />
                                <div className="text-2xl font-bold">{importResult.patients_inserted}</div>
                                <div className="text-xs text-[#888] uppercase tracking-wider">Pacientes</div>
                            </div>
                            <div className="bg-[#2b2b2b] p-4 rounded-[6px] border border-[#333]">
                                <Database className="w-6 h-6 mx-auto text-[#c3b1e1] mb-2" />
                                <div className="text-2xl font-bold">{importResult.treatments_inserted}</div>
                                <div className="text-xs text-[#888] uppercase tracking-wider">Tratamientos</div>
                            </div>
                            <div className="bg-[#2b2b2b] p-4 rounded-[6px] border border-[#333]">
                                <CreditCard className="w-6 h-6 mx-auto text-[#6ccb5f] mb-2" />
                                <div className="text-2xl font-bold">{importResult.payments_inserted}</div>
                                <div className="text-xs text-[#888] uppercase tracking-wider">Pagos</div>
                            </div>
                        </div>
                    )}

                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                        <p className="text-sm text-[#666]">Redirigiendo al inicio de sesión...</p>
                    </div>
                </div>
            </div>
        );
    }

    // --- PREVIEW STAGE (MAIN UI) ---
    if (!preview) return null;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(value);
    };

    if (embedded) {
        return (
            <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ flex: 1, minHeight: 0 }}>
                {/* Header Embebido */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold">Resumen de Importación</h2>
                        <p className="text-sm text-[#a0a0a0]">Revise los datos antes de confirmar.</p>
                    </div>
                    {isPreviewOnly && (
                        <Button
                            onClick={handleLoadFullData}
                            variant="outline"
                            className="bg-[#333] hover:bg-[#3d3d3d] text-[#e0e0e0] border-[#444] text-xs h-[28px] gap-2"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Analizar Todo
                        </Button>
                    )}
                </div>

                <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
                    {/* Summary Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard
                            icon={<Users className="w-5 h-5 text-[#60cdff]" />}
                            label="Pacientes"
                            value={preview.summary.total_patients}
                            sublabel={preview.summary.patients_with_data > 0 ? `${preview.summary.patients_with_data} ok` : undefined}
                        />
                        <StatCard
                            icon={<Database className="w-5 h-5 text-[#c3b1e1]" />}
                            label="Tratamientos"
                            value={preview.summary.total_treatments}
                        />
                        <StatCard
                            icon={<DollarSign className="w-5 h-5 text-[#6ccb5f]" />}
                            label="Recaudación"
                            value={formatCurrency(preview.summary.total_revenue)}
                        />
                        <StatCard
                            icon={<AlertCircle className="w-5 h-5 text-[#e0e0e0]" />}
                            label="Adeudado"
                            value={formatCurrency(preview.summary.total_outstanding)}
                        />
                    </div>

                    {/* Validation Brief */}
                    <div className={`rounded-[6px] border p-3 ${preview.can_proceed ? 'bg-[#1b2b1b] border-[#1b3d1b]' : 'bg-[#2b1b1b] border-[#442222]'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {preview.can_proceed ? <CheckCircle className="w-4 h-4 text-[#6ccb5f]" /> : <XCircle className="w-4 h-4 text-[#ff4b4b]" />}
                                <span className={`font-semibold text-xs ${preview.can_proceed ? 'text-[#6ccb5f]' : 'text-[#ff4b4b]'}`}>
                                    {preview.can_proceed ? 'Validación Correcta' : 'Problemas detectados'}
                                </span>
                            </div>
                            {!preview.can_proceed && (
                                <span className="text-xs text-[#ff99a4] bg-[#3b1717] px-2 py-0.5 rounded">
                                    {preview.validation_report.total_issues} problemas
                                </span>
                            )}
                        </div>
                        {!preview.can_proceed && (
                            <div className="space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                                {preview.validation_report.critical_issues.slice(0, 5).map((msg, i) => (
                                    <div key={i} className="text-[10px] text-[#ff4b4b] font-mono bg-[#3b1717] rounded px-2 py-0.5">🔴 {msg}</div>
                                ))}
                                {preview.validation_report.errors.slice(0, 5).map((msg, i) => (
                                    <div key={i} className="text-[10px] text-[#ff99a4] font-mono bg-[#3b1717] rounded px-2 py-0.5">⚠ {msg}</div>
                                ))}
                                {preview.validation_report.warnings.slice(0, 3).map((msg, i) => (
                                    <div key={i} className="text-[10px] text-[#fce100] font-mono opacity-70 px-2 py-0.5">• {msg}</div>
                                ))}
                                {(preview.validation_report.critical_issues.length > 5 || preview.validation_report.errors.length > 5) && (
                                    <div className="text-[10px] text-[#808080] px-2 py-0.5">... y {preview.validation_report.total_issues - 8} más</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Data Preview Table */}
                    <div className="border border-[#333] rounded-[6px] overflow-hidden bg-[#252525]">
                        <div className="px-4 py-2 bg-[#2d2d2d] border-b border-[#333]">
                            <h3 className="font-semibold text-xs text-[#a0a0a0] uppercase tracking-wider">Muestra de datos</h3>
                        </div>
                        <div className="overflow-x-auto max-h-[250px] custom-scrollbar">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-[#333] text-[#a0a0a0] sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">Paciente</th>
                                        <th className="px-3 py-2 font-medium text-right">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#333]">
                                    {preview.sample_patients.map(patient => (
                                        <tr key={patient.temp_id} className="hover:bg-[#333]">
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-white">{patient.full_name}</div>
                                                <div className="text-[10px] text-[#808080]">{patient.document || 'S/D'}</div>
                                            </td>
                                            <td className={`px-3 py-2 text-right font-semibold ${patient.balance > 0 ? 'text-[#ff99a4]' : 'text-[#6ccb5f]'}`}>
                                                {formatCurrency(patient.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Log del análisis */}
                    {logs.length > 0 && (
                        <div style={{ background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden', fontFamily: "'Cascadia Code','Consolas',monospace" }}>
                            <div style={{ padding: '5px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                Log del análisis ({logs.length})
                            </div>
                            <div style={{ maxHeight: 96, overflowY: 'auto', padding: '6px 12px', fontSize: 11 }}>
                                {logs.slice(-20).map((log, i) => (
                                    <div key={i} style={{ color: '#888', padding: '1px 0', display: 'flex', gap: 8 }}>
                                        <span style={{ color: '#60cdff', flexShrink: 0 }}>›</span>
                                        <span>{log}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#333] mt-2">
                    <Button onClick={onCancel} variant="ghost" className="h-[32px]">Cancelar</Button>
                    <Button
                        onClick={handleConfirmImport}
                        disabled={!preview.can_proceed}
                        className={`h-[32px] px-6 text-sm ${preview.can_proceed ? 'bg-[#0078d4] hover:bg-[#006cc1]' : 'bg-[#333]'}`}
                    >
                        Confirmar
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 font-['Segoe_UI_Variable',_'Segoe_UI',_sans-serif]">
            {/* Main Window */}
            <div className="w-full max-w-[1100px] h-[85vh] flex flex-col bg-[#202020] text-[#ffffff] rounded-[8px] border border-[#333] shadow-2xl overflow-hidden ring-1 ring-white/5">

                {/* Header */}
                <div className="flex-none px-8 py-6 border-b border-[#333] bg-[#252525]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-[#0078d4] rounded-[6px] flex items-center justify-center text-white shadow-md">
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight">Revisión de Importación</h1>
                                <p className="text-sm text-[#a0a0a0]">Verifique los datos antes de completar la migración</p>
                            </div>
                        </div>
                        {isPreviewOnly && (
                            <Button
                                onClick={handleLoadFullData}
                                variant="outline"
                                className="bg-[#333] hover:bg-[#3d3d3d] text-[#e0e0e0] border-[#444] text-sm h-[32px] gap-2"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Analizar Todo
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 custom-scrollbar bg-[#202020]">
                    <div className="space-y-6">

                        {/* Summary Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <StatCard
                                icon={<Users className="w-5 h-5 text-[#60cdff]" />}
                                label="Pacientes"
                                value={preview.summary.total_patients}
                                sublabel={preview.summary.patients_with_data > 0 ? `${preview.summary.patients_with_data} válidos` : undefined}
                            />
                            <StatCard
                                icon={<Database className="w-5 h-5 text-[#c3b1e1]" />}
                                label="Tratamientos"
                                value={preview.summary.total_treatments}
                                sublabel={`${preview.summary.treatments_completed} fin.`}
                            />
                            <StatCard
                                icon={<CreditCard className="w-5 h-5 text-[#6ccb5f]" />}
                                label="Pagos"
                                value={preview.summary.total_payments}
                            />
                            <StatCard
                                icon={<DollarSign className="w-5 h-5 text-[#6ccb5f]" />}
                                label="Recaudación"
                                value={formatCurrency(preview.summary.total_revenue)}
                            />
                            <StatCard
                                icon={<AlertCircle className="w-5 h-5 text-[#e0e0e0]" />}
                                label="Adeudado"
                                value={formatCurrency(preview.summary.total_outstanding)}
                            />
                        </div>

                        {/* Validation Box */}
                        <div className={`rounded-[6px] border p-5 ${preview.can_proceed ? 'bg-[#1b2b1b] border-[#1b3d1b]' : 'bg-[#2b1b1b] border-[#442222]'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                {preview.can_proceed ? (
                                    <div className="w-8 h-8 rounded-full bg-[#107c10]/20 flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-[#6ccb5f]" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-[#c50f1f]/20 flex items-center justify-center">
                                        <XCircle className="w-5 h-5 text-[#ff4b4b]" />
                                    </div>
                                )}
                                <h3 className={`font-semibold text-base ${preview.can_proceed ? 'text-[#6ccb5f]' : 'text-[#ff4b4b]'}`}>
                                    {preview.can_proceed ? 'Datos validados correctamente' : 'Se requieren correcciones'}
                                </h3>
                            </div>

                            <div className="space-y-3 pl-11">
                                {preview.validation_report.critical_issues.length > 0 && (
                                    <ValidationList title="Errores Críticos" items={preview.validation_report.critical_issues} color="text-[#ff4b4b]" />
                                )}
                                {preview.validation_report.errors.length > 0 && (
                                    <ValidationList title="Errores" items={preview.validation_report.errors} color="text-[#ff99a4]" />
                                )}
                                {preview.validation_report.warnings.length > 0 && (
                                    <ValidationList title="Advertencias" items={preview.validation_report.warnings} color="text-[#fce100]" />
                                )}
                                {preview.can_proceed && preview.validation_report.total_issues === 0 && (
                                    <p className="text-sm text-[#a0a0a0]">La estructura de la base de datos es compatible y consistente.</p>
                                )}
                            </div>
                        </div>

                        {/* Data Preview Table */}
                        <div className="border border-[#333] rounded-[6px] overflow-hidden bg-[#252525]">
                            <div className="px-4 py-3 bg-[#2d2d2d] border-b border-[#333] flex justify-between items-center">
                                <h3 className="font-semibold text-sm text-[#e0e0e0]">Vista Previa de Registros {isPreviewOnly && "(Muestra)"}</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-[#333] text-[#a0a0a0]">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Paciente</th>
                                            <th className="px-4 py-3 font-medium">Documento</th>
                                            <th className="px-4 py-3 font-medium text-center">Tram.</th>
                                            <th className="px-4 py-3 font-medium text-right">Facturado</th>
                                            <th className="px-4 py-3 font-medium text-right">Pagado</th>
                                            <th className="px-4 py-3 font-medium text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#333]">
                                        {preview.sample_patients.map(patient => (
                                            <tr key={patient.temp_id} className={`hover:bg-[#333] transition-colors ${patient.has_issues ? 'bg-[#3b1717]/30' : ''}`}>
                                                <td className="px-4 py-3 font-medium text-white">{patient.full_name}</td>
                                                <td className="px-4 py-3 text-[#a0a0a0] font-mono text-xs">{patient.document || '—'}</td>
                                                <td className="px-4 py-3 text-center text-[#d0d0d0]">{patient.treatments_count}</td>
                                                <td className="px-4 py-3 text-right text-[#d0d0d0]">{formatCurrency(patient.total_billed)}</td>
                                                <td className="px-4 py-3 text-right text-[#6ccb5f]">{formatCurrency(patient.total_paid)}</td>
                                                <td className={`px-4 py-3 text-right font-semibold ${patient.balance > 0 ? 'text-[#ff99a4]' : 'text-[#6ccb5f]'}`}>
                                                    {formatCurrency(patient.balance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer Controls */}
                <div className="flex-none px-8 py-6 bg-[#202020] border-t border-[#333] flex justify-between items-center">
                    <Button
                        onClick={handleCancel}
                        variant="ghost"
                        className="text-[#d0d0d0] hover:bg-[#333] hover:text-white px-6"
                    >
                        Cancelar Importación
                    </Button>

                    <Button
                        onClick={handleConfirmImport}
                        disabled={!preview.can_proceed}
                        className={`h-[40px] px-8 text-sm font-semibold shadow-lg transition-all ${preview.can_proceed
                            ? "bg-[#0078d4] hover:bg-[#006cc1] text-white"
                            : "bg-[#333] text-[#666] cursor-not-allowed"
                            }`}
                    >
                        {preview.can_proceed ? "Confirmar e Importar" : "Corregir Errores"}
                    </Button>
                </div>

            </div>
        </div>
    );
}

// Subcomponents helper styles for Dark Mode
function StatCard({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: string | number; sublabel?: string }) {
    return (
        <div className="bg-[#2b2b2b] border border-[#333] rounded-[6px] p-4 text-center hover:bg-[#333] transition-colors group cursor-default">
            <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform duration-300">{icon}</div>
            <div className="text-xl font-bold text-white mb-1 tracking-tight">{value}</div>
            <div className="text-xs text-[#a0a0a0] uppercase font-semibold tracking-wider">{label}</div>
            {sublabel && <div className="text-[10px] text-[#666] mt-1">{sublabel}</div>}
        </div>
    );
}

function ValidationList({ title, items, color }: { title: string, items: string[], color: string }) {
    return (
        <div className="mb-2">
            <h4 className={`text-sm font-semibold mb-1 ${color}`}>{title} ({items.length})</h4>
            <ul className="list-disc list-inside space-y-0.5 text-xs text-[#d0d0d0]/80 font-mono">
                {items.slice(0, 5).map((item, i) => (
                    <li key={i} className="truncate">{item}</li>
                ))}
                {items.length > 5 && <li className="text-[#666] italic">...y {items.length - 5} más</li>}
            </ul>
        </div>
    );
}
