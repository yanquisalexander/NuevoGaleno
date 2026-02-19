import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { motion, AnimatePresence } from 'motion/react';
import {
    CheckCircle2, AlertCircle, RefreshCw, Sparkles,
    Clock, Pause, RotateCw, ChevronRight, Package
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { getVersion } from '@tauri-apps/api/app';
import { useNotImplemented } from '@/utils/system/NotImplemented';
import { useAutoUpdate } from '@/hooks/useAutoUpdate';

// ─── Fluent UI v9 tokens (shared) ────────────────────────────────────────────
const tokens = {
    colorNeutralBackground1: '#1c1c1c',
    colorNeutralBackground2: '#242424',
    colorNeutralBackground3: '#2e2e2e',
    colorNeutralBackground4: '#383838',
    colorNeutralForeground1: '#ffffff',
    colorNeutralForeground2: 'rgba(255,255,255,0.72)',
    colorNeutralForeground3: 'rgba(255,255,255,0.48)',
    colorNeutralForeground4: 'rgba(255,255,255,0.28)',
    colorNeutralStroke1: 'rgba(255,255,255,0.10)',
    colorNeutralStroke2: 'rgba(255,255,255,0.06)',
    colorBrandBackground: '#0078d4',
    colorBrandBackgroundHover: '#106ebe',
    colorBrandForeground: '#4da6ff',
    colorPaletteGreenForeground: '#73c765',
    colorPaletteGreenBackground: 'rgba(107,191,89,0.12)',
    colorPaletteGreenBorder: 'rgba(107,191,89,0.25)',
    colorPaletteRedForeground: '#f1707a',
    colorPaletteRedBackground: 'rgba(232,17,35,0.12)',
    colorPaletteRedBorder: 'rgba(232,17,35,0.25)',
    colorPaletteYellowForeground: '#ffb900',
    borderRadiusMedium: '6px',
    borderRadiusLarge: '8px',
    borderRadiusXLarge: '12px',
    durationNormal: '150ms',
    curveEasyEase: 'cubic-bezier(0.33,0,0.67,1)',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────
interface UpdateInfo {
    version: string;
    currentVersion: string;
    body?: string;
    date?: string;
}

type UpdateState =
    | { type: 'idle' }
    | { type: 'checking' }
    | { type: 'available'; info: UpdateInfo }
    | { type: 'not-available' }
    | { type: 'downloading'; progress: number }
    | { type: 'installing' }
    | { type: 'done' }
    | { type: 'error'; message: string };

// ─── Small reusable atoms ─────────────────────────────────────────────────────
function StatusIcon({
    bg, color, children,
}: { bg: string; color: string; children: React.ReactNode }) {
    return (
        <div style={{
            width: 44, height: 44, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', background: bg, color,
        }}>
            {children}
        </div>
    );
}

function PrimaryButton({ onClick, children, disabled }: {
    onClick: () => void; children: React.ReactNode; disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 18px', fontSize: 13, fontWeight: 500,
                borderRadius: tokens.borderRadiusMedium,
                border: 'none',
                background: disabled ? 'rgba(0,120,212,0.4)' : tokens.colorBrandBackground,
                color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer',
                transition: `background ${tokens.durationNormal}`,
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = tokens.colorBrandBackgroundHover; }}
            onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = tokens.colorBrandBackground; }}
        >
            {children}
        </button>
    );
}

function OutlineButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 18px', fontSize: 13, fontWeight: 500,
                borderRadius: tokens.borderRadiusMedium,
                border: `1px solid ${tokens.colorNeutralStroke1}`,
                background: tokens.colorNeutralBackground3,
                color: tokens.colorNeutralForeground2, cursor: 'pointer',
                transition: `background ${tokens.durationNormal}`,
            }}
            onMouseEnter={e => e.currentTarget.style.background = tokens.colorNeutralBackground4}
            onMouseLeave={e => e.currentTarget.style.background = tokens.colorNeutralBackground3}
        >
            {children}
        </button>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function GalenoUpdateApp() {
    const [state, setState] = useState<UpdateState>({ type: 'idle' });
    const [currentVersion, setCurrentVersion] = useState<string>('');
    const toastHelpers = useToast();
    const notImplemented = useNotImplemented();
    const { updateAvailable, updateInfo, lastChecked, checkForUpdates: autoCheckForUpdates } = useAutoUpdate(false);

    useEffect(() => {
        if (updateAvailable && updateInfo) {
            setState(prev => {
                if (prev.type === 'idle' || prev.type === 'not-available' || prev.type === 'checking') {
                    return { type: 'available', info: updateInfo };
                }
                return prev;
            });
        } else {
            setState(prev => (prev.type === 'available' ? { type: 'not-available' } : prev));
        }
    }, [updateAvailable, updateInfo]);

    useEffect(() => {
        getVersion().then(setCurrentVersion).catch(console.error);
    }, []);

    const formatLastChecked = (date: Date | null) => {
        if (!date) return 'Nunca';
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return `Hoy, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return date.toLocaleString();
    };

    const handleCheckForUpdates = async () => {
        setState({ type: 'checking' });
        try {
            if (!currentVersion) setCurrentVersion(await getVersion());
            await new Promise(r => setTimeout(r, 800));
            const found = await autoCheckForUpdates();
            setState(found && updateInfo ? { type: 'available', info: updateInfo } : { type: 'not-available' });
        } catch (error: any) {
            const msg = error?.toString() || 'Error desconocido';
            setState({ type: 'error', message: msg });
            toastHelpers.error('Error', msg);
        }
    };

    const handleInstallUpdate = async () => {
        if (state.type !== 'available') return;
        try {
            setState({ type: 'downloading', progress: 0 });
            const update = await check();
            if (!update?.available) throw new Error('No hay actualización disponible');
            let downloaded = 0, contentLength = 0;
            await update.downloadAndInstall(event => {
                switch (event.event) {
                    case 'Started':
                        contentLength = event.data.contentLength || 0;
                        setState({ type: 'downloading', progress: 0 });
                        break;
                    case 'Progress':
                        downloaded += event.data.chunkLength;
                        if (contentLength > 0) {
                            setState({ type: 'downloading', progress: Math.round((downloaded / contentLength) * 100) });
                        }
                        break;
                    case 'Finished':
                        setState({ type: 'installing' });
                        break;
                }
            });
            setState({ type: 'done' });
            setTimeout(() => relaunch(), 1000);
        } catch (error: any) {
            const msg = error?.toString() || 'Error durante la instalación';
            setState({ type: 'error', message: msg });
            toastHelpers.error('Error', msg);
        }
    };

    // ─── Card content per state ────────────────────────────────────────────
    const renderCardContent = () => {
        switch (state.type) {

            case 'idle':
            case 'not-available':
                return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                        <StatusIcon bg={tokens.colorPaletteGreenBackground} color={tokens.colorPaletteGreenForeground}>
                            <CheckCircle2 size={22} />
                        </StatusIcon>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 600, color: tokens.colorNeutralForeground1, margin: '0 0 4px' }}>
                                Todo está actualizado
                            </h2>
                            <p style={{ fontSize: 13, color: tokens.colorNeutralForeground3, margin: '0 0 20px' }}>
                                Última comprobación: {formatLastChecked(lastChecked)}
                            </p>
                            <PrimaryButton onClick={handleCheckForUpdates}>
                                <RefreshCw style={{ width: 13, height: 13 }} />
                                Buscar actualizaciones
                            </PrimaryButton>
                        </div>
                    </div>
                );

            case 'checking':
                return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                        <div style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw className="animate-spin" size={22} style={{ color: tokens.colorBrandForeground }} />
                        </div>
                        <div style={{ flex: 1, paddingTop: 2 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 600, color: tokens.colorNeutralForeground1, margin: '0 0 4px' }}>
                                Buscando actualizaciones...
                            </h2>
                            <p style={{ fontSize: 13, color: tokens.colorNeutralForeground3, margin: 0 }}>
                                Esto puede tardar unos segundos.
                            </p>
                        </div>
                    </div>
                );

            case 'available':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                            <StatusIcon bg="rgba(77,166,255,0.12)" color={tokens.colorBrandForeground}>
                                <Sparkles size={22} />
                            </StatusIcon>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: 16, fontWeight: 600, color: tokens.colorNeutralForeground1, margin: '0 0 4px' }}>
                                    Actualización disponible
                                </h2>
                                <p style={{ fontSize: 13, color: tokens.colorNeutralForeground3, margin: 0 }}>
                                    Galeno {state.info.version} está listo para instalar.
                                </p>
                            </div>
                        </div>

                        {/* Update detail block */}
                        <div style={{
                            marginLeft: 62,
                            padding: '14px 16px',
                            background: tokens.colorNeutralBackground1,
                            border: `1px solid ${tokens.colorNeutralStroke1}`,
                            borderRadius: tokens.borderRadiusLarge,
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 500, color: tokens.colorNeutralForeground1, margin: '0 0 3px' }}>
                                    Galeno {state.info.version}
                                </p>
                                <p style={{ fontSize: 11, color: tokens.colorNeutralForeground4, margin: '0 0 10px' }}>
                                    Versión actual: {state.info.currentVersion}
                                    {state.info.date && ` · ${new Date(state.info.date).toLocaleDateString()}`}
                                </p>
                                {state.info.body && (
                                    <pre style={{
                                        fontSize: 11, color: tokens.colorNeutralForeground3,
                                        background: tokens.colorNeutralBackground2,
                                        border: `1px solid ${tokens.colorNeutralStroke2}`,
                                        borderRadius: tokens.borderRadiusMedium,
                                        padding: '8px 10px', margin: 0,
                                        maxHeight: 120, overflowY: 'auto',
                                        whiteSpace: 'pre-wrap', fontFamily: 'inherit',
                                        lineHeight: 1.5,
                                    }}>
                                        {state.info.body}
                                    </pre>
                                )}
                            </div>
                            <PrimaryButton onClick={handleInstallUpdate}>
                                Descargar e instalar
                            </PrimaryButton>
                        </div>
                    </div>
                );

            case 'downloading':
                return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                        <div style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{
                                width: 22, height: 22, borderRadius: '50%',
                                border: `2px solid ${tokens.colorNeutralStroke1}`,
                                borderTopColor: tokens.colorBrandForeground,
                                animation: 'spin 0.8s linear infinite',
                            }} />
                        </div>
                        <div style={{ flex: 1, paddingTop: 2 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 600, color: tokens.colorNeutralForeground1, margin: '0 0 4px' }}>
                                Descargando actualización
                            </h2>
                            <p style={{ fontSize: 13, color: tokens.colorNeutralForeground3, margin: '0 0 14px' }}>
                                {state.progress}% completado
                            </p>
                            {/* Progress bar */}
                            <div style={{
                                height: 2, width: '100%', maxWidth: 360,
                                background: tokens.colorNeutralBackground4,
                                borderRadius: 2, overflow: 'hidden',
                            }}>
                                <motion.div
                                    style={{ height: '100%', background: tokens.colorBrandForeground, borderRadius: 2 }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${state.progress}%` }}
                                    transition={{ duration: 0.2 }}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'installing':
                return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                        <div style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RotateCw className="animate-spin" size={22} style={{ color: tokens.colorBrandForeground }} />
                        </div>
                        <div style={{ flex: 1, paddingTop: 2 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 600, color: tokens.colorNeutralForeground1, margin: '0 0 4px' }}>
                                Instalando...
                            </h2>
                            <p style={{ fontSize: 13, color: tokens.colorNeutralForeground3, margin: 0 }}>
                                La aplicación se reiniciará automáticamente cuando termine.
                            </p>
                        </div>
                    </div>
                );

            case 'done':
                return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                        <StatusIcon bg={tokens.colorPaletteGreenBackground} color={tokens.colorPaletteGreenForeground}>
                            <CheckCircle2 size={22} />
                        </StatusIcon>
                        <div style={{ flex: 1, paddingTop: 2 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 600, color: tokens.colorNeutralForeground1, margin: '0 0 4px' }}>
                                ¡Listo!
                            </h2>
                            <p style={{ fontSize: 13, color: tokens.colorNeutralForeground3, margin: 0 }}>
                                Reiniciando Galeno...
                            </p>
                        </div>
                    </div>
                );

            case 'error':
                return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                        <StatusIcon bg={tokens.colorPaletteRedBackground} color={tokens.colorPaletteRedForeground}>
                            <AlertCircle size={22} />
                        </StatusIcon>
                        <div style={{ flex: 1, paddingTop: 2 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 600, color: tokens.colorNeutralForeground1, margin: '0 0 4px' }}>
                                Algo salió mal
                            </h2>
                            <p style={{ fontSize: 13, color: tokens.colorNeutralForeground3, margin: '0 0 18px' }}>
                                {state.message}
                            </p>
                            <OutlineButton onClick={handleCheckForUpdates}>
                                <RefreshCw style={{ width: 13, height: 13 }} />
                                Reintentar
                            </OutlineButton>
                        </div>
                    </div>
                );
        }
    };

    // ─── Shell ─────────────────────────────────────────────────────────────
    return (
        <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            background: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1,
            fontFamily: 'inherit', userSelect: 'none', overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{ padding: '28px 32px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Package style={{ width: 20, height: 20, color: tokens.colorBrandForeground }} />
                    <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
                        Galeno Update
                    </h1>
                </div>
                {currentVersion && (
                    <p style={{ fontSize: 12, color: tokens.colorNeutralForeground4, margin: '0 0 4px', paddingLeft: 30 }}>
                        Versión {currentVersion}
                    </p>
                )}
                <button
                    onClick={notImplemented}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12, color: tokens.colorBrandForeground,
                        background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
                        marginLeft: 30,
                    }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                >
                    Opciones avanzadas
                    <ChevronRight style={{ width: 12, height: 12 }} />
                </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px' }}>

                {/* Hero card */}
                <div style={{
                    background: tokens.colorNeutralBackground2,
                    border: `1px solid ${tokens.colorNeutralStroke1}`,
                    borderRadius: tokens.borderRadiusXLarge,
                    padding: '20px 24px',
                    marginBottom: 16,
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Subtle mica gradient */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.025) 0%, transparent 60%)',
                        pointerEvents: 'none',
                    }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={state.type}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.18 }}
                            >
                                {renderCardContent()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* More options list */}
                <div>
                    <p style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: tokens.colorNeutralForeground4,
                        margin: '0 0 8px 2px',
                    }}>
                        Más opciones
                    </p>
                    <div style={{
                        background: tokens.colorNeutralBackground2,
                        border: `1px solid ${tokens.colorNeutralStroke1}`,
                        borderRadius: tokens.borderRadiusXLarge,
                        overflow: 'hidden',
                    }}>
                        {[
                            {
                                icon: <Pause style={{ width: 16, height: 16 }} />,
                                label: 'Pausar actualizaciones',
                                description: 'Pausar temporalmente las descargas automáticas',
                                badge: 'Por 1 semana',
                            },
                            {
                                icon: <Clock style={{ width: 16, height: 16 }} />,
                                label: 'Historial de actualizaciones',
                                description: 'Ver qué se ha instalado recientemente',
                                badge: null,
                            },
                        ].map((item, i, arr) => (
                            <button
                                key={item.label}
                                onClick={notImplemented}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center',
                                    justifyContent: 'space-between', gap: 12,
                                    padding: '14px 18px', textAlign: 'left',
                                    background: 'transparent', border: 'none',
                                    borderBottom: i < arr.length - 1 ? `1px solid ${tokens.colorNeutralStroke2}` : 'none',
                                    cursor: 'pointer',
                                    transition: `background ${tokens.durationNormal}`,
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = tokens.colorNeutralBackground3}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <span style={{ color: tokens.colorNeutralForeground3 }}>{item.icon}</span>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 500, color: tokens.colorNeutralForeground1, margin: '0 0 2px' }}>
                                            {item.label}
                                        </p>
                                        <p style={{ fontSize: 11, color: tokens.colorNeutralForeground4, margin: 0 }}>
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    {item.badge && (
                                        <span style={{
                                            fontSize: 11, padding: '2px 8px',
                                            background: tokens.colorNeutralBackground3,
                                            border: `1px solid ${tokens.colorNeutralStroke1}`,
                                            borderRadius: tokens.borderRadiusMedium,
                                            color: tokens.colorNeutralForeground3,
                                        }}>
                                            {item.badge}
                                        </span>
                                    )}
                                    <ChevronRight style={{ width: 14, height: 14, color: tokens.colorNeutralForeground4 }} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* CSS for spin animation */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}