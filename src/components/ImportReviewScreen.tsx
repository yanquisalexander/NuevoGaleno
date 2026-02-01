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
    const [stage, setStage] = useState<'loading' | 'preview' | 'importing' | 'complete' | 'error'>('loading');
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<any>(null);

    useEffect(() => {
        runImportPipeline();
    }, [extractedDir]);

    async function runImportPipeline() {
        try {
            setStage('loading');

            // Paso 1: Iniciar sesión de importación
            console.log('📁 Iniciando sesión de importación...');
            const session: any = await invoke('start_import_session', { extractedDir });
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

    if (stage === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="p-8 max-w-md">
                    <div className="text-center space-y-4">
                        <Database className="w-16 h-16 mx-auto text-blue-500 animate-pulse" />
                        <h2 className="text-2xl font-bold">Procesando Datos</h2>
                        <p className="text-slate-600">
                            Leyendo, transformando y validando registros de Galeno 2000...
                        </p>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    if (stage === 'error') {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="p-8 max-w-2xl border-red-300">
                    <div className="text-center space-y-4">
                        <XCircle className="w-16 h-16 mx-auto text-red-500" />
                        <h2 className="text-2xl font-bold text-red-600">Error en Importación</h2>
                        <p className="text-slate-700 bg-red-50 p-4 rounded border border-red-200 font-mono text-sm">
                            {error}
                        </p>
                        <Button onClick={handleCancel} variant="outline">
                            Volver
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (stage === 'importing') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="p-8 max-w-md">
                    <div className="text-center space-y-4">
                        <Database className="w-16 h-16 mx-auto text-green-500 animate-pulse" />
                        <h2 className="text-2xl font-bold">Guardando en Base de Datos</h2>
                        <p className="text-slate-600">
                            Insertando registros de forma transaccional...
                        </p>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    if (stage === 'complete') {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="p-8 max-w-2xl border-green-300">
                    <div className="text-center space-y-6">
                        <CheckCircle className="w-20 h-20 mx-auto text-green-500" />
                        <h2 className="text-3xl font-bold text-green-600">Importación Exitosa</h2>

                        {importResult && (
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                                    <div className="text-2xl font-bold text-blue-600">{importResult.patients_inserted}</div>
                                    <div className="text-sm text-slate-600">Pacientes</div>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <Database className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                                    <div className="text-2xl font-bold text-purple-600">{importResult.treatments_inserted}</div>
                                    <div className="text-sm text-slate-600">Tratamientos</div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <CreditCard className="w-8 h-8 mx-auto text-green-600 mb-2" />
                                    <div className="text-2xl font-bold text-green-600">{importResult.payments_inserted}</div>
                                    <div className="text-sm text-slate-600">Pagos</div>
                                </div>
                            </div>
                        )}

                        <p className="text-slate-600 mt-4">
                            Todos los datos fueron importados correctamente y están listos para usar.
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <Card className="p-6">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Revisión de Importación</h1>
                    <p className="text-slate-600">
                        Revisa cuidadosamente los datos antes de confirmar. Esta operación es irreversible.
                    </p>
                </Card>

                {/* Resumen Ejecutivo */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        Resumen Ejecutivo
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
                            icon={<CreditCard className="w-6 h-6 text-green-600" />}
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
                            label="Saldo Adeudado"
                            value={formatCurrency(preview.summary.total_outstanding)}
                        />
                    </div>
                </Card>

                {/* Validación */}
                <Card className={`p-6 ${preview.can_proceed ? 'border-green-300' : 'border-red-300'}`}>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        {preview.can_proceed ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        Reporte de Validación
                    </h2>

                    {preview.validation_report.critical_issues.length > 0 && (
                        <div className="mb-4 bg-red-50 border border-red-300 rounded-lg p-4">
                            <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                                <XCircle className="w-5 h-5" />
                                Errores Críticos ({preview.validation_report.critical_issues.length})
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                                {preview.validation_report.critical_issues.slice(0, 5).map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {preview.validation_report.errors.length > 0 && (
                        <div className="mb-4 bg-orange-50 border border-orange-300 rounded-lg p-4">
                            <h3 className="font-bold text-orange-700 mb-2 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                Errores ({preview.validation_report.errors.length})
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-orange-800">
                                {preview.validation_report.errors.slice(0, 5).map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {preview.validation_report.warnings.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                            <h3 className="font-bold text-yellow-700 mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Advertencias ({preview.validation_report.warnings.length})
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                                {preview.validation_report.warnings.slice(0, 10).map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                ))}
                                {preview.validation_report.warnings.length > 10 && (
                                    <li className="font-semibold">
                                        ... y {preview.validation_report.warnings.length - 10} advertencias más
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {preview.can_proceed && preview.validation_report.total_issues === 0 && (
                        <div className="bg-green-50 border border-green-300 rounded-lg p-4 text-center">
                            <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                            <p className="font-bold text-green-700">Todos los datos son válidos</p>
                            <p className="text-sm text-green-600">No se encontraron problemas</p>
                        </div>
                    )}
                </Card>

                {/* Vista Previa de Pacientes */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">Vista Previa de Pacientes (primeros 50)</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 border-b-2 border-slate-300">
                                <tr>
                                    <th className="px-3 py-2 text-left">Nombre Completo</th>
                                    <th className="px-3 py-2 text-left">Documento</th>
                                    <th className="px-3 py-2 text-left">Teléfono</th>
                                    <th className="px-3 py-2 text-center">Tratamientos</th>
                                    <th className="px-3 py-2 text-right">Total Facturado</th>
                                    <th className="px-3 py-2 text-right">Total Pagado</th>
                                    <th className="px-3 py-2 text-right">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {preview.sample_patients.map(patient => (
                                    <tr
                                        key={patient.temp_id}
                                        className={`hover:bg-blue-50 ${patient.has_issues ? 'bg-yellow-50' : ''}`}
                                    >
                                        <td className="px-3 py-2 font-medium">{patient.full_name}</td>
                                        <td className="px-3 py-2 text-slate-600">{patient.document || '—'}</td>
                                        <td className="px-3 py-2 text-slate-600">{patient.phone || '—'}</td>
                                        <td className="px-3 py-2 text-center">{patient.treatments_count}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(patient.total_billed)}</td>
                                        <td className="px-3 py-2 text-right text-green-600">{formatCurrency(patient.total_paid)}</td>
                                        <td className={`px-3 py-2 text-right font-semibold ${patient.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                            {formatCurrency(patient.balance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Botones de Acción */}
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <Button onClick={handleCancel} variant="outline" size="lg">
                            Cancelar
                        </Button>

                        <Button
                            onClick={handleConfirmImport}
                            disabled={!preview.can_proceed}
                            size="lg"
                            className={preview.can_proceed
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-gray-400 cursor-not-allowed"
                            }
                        >
                            {preview.can_proceed
                                ? "✓ Confirmar e Importar Datos"
                                : "✗ No se puede importar (errores críticos)"}
                        </Button>
                    </div>
                    {preview.can_proceed && (
                        <p className="text-sm text-slate-600 text-center mt-4">
                            ⚠️ Esta acción es irreversible. Asegúrate de haber revisado todos los datos.
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
