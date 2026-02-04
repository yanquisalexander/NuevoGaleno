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
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
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

    // Detectar archivos .doc al montar
    useEffect(() => {
        detectDocFiles();
    }, [sourcePath]);

    const detectDocFiles = async () => {
        try {
            const response = await invoke<{
                found: boolean;
                info: DocFilesInfo;
                files: string[];
            }>('detect_doc_files_in_import', { sourcePath });

            if (response.found) {
                setDocInfo(response.info);
                setDocFiles(response.files);
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
            <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        Archivos Word (.doc) Detectados
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                        {!converting && !result && (
                            <>
                                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-md border border-amber-200 dark:border-amber-800">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-amber-900 dark:text-amber-100">
                                        <p className="font-semibold mb-1">
                                            Se encontraron {docInfo.count} archivo{docInfo.count !== 1 ? 's' : ''} .doc de Word
                                        </p>
                                        <p className="text-amber-800 dark:text-amber-200">
                                            Los archivos .doc binarios (formato antiguo de Word) no se pueden leer directamente.
                                            Se recomienda convertirlos a texto plano (.txt) antes de importar.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-sm text-muted-foreground">
                                        <strong>Total:</strong> {docInfo.count} archivo{docInfo.count !== 1 ? 's' : ''} ({docInfo.total_size_mb.toFixed(2)} MB)
                                    </div>

                                    {docInfo.sample_files.length > 0 && (
                                        <div className="text-sm">
                                            <strong className="text-muted-foreground">Ejemplos:</strong>
                                            <ul className="list-disc list-inside mt-1 space-y-0.5 text-muted-foreground">
                                                {docInfo.sample_files.map((file, idx) => (
                                                    <li key={idx} className="truncate">{file}</li>
                                                ))}
                                                {docInfo.count > 5 && (
                                                    <li className="text-muted-foreground/60">
                                                        ...y {docInfo.count - 5} más
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                        <strong>Importante:</strong> Esta operación abrirá Microsoft Word en segundo plano
                                        mediante PowerShell para realizar la conversión. El proceso puede tardar varios minutos
                                        dependiendo de la cantidad de archivos.
                                    </AlertDescription>
                                </Alert>
                            </>
                        )}

                        {converting && (
                            <div className="space-y-4 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                    <span className="text-sm font-medium">{progressMessage}</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                                <p className="text-xs text-muted-foreground text-center">
                                    Por favor espere, Word está procesando los archivos...
                                </p>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-3 py-4">
                                {result.errors.length === 0 ? (
                                    <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-green-900 dark:text-green-100">
                                            <strong>✓ Conversión exitosa</strong>
                                            <br />
                                            {result.success_count} de {result.total} archivo{result.total !== 1 ? 's' : ''} convertido{result.success_count !== 1 ? 's' : ''} a .txt
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <>
                                        <Alert className={result.success_count > 0 ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}>
                                            {result.success_count > 0 ? (
                                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            )}
                                            <AlertDescription>
                                                <strong>
                                                    {result.success_count > 0 ? 'Conversión parcial' : 'Conversión fallida'}
                                                </strong>
                                                <br />
                                                {result.success_count} exitoso{result.success_count !== 1 ? 's' : ''}, {result.errors.length} error{result.errors.length !== 1 ? 'es' : ''}
                                            </AlertDescription>
                                        </Alert>

                                        {result.errors.length > 0 && (
                                            <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto">
                                                <strong>Errores:</strong>
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

                <AlertDialogFooter>
                    {!converting && !result && (
                        <>
                            <AlertDialogCancel onClick={handleSkip}>
                                Omitir (continuar sin convertir)
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleConvert}>
                                Convertir archivos ahora
                            </AlertDialogAction>
                        </>
                    )}

                    {converting && (
                        <AlertDialogCancel disabled>
                            Procesando...
                        </AlertDialogCancel>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
