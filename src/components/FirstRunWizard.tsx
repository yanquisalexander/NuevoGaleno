import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronRight, FileCode, Database, HardDrive, ShieldCheck } from "lucide-react";
import ImportReviewScreen from "./ImportReviewScreen";

// Estilo base para el efecto Glass
const glassStyle = "bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] rounded-2xl";

export default function FirstRunWizard({ onFinish }: { onFinish: () => void }) {
    const [step, setStep] = useState(0);
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [extracting, setExtracting] = useState(false);
    const [extractedFiles, setExtractedFiles] = useState<string[]>([]);
    const [dbInspections, setDbInspections] = useState<any[]>([]);
    const [progress, setProgress] = useState(0);
    const [dbTables, setDbTables] = useState<Record<string, string[]>>({});
    const [tableData, setTableData] = useState<Record<string, string[][]>>({});
    const [showImportReview, setShowImportReview] = useState(false);
    const [extractedDir, setExtractedDir] = useState<string | null>(null);

    const next = () => setStep((s) => s + 1);
    const back = () => setStep((s) => Math.max(0, s - 1));

    // --- Lógica de Handlers (Se mantiene igual a tu código original) ---
    async function handleCreateAdmin() {
        await invoke("init_app_db");
        const pwBuffer = new TextEncoder().encode(password || "");
        const hashBuf = await crypto.subtle.digest("SHA-256", pwBuffer);
        const hashHex = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
        await invoke("set_config", { key: "admin_user", value: JSON.stringify({ name, username, password_hash: hashHex }) });
        await invoke("set_config", { key: "first_run_completed", value: "true" });
        next();
    }

    async function handleSelectGln() {
        try {
            const res: any = await invoke('select_gln');
            if (res) setSelectedFile(res as string);
        } catch (e) { console.error(e); }
    }

    async function handleImport() {
        if (!selectedFile) { toast.error('Selecciona un archivo .gln'); return; }
        setExtracting(true);
        try {
            const jobId: any = await invoke("extract_gln", { glnPath: selectedFile });
            const unlistenFinished = await listen("import:finished", async (event) => {
                const payload: any = event.payload;
                if (payload?.job_id !== jobId) return;
                setExtracting(false);
                if (payload.extracted_to) {
                    setExtractedDir(payload.extracted_to); // Guardar directorio para ImportReviewScreen
                    const list: any = await invoke("list_extracted_files", { dir: payload.extracted_to });
                    setExtractedFiles([...(list.db_files || []), ...(list.documents || [])]);

                    const inspections = [];
                    for (const db of list.db_files || []) {
                        const info: any = await invoke("inspect_paradox_db", { path: db });
                        inspections.push(info);
                    }
                    setDbInspections(inspections);

                    const tables: Record<string, string[]> = {};
                    const data: Record<string, string[][]> = {};
                    for (const db of list.db_files || []) {
                        const tbls: any = await invoke("list_tables", { path: db });
                        tables[db] = tbls;
                        try {
                            // Try new pxlib bindings first
                            const records: any = await invoke("read_table_data_pxlib", { path: db, limit: 5 });
                            data[db] = records;
                        } catch (e) {
                            // Fallback to bundled reader if bindings not available or error
                            try {
                                const records2: any = await invoke("read_table_data", { path: db, limit: 5 });
                                data[db] = records2;
                            } catch (e2) {
                                data[db] = [];
                            }
                        }
                    }
                    setDbTables(tables);
                    setTableData(data);
                    toast.success("Importación completada");
                }
                unlistenFinished();
            });

            const _unlistenProgress = await listen("import:progress", (event: any) => {
                if (event.payload?.job_id === jobId) setProgress(event.payload.progress);
            });
        } catch (e) {
            setExtracting(false);
            toast.error('Error iniciando extracción');
        }
    }

    return (
        <div className="min-h-dvh p-8 flex items-center justify-center font-sans">
            <div className="max-w-4xl w-full flex flex-col gap-6">

                {/* Header con Indicador de Pasos */}
                <div className="flex justify-between items-end px-2">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
                            Nuevo Galeno
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">Asistente de configuración inicial</p>
                    </div>
                    <div className="flex gap-3">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className={`h-2 w-12 rounded-full transition-all duration-500 ${step === i ? "bg-blue-500 w-16" : "bg-slate-200 dark:bg-slate-800"
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Contenedor Principal (Liquid Glass) */}
                <div className={`${glassStyle} overflow-hidden min-h-[450px] flex flex-col`}>

                    {step === 0 && (
                        <div className="p-10 flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center border border-blue-500/20">
                                <Database className="w-10 h-10 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-semibold">Bienvenido</h2>
                            <p className="text-slate-600 dark:text-slate-400 max-w-md">
                                Esta aplicación reemplaza el software antiguo y permite la migración de datos históricos desde contenedores <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">.gln</span>.
                            </p>
                            <Button onClick={next} size="lg" className="rounded-xl px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                                Comenzar <ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="p-8 flex flex-col gap-6 animate-in slide-in-from-right duration-500">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="text-blue-500" />
                                <h2 className="text-xl font-semibold">Seguridad de Acceso</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium uppercase text-slate-500 ml-1">Nombre Completo</label>
                                    <Input className="bg-white/50 border-white/30 rounded-xl h-12" placeholder="Ej. Dr. Juan Pérez" value={name} onChange={(e) => setName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium uppercase text-slate-500 ml-1">Usuario</label>
                                    <Input className="bg-white/50 border-white/30 rounded-xl h-12" placeholder="admin" value={username} onChange={(e) => setUsername(e.target.value)} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-medium uppercase text-slate-500 ml-1">Contraseña Maestra</label>
                                    <Input className="bg-white/50 border-white/30 rounded-xl h-12" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-between mt-4">
                                <Button variant="ghost" onClick={back}>Atrás</Button>
                                <Button onClick={handleCreateAdmin} disabled={!username || !password} className="rounded-xl px-8 shadow-xl">
                                    Establecer Credenciales
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="p-6 flex flex-col gap-4 animate-in slide-in-from-right duration-500 flex-1">
                            <div className="flex justify-between items-center bg-white/30 p-4 rounded-2xl border border-white/20">
                                <div className="flex items-center gap-3">
                                    <HardDrive className="text-slate-600" />
                                    <div>
                                        <p className="text-sm font-medium">Fuente de Datos Paradox</p>
                                        <p className="text-xs text-slate-500">{selectedFile ? selectedFile.split(/[\\/]/).pop() : 'Ningún archivo seleccionado'}</p>
                                    </div>
                                </div>
                                <Button variant="outline" onClick={handleSelectGln} className="rounded-xl border-blue-200 hover:bg-blue-50">
                                    Buscar .gln
                                </Button>
                            </div>

                            {selectedFile && !extractedFiles.length && (
                                <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-2xl flex flex-col items-center gap-4">
                                    {extracting ? (
                                        <div className="w-full space-y-3">
                                            <div className="flex justify-between text-xs font-medium">
                                                <span className="animate-pulse">PROCESANDO ARCHIVOS...</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <Progress value={progress} className="h-2" />
                                        </div>
                                    ) : (
                                        <Button onClick={handleImport} className="w-full py-6 rounded-xl text-lg shadow-blue-500/10">
                                            Iniciar Importación
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Resultados con ScrollArea para no romper el Glass Container */}
                            <div className="flex-1 rounded-xl scroll-auto">
                                <div className="space-y-4 pr-4">
                                    {extractedFiles.length > 0 && (
                                        <div className="grid grid-cols-1 gap-3">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Entidades Detectadas</h3>
                                            {Object.entries(dbTables).map(([path, _tables]) => (
                                                <div key={path} className="bg-white/20 border border-white/30 rounded-xl p-4 shadow-sm">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <FileCode className="w-4 h-4 text-blue-500" />
                                                        <span className="text-sm font-bold truncate">{path.split(/[\\/]/).pop()}</span>
                                                    </div>
                                                    {/* Mini Tabla de Muestra */}
                                                    <div className="overflow-x-auto rounded-lg border border-slate-200/50">
                                                        <table className="w-full text-[11px] text-left">
                                                            <thead className="bg-slate-100">
                                                                <tr>
                                                                    {(() => {
                                                                        const raw: any = tableData[path];
                                                                        if (raw && raw.fields && Array.isArray(raw.fields)) {
                                                                            return raw.fields.map((field: any, index: number) => (
                                                                                <th key={index} className="px-2 py-1.5 text-slate-700 font-medium">
                                                                                    {field.name}
                                                                                </th>
                                                                            ));
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {(() => {
                                                                    const raw: any = tableData[path];
                                                                    if (!raw) return null;

                                                                    // If already an array of arrays
                                                                    if (Array.isArray(raw)) {
                                                                        return raw.map((row: any[], i: number) => (
                                                                            <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                                                                {row.map((cell, ci) => (
                                                                                    <td key={ci} className="px-2 py-1.5 whitespace-nowrap text-slate-600">{cell ?? '-'}</td>
                                                                                ))}
                                                                            </tr>
                                                                        ));
                                                                    }

                                                                    // If response is an object with { fields: [...], rows: [...] }
                                                                    if (raw.rows && Array.isArray(raw.rows)) {
                                                                        const fields = Array.isArray(raw.fields) ? raw.fields.map((f: any) => f.name) : Object.keys(raw.rows[0] || {});
                                                                        return raw.rows.map((rowObj: any, i: number) => (
                                                                            <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                                                                {fields.map((fname: string, ci: number) => (
                                                                                    <td key={ci} className="px-2 py-1.5 whitespace-nowrap text-slate-600">{(rowObj?.[fname] ?? '-')?.toString?.() ?? '-'}</td>
                                                                                ))}
                                                                            </tr>
                                                                        ));
                                                                    }

                                                                    // Fallback: try to render as-is
                                                                    if (typeof raw === 'object') {
                                                                        return Object.values(raw).map((r: any, i: number) => (
                                                                            <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                                                                <td className="px-2 py-1.5 whitespace-nowrap text-slate-600">{JSON.stringify(r)}</td>
                                                                            </tr>
                                                                        ));
                                                                    }

                                                                    return null;
                                                                })()}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/20">
                                <Button variant="ghost" onClick={back}>Atrás</Button>
                                <div className="flex gap-2">
                                    {!extractedFiles.length && (
                                        <Button variant="ghost" className="text-slate-400" onClick={() => { onFinish(); }}>Omitir</Button>
                                    )}
                                    {extractedFiles.length > 0 && extractedDir && (
                                        <Button 
                                            onClick={() => setShowImportReview(true)} 
                                            className="rounded-xl px-8 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                                        >
                                            Revisar e Importar Datos
                                        </Button>
                                    )}
                                    <Button 
                                        onClick={onFinish} 
                                        variant={extractedFiles.length > 0 ? "outline" : "default"}
                                        className={extractedFiles.length > 0 
                                            ? "rounded-xl px-6" 
                                            : "rounded-xl px-10 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                                        }
                                    >
                                        {extractedFiles.length > 0 ? "Omitir Importación" : "Finalizar Configuración"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Pantalla de Revisión e Importación */}
            {showImportReview && extractedDir && (
                <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950">
                    <ImportReviewScreen
                        extractedDir={extractedDir}
                        onComplete={() => {
                            setShowImportReview(false);
                            toast.success("Datos importados correctamente");
                            setTimeout(() => onFinish(), 1500);
                        }}
                        onCancel={() => setShowImportReview(false)}
                    />
                </div>
            )}
        </div>
    );
}