import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCode, Database, HardDrive, ShieldCheck, UserCircle } from "lucide-react";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import ImportReviewScreen from "./ImportReviewScreen";

export default function FirstRunWizard({ onFinish }: { onFinish: () => void }) {
    const { openWindow } = useWindowManager();
    const [step, setStep] = useState(0);
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [extracting, setExtracting] = useState(false);
    const [extractedFiles, setExtractedFiles] = useState<string[]>([]);
    // const [dbInspections, setDbInspections] = useState<any[]>([]); // Removed unused state
    const [progress, setProgress] = useState(0);
    const [dbTables, setDbTables] = useState<Record<string, string[]>>({});
    const [tableData, setTableData] = useState<Record<string, string[][]>>({});
    const [extractedDir, setExtractedDir] = useState<string | null>(null);
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const [existingUsers, setExistingUsers] = useState<any[]>([]);
    const [isFirstUser, setIsFirstUser] = useState(true);
    const [showReview, setShowReview] = useState(false); // New state for embedded review

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

    // Función para mostrar la revisión de importación embebida
    const handleOpenImportReview = () => {
        if (!extractedDir) return;
        setShowReview(true);
    };

    // Callback cuando termina la revisión (embedded)
    const handleReviewComplete = () => {
        toast.success("Datos importados correctamente");
        setTimeout(() => onFinish(), 1500);
    };

    const handleReviewCancel = () => {
        setShowReview(false);
    };

    // --- Lógica de Handlers ---
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
                    // setDbInspections(inspections);

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

            await listen("import:progress", (event: any) => {
                if (event.payload?.job_id === jobId) setProgress(event.payload.progress);
            });
        } catch (e) {
            setExtracting(false);
            toast.error('Error iniciando extracción');
        }
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-['Segoe_UI_Variable',_'Segoe_UI',_sans-serif]">
            {/* Windows 11 Installer Window Frame */}
            <div className="w-full max-w-[900px] h-[650px] flex flex-col bg-[#202020] text-[#ffffff] rounded-[8px] border border-[#333] shadow-[0_32px_64px_rgba(0,0,0,0.5),0_2px_21px_rgba(0,0,0,0.4)] overflow-hidden ring-1 ring-white/5">
                
                {/* 1. Header Fijo (Draggable area concept) */}
                <div className="flex-none px-10 pt-10 pb-6 select-none relative">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-semibold tracking-tight leading-tight">
                                {isFirstUser ? 'Configuración de Nuevo Galeno' : 'Gestión de Usuarios'}
                            </h1>
                            <p className="text-[#a0a0a0] text-base font-light">
                                {step === 0 && (isFirstUser ? "Bienvenido al asistente de instalación" : "Resumen del sistema")}
                                {step === 1 && (isFirstUser ? "Creación de cuenta administrativa" : "Agregar nuevo usuario")}
                                {step === 2 && "Importación de base de datos Paradox"}
                            </p>
                        </div>
                        {/* Windows Logo / App Icon Placeholder */}
                        <div className="h-12 w-12 bg-[#0078d4] rounded-[6px] flex items-center justify-center text-white shadow-xl">
                            <Database className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* 2. Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 py-2 custom-scrollbar relative">
                    {showReview && extractedDir ? (
                         <div className="absolute inset-0 bg-[#202020] z-20 px-6">
                            <ImportReviewScreen 
                                extractedDir={extractedDir}
                                onComplete={handleReviewComplete}
                                onCancel={handleReviewCancel}
                                embedded={true}
                            />
                         </div>
                    ) : (
                        <>
                    {step === 0 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                            {isFirstUser ? (
                                <div className="space-y-4">
                                   <div className="p-5 bg-[#272727] border border-[#333] rounded-[6px] flex gap-5 hover:bg-[#2c2c2c] transition-colors cursor-default group">
                                        <div className="p-3 bg-[#333] rounded-full group-hover:bg-[#3d3d3d] transition-colors">
                                            <ShieldCheck className="w-6 h-6 text-[#60cdff]" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-base mb-1">Comenzar la instalación</h3>
                                            <p className="text-sm text-[#bcbcbc] leading-relaxed">
                                                Este asistente le guiará a través de la configuración inicial de Nuevo Galeno. 
                                                Se creará una base de datos local y se configurará el usuario administrador principal.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-5 bg-[#272727] border border-[#333] rounded-[6px]">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center">
                                            <UserCircle className="w-6 h-6 text-[#60cdff]" />
                                        </div>
                                        <h3 className="font-semibold text-base">Usuarios del Sistema</h3>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                        {existingUsers.map((user: any) => (
                                            <div key={user.id} className="flex items-center gap-4 p-3 rounded-[4px] hover:bg-[#333] transition-colors group cursor-default">
                                                <div className="w-9 h-9 rounded-full bg-[#333] group-hover:bg-[#404040] flex items-center justify-center text-sm font-semibold border border-[#404040]">
                                                    {user.username.substring(0,2).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate text-white">{user.name}</div>
                                                    <div className="text-xs text-[#999] truncate mt-0.5">{user.role} &bull; @{user.username}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="text-xs text-[#808080] space-y-2 pt-8 border-t border-[#333]">
                                <p>Al continuar, usted acepta los términos de licencia del software médico.</p>
                                <p>Versión del instalador: 2.0.0 (Build 2026)</p>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 py-2 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[480px]">
                            <div className="space-y-2 group">
                                <label className="text-sm font-medium text-[#e0e0e0] group-focus-within:text-[#60cdff] transition-colors">Nombre completo</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej. Dr. Juan Pérez"
                                    className="h-[40px] bg-[#272727] border-[#404040] focus:border-[#60cdff] border-b-2 hover:bg-[#2f2f2f] focus:ring-0 rounded-[4px] text-base placeholder:text-[#666] transition-all"
                                />
                            </div>

                            <div className="space-y-2 group">
                                <label className="text-sm font-medium text-[#e0e0e0] group-focus-within:text-[#60cdff] transition-colors">Nombre de usuario</label>
                                <Input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="admin"
                                    className="h-[40px] bg-[#272727] border-[#404040] focus:border-[#60cdff] border-b-2 hover:bg-[#2f2f2f] focus:ring-0 rounded-[4px] text-base placeholder:text-[#666] transition-all"
                                />
                            </div>

                            <div className="space-y-2 group">
                                <label className="text-sm font-medium text-[#e0e0e0] group-focus-within:text-[#60cdff] transition-colors">Contraseña</label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="h-[40px] bg-[#272727] border-[#404040] focus:border-[#60cdff] border-b-2 hover:bg-[#2f2f2f] focus:ring-0 rounded-[4px] text-base placeholder:text-[#666] transition-all"
                                />
                                <div className="flex items-start gap-2 pt-2">
                                    <ShieldCheck className="w-3 h-3 text-[#60cdff] mt-0.5" />
                                    <p className="text-xs text-[#a0a0a0]">
                                        {isFirstUser 
                                            ? "Esta será la cuenta administrativa principal. Guárdela en un lugar seguro."
                                            : "El usuario deberá cambiar su contraseña al primer inicio de sesión."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* File Selection Box */}
                            <div 
                                onClick={handleSelectGln}
                                className="p-6 bg-[#272727] border border-[#333] hover:border-[#555] hover:bg-[#2f2f2f] rounded-[6px] flex items-center justify-between cursor-pointer transition-all group"
                            >
                                <div className="flex items-center gap-5 overflow-hidden">
                                    <div className="p-3 bg-[#333] rounded-full group-hover:bg-[#3d3d3d] transition-colors">
                                        <HardDrive className="w-6 h-6 text-[#a0a0a0] group-hover:text-[#60cdff] transition-colors" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-base font-medium truncate text-[#f0f0f0]">
                                            {selectedFile || "Seleccionar archivo de respaldo (.gln)"}
                                        </p>
                                        <p className="text-sm text-[#808080] mt-0.5">
                                            {selectedFile ? "Archivo cargado y listo" : "Haga clic para examinar su equipo"}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-[#383838] px-4 py-2 rounded-[4px] text-xs font-medium text-[#d0d0d0] group-hover:bg-[#454545] transition-colors">
                                    Examinar
                                </div>
                            </div>

                            {/* Processing Status */}
                            {selectedFile && !extractedFiles.length && (
                                <div className="space-y-4">
                                    {extracting ? (
                                        <>
                                            <div className="flex justify-between text-xs text-[#d0d0d0] font-medium tracking-wide uppercase">
                                                <span>Procesando...</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="h-1 w-full bg-[#333] rounded-full overflow-hidden">
                                                <div className="h-full bg-[#60cdff] transition-all duration-300" style={{ width: `${progress}%` }} />
                                            </div>
                                            
                                            {/* Terminal Output */}
                                            <div className="bg-[#1e1e1e] rounded-[6px] border border-[#333] h-56 overflow-hidden font-mono text-xs p-4 shadow-inner">
                                                <ScrollArea className="h-full">
                                                    {terminalLogs.length === 0 ? (
                                                        <span className="text-[#666]">Iniciando motor de migración Paradox...</span>
                                                    ) : (
                                                        terminalLogs.map((log, i) => (
                                                            <div key={i} className="text-[#cccccc] py-0.5 border-l-2 border-transparent hover:border-[#60cdff] hover:bg-[#252525] pl-2 font-['Consolas']">
                                                                <span className="text-[#60cdff] mr-2">➜</span>
                                                                {log}
                                                            </div>
                                                        ))
                                                    )}
                                                </ScrollArea>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex justify-end pt-2">
                                            <Button 
                                                onClick={handleImport}
                                                className="bg-[#0078d4] hover:bg-[#006cc1] text-white px-8 py-6 text-base font-semibold rounded-[4px] shadow-lg shadow-blue-900/20 w-auto"
                                            >
                                                Iniciar Importación de Datos
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Results Grid */}
                            {extractedFiles.length > 0 && (
                                <div className="bg-[#272727] border border-[#333] rounded-[6px] overflow-hidden">
                                    <div className="px-4 py-3 border-b border-[#333] flex justify-between items-center bg-[#2c2c2c]">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#a0a0a0]">Tablas Importadas</h3>
                                        <span className="text-xs bg-[#0078d4] text-white px-2 py-0.5 rounded-full font-medium">{Object.keys(dbTables).length} Archivos</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-[1px] bg-[#333] max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {Object.entries(dbTables).map(([path, _]) => (
                                            <div key={path} className="flex items-center justify-between p-3 bg-[#252525] hover:bg-[#2f2f2f] group">
                                                <div className="flex items-center gap-3">
                                                    <FileCode className="w-4 h-4 text-[#60cdff]" />
                                                    <span className="text-sm text-[#e0e0e0] font-mono">{path.split(/[\\/]/).pop()}</span>
                                                </div>
                                                <div className="text-xs text-[#666] group-hover:text-[#a0a0a0] font-mono">
                                                    {tableData[path]?.length || Object.keys(tableData[path] || {}).length || 0} reg
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                        </>
                    )}
                </div>

                {/* 3. Footer Fijo */}
                {!showReview && (
                    <div className="flex-none px-10 py-8 bg-[#202020] border-t border-[#333] flex justify-between items-center">
                        {step > 0 ? (
                            <Button
                                variant="ghost"
                                onClick={back}
                                className="text-[#d0d0d0] hover:bg-[#2b2b2b] hover:text-white h-[36px] px-6 rounded-[4px] text-sm"
                            >
                                Atrás
                            </Button>
                        ) : (
                            <div /> 
                        )}

                        <div className="flex gap-4">
                            {!isFirstUser && (
                            <Button
                                    variant="secondary"
                                    onClick={onFinish}
                                    className="bg-[#333] hover:bg-[#3d3d3d] text-white border border-white/5 h-[36px] px-6 rounded-[4px] text-sm"
                                >
                                    {step === 2 && extractedFiles.length === 0 ? "Omitir" : "Cancelar"}
                                </Button>
                            )}
                            
                            {(step < 2) && (
                                <Button
                                    onClick={step === 1 ? handleCreateAdmin : next}
                                    disabled={step === 1 && (!username || !password || !name)}
                                    className="bg-[#0078d4] hover:bg-[#006cc1] text-white shadow-md h-[36px] px-8 rounded-[4px] font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                                >
                                    {step === 1 ? (isFirstUser ? "Crear y Continuar" : "Crear Usuario") : "Siguiente"}
                                </Button>
                            )}

                            {step === 2 && extractedFiles.length > 0 && (
                                <>
                                    <Button
                                        onClick={handleOpenImportReview}
                                        variant="secondary"
                                        className="bg-[#2b2b2b] hover:bg-[#333] text-white border border-[#444] h-[36px] px-4 rounded-[4px] text-sm"
                                    >
                                        Revisar Detalles
                                    </Button>
                                    <Button
                                        onClick={onFinish}
                                        className="bg-[#107c10] hover:bg-[#0f700f] text-white shadow-md h-[36px] px-8 rounded-[4px] font-medium text-sm"
                                    >
                                        Finalizar
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
