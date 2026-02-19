import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from 'sonner';
import { FileCode, Database, HardDrive, ShieldCheck, UserCircle, ChevronRight, ChevronLeft, Check } from "lucide-react";
import ImportReviewScreen from "./ImportReviewScreen";
import { useLicense } from "@/hooks/useLicense";
import { useConfig } from "@/hooks/useConfig";

// ─── Fluent UI v9 Design Tokens ─────────────────────────────────────────────
const fluent = {
    // Neutrals
    bg: "#202020",           // canvas / mica base
    bgLayer1: "rgba(255,255,255,0.04)",  // elevated surface
    bgLayer2: "rgba(255,255,255,0.07)",  // card
    bgLayer3: "rgba(255,255,255,0.10)",  // hover
    border: "rgba(255,255,255,0.08)",
    borderFocus: "#60cdff",
    // Text
    textPrimary: "rgba(255,255,255,0.955)",
    textSecondary: "rgba(255,255,255,0.60)",
    textDisabled: "rgba(255,255,255,0.36)",
    // Accent
    accentBase: "#60cdff",
    accentBg: "rgba(96,205,255,0.15)",
    accentHover: "#4ec9fb",
    // Semantic fill
    fillSubtle: "rgba(255,255,255,0.06)",
    fillControl: "rgba(255,255,255,0.06)",
    fillControlHover: "rgba(255,255,255,0.09)",
    fillAccent: "#0078d4",
    fillAccentHover: "#006cc1",
    fillAccentDown: "#005ba1",
    fillSuccess: "#107c10",
    fillSuccessHover: "#0f700f",
    // Stroke
    strokeCard: "rgba(255,255,255,0.083)",
    strokeFocus: "rgba(255,255,255,0.54)",
    // Shadow
    shadowCard: "0 2px 4px rgba(0,0,0,0.26), 0 0 2px rgba(0,0,0,0.16)",
    shadowFlyout: "0 8px 16px rgba(0,0,0,0.36)",
    // Radius
    radiusMedium: "4px",
    radiusLarge: "8px",
    radiusCircle: "50%",
    // Type ramp
    caption: "12px",
    body: "14px",
    bodyStrong: "14px",
    subtitle: "20px",
    title: "28px",
    titleLarge: "40px",
    display: "68px",
};

// ─── Utility: inline style helpers ──────────────────────────────────────────
const card: React.CSSProperties = {
    background: fluent.bgLayer2,
    border: `1px solid ${fluent.strokeCard}`,
    borderRadius: fluent.radiusLarge,
    boxShadow: fluent.shadowCard,
};

const controlInput: React.CSSProperties = {
    height: 32,
    background: fluent.fillControl,
    border: `1px solid ${fluent.strokeCard}`,
    borderRadius: fluent.radiusMedium,
    color: fluent.textPrimary,
    fontSize: fluent.body,
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', sans-serif",
    padding: "0 11px",
    outline: "none",
    transition: "border-color 0.1s",
    width: "100%",
    boxSizing: "border-box" as const,
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ total, current }: { total: number; current: number }) {
    return (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        width: i === current ? 20 : 6,
                        height: 6,
                        borderRadius: 3,
                        background: i === current
                            ? fluent.accentBase
                            : i < current
                                ? "rgba(96,205,255,0.45)"
                                : "rgba(255,255,255,0.18)",
                        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                    }}
                />
            ))}
        </div>
    );
}

function FluentButton({
    children,
    onClick,
    disabled,
    variant = "primary",
    style,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "primary" | "secondary" | "subtle" | "success";
    style?: React.CSSProperties;
}) {
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);

    const base: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 32,
        padding: "0 12px",
        borderRadius: fluent.radiusMedium,
        fontSize: fluent.body,
        fontFamily: "'Segoe UI Variable Text', 'Segoe UI', sans-serif",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.1s, transform 0.1s",
        border: "1px solid transparent",
        userSelect: "none",
        opacity: disabled ? 0.37 : 1,
        transform: pressed && !disabled ? "scale(0.99)" : "scale(1)",
        ...style,
    };

    const variants: Record<string, React.CSSProperties> = {
        primary: {
            background: pressed ? fluent.fillAccentDown : hovered ? fluent.fillAccentHover : fluent.fillAccent,
            color: "#fff",
            borderColor: "rgba(255,255,255,0.09)",
            boxShadow: hovered && !pressed ? "0 0 0 1px rgba(96,205,255,0.25)" : "none",
        },
        secondary: {
            background: pressed ? "rgba(255,255,255,0.06)" : hovered ? fluent.bgLayer3 : fluent.bgLayer2,
            color: fluent.textPrimary,
            borderColor: fluent.strokeCard,
        },
        subtle: {
            background: hovered ? fluent.fillControlHover : "transparent",
            color: fluent.textSecondary,
            borderColor: "transparent",
        },
        success: {
            background: pressed ? "#0a620a" : hovered ? fluent.fillSuccessHover : fluent.fillSuccess,
            color: "#fff",
            borderColor: "rgba(255,255,255,0.09)",
        },
    };

    return (
        <button
            onClick={disabled ? undefined : onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false); }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            style={{ ...base, ...variants[variant] }}
        >
            {children}
        </button>
    );
}

function FluentInput({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    hint,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    hint?: React.ReactNode;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{
                fontSize: fluent.caption,
                fontWeight: 600,
                color: focused ? fluent.accentBase : fluent.textSecondary,
                transition: "color 0.1s",
                fontFamily: "'Segoe UI Variable Text', 'Segoe UI', sans-serif",
            }}>
                {label}
            </label>
            <div style={{ position: "relative" }}>
                <input
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={{
                        ...controlInput,
                        borderColor: focused ? fluent.borderFocus : fluent.strokeCard,
                        boxShadow: focused ? `0 0 0 1px ${fluent.borderFocus}` : "none",
                    }}
                />
                {/* Bottom accent line (Fluent v9 focus indicator) */}
                <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    height: 2,
                    width: focused ? "100%" : "0%",
                    background: fluent.accentBase,
                    borderRadius: "0 0 2px 2px",
                    transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
                }} />
            </div>
            {hint && (
                <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    color: fluent.textSecondary,
                    fontSize: fluent.caption,
                    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', sans-serif",
                }}>
                    {hint}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FirstRunWizard({ onFinish }: { onFinish: () => void }) {
    const { startTrial } = useLicense();
    const { values, setConfigValue } = useConfig();

    const [step, setStep] = useState(0);
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [extracting, setExtracting] = useState(false);
    const [extractedFiles, setExtractedFiles] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [dbTables, setDbTables] = useState<Record<string, string[]>>({});
    const [tableData, setTableData] = useState<Record<string, string[][]>>({});
    const [extractedDir, setExtractedDir] = useState<string | null>(null);
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const [existingUsers, setExistingUsers] = useState<any[]>([]);
    const [isFirstUser, setIsFirstUser] = useState(true);
    const [showReview, setShowReview] = useState(false);

    // New: layout selection (windows | macos)
    const [selectedLayout, setSelectedLayout] = useState<string>((values.layoutStyle as string) || 'windows');

    const next = () => setStep(s => s + 1);
    const back = () => setStep(s => Math.max(0, s - 1));

    useState(() => {
        const check = async () => {
            try {
                const users: any[] = await invoke('list_users');
                setExistingUsers(users);
                setIsFirstUser(users.length === 0);
            } catch { setIsFirstUser(true); }
        };
        check();
    });

    const handleOpenImportReview = () => { if (extractedDir) setShowReview(true); };
    const handleReviewComplete = () => {
        toast.success("Datos importados correctamente");
        startTrial().catch(console.error);
        setTimeout(() => finishAndPersist(), 1500);
    };

    // Persistir la interfaz seleccionada y luego cerrar el wizard
    async function finishAndPersist() {
        try {
            await setConfigValue('layoutStyle', selectedLayout);
        } catch (err) {
            console.error('No se pudo guardar layoutStyle:', err);
            toast.error('No se pudo guardar la preferencia de interfaz');
        } finally {
            onFinish();
        }
    }
    const handleReviewCancel = () => setShowReview(false);

    async function handleCreateAdmin() {
        try {
            await invoke("init_app_db");
            const pwBuffer = new TextEncoder().encode(password || "");
            const hashBuf = await crypto.subtle.digest("SHA-256", pwBuffer);
            const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
            await invoke("create_user", { username, passwordHash: hashHex, name, role: "admin" });
            if (isFirstUser) {
                await invoke("set_system_password", { passwordHash: hashHex });
                await invoke("set_config", { key: "first_run_completed", value: "true" });
            }
            toast.success(`Usuario ${username} creado correctamente`);
            next();
        } catch (err: any) { toast.error(err.toString()); }
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
            const unlistenLogs = await listen("log://log", (event: any) => {
                const logMsg = event.payload?.message || JSON.stringify(event.payload);
                setTerminalLogs(prev => [...prev, logMsg].slice(-50));
            });
            const unlistenFinished = await listen("import:finished", async (event) => {
                const payload: any = event.payload;
                if (payload?.job_id !== jobId) return;
                setExtracting(false);
                if (payload.extracted_to) {
                    setExtractedDir(payload.extracted_to);
                    const list: any = await invoke("list_extracted_files", { dir: payload.extracted_to });
                    setExtractedFiles([...(list.db_files || []), ...(list.documents || [])]);
                    const tables: Record<string, string[]> = {};
                    const data: Record<string, string[][]> = {};
                    for (const db of list.db_files || []) {
                        const tbls: any = await invoke("list_tables", { path: db });
                        tables[db] = tbls;
                        try {
                            const records: any = await invoke("read_table_data_pxlib", { path: db, limit: 5 });
                            data[db] = records;
                        } catch {
                            try { data[db] = await invoke("read_table_data", { path: db, limit: 5 }); }
                            catch { data[db] = []; }
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
        } catch {
            setExtracting(false);
            toast.error('Error iniciando extracción');
        }
    }

    // ─── Step titles ──────────────────────────────────────────────────────────
    const totalSteps = 4;
    const stepTitles = [
        isFirstUser ? "Bienvenido" : "Resumen del sistema",
        "Elige la interfaz",
        isFirstUser ? "Crear cuenta" : "Nuevo usuario",
        "Importar datos",
    ];
    const stepSubtitles = [
        isFirstUser ? "Asistente de instalación de Nuevo Galeno" : "Gestión de usuarios del sistema",
        "Selecciona el estilo de interfaz que prefieres para la aplicación",
        isFirstUser ? "Configuración de la cuenta administrativa principal" : "Agregar un nuevo usuario al sistema",
        "Migración de base de datos Paradox (.gln)",
    ];

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{
            position: "fixed", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.54)",
            backdropFilter: "blur(24px) saturate(1.6)",
            fontFamily: "'Segoe UI Variable Text', 'Segoe UI', sans-serif",
            zIndex: 9999,
        }}>
            {/* Window */}
            <div style={{
                width: "100%", maxWidth: 880, height: 640,
                display: "flex", flexDirection: "column",
                background: "rgba(32,32,32,0.97)",
                borderRadius: 8,
                border: `1px solid ${fluent.strokeCard}`,
                boxShadow: "0 32px 64px rgba(0,0,0,0.62), 0 2px 24px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.07)",
                overflow: "hidden",
            }}>
                {/* ── Title bar ─────────────────────────────────────────────── */}
                <div style={{
                    flexShrink: 0,
                    display: "flex", alignItems: "center",
                    padding: "0 16px", height: 32,
                    background: "rgba(0,0,0,0.28)",
                    borderBottom: `1px solid ${fluent.strokeCard}`,
                    userSelect: "none",
                }}>
                    <Database style={{ width: 14, height: 14, color: fluent.accentBase, marginRight: 8 }} />
                    <span style={{ fontSize: 12, color: fluent.textSecondary, letterSpacing: 0.1 }}>
                        Nuevo Galeno — Configuración
                    </span>
                </div>

                {/* ── Content wrapper ───────────────────────────────────────── */}
                <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

                    {/* Left sidebar navigation */}
                    <div style={{
                        width: 220, flexShrink: 0,
                        padding: "28px 0",
                        background: "rgba(0,0,0,0.18)",
                        borderRight: `1px solid ${fluent.strokeCard}`,
                        display: "flex", flexDirection: "column", gap: 2,
                    }}>
                        {/* App brand */}
                        <div style={{ padding: "0 20px 20px", borderBottom: `1px solid ${fluent.strokeCard}`, marginBottom: 8 }}>
                            <div style={{
                                width: 40, height: 40,
                                background: "linear-gradient(135deg, #0078d4 0%, #005a9e 100%)",
                                borderRadius: 8,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                marginBottom: 10,
                                boxShadow: "0 4px 12px rgba(0,120,212,0.4)",
                            }}>
                                <Database style={{ width: 20, height: 20, color: "#fff" }} />
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: fluent.textPrimary, lineHeight: 1.2 }}>Nuevo Galeno</div>
                            <div style={{ fontSize: 11, color: fluent.textSecondary, marginTop: 2 }}>Instalación inicial</div>
                        </div>

                        {/* Steps list */}
                        {stepTitles.map((title, i) => {
                            const isDone = i < step;
                            const isActive = i === step;
                            return (
                                <div key={i} style={{
                                    display: "flex", alignItems: "center", gap: 10,
                                    padding: "8px 20px",
                                    background: isActive ? "rgba(96,205,255,0.08)" : "transparent",
                                    borderLeft: isActive ? `2px solid ${fluent.accentBase}` : "2px solid transparent",
                                    transition: "all 0.15s",
                                    cursor: "default",
                                }}>
                                    {/* Step circle */}
                                    <div style={{
                                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: isDone
                                            ? "rgba(96,205,255,0.2)"
                                            : isActive
                                                ? fluent.accentBase
                                                : "rgba(255,255,255,0.08)",
                                        border: isDone
                                            ? `1px solid rgba(96,205,255,0.45)`
                                            : isActive
                                                ? "none"
                                                : `1px solid rgba(255,255,255,0.15)`,
                                        fontSize: 11, fontWeight: 700,
                                        color: isDone ? fluent.accentBase : isActive ? "#fff" : fluent.textDisabled,
                                        transition: "all 0.2s",
                                    }}>
                                        {isDone ? <Check style={{ width: 12, height: 12 }} /> : i + 1}
                                    </div>
                                    <div>
                                        <div style={{
                                            fontSize: 13, fontWeight: isActive ? 600 : 400,
                                            color: isActive ? fluent.textPrimary : isDone ? fluent.accentBase : fluent.textSecondary,
                                            transition: "color 0.15s",
                                        }}>
                                            {title}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Main panel */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        {/* Header */}
                        <div style={{
                            padding: "28px 32px 20px",
                            borderBottom: `1px solid ${fluent.strokeCard}`,
                            flexShrink: 0,
                        }}>
                            <h1 style={{
                                margin: 0,
                                fontSize: fluent.subtitle,
                                fontWeight: 600,
                                color: fluent.textPrimary,
                                fontFamily: "'Segoe UI Variable Display', 'Segoe UI', sans-serif",
                                letterSpacing: -0.3,
                                lineHeight: 1.2,
                            }}>
                                {stepTitles[step]}
                            </h1>
                            <p style={{
                                margin: "6px 0 0",
                                fontSize: fluent.caption,
                                color: fluent.textSecondary,
                            }}>
                                {stepSubtitles[step]}
                            </p>
                        </div>

                        {/* Scrollable content */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
                            {showReview && extractedDir ? (
                                <div style={{ position: "absolute", inset: 0, background: fluent.bg, zIndex: 20, padding: 24 }}>
                                    <ImportReviewScreen
                                        extractedDir={extractedDir}
                                        onComplete={handleReviewComplete}
                                        onCancel={handleReviewCancel}
                                        embedded={true}
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* ── Step 0 ── */}
                                    {step === 0 && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeSlide 0.3s ease-out" }}>
                                            {isFirstUser ? (
                                                <>
                                                    {/* Info card */}
                                                    <div style={{ ...card, padding: "18px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                                                        <div style={{
                                                            width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                                                            background: fluent.accentBg,
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                        }}>
                                                            <ShieldCheck style={{ width: 20, height: 20, color: fluent.accentBase }} />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: fluent.body, fontWeight: 600, color: fluent.textPrimary, marginBottom: 4 }}>
                                                                Comenzar la instalación
                                                            </div>
                                                            <div style={{ fontSize: fluent.caption, color: fluent.textSecondary, lineHeight: 1.6 }}>
                                                                Este asistente le guiará a través de la configuración inicial de Nuevo Galeno. Se creará una base de datos local y se configurará el usuario administrador principal.
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Feature chips */}
                                                    {[
                                                        { icon: <Database style={{ width: 14, height: 14 }} />, text: "Base de datos local SQLite" },
                                                        { icon: <ShieldCheck style={{ width: 14, height: 14 }} />, text: "Contraseña cifrada con SHA-256" },
                                                        { icon: <HardDrive style={{ width: 14, height: 14 }} />, text: "Importación de respaldos .gln" },
                                                    ].map((f, i) => (
                                                        <div key={i} style={{
                                                            display: "flex", alignItems: "center", gap: 10,
                                                            padding: "10px 14px",
                                                            background: fluent.fillSubtle,
                                                            borderRadius: fluent.radiusMedium,
                                                            border: `1px solid ${fluent.strokeCard}`,
                                                            color: fluent.textSecondary,
                                                            fontSize: fluent.caption,
                                                        }}>
                                                            <span style={{ color: fluent.accentBase }}>{f.icon}</span>
                                                            {f.text}
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <div style={{ ...card, padding: 20 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                                        <UserCircle style={{ width: 18, height: 18, color: fluent.accentBase }} />
                                                        <span style={{ fontSize: fluent.body, fontWeight: 600, color: fluent.textPrimary }}>
                                                            Usuarios del sistema
                                                        </span>
                                                        <span style={{
                                                            marginLeft: "auto",
                                                            background: fluent.accentBg,
                                                            color: fluent.accentBase,
                                                            fontSize: 11, fontWeight: 700,
                                                            padding: "2px 8px", borderRadius: 99,
                                                        }}>
                                                            {existingUsers.length}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 280, overflowY: "auto" }}>
                                                        {existingUsers.map((user: any) => (
                                                            <div key={user.id} style={{
                                                                display: "flex", alignItems: "center", gap: 12,
                                                                padding: "8px 10px",
                                                                borderRadius: fluent.radiusMedium,
                                                                background: "transparent",
                                                                transition: "background 0.1s",
                                                                cursor: "default",
                                                            }}
                                                                onMouseEnter={e => (e.currentTarget.style.background = fluent.fillControlHover)}
                                                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                                            >
                                                                <div style={{
                                                                    width: 32, height: 32, borderRadius: "50%",
                                                                    background: fluent.accentBg,
                                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                                    fontSize: 12, fontWeight: 700, color: fluent.accentBase,
                                                                    border: `1px solid rgba(96,205,255,0.2)`,
                                                                    flexShrink: 0,
                                                                }}>
                                                                    {user.username.substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontSize: fluent.body, color: fluent.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                        {user.name}
                                                                    </div>
                                                                    <div style={{ fontSize: 11, color: fluent.textSecondary, marginTop: 1 }}>
                                                                        {user.role} · @{user.username}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div style={{
                                                marginTop: 8, paddingTop: 16,
                                                borderTop: `1px solid ${fluent.strokeCard}`,
                                                fontSize: 11, color: fluent.textDisabled,
                                                lineHeight: 1.8,
                                            }}>
                                                <p style={{ margin: 0 }}>Al continuar, acepta los términos de licencia del software médico.</p>
                                                <p style={{ margin: "2px 0 0" }}>Versión del instalador: 2.0.0 (Build 2026)</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Step 1 ── */}
                                    {step === 1 && (
                                        <div style={{
                                            display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'center',
                                            animation: 'fadeSlide 0.3s ease-out'
                                        }}>
                                            {/* Windows option */}
                                            <button
                                                onClick={() => setSelectedLayout('windows')}
                                                style={{
                                                    width: 260, padding: 16, borderRadius: 8,
                                                    background: selectedLayout === 'windows' ? 'rgba(96,205,255,0.06)' : 'transparent',
                                                    border: selectedLayout === 'windows' ? `1px solid ${fluent.borderFocus}` : `1px solid ${fluent.strokeCard}`,
                                                    boxShadow: selectedLayout === 'windows' ? '0 6px 20px rgba(0,0,0,0.45)' : 'none',
                                                    cursor: 'pointer', textAlign: 'left'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 56, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 6 }}>
                                                        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 6 }} />
                                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                            <div style={{ width: 10, height: 10, borderRadius: 3, background: '#00a4ef' }} />
                                                            <div style={{ width: 10, height: 10, borderRadius: 3, background: '#60cdff' }} />
                                                            <div style={{ width: 10, height: 10, borderRadius: 3, background: '#a78bfa' }} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 14, fontWeight: 700, color: fluent.textPrimary }}>Windows</div>
                                                        <div style={{ fontSize: 12, color: fluent.textSecondary, marginTop: 6, maxWidth: 160 }}>Barra de tareas en la parte inferior con íconos centrados — estilo por defecto.</div>
                                                    </div>
                                                </div>
                                            </button>

                                            {/* macOS option */}
                                            <button
                                                onClick={() => setSelectedLayout('macos')}
                                                style={{
                                                    width: 260, padding: 16, borderRadius: 8,
                                                    background: selectedLayout === 'macos' ? 'rgba(96,205,255,0.06)' : 'transparent',
                                                    border: selectedLayout === 'macos' ? `1px solid ${fluent.borderFocus}` : `1px solid ${fluent.strokeCard}`,
                                                    boxShadow: selectedLayout === 'macos' ? '0 6px 20px rgba(0,0,0,0.45)' : 'none',
                                                    cursor: 'pointer', textAlign: 'left'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 56, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <div style={{ width: '70%', height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.06)', display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                                                            <div style={{ width: 8, height: 8, borderRadius: 8, background: '#00a4ef' }} />
                                                            <div style={{ width: 8, height: 8, borderRadius: 8, background: '#60cdff' }} />
                                                            <div style={{ width: 8, height: 8, borderRadius: 8, background: '#a78bfa' }} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 14, fontWeight: 700, color: fluent.textPrimary }}>macOS</div>
                                                        <div style={{ fontSize: 12, color: fluent.textSecondary, marginTop: 6, maxWidth: 160 }}>Dock estilo macOS y barra superior — aspecto alternativo.</div>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    )}

                                    {/* ── Step 2 ── */}
                                    {step === 2 && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeSlide 0.3s ease-out" }}>
                                            <FluentInput
                                                label="Nombre completo"
                                                value={name}
                                                onChange={v => setName(v)}
                                                placeholder="Ej. Dr. Juan Pérez"
                                            />

                                            <FluentInput
                                                label="Nombre de usuario"
                                                value={username}
                                                onChange={v => setUsername(v)}
                                                placeholder="admin"
                                            />

                                            <FluentInput
                                                label="Contraseña"
                                                type="password"
                                                value={password}
                                                onChange={v => setPassword(v)}
                                                placeholder="••••••••"
                                                hint={
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                                        <ShieldCheck style={{ width: 14, height: 14, color: fluent.accentBase, marginTop: 4 }} />
                                                        <div style={{ fontSize: 12, color: fluent.textSecondary }}>
                                                            {isFirstUser
                                                                ? "Esta será la cuenta administrativa principal. Guárdela en un lugar seguro."
                                                                : "El usuario deberá cambiar su contraseña al primer inicio de sesión."}
                                                        </div>
                                                    </div>
                                                }
                                            />
                                        </div>
                                    )}

                                    {/* ── Step 3 (Import) ── */}
                                    {step === 3 && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeSlide 0.3s ease-out" }}>
                                            {/* File picker */}
                                            <div
                                                onClick={handleSelectGln}
                                                style={{
                                                    ...card,
                                                    padding: "14px 18px",
                                                    display: "flex", alignItems: "center", gap: 14,
                                                    cursor: "pointer",
                                                    transition: "background 0.1s, border-color 0.1s",
                                                }}
                                                onMouseEnter={e => {
                                                    (e.currentTarget as HTMLDivElement).style.background = fluent.bgLayer3;
                                                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.14)";
                                                }}
                                                onMouseLeave={e => {
                                                    (e.currentTarget as HTMLDivElement).style.background = fluent.bgLayer2;
                                                    (e.currentTarget as HTMLDivElement).style.borderColor = fluent.strokeCard;
                                                }}
                                            >
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                                                    background: selectedFile ? fluent.accentBg : fluent.fillSubtle,
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    border: `1px solid ${selectedFile ? "rgba(96,205,255,0.3)" : fluent.strokeCard}`,
                                                }}>
                                                    <HardDrive style={{ width: 18, height: 18, color: selectedFile ? fluent.accentBase : fluent.textSecondary }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: fluent.body, color: fluent.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {selectedFile || "Seleccionar archivo de respaldo (.gln)"}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: fluent.textSecondary, marginTop: 2 }}>
                                                        {selectedFile ? "Archivo cargado y listo" : "Haga clic para examinar su equipo"}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    padding: "5px 12px",
                                                    background: fluent.fillSubtle,
                                                    border: `1px solid ${fluent.strokeCard}`,
                                                    borderRadius: fluent.radiusMedium,
                                                    fontSize: 12, color: fluent.textSecondary,
                                                    flexShrink: 0,
                                                }}>
                                                    Examinar
                                                </div>
                                            </div>

                                            {/* Import trigger / progress */}
                                            {selectedFile && !extractedFiles.length && (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                                    {extracting ? (
                                                        <>
                                                            {/* Progress bar */}
                                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: fluent.textSecondary, marginBottom: 2 }}>
                                                                <span style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>Procesando</span>
                                                                <span style={{ color: fluent.accentBase, fontWeight: 600 }}>{progress}%</span>
                                                            </div>
                                                            <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1, overflow: "hidden" }}>
                                                                <div style={{
                                                                    height: "100%",
                                                                    width: `${progress}%`,
                                                                    background: fluent.accentBase,
                                                                    borderRadius: 1,
                                                                    transition: "width 0.3s ease-out",
                                                                    boxShadow: `0 0 8px ${fluent.accentBase}`,
                                                                }} />
                                                            </div>

                                                            {/* Terminal */}
                                                            <div style={{
                                                                background: "#0c0c0c",
                                                                border: `1px solid ${fluent.strokeCard}`,
                                                                borderRadius: fluent.radiusLarge,
                                                                height: 200,
                                                                overflow: "hidden",
                                                                fontFamily: "'Cascadia Code', 'Consolas', monospace",
                                                                fontSize: 12,
                                                                padding: "12px 16px",
                                                            }}>
                                                                <div style={{ overflowY: "auto", height: "100%" }}>
                                                                    {terminalLogs.length === 0 ? (
                                                                        <span style={{ color: "#444" }}>Iniciando motor de migración Paradox...</span>
                                                                    ) : terminalLogs.map((log, i) => (
                                                                        <div key={i} style={{ color: "#ccc", padding: "1px 0", display: "flex", gap: 8 }}>
                                                                            <span style={{ color: fluent.accentBase, flexShrink: 0 }}>›</span>
                                                                            <span>{log}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                                                            <FluentButton onClick={handleImport} variant="primary" style={{ height: 36, padding: "0 20px", fontSize: fluent.body }}>
                                                                Iniciar importación de datos
                                                            </FluentButton>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Results */}
                                            {extractedFiles.length > 0 && (
                                                <div style={{ ...card, overflow: "hidden" }}>
                                                    <div style={{
                                                        padding: "10px 16px",
                                                        borderBottom: `1px solid ${fluent.strokeCard}`,
                                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                                        background: "rgba(0,0,0,0.14)",
                                                    }}>
                                                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, color: fluent.textSecondary }}>
                                                            Tablas importadas
                                                        </span>
                                                        <span style={{
                                                            background: fluent.accentBg,
                                                            color: fluent.accentBase,
                                                            fontSize: 11, fontWeight: 700,
                                                            padding: "2px 8px", borderRadius: 99,
                                                        }}>
                                                            {Object.keys(dbTables).length} archivos
                                                        </span>
                                                    </div>
                                                    <div style={{ maxHeight: 240, overflowY: "auto" }}>
                                                        {Object.entries(dbTables).map(([path, _]) => (
                                                            <div key={path} style={{
                                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                                padding: "9px 16px",
                                                                borderBottom: `1px solid ${fluent.strokeCard}`,
                                                                transition: "background 0.1s",
                                                                cursor: "default",
                                                            }}
                                                                onMouseEnter={e => (e.currentTarget.style.background = fluent.fillControlHover)}
                                                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                                            >
                                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                                    <FileCode style={{ width: 14, height: 14, color: fluent.accentBase, flexShrink: 0 }} />
                                                                    <span style={{ fontSize: 13, fontFamily: "'Cascadia Code', monospace", color: fluent.textPrimary }}>
                                                                        {path.split(/[\\/]/).pop()}
                                                                    </span>
                                                                </div>
                                                                <span style={{ fontSize: 11, color: fluent.textSecondary, fontFamily: "'Cascadia Code', monospace" }}>
                                                                    {tableData[path]?.length || Object.keys(tableData[path] || {}).length || 0} reg
                                                                </span>
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

                        {/* ── Footer ─────────────────────────────────────────── */}
                        {!showReview && (
                            <div style={{
                                flexShrink: 0,
                                padding: "14px 32px",
                                borderTop: `1px solid ${fluent.strokeCard}`,
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                background: "rgba(0,0,0,0.12)",
                            }}>
                                {/* Left: step indicator */}
                                <StepIndicator total={totalSteps} current={step} />

                                {/* Right: action buttons */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {step > 0 && (
                                        <FluentButton variant="subtle" onClick={back}>
                                            <ChevronLeft style={{ width: 14, height: 14 }} />
                                            Atrás
                                        </FluentButton>
                                    )}

                                    {(step === 3 && extractedFiles.length === 0) && (
                                        <FluentButton variant="secondary" onClick={finishAndPersist}>
                                            Omitir
                                        </FluentButton>
                                    )}
                                    {!isFirstUser && (
                                        <FluentButton variant="secondary" onClick={onFinish}>
                                            Cancelar
                                        </FluentButton>
                                    )}

                                    {step < 3 && (
                                        <FluentButton
                                            variant="primary"
                                            onClick={step === 2 ? handleCreateAdmin : next}
                                            disabled={step === 2 && (!username || !password || !name)}
                                        >
                                            {step === 2 ? (isFirstUser ? "Crear y continuar" : "Crear usuario") : "Siguiente"}
                                            <ChevronRight style={{ width: 14, height: 14 }} />
                                        </FluentButton>
                                    )}

                                    {step === 3 && extractedFiles.length > 0 && (
                                        <>
                                            <FluentButton variant="secondary" onClick={handleOpenImportReview}>
                                                Revisar detalles
                                            </FluentButton>
                                            <FluentButton variant="success" onClick={finishAndPersist}>
                                                <Check style={{ width: 14, height: 14 }} />
                                                Finalizar
                                            </FluentButton>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CSS animations */}
            <style>{`
                @keyframes fadeSlide {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                ::-webkit-scrollbar { width: 6px; background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
            `}</style>
        </div>
    );
}