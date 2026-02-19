import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Shield, ShieldAlert, ChevronDown, Lock, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogOverlay,
    DialogTitle,
} from '@/components/ui/dialog';
import { useWindowManager } from "@/contexts/WindowManagerContext";

// ─── Fluent v9 / Win11 UAC Tokens ────────────────────────────────────────────
const f = {
    // Surfaces  (mica-dark layering)
    canvas: "#1c1c1c",
    surface: "rgba(255,255,255,0.04)",
    surfaceHover: "rgba(255,255,255,0.07)",
    surfaceRaised: "rgba(255,255,255,0.06)",
    footer: "#202020",

    // Strokes
    stroke: "rgba(255,255,255,0.083)",
    strokeStrong: "rgba(255,255,255,0.14)",

    // Text
    textPrimary: "rgba(255,255,255,0.955)",
    textSecondary: "rgba(255,255,255,0.60)",
    textDisabled: "rgba(255,255,255,0.36)",
    textCaption: "rgba(255,255,255,0.45)",

    // Accent (Win11 blue)
    accent: "#0078D4",
    accentHover: "#006CC0",
    accentDown: "#005BA1",
    accentBg: "rgba(0,120,212,0.14)",
    accentGlow: "rgba(0,120,212,0.35)",

    // Warning / danger (Win11 UAC yellow / orange-red)
    warn: "#FCE100",
    warnBg: "rgba(252,225,0,0.10)",
    warnStroke: "rgba(252,225,0,0.25)",
    danger: "#D83B01",
    dangerHover: "#C53000",
    dangerDown: "#A52800",
    dangerBg: "rgba(216,59,1,0.12)",
    dangerStroke: "rgba(216,59,1,0.30)",

    // Misc
    radius: "4px",
    radiusLg: "8px",
    fontStack: '"Segoe UI Variable Text", "Segoe UI", sans-serif',
    fontDisplay: '"Segoe UI Variable Display", "Segoe UI", sans-serif',
    body: "13px",
    caption: "12px",
    shadow: "0 8px 32px rgba(0,0,0,0.54), 0 2px 8px rgba(0,0,0,0.38)",
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function useHover() {
    const [hovered, setHovered] = useState(false);
    return [hovered, { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }] as const;
}
function usePress() {
    const [pressed, setPressed] = useState(false);
    return [pressed, { onMouseDown: () => setPressed(true), onMouseUp: () => setPressed(false), onMouseLeave: () => setPressed(false) }] as const;
}

// ─── FluentButton ─────────────────────────────────────────────────────────────
function FluentBtn({
    children, onClick, disabled, variant = "primary", minWidth = 110,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "primary" | "secondary" | "danger";
    minWidth?: number;
}) {
    const [hov, hovProps] = useHover();
    const [prs, prsProps] = usePress();

    const bg: Record<string, string> = {
        primary: prs ? f.accentDown : hov ? f.accentHover : f.accent,
        secondary: prs ? "rgba(255,255,255,0.07)" : hov ? f.surfaceHover : f.surfaceRaised,
        danger: prs ? f.dangerDown : hov ? f.dangerHover : f.danger,
    };
    const border: Record<string, string> = {
        primary: "rgba(255,255,255,0.09)",
        secondary: f.strokeStrong,
        danger: "rgba(255,255,255,0.09)",
    };

    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            {...hovProps}
            {...prsProps}
            style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                minWidth, height: 32, padding: "0 14px",
                background: bg[variant],
                border: `1px solid ${border[variant]}`,
                borderRadius: f.radius,
                color: f.textPrimary,
                fontSize: f.body,
                fontFamily: f.fontStack,
                fontWeight: variant === "secondary" ? 400 : 600,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.37 : 1,
                transform: prs && !disabled ? "scale(0.985)" : "scale(1)",
                transition: "background 0.1s, transform 0.08s, opacity 0.15s",
                userSelect: "none",
                outline: "none",
                boxShadow: hov && variant === "primary" && !disabled
                    ? `0 0 0 1px ${f.accentGlow}`
                    : "none",
            }}
        >
            {children}
        </button>
    );
}

// ─── FluentInput ──────────────────────────────────────────────────────────────
function FluentPasswordInput({
    value, onChange, onEnter, inputRef, placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    onEnter: () => void;
    inputRef: React.RefObject<HTMLInputElement>;
    placeholder?: string;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <div style={{ position: "relative" }}>
            <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "0 10px",
                height: 32,
                background: focused ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${focused ? f.accent : f.strokeStrong}`,
                borderRadius: f.radius,
                boxShadow: focused ? `0 0 0 1px ${f.accent}` : "none",
                transition: "border-color 0.1s, box-shadow 0.1s, background 0.1s",
            }}>
                <Lock style={{ width: 12, height: 12, color: f.textCaption, flexShrink: 0 }} />
                <input
                    ref={inputRef}
                    type="password"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && onEnter()}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder || "Contraseña"}
                    autoComplete="off"
                    style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: f.textPrimary,
                        fontSize: f.body,
                        fontFamily: f.fontStack,
                    }}
                />
            </div>
            {/* Fluent v9 bottom focus line */}
            <div style={{
                position: "absolute", bottom: 0, left: "50%",
                transform: "translateX(-50%)",
                height: 2,
                width: focused ? "100%" : "0%",
                background: f.accent,
                borderRadius: "0 0 2px 2px",
                transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
            }} />
        </div>
    );
}

// ─── Shield Badge ─────────────────────────────────────────────────────────────
function ShieldBadge({ dangerous }: { dangerous: boolean }) {
    return (
        <div style={{
            width: 48, height: 48,
            borderRadius: 10,
            background: dangerous ? f.dangerBg : f.accentBg,
            border: `1px solid ${dangerous ? f.dangerStroke : "rgba(0,120,212,0.35)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: `0 2px 12px ${dangerous ? f.dangerBg : f.accentBg}`,
        }}>
            {dangerous
                ? <ShieldAlert style={{ width: 24, height: 24, color: f.danger }} strokeWidth={1.5} />
                : <Shield style={{ width: 24, height: 24, color: f.accent }} strokeWidth={1.5} />
            }
        </div>
    );
}

// ─── Detail row ───────────────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ width: 128, flexShrink: 0, color: f.textSecondary, fontSize: f.caption }}>{label}</span>
            <span style={{ color: f.textPrimary, fontSize: f.caption, fontFamily: "monospace", wordBreak: "break-all" }}>{value}</span>
        </div>
    );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
    return <div style={{ height: 1, background: f.stroke, margin: "0 -24px" }} />;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
    return (
        <div style={{
            width: 12, height: 12,
            border: `2px solid rgba(255,255,255,0.25)`,
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "uac-spin 0.7s linear infinite",
            flexShrink: 0,
        }} />
    );
}

// ─── Interface ────────────────────────────────────────────────────────────────
interface SystemPasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: (passwordHash: string) => Promise<void>;
    dangerous?: boolean;
    appId?: string;
    moduleName?: string;
    actionType?: 'admin' | 'dangerous' | 'install' | 'delete' | 'system';
}

const actionTypeLabels: Record<string, string> = {
    admin: "Administrativo",
    dangerous: "Crítico",
    install: "Instalación",
    delete: "Eliminación",
    system: "Sistema",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function SystemPasswordDialog({
    open, onOpenChange,
    title, description,
    confirmLabel = "Sí",
    onConfirm,
    dangerous = false,
    appId, moduleName,
    actionType = "admin",
}: SystemPasswordDialogProps) {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [detailsHov, detailsHovProps] = useHover();
    const inputRef = useRef<HTMLInputElement>(null);
    const { apps } = useWindowManager();

    useEffect(() => {
        if (open) {
            setPassword("");
            setLoading(false);
            setShowDetails(false);
            setTimeout(() => inputRef.current?.focus(), 120);
        }
    }, [open]);

    const handleConfirm = async () => {
        if (!password) { inputRef.current?.focus(); return; }
        setLoading(true);
        try {
            const buf = new TextEncoder().encode(password);
            const hashBuf = await crypto.subtle.digest("SHA-256", buf);
            const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
            const isValid: boolean = await invoke("verify_system_password", { passwordHash: hashHex });
            if (!isValid) {
                toast.error("La contraseña es incorrecta. Inténtelo de nuevo.");
                setPassword("");
                inputRef.current?.focus();
                setLoading(false);
                return;
            }
            await onConfirm(hashHex);
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.toString());
        } finally {
            setLoading(false);
        }
    };

    const appName = apps?.get(appId!)?.name || "Nuevo Galeno";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* UAC secure-desktop backdrop: heavy dark + desaturation */}
            <DialogOverlay className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm transition-all duration-200" />

            <DialogContent
                className="fixed left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-[460px] p-0 overflow-hidden outline-none [&>button]:hidden"
                style={{
                    background: f.canvas,
                    border: `1px solid ${f.stroke}`,
                    borderRadius: f.radiusLg,
                    boxShadow: f.shadow,
                    fontFamily: f.fontStack,
                }}
            >
                <DialogTitle className="sr-only">{title}</DialogTitle>

                {/* ── Danger / Warning bar ──────────────────────────────── */}
                {dangerous && (
                    <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 20px",
                        background: "linear-gradient(90deg, rgba(216,59,1,0.18) 0%, transparent 100%)",
                        borderBottom: `1px solid ${f.dangerStroke}`,
                    }}>
                        <AlertTriangle style={{ width: 14, height: 14, color: f.danger, flexShrink: 0 }} />
                        <span style={{ fontSize: f.caption, color: f.danger, fontWeight: 600, letterSpacing: 0.2 }}>
                            Esta acción es irreversible y puede afectar el sistema
                        </span>
                    </div>
                )}

                {/* ── Main body ─────────────────────────────────────────── */}
                <div style={{ padding: "24px 24px 0" }}>

                    {/* Header row: shield + title */}
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
                        <ShieldBadge dangerous={dangerous} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 16, fontWeight: 600, color: f.textPrimary, fontFamily: f.fontDisplay, lineHeight: 1.25, marginBottom: 4 }}>
                                Nuevo Galeno requiere confirmación
                            </div>
                            <div style={{ fontSize: f.body, color: f.textSecondary, lineHeight: 1.5 }}>
                                Para continuar, escriba la contraseña de administrador.
                            </div>
                        </div>
                    </div>

                    {/* Info chip row */}
                    <div style={{
                        display: "flex", flexWrap: "wrap", gap: 6,
                        marginBottom: 18,
                    }}>
                        {[
                            { label: "Acción", value: title },
                            { label: "App", value: appName },
                            ...(moduleName ? [{ label: "Módulo", value: moduleName }] : []),
                            { label: "Tipo", value: actionTypeLabels[actionType] || "General" },
                        ].map(chip => (
                            <div key={chip.label} style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                padding: "3px 10px",
                                background: f.surface,
                                border: `1px solid ${f.stroke}`,
                                borderRadius: 99,
                                fontSize: f.caption,
                                color: f.textSecondary,
                            }}>
                                <span style={{ color: f.textCaption }}>{chip.label}:</span>
                                <span style={{ color: f.textPrimary, fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {chip.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    <Divider />

                    {/* Password section */}
                    <div style={{ padding: "16px 0 0" }}>
                        <label style={{
                            display: "block",
                            fontSize: f.caption,
                            fontWeight: 600,
                            color: f.textSecondary,
                            marginBottom: 6,
                        }}>
                            Contraseña de administrador
                        </label>
                        <FluentPasswordInput
                            value={password}
                            onChange={setPassword}
                            onEnter={handleConfirm}
                            inputRef={inputRef}
                        />
                        {description && (
                            <div style={{ marginTop: 8, fontSize: f.caption, color: f.textCaption, lineHeight: 1.5 }}>
                                {description}
                            </div>
                        )}
                    </div>

                    {/* Details accordion */}
                    <div style={{ padding: "12px 0 20px" }}>
                        <button
                            onClick={() => setShowDetails(v => !v)}
                            {...detailsHovProps}
                            style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                background: "none", border: "none", padding: 0,
                                cursor: "pointer", outline: "none",
                                color: detailsHov ? f.accentHover : f.accent,
                                fontSize: f.caption,
                                fontFamily: f.fontStack,
                                textDecoration: detailsHov ? "underline" : "none",
                                transition: "color 0.1s",
                            }}
                        >
                            <span>{showDetails ? "Ocultar detalles" : "Mostrar detalles"}</span>
                            <ChevronDown style={{
                                width: 12, height: 12,
                                transform: showDetails ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.2s",
                            }} />
                        </button>

                        {showDetails && (
                            <div style={{
                                marginTop: 10,
                                padding: "12px 14px",
                                background: f.surface,
                                border: `1px solid ${f.stroke}`,
                                borderRadius: f.radius,
                                display: "flex", flexDirection: "column", gap: 6,
                                animation: "uac-details-in 0.18s ease-out",
                            }}>
                                <DetailRow label="ID de aplicación" value={appId || "N/A"} />
                                <DetailRow label="Tipo de acción" value={actionTypeLabels[actionType] || "General"} />
                                {moduleName && <DetailRow label="Módulo" value={moduleName} />}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer ───────────────────────────────────────────── */}
                <div style={{
                    display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8,
                    padding: "12px 20px",
                    background: f.footer,
                    borderTop: `1px solid ${f.stroke}`,
                }}>
                    <FluentBtn
                        variant="secondary"
                        onClick={() => { setPassword(""); onOpenChange(false); }}
                        disabled={loading}
                    >
                        No
                    </FluentBtn>
                    <FluentBtn
                        variant={dangerous ? "danger" : "primary"}
                        onClick={handleConfirm}
                        disabled={loading || !password}
                    >
                        {loading && <Spinner />}
                        {confirmLabel}
                    </FluentBtn>
                </div>
            </DialogContent>

            {/* Keyframes */}
            <style>{`
                @keyframes uac-spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes uac-details-in {
                    from { opacity: 0; transform: translateY(-4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </Dialog>
    );
}