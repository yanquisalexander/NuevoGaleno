// Componente React para la pantalla de revisión de importación
// Ejemplo de implementación para integrar en FirstRunWizard o como pantalla independiente

import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { AlertCircle, CheckCircle, XCircle, AlertTriangle, Database, Users, CreditCard, DollarSign } from 'lucide-react';

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
}

export default function ImportReviewScreen({ extractedDir, onComplete, onCancel }: ImportReviewScreenProps) {
    const [stage, setStage] = useState<'loading' | 'preview' | 'loading-full' | 'importing' | 'complete' | 'error'>('loading');
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<any>(null);
    const [isPreviewOnly, setIsPreviewOnly] = useState(true);

    useEffect(() => {
        runImportPipeline(true); // Iniciar con preview rápido
    }, [extractedDir]);

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

    if (stage === 'loading' || stage === 'loading-full') {
        return (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 p-4">
                <Card className="p-8 max-w-lg w-full shadow-md border-slate-200/70">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-200 flex items-center justify-center">
                            <Database className="w-6 h-6 text-blue-600 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.12em] text-blue-500 font-semibold">Importación</p>
                            <h2 className="text-2xl font-bold text-slate-800">
                                {stage === 'loading' ? 'Vista previa rápida' : 'Procesando todos los datos'}
                            </h2>
                        </div>
                    </div>
                    <p className="text-slate-600 mb-4">
                        {stage === 'loading'
                            ? 'Leyendo los primeros registros para mostrar un adelanto rápido.'
                            : 'Leyendo, transformando y validando el dataset completo. Esto puede tardar unos minutos.'
                        }
                    </p>
                    <div className="space-y-3">
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: stage === 'loading' ? '45%' : '70%' }}></div>
                        </div>
                        <p className="text-xs text-slate-500">No cierres la app durante el proceso.</p>
                    </div>
                </Card>
            </div>
        );
    }

    if (stage === 'error') {
        return (
            <div className="flex items-center justify-center h-full p-4 bg-gradient-to-br from-rose-50 via-white to-slate-50">
                <Card className="p-8 max-w-2xl border-red-200 shadow-md">
                    <div className="text-center space-y-4">
                        <XCircle className="w-16 h-16 mx-auto text-red-500" />
                        <h2 className="text-2xl font-bold text-red-600">Error en importación</h2>
                        <p className="text-slate-700 bg-red-50/80 p-4 rounded border border-red-200 font-mono text-sm">
                            {error}
                        </p>
                        <Button onClick={handleCancel} variant="outline" className="border-red-200 text-red-600">
                            Volver
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (stage === 'importing') {
        return (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4">
                <Card className="p-8 max-w-md shadow-md">
                    <div className="text-center space-y-4">
                        <Database className="w-16 h-16 mx-auto text-emerald-500 animate-pulse" />
                        <h2 className="text-2xl font-bold">Guardando en base de datos</h2>
                        <p className="text-slate-600">
                            Insertando registros de forma transaccional...
                        </p>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-emerald-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    if (stage === 'complete') {
        return (
            <div className="flex items-center justify-center h-full p-4 bg-gradient-to-br from-emerald-50 via-white to-blue-50">
                <Card className="p-8 max-w-2xl border-emerald-200 shadow-lg">
                    <div className="text-center space-y-6">
                        <CheckCircle className="w-20 h-20 mx-auto text-emerald-500" />
                        <h2 className="text-3xl font-bold text-emerald-600">Importación exitosa</h2>

                        {importResult && (
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                                    <div className="text-2xl font-bold text-blue-700">{importResult.patients_inserted}</div>
                                    <div className="text-sm text-slate-600">Pacientes</div>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                    <Database className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                                    <div className="text-2xl font-bold text-purple-700">{importResult.treatments_inserted}</div>
                                    <div className="text-sm text-slate-600">Tratamientos</div>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <CreditCard className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                                    <div className="text-2xl font-bold text-emerald-700">{importResult.payments_inserted}</div>
                                    <div className="text-sm text-slate-600">Pagos</div>
                                </div>
                            </div>
                        )}

                        <p className="text-slate-600 mt-4">
                            Todos los datos fueron importados y están listos para usar.
                        </p>
                    </div>
                </Card>
            </div>
        );
    }

    // PREVIEW STAGE
    if (!preview) return null;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(value);
    };

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Hero */}
                <Card className="p-6 bg-white shadow-md border-slate-200/70">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-200 flex items-center justify-center">
                                <Database className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.14em] text-blue-500 font-semibold">Revisión</p>
                                <h1 className="text-3xl font-bold text-slate-900">Revisión de Importación</h1>
                                <p className="text-slate-600">Verifica antes de aplicar los cambios. Importación estilo MD3.</p>
                            </div>
                        </div>
                        {isPreviewOnly && (
                            <Button onClick={handleLoadFullData} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                                📊 Cargar todos los datos
                            </Button>
                        )}
                    </div>
                </Card>

                {/* Resumen Ejecutivo */}
                <Card className="p-6 bg-white shadow-sm border-slate-200/70">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900">
                        <Database className="w-5 h-5 text-blue-600" />
                        Resumen ejecutivo
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <StatCard
                            icon={<Users className="w-6 h-6 text-blue-600" />}
                            label="Pacientes"
                            value={preview.summary.total_patients}
                            sublabel={`${preview.summary.patients_with_data} con datos completos`}
                        />
                        <StatCard
                            icon={<Database className="w-6 h-6 text-purple-600" />}
                            label="Tratamientos"
                            value={preview.summary.total_treatments}
                            sublabel={`${preview.summary.treatments_completed} completados`}
                        />
                        <StatCard
                            icon={<CreditCard className="w-6 h-6 text-emerald-600" />}
                            label="Pagos"
                            value={preview.summary.total_payments}
                        />
                        <StatCard
                            icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
                            label="Recaudación"
                            value={formatCurrency(preview.summary.total_revenue)}
                        />
                        <StatCard
                            icon={<AlertCircle className="w-6 h-6 text-orange-600" />}
                            label="Saldo adeudado"
                            value={formatCurrency(preview.summary.total_outstanding)}
                        />
                    </div>
                </Card>

                {/* Validación */}
                <Card className={`p-6 bg-white shadow-sm border ${preview.can_proceed ? 'border-emerald-200' : 'border-red-200'}`}>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900">
                        {preview.can_proceed ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        Reporte de validación
                    </h2>

                    {preview.validation_report.critical_issues.length > 0 && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
                            <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                                <XCircle className="w-5 h-5" />
                                Errores críticos ({preview.validation_report.critical_issues.length})
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-red-800 max-h-40 overflow-y-auto pr-2">
                                {preview.validation_report.critical_issues.map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {preview.validation_report.errors.length > 0 && (
                        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
                            <h3 className="font-bold text-orange-700 mb-2 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                Errores ({preview.validation_report.errors.length})
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-orange-800 max-h-60 overflow-y-auto pr-2">
                                {preview.validation_report.errors.map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {preview.validation_report.warnings.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                            <h3 className="font-bold text-yellow-700 mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Advertencias ({preview.validation_report.warnings.length})
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 max-h-40 overflow-y-auto pr-2">
                                {preview.validation_report.warnings.map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {preview.can_proceed && preview.validation_report.total_issues === 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                            <CheckCircle className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                            <p className="font-bold text-emerald-700">Todos los datos son válidos</p>
                            <p className="text-sm text-emerald-600">No se encontraron problemas</p>
                        </div>
                    )}
                </Card>

                {/* Vista Previa de Pacientes */}
                <Card className="p-6 bg-white shadow-sm border-slate-200/70">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Muestra</p>
                            <h2 className="text-xl font-bold text-slate-900">Vista previa de pacientes {isPreviewOnly && '(primeros 5)'}</h2>
                        </div>
                        {isPreviewOnly && (
                            <Button
                                onClick={handleLoadFullData}
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                                Cargar todos
                            </Button>
                        )}
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-200/70">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-3 py-2 text-left text-slate-700">Nombre Completo</th>
                                    <th className="px-3 py-2 text-left text-slate-700">Documento</th>
                                    <th className="px-3 py-2 text-left text-slate-700">Teléfono</th>
                                    <th className="px-3 py-2 text-center text-slate-700">Tratamientos</th>
                                    <th className="px-3 py-2 text-right text-slate-700">Total Facturado</th>
                                    <th className="px-3 py-2 text-right text-slate-700">Total Pagado</th>
                                    <th className="px-3 py-2 text-right text-slate-700">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {preview.sample_patients.map(patient => (
                                    <tr
                                        key={patient.temp_id}
                                        className={`hover:bg-blue-50/60 ${patient.has_issues ? 'bg-amber-50' : ''}`}
                                    >
                                        <td className="px-3 py-2 font-medium text-slate-900">{patient.full_name}</td>
                                        <td className="px-3 py-2 text-slate-600">{patient.document || '—'}</td>
                                        <td className="px-3 py-2 text-slate-600">{patient.phone || '—'}</td>
                                        <td className="px-3 py-2 text-center text-slate-700">{patient.treatments_count}</td>
                                        <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(patient.total_billed)}</td>
                                        <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(patient.total_paid)}</td>
                                        <td className={`px-3 py-2 text-right font-semibold ${patient.balance > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                            {formatCurrency(patient.balance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Botones de Acción */}
                <Card className="p-6 bg-white shadow-sm border-slate-200/70">
                    <div className="flex items-center justify-between">
                        <Button onClick={handleCancel} variant="outline" size="lg" className="rounded-xl border-slate-200 text-slate-700">
                            Cancelar
                        </Button>

                        <Button
                            onClick={handleConfirmImport}
                            disabled={!preview.can_proceed}
                            size="lg"
                            className={preview.can_proceed
                                ? "rounded-xl bg-emerald-600 hover:bg-emerald-700"
                                : "rounded-xl bg-slate-300 cursor-not-allowed"
                            }
                        >
                            {preview.can_proceed
                                ? "✓ Confirmar e importar"
                                : "✗ Revisa los errores antes"}
                        </Button>
                    </div>
                    {preview.can_proceed && (
                        <p className="text-sm text-slate-600 text-center mt-4">
                            Acción irreversible: confirma solo si todo luce correcto.
                        </p>
                    )}
                </Card>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: string | number; sublabel?: string }) {
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="flex justify-center mb-2">{icon}</div>
            <div className="text-2xl font-bold text-slate-800">{value}</div>
            <div className="text-xs text-slate-600 font-medium">{label}</div>
            {sublabel && <div className="text-xs text-slate-500 mt-1">{sublabel}</div>}
        </div>
    );
}
