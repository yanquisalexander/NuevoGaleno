import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronRight, FileCode, Database, HardDrive, ShieldCheck, UserCircle } from "lucide-react";
import { useWindowManager } from "@/contexts/WindowManagerContext";

export default function FirstRunWizard({ onFinish }: { onFinish: () => void }) {
    const { openWindow, closeWindow } = useWindowManager();
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
    const [extractedDir, setExtractedDir] = useState<string | null>(null);
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const [existingUsers, setExistingUsers] = useState<any[]>([]);
    const [isFirstUser, setIsFirstUser] = useState(true);

    const next = () => setStep((s) => s + 1);
    const back = () => setStep((s) => Math.max(0, s - 1));

    // Verificar si ya existen usuarios en el sistema
    useState(() => {
        const checkExistingUsers = async () => {
            try {
                const users: any[] = await invoke('list_users');
                setExistingUsers(users);
                setIsFirstUser(users.length === 0);
            } catch (err) {
                console.error('Error verificando usuarios:', err);
                setIsFirstUser(true);
            }
        };
        checkExistingUsers();
    });

    // Función para abrir la ventana de revisión de importación
    const handleOpenImportReview = () => {
        if (!extractedDir) return;

        openWindow('import-review', {
            extractedDir,
            onComplete: () => {
                toast.success("Datos importados correctamente");
                setTimeout(() => onFinish(), 1500);
            },
            onCancel: () => {
                // La ventana se cerrará automáticamente
            }
        });
    };

    // --- Lógica de Handlers (Se mantiene igual a tu código original) ---
    async function handleCreateAdmin() {
        try {
            await invoke("init_app_db");
            const pwBuffer = new TextEncoder().encode(password || "");
            const hashBuf = await crypto.subtle.digest("SHA-256", pwBuffer);
            const hashHex = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

            // Crear el usuario
            await invoke("create_user", {
                username,
                passwordHash: hashHex,
                name,
                role: "admin"
            });

            // Solo establecer la contraseña del sistema si es el primer usuario
            if (isFirstUser) {
                await invoke("set_system_password", { passwordHash: hashHex });
                await invoke("set_config", { key: "first_run_completed", value: "true" });
            }

            toast.success(`Usuario ${username} creado correctamente`);

            // Si no es el primer usuario, ir directo al paso de importación o finalizar
            if (!isFirstUser) {
                next();
            } else {
                next();
            }
        } catch (err: any) {
            toast.error(err.toString());
            console.error('Error creando usuario:', err);
        }
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
        setTerminalLogs([]);
        try {
            const jobId: any = await invoke("extract_gln", { glnPath: selectedFile });

            // Listener para logs del backend
            const unlistenLogs = await listen("log://log", (event: any) => {
                const logMsg = event.payload?.message || JSON.stringify(event.payload);
                setTerminalLogs(prev => [...prev, logMsg].slice(-50)); // Mantener últimas 50 líneas
            });
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
                if (typeof unlistenLogs === 'function') unlistenLogs();
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
        <div className="relative min-h-full flex items-center justify-center font-sans overflow-hidden bg-[#fef7ff]">
            {/* Material Design 3 Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#6750a4]/5 via-transparent to-[#7d5260]/5" />

            <div className="max-w-4xl w-full mx-8 relative z-10">
                {/* Material Design 3 Card */}
                <div className="bg-white rounded-[28px] shadow-[0_1px_2px_0_rgba(0,0,0,0.3),0_2px_6px_2px_rgba(0,0,0,0.15)] overflow-hidden">

                    {/* Header */}
                    <div className="px-8 py-6 border-b border-[#79747e]/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-[28px] font-normal text-[#1d1b20] mb-1">
                                    {isFirstUser ? 'Configuración Inicial' : 'Crear Nuevo Usuario'}
                                </h1>
                                <p className="text-sm text-[#49454f]">
                                    {isFirstUser
                                        ? 'Configura tu sistema médico en 2 pasos simples'
                                        : `${existingUsers.length} usuario${existingUsers.length !== 1 ? 's' : ''} existente${existingUsers.length !== 1 ? 's' : ''} en el sistema`
                                    }
                                </p>
                            </div>

                            {/* Stepper */}
                            <div className="flex gap-3">
                                {[0, 1].map((i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${step === i
                                            ? 'bg-[#6750a4] text-white'
                                            : step > i
                                                ? 'bg-[#e8def8] text-[#6750a4]'
                                                : 'bg-[#e7e0ec] text-[#49454f]'
                                            }`}>
                                            {step > i ? <Check className="w-5 h-5" /> : <span className="text-sm font-medium">{i + 1}</span>}
                                        </div>
                                        {i < 1 && <div className={`w-12 h-0.5 ${step > i ? 'bg-[#6750a4]' : 'bg-[#e7e0ec]'}`} />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        {step === 0 && (
                            <div className="space-y-6">
                                {/* Info Card */}
                                {isFirstUser && (
                                    <div className="bg-[#e8def8] rounded-2xl p-6 flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[#6750a4] flex items-center justify-center flex-shrink-0">
                                            <Database className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-[#1d1b20] mb-1">Bienvenido a Nuevo Galeno</h3>
                                            <p className="text-sm text-[#49454f] leading-relaxed">
                                                Sistema médico integrado para gestión de pacientes, historias clínicas y migración de datos Paradox.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Existing Users List (if not first user) */}
                                {!isFirstUser && existingUsers.length > 0 && (
                                    <div className="bg-[#e8def8] rounded-2xl p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-[#6750a4] flex items-center justify-center">
                                                <UserCircle className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-[#1d1b20]">Sistema Configurado</h3>
                                                <p className="text-sm text-[#49454f]">{existingUsers.length} usuario{existingUsers.length !== 1 ? 's' : ''} registrado{existingUsers.length !== 1 ? 's' : ''}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mb-4">
                                            {existingUsers.map((user: any) => (
                                                <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/50 border border-[#79747e]/10">
                                                    <div className="w-8 h-8 rounded-full bg-[#6750a4]/10 flex items-center justify-center">
                                                        <UserCircle className="w-4 h-4 text-[#6750a4]" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-[#1d1b20] text-sm">{user.name}</div>
                                                        <div className="text-xs text-[#49454f]">@{user.username} · {user.role}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-[#49454f] leading-relaxed">
                                            Puedes crear un nuevo usuario o continuar directamente al sistema.
                                        </p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-between gap-3 pt-4">
                                    <div>
                                        {!isFirstUser && (
                                            <Button
                                                variant="outline"
                                                onClick={onFinish}
                                                className="rounded-full px-6 border-[#79747e]/40 text-[#49454f] hover:bg-[#e7e0ec]/50"
                                            >
                                                Continuar al Sistema
                                            </Button>
                                        )}
                                    </div>
                                    <Button
                                        onClick={next}
                                        className="rounded-full px-6 bg-[#6750a4] hover:bg-[#7f67be] text-white shadow-md"
                                    >
                                        {isFirstUser ? 'Comenzar Configuración' : 'Crear Nuevo Usuario'}
                                        <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-6">
                                {/* Section Header */}
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-[#e8def8] flex items-center justify-center flex-shrink-0">
                                        <ShieldCheck className="w-6 h-6 text-[#6750a4]" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-medium text-[#1d1b20] mb-1">
                                            {isFirstUser ? 'Usuario Administrador' : 'Nuevo Usuario'}
                                        </h2>
                                        <p className="text-sm text-[#49454f]">
                                            {isFirstUser
                                                ? 'Este usuario tendrá acceso completo al sistema y su contraseña se usará para funciones administrativas críticas.'
                                                : 'Crea un nuevo usuario con permisos de administrador.'
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#49454f] mb-2">
                                            Nombre completo
                                        </label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Ej. Dr. Juan Pérez"
                                            className="h-14 rounded-xl border-[#79747e]/40 focus:border-[#6750a4] focus:ring-1 focus:ring-[#6750a4] text-base"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#49454f] mb-2">
                                            Nombre de usuario
                                        </label>
                                        <Input
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="usuario.admin"
                                            className="h-14 rounded-xl border-[#79747e]/40 focus:border-[#6750a4] focus:ring-1 focus:ring-[#6750a4] text-base"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#49454f] mb-2">
                                            Contraseña
                                        </label>
                                        <Input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="h-14 rounded-xl border-[#79747e]/40 focus:border-[#6750a4] focus:ring-1 focus:ring-[#6750a4] text-base"
                                        />
                                        {isFirstUser && (
                                            <p className="text-xs text-[#49454f] mt-2">
                                                Esta contraseña también se usará como contraseña del sistema para operaciones críticas.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-between pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={back}
                                        className="rounded-full px-6 border-[#79747e]/40 text-[#6750a4]"
                                    >
                                        Atrás
                                    </Button>
                                    <div className="flex gap-3">
                                        {!isFirstUser && (
                                            <Button
                                                variant="outline"
                                                onClick={next}
                                                className="rounded-full px-6 border-[#79747e]/40 text-[#49454f] hover:bg-[#e7e0ec]/50"
                                            >
                                                Omitir y Continuar
                                            </Button>
                                        )}
                                        <Button
                                            onClick={handleCreateAdmin}
                                            disabled={!username || !password || !name}
                                            className="rounded-full px-6 bg-[#6750a4] hover:bg-[#7f67be] text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isFirstUser ? 'Continuar' : 'Crear Usuario'}
                                            <ChevronRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="p-8 flex flex-col gap-5 animate-in slide-in-from-right duration-500 flex-1">
                                <div className="flex items-start justify-between bg-gradient-to-r from-white/80 via-white/70 to-blue-50/60 dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-800/60 p-5 rounded-3xl border border-white/70 dark:border-white/10 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
                                            <HardDrive className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase font-semibold text-blue-600 tracking-[0.14em]">Paso 2</p>
                                            <p className="text-lg font-semibold text-slate-900 dark:text-white">Fuente de Datos Paradox</p>
                                            <p className="text-sm text-slate-500">Selecciona tu contenedor .gln para extraer y validar las tablas.</p>
                                            <p className="text-xs text-slate-500 mt-1">{selectedFile ? selectedFile.split(/[\\/]/).pop() : 'Ningún archivo seleccionado'}</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" onClick={handleSelectGln} className="rounded-2xl border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-slate-800">
                                        Buscar .gln
                                    </Button>
                                </div>

                                {selectedFile && !extractedFiles.length && (
                                    <div className="bg-blue-500/5 border border-blue-500/15 p-6 rounded-3xl flex flex-col items-center gap-4">
                                        {extracting ? (
                                            <div className="w-full space-y-3">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="animate-pulse tracking-[0.18em] text-blue-700">PROCESANDO...</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <Progress value={progress} className="h-2" />

                                                {/* Terminal Console */}
                                                <div className="mt-4 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                                                    <div className="bg-slate-900/50 px-3 py-2 border-b border-slate-800 flex items-center gap-2">
                                                        <div className="flex gap-1.5">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                                                        </div>
                                                        <span className="text-xs text-slate-400 font-mono">Extracción en progreso</span>
                                                    </div>
                                                    <ScrollArea className="h-48">
                                                        <div className="p-3 font-mono text-xs space-y-1">
                                                            {terminalLogs.length === 0 ? (
                                                                <div className="text-slate-500">Esperando logs...</div>
                                                            ) : (
                                                                terminalLogs.map((log, i) => (
                                                                    <div key={i} className="text-green-400">
                                                                        <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                                                        {log}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </ScrollArea>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button onClick={handleImport} className="w-full py-6 rounded-2xl text-lg shadow-blue-500/10 bg-gradient-to-r from-blue-600 to-sky-500">
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
                                                onClick={handleOpenImportReview}
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
            </div>
        </div>
    );
}