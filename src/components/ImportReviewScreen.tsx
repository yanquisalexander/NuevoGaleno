// Componente React para la pantalla de revisión de importación
// Estilo Fluent Windows 11 Dark Mode

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertCircle, CheckCircle, XCircle, Database, Users, CreditCard, DollarSign, RefreshCw, ChevronLeft, ChevronRight, Layers3 } from 'lucide-react';
import { DocConversionDialog } from './DocConversionDialog';
import { getAllTreatmentCatalog, type TreatmentCatalogEntry } from '@/hooks/useTreatmentCatalog';

interface ImportPreview {
    summary: PreviewSummary;
    sample_patients: PatientPreview[];
    legacy_treatments: LegacyTreatmentPreview;
    validation_report: ValidationReport;
    can_proceed: boolean;
}

interface LegacyTreatmentPreview {
    total_groups: number;
    unresolved_groups: number;
    total_occurrences: number;
    groups: LegacyTreatmentGroup[];
}

interface LegacyCatalogDraft {
    name: string;
    description?: string;
    default_cost: number;
    category?: string;
    color?: string;
    icon?: string;
    show_independently: boolean;
    applies_to_whole_tooth: boolean;
    visual_effect?: string;
    is_bridge_component: boolean;
}

type LegacyTreatmentResolution =
    | { type: 'unresolved' }
    | { type: 'existing_catalog'; treatment_catalog_id: number }
    | { type: 'create_catalog'; draft: LegacyCatalogDraft }
    | { type: 'reuse_created_catalog'; source_group_key: string };

interface LegacyTreatmentGroup {
    key: string;
    display_name: string;
    reference_code?: string;
    occurrence_count: number;
    patient_count: number;
    total_cost: number;
    sample_tooth_numbers: string[];
    is_general_treatment: boolean;
    suggested_draft: LegacyCatalogDraft;
    resolution: LegacyTreatmentResolution;
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
    const [stage, setStage] = useState<'checking-docs' | 'loading' | 'preview' | 'importing' | 'complete' | 'error'>('checking-docs');
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<any>(null);
    const [progressMessage, setProgressMessage] = useState<string>('Detectando archivos de historias clínicas...');
    const [progressStage, setProgressStage] = useState<string>('checking');
    const [progressPercent, setProgressPercent] = useState<number | null>(null);
    const [checkingSeconds, setCheckingSeconds] = useState<number>(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [catalogOptions, setCatalogOptions] = useState<TreatmentCatalogEntry[]>([]);
    const [legacyDrafts, setLegacyDrafts] = useState<Record<string, LegacyCatalogDraft>>({});
    const [createModeByGroup, setCreateModeByGroup] = useState<Record<string, boolean>>({});
    const [savingLegacyGroup, setSavingLegacyGroup] = useState<string | null>(null);
    const [showLegacyModal, setShowLegacyModal] = useState(false);
    const [activeLegacyGroupKey, setActiveLegacyGroupKey] = useState<string | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const legacyModalInitializedRef = useRef(false);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    useEffect(() => {
        if (stage !== 'checking-docs') {
            return;
        }

        setCheckingSeconds(0);
        const intervalId = window.setInterval(() => {
            setCheckingSeconds((current) => current + 1);
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [stage]);

    useEffect(() => {
        if (stage === 'preview') {
            getAllTreatmentCatalog()
                .then(setCatalogOptions)
                .catch((catalogError) => {
                    console.error('Error cargando catálogo para mapeo legacy:', catalogError);
                });
        }
    }, [stage]);

    useEffect(() => {
        if (!preview) return;

        if (preview.legacy_treatments.total_groups === 0) {
            setShowLegacyModal(false);
            setActiveLegacyGroupKey(null);
            legacyModalInitializedRef.current = false;
            return;
        }

        setLegacyDrafts((current) => {
            const next = { ...current };
            for (const group of preview.legacy_treatments.groups) {
                if (!next[group.key]) {
                    next[group.key] = group.resolution.type === 'create_catalog'
                        ? group.resolution.draft
                        : group.suggested_draft;
                }
            }
            return next;
        });

        setCreateModeByGroup((current) => {
            const next = { ...current };
            for (const group of preview.legacy_treatments.groups) {
                next[group.key] = group.resolution.type === 'create_catalog' || current[group.key] === true;
            }
            return next;
        });

        setActiveLegacyGroupKey((current) => {
            const groups = preview.legacy_treatments.groups;
            const unresolved = groups.filter((group) => group.resolution.type === 'unresolved');

            if (current) {
                const existing = groups.find((group) => group.key === current);
                if (existing && (existing.resolution.type === 'unresolved' || unresolved.length === 0)) {
                    return current;
                }
            }

            return unresolved[0]?.key ?? groups[0]?.key ?? null;
        });

        if (!legacyModalInitializedRef.current) {
            setShowLegacyModal(true);
            legacyModalInitializedRef.current = true;
        }
    }, [preview]);

    useEffect(() => {
        // Listener para eventos de progreso
        const setupListener = async () => {
            const unlistenProgress = await listen<any>('import:progress', (event) => {
                const msg: string = event.payload.message || 'Procesando...';
                const stg: string = event.payload.stage || 'reading';
                const payloadProgress = Number(event.payload?.progress);
                setProgressMessage(msg);
                setProgressStage(stg);

                if (Number.isFinite(payloadProgress)) {
                    const bounded = Math.max(0, Math.min(100, payloadProgress));
                    setProgressPercent(bounded);
                } else {
                    const stageFallback: Record<string, number> = {
                        checking: 8,
                        reading: 30,
                        transforming: 72,
                        complete: 100,
                        persisting: 12,
                        done: 100,
                    };
                    if (stageFallback[stg] !== undefined) {
                        setProgressPercent((current) => Math.max(current ?? 0, stageFallback[stg]));
                    }
                }

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

        // Cleanup
        return () => {
            cleanupPromise.then(cleanup => cleanup());
        };
    }, [extractedDir]);

    const handleDocConversionComplete = (success: boolean) => {
        console.log(`✅ Conversión de .doc completada. Éxito: ${success}`);
        setStage('loading');
        runImportPipeline();
    };

    const handleSkipDocConversion = () => {
        console.log('⏭️ Conversión de .doc omitida');
        setStage('loading');
        runImportPipeline();
    };

    async function runImportPipeline() {
        try {
            setStage('loading');
            setProgressPercent(5);

            // Paso 1: Iniciar sesión de importación
            console.log('📁 Iniciando sesión de importación completa...');
            const session: any = await invoke('start_import_session', {
                extractedDir,
                previewOnly: false
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

            legacyModalInitializedRef.current = false;
            setPreview(previewData.preview);
            setStage('preview');
        } catch (err: any) {
            console.error('❌ Error en pipeline:', err);
            setError(err.toString());
            setStage('error');
        }
    }

    async function reloadPreview() {
        const previewData: any = await invoke('generate_import_preview');
        setPreview(previewData.preview);
    }

    async function handleLegacyCatalogSelection(group: LegacyTreatmentGroup, value: string) {
        if (!value || value === '__unresolved__') {
            await invoke('clear_legacy_treatment_resolution', { groupKey: group.key });
            setCreateModeByGroup((current) => ({ ...current, [group.key]: false }));
            await reloadPreview();
            return;
        }

        if (value.startsWith('__reuse__::')) {
            const sourceGroupKey = value.slice('__reuse__::'.length);
            if (!sourceGroupKey) {
                return;
            }

            setSavingLegacyGroup(group.key);
            try {
                await invoke('resolve_legacy_treatment_with_pending_catalog', {
                    groupKey: group.key,
                    sourceGroupKey,
                });
                setCreateModeByGroup((current) => ({ ...current, [group.key]: false }));
                await reloadPreview();
            } finally {
                setSavingLegacyGroup(null);
            }
            return;
        }

        if (value === '__create__') {
            setCreateModeByGroup((current) => ({ ...current, [group.key]: true }));
            if (group.resolution.type !== 'create_catalog') {
                await invoke('clear_legacy_treatment_resolution', { groupKey: group.key });
                await reloadPreview();
            }
            return;
        }

        const treatmentCatalogId = Number(value);
        if (Number.isNaN(treatmentCatalogId)) {
            return;
        }

        setSavingLegacyGroup(group.key);
        try {
            await invoke('resolve_legacy_treatment_with_catalog', {
                groupKey: group.key,
                treatmentCatalogId,
            });
            setCreateModeByGroup((current) => ({ ...current, [group.key]: false }));
            await reloadPreview();
        } finally {
            setSavingLegacyGroup(null);
        }
    }

    async function handleSaveLegacyDraft(group: LegacyTreatmentGroup) {
        const draft = legacyDrafts[group.key];
        if (!draft?.name?.trim()) {
            setError('Debe indicar un nombre para el tratamiento nuevo de catálogo');
            return;
        }

        setSavingLegacyGroup(group.key);
        try {
            await invoke('resolve_legacy_treatment_with_new_catalog', {
                groupKey: group.key,
                draft,
            });
            setCreateModeByGroup((current) => ({ ...current, [group.key]: true }));
            await reloadPreview();
        } catch (legacyError: any) {
            setError(legacyError.toString());
        } finally {
            setSavingLegacyGroup(null);
        }
    }

    function getLegacySelectionValue(group: LegacyTreatmentGroup): string {
        if (group.resolution.type === 'existing_catalog') {
            return String(group.resolution.treatment_catalog_id);
        }

        if (group.resolution.type === 'reuse_created_catalog') {
            const sourceGroupKey = group.resolution.source_group_key;
            const sourceGroup = preview?.legacy_treatments.groups.find(
                (candidate) => candidate.key === sourceGroupKey
            );

            if (sourceGroup?.resolution.type === 'create_catalog') {
                return `__reuse__::${sourceGroupKey}`;
            }

            return '__unresolved__';
        }

        if (group.resolution.type === 'create_catalog' || createModeByGroup[group.key]) {
            return '__create__';
        }

        return '__unresolved__';
    }

    function getReusablePendingCatalogGroups(currentGroupKey: string): LegacyTreatmentGroup[] {
        if (!preview) return [];

        return preview.legacy_treatments.groups
            .filter((group) => group.key !== currentGroupKey && group.resolution.type === 'create_catalog')
            .sort((left, right) => left.display_name.localeCompare(right.display_name));
    }

    function getOrderedLegacyGroups(): LegacyTreatmentGroup[] {
        if (!preview) return [];

        return [...preview.legacy_treatments.groups].sort((left, right) => {
            const leftPending = left.resolution.type === 'unresolved' ? 0 : 1;
            const rightPending = right.resolution.type === 'unresolved' ? 0 : 1;

            if (leftPending !== rightPending) {
                return leftPending - rightPending;
            }

            return left.display_name.localeCompare(right.display_name);
        });
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
                        <h2 className="text-xl font-semibold mb-2 text-white">Verificando archivos...</h2>
                        <p className="text-[#a0a0a0] text-sm">{progressMessage || 'Detectando archivos de historias clínicas'}</p>
                        <p className="text-[#6f6f6f] text-xs mt-2">Tiempo transcurrido: {checkingSeconds}s</p>
                    </div>
                ) : (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans select-none">
                        <div className="w-[500px] bg-[#202020] text-[#ffffff] rounded-[8px] border border-[#333] shadow-[0_32px_64px_rgba(0,0,0,0.5),0_2px_21px_rgba(0,0,0,0.4)] overflow-hidden ring-1 ring-white/5 p-8 flex flex-col items-center text-center">
                            <div className="mb-6 relative">
                                <div className="absolute inset-0 bg-[#0078d4] blur-[30px] opacity-20 rounded-full"></div>
                                <RefreshCw className="w-12 h-12 text-[#0078d4] animate-spin relative z-10" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2 text-white">Verificando archivos...</h2>
                            <p className="text-[#a0a0a0] text-sm">{progressMessage || 'Detectando archivos de historias clínicas'}</p>
                            <p className="text-[#6f6f6f] text-xs mt-2">Tiempo transcurrido: {checkingSeconds}s</p>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Si está embebido, NO mostramos el contenedor fixed ni el backdrop, solo el contenido.
    // Ajustaremos el estilo para que fluya dentro del FirstRunWizard.

    if (stage === 'loading') {
        const stageBase: Record<string, number> = {
            checking: 8,
            reading: 30,
            transforming: 72,
            complete: 100,
        };
        const fallbackByLogs = Math.min(95, (stageBase[progressStage] ?? 20) + Math.min(logs.length, 20));
        const progressValue = Math.max(0, Math.min(100, progressPercent ?? fallbackByLogs));

        if (embedded) {
            return (
                <div className="animate-in fade-in duration-500" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 24px 14px', textAlign: 'center' }}>
                        <div style={{ position: 'relative', marginBottom: 10 }}>
                            <div style={{ position: 'absolute', inset: 0, background: '#0078d4', filter: 'blur(30px)', opacity: 0.2, borderRadius: '50%' }} />
                            <RefreshCw className="w-9 h-9 text-[#0078d4] animate-spin relative z-10" />
                        </div>
                        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }} className="text-white">
                            Analizando base de datos completa...
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
                        Analizando base de datos completa
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
                        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }} className="text-white">Escribiendo en base de datos...</h2>
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

    const fluent = {
        bg: 'rgba(32,32,32,0.98)',
        layer1: 'rgba(255,255,255,0.04)',
        layer2: 'rgba(255,255,255,0.07)',
        layer3: 'rgba(255,255,255,0.10)',
        border: 'rgba(255,255,255,0.083)',
        textPrimary: 'rgba(255,255,255,0.955)',
        textSecondary: 'rgba(255,255,255,0.60)',
        textMuted: 'rgba(255,255,255,0.36)',
        accent: '#60cdff',
        accentBg: 'rgba(96,205,255,0.14)',
        successBg: 'rgba(16,124,16,0.24)',
        dangerBg: 'rgba(197,15,31,0.24)',
    };

    const orderedLegacyGroups = getOrderedLegacyGroups();
    const activeLegacyGroup = orderedLegacyGroups.find((group) => group.key === activeLegacyGroupKey)
        ?? orderedLegacyGroups[0]
        ?? null;
    const activeLegacyGroupIndex = activeLegacyGroup
        ? orderedLegacyGroups.findIndex((group) => group.key === activeLegacyGroup.key)
        : -1;

    const renderLegacySummaryCard = () => {
        if (!preview || preview.legacy_treatments.total_groups === 0) {
            return null;
        }

        const unresolved = preview.legacy_treatments.unresolved_groups;

        return (
            <div className="rounded-[8px] overflow-hidden" style={{ background: fluent.layer2, border: `1px solid ${fluent.border}` }}>
                <div className="px-4 py-3 flex items-center justify-between gap-4" style={{ borderBottom: `1px solid ${fluent.border}`, background: 'rgba(0,0,0,0.18)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-[8px] border flex items-center justify-center shrink-0" style={{ background: fluent.accentBg, borderColor: 'rgba(96,205,255,0.3)' }}>
                            <Layers3 className="w-4 h-4" style={{ color: fluent.accent }} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-sm" style={{ color: fluent.textPrimary }}>Tratamientos legacy detectados</h3>
                            <p className="text-xs mt-1" style={{ color: fluent.textSecondary }}>
                                {preview.legacy_treatments.total_groups} grupos, {preview.legacy_treatments.total_occurrences} ocurrencias totales.
                                {unresolved > 0 ? ` ${unresolved} pendientes de resolución.` : ' Todo resuelto.'}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setShowLegacyModal(true)}
                        className={`h-[32px] px-4 text-sm text-white ${unresolved > 0 ? 'bg-[#0078d4] hover:bg-[#006cc1]' : 'bg-[#107c10] hover:bg-[#0f700f]'}`}
                    >
                        {unresolved > 0 ? 'Resolver ahora' : 'Revisar'}
                    </Button>
                </div>
            </div>
        );
    };

    const renderLegacyResolutionModal = () => {
        if (!preview || !showLegacyModal || !activeLegacyGroup) {
            return null;
        }

        const draft = legacyDrafts[activeLegacyGroup.key] || activeLegacyGroup.suggested_draft;
        const selectionValue = getLegacySelectionValue(activeLegacyGroup);
        const reusablePendingGroups = getReusablePendingCatalogGroups(activeLegacyGroup.key);
        const isSaving = savingLegacyGroup === activeLegacyGroup.key;
        const unresolved = preview.legacy_treatments.unresolved_groups;
        const canGoBack = activeLegacyGroupIndex > 0;
        const canGoNext = activeLegacyGroupIndex >= 0 && activeLegacyGroupIndex < orderedLegacyGroups.length - 1;
        const modalContent = (
            <div className="fixed inset-0 z-[120] p-4 md:p-6" style={{ background: 'rgba(0,0,0,0.54)', backdropFilter: 'blur(24px) saturate(1.4)' }}>
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-full max-w-[980px] h-full max-h-[720px] rounded-[8px] overflow-hidden flex flex-col" style={{ background: fluent.bg, border: `1px solid ${fluent.border}`, boxShadow: '0 32px 64px rgba(0,0,0,0.62), 0 2px 24px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
                        <div className="px-6 py-4 flex items-center justify-between gap-4" style={{ borderBottom: `1px solid ${fluent.border}`, background: 'rgba(0,0,0,0.28)' }}>
                            <div>
                                <h2 className="text-lg font-semibold" style={{ color: fluent.textPrimary }}>Resolver tratamientos legacy</h2>
                                <p className="text-sm mt-1" style={{ color: fluent.textSecondary }}>
                                    Asigna cada tratamiento a un catálogo existente o crea uno nuevo antes de persistir.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-xs font-semibold px-2.5 py-1 rounded" style={{ background: unresolved > 0 ? fluent.dangerBg : fluent.successBg, color: unresolved > 0 ? '#ff99a4' : '#6ccb5f' }}>
                                    {unresolved > 0 ? `${unresolved} pendientes` : 'Resueltos'}
                                </div>
                                <button
                                    onClick={() => setShowLegacyModal(false)}
                                    className="h-8 px-3 rounded-md text-sm"
                                    style={{ color: fluent.textSecondary, background: fluent.layer1, border: `1px solid ${fluent.border}` }}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 grid grid-cols-[280px_1fr]">
                            <div className="overflow-y-auto custom-scrollbar p-3 space-y-2" style={{ borderRight: `1px solid ${fluent.border}`, background: 'rgba(0,0,0,0.18)' }}>
                                {orderedLegacyGroups.map((group, index) => {
                                    const isActive = group.key === activeLegacyGroup.key;
                                    const isResolved = group.resolution.type !== 'unresolved';
                                    return (
                                        <button
                                            key={group.key}
                                            onClick={() => setActiveLegacyGroupKey(group.key)}
                                            className="w-full text-left rounded-[8px] p-3 border transition-colors"
                                            style={{
                                                background: isActive ? fluent.accentBg : fluent.layer1,
                                                borderColor: isActive ? 'rgba(96,205,255,0.35)' : fluent.border,
                                            }}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-semibold" style={{ color: fluent.textMuted }}>#{index + 1}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: isResolved ? fluent.successBg : fluent.dangerBg, color: isResolved ? '#6ccb5f' : '#ff99a4' }}>
                                                    {isResolved ? 'OK' : 'Pendiente'}
                                                </span>
                                            </div>
                                            <div className="mt-2 font-medium text-sm line-clamp-2" style={{ color: fluent.textPrimary }}>{group.display_name}</div>
                                            <div className="mt-1 text-[11px] line-clamp-2" style={{ color: fluent.textSecondary }}>
                                                {group.occurrence_count} ocurrencias · {formatCurrency(group.total_cost)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex flex-col min-h-0 overflow-hidden">
                                <div className="px-6 py-5 flex items-start justify-between gap-4" style={{ borderBottom: `1px solid ${fluent.border}`, background: 'rgba(255,255,255,0.02)' }}>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-xl font-semibold" style={{ color: fluent.textPrimary }}>{activeLegacyGroup.display_name}</h3>
                                            {activeLegacyGroup.is_general_treatment && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-[#11324d] text-[#9bd0ff] border border-[#1c4c74]">
                                                    General / boca completa
                                                </span>
                                            )}
                                            {activeLegacyGroup.resolution.type === 'existing_catalog' && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-[#1b2b1b] text-[#6ccb5f] border border-[#1b3d1b]">
                                                    Vinculado a catálogo existente
                                                </span>
                                            )}
                                            {activeLegacyGroup.resolution.type === 'create_catalog' && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-[#112b40] text-[#60cdff] border border-[#1f4968]">
                                                    Se creará al importar
                                                </span>
                                            )}
                                            {activeLegacyGroup.resolution.type === 'reuse_created_catalog' && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-[#222f43] text-[#c6dcff] border border-[#324760]">
                                                    Reutiliza catálogo nuevo de otro grupo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm mt-2" style={{ color: fluent.textSecondary }}>
                                            {activeLegacyGroup.occurrence_count} ocurrencias en {activeLegacyGroup.patient_count} pacientes
                                            {activeLegacyGroup.reference_code ? ` · Ref. ${activeLegacyGroup.reference_code}` : ''}
                                            {activeLegacyGroup.sample_tooth_numbers.length > 0 ? ` · Piezas ${activeLegacyGroup.sample_tooth_numbers.join(', ')}` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-xs uppercase tracking-wide" style={{ color: fluent.textMuted }}>Total legacy</div>
                                        <div className="text-lg font-semibold mt-1" style={{ color: fluent.textPrimary }}>{formatCurrency(activeLegacyGroup.total_cost)}</div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
                                    <div>
                                        <label className="block text-[11px] uppercase tracking-wide mb-2" style={{ color: fluent.textMuted }}>
                                            Acción a realizar
                                        </label>
                                        <Select
                                            value={selectionValue}
                                            onValueChange={(value) => handleLegacyCatalogSelection(activeLegacyGroup, value)}
                                            disabled={isSaving}
                                        >
                                            <SelectTrigger
                                                className="w-full h-[40px] rounded-md px-3 text-sm shadow-none focus:ring-0"
                                                style={{ background: fluent.layer1, border: `1px solid ${fluent.border}`, color: fluent.textPrimary }}
                                            >
                                                <SelectValue placeholder="Seleccionar destino..." />
                                            </SelectTrigger>
                                            <SelectContent
                                                className="z-[140] max-h-[320px] overflow-y-auto border shadow-2xl"
                                                style={{ background: fluent.layer1, borderColor: fluent.border, color: fluent.textPrimary }}
                                            >
                                                <SelectItem value="__unresolved__" className="text-sm focus:bg-[#163247] focus:text-white data-[highlighted]:bg-[#163247] data-[highlighted]:text-white" style={{ color: fluent.textSecondary }}>
                                                    Sin resolver
                                                </SelectItem>
                                                <SelectItem value="__create__" className="text-sm focus:bg-[#163247] focus:text-white data-[highlighted]:bg-[#163247] data-[highlighted]:text-white" style={{ color: fluent.textPrimary }}>
                                                    Crear nuevo tratamiento de catálogo
                                                </SelectItem>
                                                {reusablePendingGroups.map((option) => (
                                                    <SelectItem
                                                        key={`reuse-${option.key}`}
                                                        value={`__reuse__::${option.key}`}
                                                        className="text-sm focus:bg-[#163247] focus:text-white data-[highlighted]:bg-[#163247] data-[highlighted]:text-white"
                                                        style={{ color: '#c6dcff' }}
                                                    >
                                                        Reutilizar nuevo: {option.display_name}
                                                    </SelectItem>
                                                ))}
                                                {catalogOptions.map((option) => (
                                                    <SelectItem key={option.id} value={String(option.id)} className="text-sm focus:bg-[#163247] focus:text-white data-[highlighted]:bg-[#163247] data-[highlighted]:text-white" style={{ color: fluent.textPrimary }}>
                                                        {option.name}{option.category ? ` · ${option.category}` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectionValue === '__create__' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-[8px] p-4" style={{ border: `1px solid ${fluent.border}`, background: 'rgba(0,0,0,0.20)' }}>
                                            <div>
                                                <label className="block text-[11px] uppercase tracking-wide mb-2" style={{ color: fluent.textMuted }}>Nombre</label>
                                                <input
                                                    value={draft.name}
                                                    onChange={(event) => setLegacyDrafts((current) => ({
                                                        ...current,
                                                        [activeLegacyGroup.key]: { ...draft, name: event.target.value },
                                                    }))}
                                                    className="w-full h-[40px] rounded-md px-3 text-sm focus:outline-none"
                                                    style={{ background: fluent.layer1, border: `1px solid ${fluent.border}`, color: fluent.textPrimary }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] uppercase tracking-wide mb-2" style={{ color: fluent.textMuted }}>Categoría</label>
                                                <input
                                                    value={draft.category || ''}
                                                    onChange={(event) => setLegacyDrafts((current) => ({
                                                        ...current,
                                                        [activeLegacyGroup.key]: { ...draft, category: event.target.value },
                                                    }))}
                                                    className="w-full h-[40px] rounded-md px-3 text-sm focus:outline-none"
                                                    style={{ background: fluent.layer1, border: `1px solid ${fluent.border}`, color: fluent.textPrimary }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] uppercase tracking-wide mb-2" style={{ color: fluent.textMuted }}>Costo base</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={draft.default_cost}
                                                    onChange={(event) => setLegacyDrafts((current) => ({
                                                        ...current,
                                                        [activeLegacyGroup.key]: { ...draft, default_cost: Number(event.target.value) || 0 },
                                                    }))}
                                                    className="w-full h-[40px] rounded-md px-3 text-sm focus:outline-none"
                                                    style={{ background: fluent.layer1, border: `1px solid ${fluent.border}`, color: fluent.textPrimary }}
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <label className="flex items-center gap-2 text-sm" style={{ color: fluent.textSecondary }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={draft.show_independently}
                                                        onChange={(event) => setLegacyDrafts((current) => ({
                                                            ...current,
                                                            [activeLegacyGroup.key]: { ...draft, show_independently: event.target.checked },
                                                        }))}
                                                    />
                                                    Mostrar como tratamiento general
                                                </label>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[11px] uppercase tracking-wide mb-2" style={{ color: fluent.textMuted }}>Descripción</label>
                                                <textarea
                                                    rows={3}
                                                    value={draft.description || ''}
                                                    onChange={(event) => setLegacyDrafts((current) => ({
                                                        ...current,
                                                        [activeLegacyGroup.key]: { ...draft, description: event.target.value },
                                                    }))}
                                                    className="w-full rounded-md px-3 py-2 text-sm focus:outline-none resize-none"
                                                    style={{ background: fluent.layer1, border: `1px solid ${fluent.border}`, color: fluent.textPrimary }}
                                                />
                                            </div>
                                            <div className="md:col-span-2 flex justify-end">
                                                <Button
                                                    onClick={() => handleSaveLegacyDraft(activeLegacyGroup)}
                                                    disabled={isSaving || !draft.name.trim()}
                                                    className="h-[36px] px-4 text-sm bg-[#0078d4] hover:bg-[#006cc1] text-white"
                                                >
                                                    {isSaving ? 'Guardando...' : 'Confirmar creación de catálogo'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {selectionValue !== '__create__' && activeLegacyGroup.resolution.type === 'existing_catalog' && (
                                        <div className="rounded-[8px] border border-[#1b3d1b] bg-[#1b2b1b] p-4 text-sm text-[#cfe9cf]">
                                            Este grupo ya quedó vinculado a un tratamiento de catálogo existente y se usará en la persistencia.
                                        </div>
                                    )}

                                    {activeLegacyGroup.resolution.type === 'reuse_created_catalog' && (
                                        <div className="rounded-[8px] border p-4 text-sm" style={{ borderColor: '#324760', background: '#1b2532', color: '#c6dcff' }}>
                                            Este grupo reutilizará el mismo tratamiento nuevo definido en otro grupo del wizard, para evitar duplicados por variantes o typos.
                                        </div>
                                    )}
                                </div>

                                <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderTop: `1px solid ${fluent.border}`, background: 'rgba(0,0,0,0.18)' }}>
                                    <div className="text-xs" style={{ color: fluent.textMuted }}>
                                        Grupo {activeLegacyGroupIndex + 1} de {orderedLegacyGroups.length}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => canGoBack && setActiveLegacyGroupKey(orderedLegacyGroups[activeLegacyGroupIndex - 1].key)}
                                            disabled={!canGoBack}
                                            variant="ghost"
                                            className="h-[34px] px-3 text-sm"
                                        >
                                            <ChevronLeft className="w-4 h-4 mr-1" />
                                            Anterior
                                        </Button>
                                        <Button
                                            onClick={() => canGoNext && setActiveLegacyGroupKey(orderedLegacyGroups[activeLegacyGroupIndex + 1].key)}
                                            disabled={!canGoNext}
                                            variant="ghost"
                                            className="h-[34px] px-3 text-sm"
                                        >
                                            Siguiente
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );

        if (typeof document === 'undefined') {
            return null;
        }

        return createPortal(modalContent, document.body);
    };

    if (embedded) {
        return (
            <div className="relative flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ flex: 1, minHeight: 0 }}>
                {/* Header Embebido */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold">Resumen de Importación</h2>
                        <p className="text-sm text-[#a0a0a0]">Revise los datos antes de confirmar.</p>
                    </div>
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

                    {renderLegacySummaryCard()}

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

                {renderLegacyResolutionModal()}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 font-['Segoe_UI_Variable',_'Segoe_UI',_sans-serif]">
            {/* Main Window */}
            <div className="relative w-full max-w-[1100px] h-[85vh] flex flex-col bg-[#202020] text-[#ffffff] rounded-[8px] border border-[#333] shadow-2xl overflow-hidden ring-1 ring-white/5">

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

                        {renderLegacySummaryCard()}

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
                                <h3 className="font-semibold text-sm text-[#e0e0e0]">Vista Previa de Registros</h3>
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

                {renderLegacyResolutionModal()}

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
