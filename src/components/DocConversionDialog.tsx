import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';
import { FileText, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface DocFilesInfo {
    count: number;
    total_size_mb: number;
    sample_files: string[];
}

interface DocConversionDialogProps {
    sourcePath: string;
    onConversionComplete?: (success: boolean) => void;
    onSkip?: () => void;
}

export function DocConversionDialog({
    sourcePath,
    onConversionComplete,
    onSkip,
}: DocConversionDialogProps) {
    const fluent = {
        shell: '#202020',
        layer: '#252525',
        layerAlt: '#2a2a2a',
        border: 'rgba(255,255,255,0.11)',
        text: '#f3f3f3',
        textMuted: '#a0a0a0',
        accent: '#0078d4',
        warningBg: 'rgba(255, 185, 0, 0.12)',
        warningBorder: 'rgba(255, 185, 0, 0.35)',
        warningText: '#ffd67a',
        successBg: 'rgba(16, 124, 16, 0.14)',
        successBorder: 'rgba(106, 204, 95, 0.35)',
        successText: '#9fdb95',
        dangerBg: 'rgba(197, 15, 31, 0.15)',
        dangerBorder: 'rgba(255, 75, 75, 0.35)',
        dangerText: '#ff9aa5',
    };

    const [open, setOpen] = useState(false);
    const [docInfo, setDocInfo] = useState<DocFilesInfo | null>(null);
    const [docFiles, setDocFiles] = useState<string[]>([]);
    const [converting, setConverting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [result, setResult] = useState<{
        success_count: number;
        errors: string[];
        total: number;
    } | null>(null);

    const [converterStatus, setConverterStatus] = useState<{
        has_libreoffice: boolean;
        libreoffice_path?: string;
        has_word: boolean;
        recommended: 'libreoffice' | 'word' | 'none';
    } | null>(null);

    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; message: string } | null>(null);

    const [preferredEngine, setPreferredEngine] = useState<'auto' | 'libreoffice' | 'word'>('auto');

    // Detectar archivos .doc al montar
    useEffect(() => {
        detectDocFiles();
    }, [sourcePath]);

    const detectDocFiles = async () => {
        console.log('🧪 [DocConversionDialog] detectDocFiles sourcePath:', sourcePath);
        try {
            const response = await invoke<{
                found: boolean;
                info: DocFilesInfo;
                files: string[];
            }>('detect_doc_files_in_import', { sourcePath });
            console.log('🧪 [DocConversionDialog] detectDocFiles response:', response);

            if (response.found) {
                setDocInfo(response.info);
                setDocFiles(response.files);

                // Consultar si hay motores de conversión disponibles
                try {
                    const status = await invoke<{
                        has_libreoffice: boolean;
                        libreoffice_path?: string;
                        has_word: boolean;
                        recommended: 'libreoffice' | 'word' | 'none';
                    }>('check_doc_conversion_environment');
                    setConverterStatus(status);

                    // Ajustar preferencia inicial según lo disponible
                    if (status.recommended === 'libreoffice') {
                        setPreferredEngine('libreoffice');
                    } else if (status.recommended === 'word') {
                        setPreferredEngine('word');
                    } else {
                        setPreferredEngine('auto');
                    }
                } catch (envError) {
                    console.warn('No se pudo determinar el estado de conversión:', envError);
                }

                setOpen(true);
            } else {
                // No hay archivos .doc, continuar normalmente
                onSkip?.();
            }
        } catch (error) {
            console.error('Error detectando archivos .doc:', error);
            onSkip?.();
        }
    };

    const handleDownloadLibreOffice = async () => {
        setDownloading(true);
        setDownloadProgress({ current: 0, total: 0, message: 'Iniciando descarga...' });

        const unlisten = await listen<any>('doc_conversion:progress', (event) => {
            const { stage, current, total, message } = event.payload;
            if (stage === 'downloading') {
                setDownloadProgress({ current, total, message });
            }
        });

        try {
            const response = await invoke<{ installed: boolean; libreoffice_path: string }>('download_libreoffice_portable');
            setConverterStatus({
                has_libreoffice: response.installed,
                libreoffice_path: response.libreoffice_path,
                has_word: converterStatus?.has_word ?? false,
                recommended: 'libreoffice',
            });
            setDownloadProgress(null);
        } catch (error) {
            console.error('Error descargando LibreOffice:', error);
            setDownloadProgress({ current: 0, total: 0, message: `Error: ${error}` });
        } finally {
            setDownloading(false);
            unlisten();
        }
    };

    const handleConvert = async () => {
        setConverting(true);
        setProgress(0);
        setResult(null);

        // Escuchar eventos de progreso con detalles (current/total)
        const unlisten = await listen<any>('doc_conversion:progress', (event) => {
            const { stage, current, total, message } = event.payload;
            setProgressMessage(message);

            if (stage === 'starting') {
                setProgress(0);
            } else if (stage === 'converting' && total > 0) {
                // Calcular progreso real basado en archivos procesados
                const percentage = Math.round((current / total) * 100);
                setProgress(percentage);
            } else if (stage === 'complete') {
                setProgress(100);
            }
        });

        try {
            const response = await invoke<{
                success: number;
                errors: string[];
                total: number;
            }>('convert_doc_files_to_txt', {
                docFilesPaths: docFiles,
                preferredEngine: preferredEngine,
            });

            setResult({
                success_count: response.success,
                errors: response.errors,
                total: response.total,
            });

            // Esperar un momento para mostrar el resultado
            setTimeout(() => {
                setConverting(false);
                unlisten();

                const allSuccess = response.errors.length === 0;
                onConversionComplete?.(allSuccess);
                setOpen(false);
            }, 2000);
        } catch (error) {
            console.error('Error en conversión:', error);
            setProgressMessage(`Error: ${error}`);
            setConverting(false);
            unlisten();
        }
    };

    const handleSkip = () => {
        setOpen(false);
        onSkip?.();
    };

    if (!docInfo) return null;

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent
                className="max-w-2xl border-none p-0 overflow-hidden"
                style={{
                    background: fluent.shell,
                    color: fluent.text,
                    borderRadius: 10,
                    boxShadow: '0 32px 64px rgba(0,0,0,0.55), 0 2px 20px rgba(0,0,0,0.35)',
                    border: `1px solid ${fluent.border}`,
                    fontFamily: "'Segoe UI Variable','Segoe UI',sans-serif",
                }}
            >
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-3 px-6 pt-6">
                        <div
                            className="h-9 w-9 rounded-[8px] flex items-center justify-center"
                            style={{ background: fluent.accent, boxShadow: '0 6px 20px rgba(0,120,212,0.35)' }}
                        >
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <div className="text-[18px] leading-6 font-semibold">Archivos Word (.doc) Detectados</div>
                            <div className="text-[12px] mt-0.5" style={{ color: fluent.textMuted }}>
                                Revisión previa a la importación
                            </div>
                        </div>
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4 px-6 pb-1 pt-4" style={{ color: fluent.textMuted }}>
                        {!converting && !result && (
                            <>
                                <div
                                    className="flex items-start gap-3 p-4 rounded-[8px] border"
                                    style={{ background: fluent.warningBg, borderColor: fluent.warningBorder }}
                                >
                                    <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: fluent.warningText }} />
                                    <div className="text-sm" style={{ color: fluent.warningText }}>
                                        <p className="font-semibold mb-1" style={{ color: fluent.text }}>
                                            Se encontraron {docInfo.count} archivo{docInfo.count !== 1 ? 's' : ''} .doc de Word
                                        </p>
                                        <p>
                                            Los archivos .doc binarios (formato antiguo de Word) no se pueden leer directamente.
                                            Se recomienda convertirlos a texto plano (.txt) antes de importar.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 rounded-[8px] border p-3" style={{ background: fluent.layer, borderColor: fluent.border }}>
                                    <div className="text-sm" style={{ color: fluent.textMuted }}>
                                        <strong>Total:</strong> {docInfo.count} archivo{docInfo.count !== 1 ? 's' : ''} ({docInfo.total_size_mb.toFixed(2)} MB)
                                    </div>

                                    {docInfo.sample_files.length > 0 && (
                                        <div className="text-sm">
                                            <strong style={{ color: fluent.textMuted }}>Ejemplos:</strong>
                                            <ul className="list-disc list-inside mt-1 space-y-0.5" style={{ color: fluent.textMuted }}>
                                                {docInfo.sample_files.map((file, idx) => (
                                                    <li key={idx} className="truncate">{file}</li>
                                                ))}
                                                {docInfo.count > 5 && (
                                                    <li style={{ opacity: 0.65 }}>
                                                        ...y {docInfo.count - 5} más
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[8px] border p-3 text-sm" style={{ background: fluent.layerAlt, borderColor: fluent.border, color: fluent.textMuted }}>
                                    {converterStatus ? (
                                        <>
                                            {converterStatus.recommended === 'libreoffice' ? (
                                                <>
                                                    <strong style={{ color: fluent.text }}>Usando LibreOffice Portable</strong>
                                                    <p className="mt-1">
                                                        Se usará LibreOffice en modo headless para convertir los archivos.
                                                        Esto evita abrir múltiples instancias de Word y mejora la estabilidad.
                                                    </p>
                                                </>
                                            ) : converterStatus.recommended === 'word' ? (
                                                <>
                                                    <strong style={{ color: fluent.text }}>Usando Microsoft Word</strong>
                                                    <p className="mt-1">
                                                        Esta operación abrirá Microsoft Word en segundo plano mediante PowerShell.
                                                        El proceso puede tardar varios minutos y puede generar múltiples instancias de Word.
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <strong style={{ color: fluent.text }}>No se detectó conversor disponible</strong>
                                                    <p className="mt-1">
                                                        No se encontró ni LibreOffice ni Microsoft Word instalados. Puedes descargar
                                                        LibreOffice Portable para continuar.
                                                    </p>
                                                </>
                                            )}

                                            {converterStatus.recommended !== 'libreoffice' && (
                                                <div className="mt-3 flex flex-col gap-2">
                                                    <button
                                                        onClick={handleDownloadLibreOffice}
                                                        disabled={downloading}
                                                        className="w-full px-3 py-2 text-sm font-medium rounded-md transition-all bg-[#0078d4] hover:bg-[#1084d7] active:bg-[#0066b2] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {downloading ? 'Descargando LibreOffice…' : 'Descargar LibreOffice Portable'}
                                                    </button>

                                                    {downloadProgress && (
                                                        <div className="text-xs text-white/70">
                                                            {downloadProgress.message} ({downloadProgress.current} / {downloadProgress.total})
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {(converterStatus.has_libreoffice || converterStatus.has_word) && (
                                                <div className="mt-3 rounded-[8px] border p-3 bg-[#1d1d1d] border-white/10">
                                                    <div className="text-sm font-semibold mb-2" style={{ color: fluent.text }}>
                                                        Preferencia de conversión
                                                    </div>
                                                    <div className="flex flex-col gap-2 text-sm" style={{ color: fluent.textMuted }}>
                                                        <label className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="preferredEngine"
                                                                value="libreoffice"
                                                                checked={preferredEngine === 'libreoffice'}
                                                                onChange={() => setPreferredEngine('libreoffice')}
                                                                disabled={!converterStatus.has_libreoffice}
                                                            />
                                                            <span>Usar LibreOffice (recomendado)</span>
                                                        </label>
                                                        <label className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="preferredEngine"
                                                                value="word"
                                                                checked={preferredEngine === 'word'}
                                                                onChange={() => setPreferredEngine('word')}
                                                                disabled={!converterStatus.has_word}
                                                            />
                                                            <span>Usar Microsoft Word</span>
                                                        </label>
                                                        {converterStatus.recommended === 'libreoffice' && converterStatus.has_word && (
                                                            <div className="text-xs text-white/60">
                                                                Si Word está instalado, puede usarlo si prefiere, pero puede ser menos estable.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <strong style={{ color: fluent.text }}>Importante:</strong> Esta operación convertirá los archivos.
                                            Si no ves barra de progreso, puede deberse a que no se detectó un conversor.
                                        </>
                                    )}
                                </div>
                            </>
                        )}

                        {converting && (
                            <div className="space-y-4 py-4 rounded-[8px] border px-4" style={{ background: fluent.layer, borderColor: fluent.border }}>
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-transparent" style={{ borderBottomColor: fluent.accent, borderLeftColor: fluent.accent }}></div>
                                    <span className="text-sm font-medium" style={{ color: fluent.text }}>{progressMessage}</span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.09)' }}>
                                    <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: fluent.accent }} />
                                </div>
                                <p className="text-xs text-center" style={{ color: fluent.textMuted }}>
                                    Por favor espere, {converterStatus?.recommended === 'libreoffice' ? 'LibreOffice' : 'Word'} está procesando los archivos...
                                </p>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-3 py-4">
                                {result.errors.length === 0 ? (
                                    <div className="rounded-[8px] border p-3" style={{ background: fluent.successBg, borderColor: fluent.successBorder }}>
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2 className="h-4 w-4 mt-0.5" style={{ color: fluent.successText }} />
                                            <div style={{ color: fluent.successText }}>
                                                <strong>✓ Conversión exitosa</strong>
                                                <br />
                                                {result.success_count} de {result.total} archivo{result.total !== 1 ? 's' : ''} convertido{result.success_count !== 1 ? 's' : ''} a .txt
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            className="rounded-[8px] border p-3"
                                            style={{
                                                background: result.success_count > 0 ? fluent.warningBg : fluent.dangerBg,
                                                borderColor: result.success_count > 0 ? fluent.warningBorder : fluent.dangerBorder,
                                            }}
                                        >
                                            <div className="flex items-start gap-2" style={{ color: result.success_count > 0 ? fluent.warningText : fluent.dangerText }}>
                                                {result.success_count > 0 ? (
                                                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                                                ) : (
                                                    <XCircle className="h-4 w-4 mt-0.5" />
                                                )}
                                                <div>
                                                    <strong>
                                                        {result.success_count > 0 ? 'Conversión parcial' : 'Conversión fallida'}
                                                    </strong>
                                                    <br />
                                                    {result.success_count} exitoso{result.success_count !== 1 ? 's' : ''}, {result.errors.length} error{result.errors.length !== 1 ? 'es' : ''}
                                                </div>
                                            </div>
                                        </div>

                                        {result.errors.length > 0 && (
                                            <div className="text-xs max-h-32 overflow-y-auto rounded-[8px] border p-3" style={{ color: fluent.textMuted, background: fluent.layer, borderColor: fluent.border }}>
                                                <strong style={{ color: fluent.text }}>Errores:</strong>
                                                <ul className="list-disc list-inside mt-1 space-y-0.5">
                                                    {result.errors.slice(0, 5).map((error, idx) => (
                                                        <li key={idx} className="truncate">{error}</li>
                                                    ))}
                                                    {result.errors.length > 5 && (
                                                        <li>...y {result.errors.length - 5} más</li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter className="px-6 pb-6 pt-3" style={{ borderTop: `1px solid ${fluent.border}` }}>
                    {!converting && !result && (
                        <>
                            <AlertDialogCancel
                                onClick={handleSkip}
                                className="h-9 border text-sm"
                                style={{ background: 'transparent', borderColor: fluent.border, color: fluent.text }}
                            >
                                Omitir (continuar sin convertir)
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleConvert}
                                disabled={
                                    downloading ||
                                    !converterStatus ||
                                    (converterStatus.recommended === 'none' && preferredEngine === 'auto')
                                }
                                className="h-9 text-sm"
                                style={{ background: fluent.accent, color: '#fff' }}
                            >
                                Convertir archivos ahora
                            </AlertDialogAction>
                        </>
                    )}

                    {converting && (
                        <AlertDialogCancel disabled className="h-9 text-sm" style={{ borderColor: fluent.border, color: fluent.textMuted }}>
                            Procesando...
                        </AlertDialogCancel>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
