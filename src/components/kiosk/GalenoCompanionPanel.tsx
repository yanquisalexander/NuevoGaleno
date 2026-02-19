import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, FileText, ImageIcon, ChevronRight, Smartphone, Wifi, Upload } from 'lucide-react';
import { useNotImplemented } from '@/utils/system/NotImplemented';

// ─── Fluent Design Tokens ─────────────────────────────────────────────────────
const tokens = {
    // Surfaces (dark theme)
    bg1: '#202020',
    bg2: '#2c2c2c',
    bg3: '#383838',
    bg4: '#404040',

    // Foregrounds
    fg1: 'rgba(255,255,255,0.9)',
    fg2: 'rgba(255,255,255,0.62)',
    fg3: 'rgba(255,255,255,0.4)',
    fg4: 'rgba(255,255,255,0.22)',

    // Strokes
    stroke1: 'rgba(255,255,255,0.082)',
    stroke2: 'rgba(255,255,255,0.05)',

    // Brand
    brand: '#0078d4',
    brandHover: '#1684d8',
    brandPress: '#006cbd',
    brandFg: '#60b0ff',

    // Radii
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,

    // Font
    font: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
    fontDisplay: '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif',
} as const;

// ─── Fluent Button (subtle variant) ──────────────────────────────────────────
function SubtleButton({
    children, onClick, icon, fullWidth,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}) {
    const [s, setS] = useState<'idle' | 'hover' | 'press'>('idle');
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setS('hover')}
            onMouseLeave={() => setS('idle')}
            onMouseDown={() => setS('press')}
            onMouseUp={() => setS('hover')}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '6px 12px', borderRadius: tokens.md,
                width: fullWidth ? '100%' : undefined,
                background: s === 'press' ? 'rgba(255,255,255,0.05)'
                    : s === 'hover' ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: `1px solid ${s === 'hover' || s === 'press' ? tokens.stroke1 : tokens.stroke2}`,
                color: s === 'press' ? tokens.fg3 : tokens.fg2,
                fontSize: 12, fontWeight: 400,
                fontFamily: tokens.font,
                cursor: 'default',
                transition: 'background 0.1s, border-color 0.1s, color 0.1s',
                whiteSpace: 'nowrap',
            }}
        >
            {icon}
            {children}
        </button>
    );
}

// ─── Fluent Button (primary/brand variant) ────────────────────────────────────
function PrimaryButton({
    children, onClick, icon, fullWidth,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}) {
    const [s, setS] = useState<'idle' | 'hover' | 'press'>('idle');
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setS('hover')}
            onMouseLeave={() => setS('idle')}
            onMouseDown={() => setS('press')}
            onMouseUp={() => setS('hover')}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '7px 16px', borderRadius: tokens.md,
                width: fullWidth ? '100%' : undefined,
                background: s === 'press' ? tokens.brandPress
                    : s === 'hover' ? tokens.brandHover : tokens.brand,
                border: `1px solid rgba(255,255,255,${s === 'press' ? 0 : 0.08})`,
                boxShadow: s === 'idle' ? 'inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
                color: '#fff',
                fontSize: 12, fontWeight: 600,
                fontFamily: tokens.font,
                cursor: 'default',
                transition: 'background 0.1s, box-shadow 0.1s',
                whiteSpace: 'nowrap',
            }}
        >
            {icon}
            {children}
        </button>
    );
}

// ─── File row item ────────────────────────────────────────────────────────────
function FileRow({ icon, title, sub, onClick }: {
    icon: React.ReactNode;
    title: string;
    sub: string;
    onClick?: () => void;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 8px', borderRadius: tokens.md,
                background: hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: 'none', cursor: 'default', textAlign: 'left', width: '100%',
                transition: 'background 0.1s',
            }}
        >
            {/* File icon container */}
            <div style={{
                width: 32, height: 32, borderRadius: tokens.md,
                background: tokens.bg3,
                border: `1px solid ${tokens.stroke1}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: tokens.fg3, flexShrink: 0,
            }}>
                {icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 12, color: tokens.fg1, fontFamily: tokens.font,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontWeight: 400,
                }}>
                    {title}
                </div>
                <div style={{ fontSize: 11, color: tokens.fg4, fontFamily: tokens.font, marginTop: 1 }}>
                    {sub}
                </div>
            </div>

            <ChevronRight
                size={12}
                style={{
                    color: tokens.fg4, flexShrink: 0,
                    opacity: hovered ? 1 : 0,
                    transition: 'opacity 0.1s',
                }}
            />
        </button>
    );
}

// ─── "Coming soon" badge ──────────────────────────────────────────────────────
function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '1px 7px', borderRadius: 100,
            background: 'rgba(0,120,212,0.15)',
            border: '1px solid rgba(0,120,212,0.3)',
            color: tokens.brandFg,
            fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
            fontFamily: tokens.font,
            textTransform: 'uppercase',
        }}>
            {children}
        </span>
    );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
    return <div style={{ height: 1, background: tokens.stroke2, margin: '0 -1px' }} />;
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: tokens.fg4,
            fontFamily: tokens.font,
            marginBottom: 6,
        }}>
            {children}
        </p>
    );
}

// ─── Companion Panel ──────────────────────────────────────────────────────────
export function GalenoCompanionPanel({ visible = true, placement = 'tray', width = 316, bottom = 48, left = 538, right = 12 }: { visible?: boolean; placement?: 'tray' | 'start'; width?: number | string; bottom?: number | string; left?: number | string; right?: number | string; }) {
    const notImplemented = useNotImplemented();

    const posStyle: any = {
        position: 'fixed',
        bottom,
        width,
        zIndex: 49,
        display: 'flex',
        flexDirection: 'column',

        // Fluent panel surface
        background: 'rgba(40,40,40,0.94)',
        backdropFilter: 'blur(60px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(60px) saturate(1.5)',
        borderRadius: tokens.xl,
        border: `1px solid ${tokens.stroke1}`,
        boxShadow: [
            '0 32px 64px rgba(0,0,0,0.45)',
            '0 8px 16px rgba(0,0,0,0.2)',
            `inset 0 1px 0 rgba(255,255,255,0.06)`,
        ].join(', '),
        overflow: 'hidden',
    };

    if (placement === 'tray') posStyle.right = right; else posStyle.left = left;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 420, mass: 0.7 }}
                    style={posStyle}
                >
                    {/* ── App Header ── */}
                    <div style={{ padding: '16px 16px 14px' }}>
                        {/* App identity row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                            {/* App icon */}
                            <div style={{
                                width: 44, height: 44, borderRadius: tokens.lg,
                                background: 'linear-gradient(145deg, #0078d4 0%, #00b4ef 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,120,212,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                                flexShrink: 0,
                            }}>
                                <Smartphone size={20} style={{ color: '#fff' }} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                    <span style={{
                                        fontSize: 13, fontWeight: 600,
                                        color: tokens.fg1, fontFamily: tokens.fontDisplay,
                                        letterSpacing: '-0.01em',
                                    }}>
                                        Galeno Companion
                                    </span>
                                    <Badge>Próximamente</Badge>
                                </div>
                                <div style={{
                                    fontSize: 11, color: tokens.fg4,
                                    fontFamily: tokens.font,
                                    display: 'flex', alignItems: 'center', gap: 5,
                                }}>
                                    <Wifi size={10} />
                                    Conecta tu dispositivo móvil
                                </div>
                            </div>
                        </div>

                        {/* CTA buttons */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <PrimaryButton
                                onClick={notImplemented}
                                icon={<Upload size={12} />}
                                fullWidth
                            >
                                Enviar archivos
                            </PrimaryButton>
                            <SubtleButton onClick={notImplemented} icon={<ImageIcon size={12} />}>
                                Fotos
                            </SubtleButton>
                        </div>
                    </div>

                    <Divider />

                    {/* ── Recent files ── */}
                    <div style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
                        <div style={{ padding: '0 8px', marginBottom: 8 }}>
                            <SectionLabel>Recientes</SectionLabel>
                        </div>

                        <FileRow
                            onClick={notImplemented}
                            icon={<FileText size={14} />}
                            title="Informe_Paciente.pdf"
                            sub="Hace 2 días · 348 KB"
                        />
                        <FileRow
                            onClick={notImplemented}
                            icon={<ImageIcon size={14} />}
                            title="Foto_ortodoncia.jpg"
                            sub="Ayer · 1.2 MB"
                        />

                        {/* Empty state note */}
                        <div style={{
                            margin: '10px 8px 0',
                            padding: '10px 12px',
                            borderRadius: tokens.md,
                            background: tokens.bg3,
                            border: `1px solid ${tokens.stroke2}`,
                        }}>
                            <p style={{
                                fontSize: 11, color: tokens.fg4,
                                fontFamily: tokens.font, lineHeight: 1.5,
                                margin: 0,
                            }}>
                                La actividad del Companion aparecerá aquí cuando la integración esté disponible.
                            </p>
                        </div>
                    </div>

                    <Divider />

                    {/* ── Footer ── */}
                    <div style={{
                        padding: '12px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 8,
                    }}>
                        <span style={{
                            fontSize: 11, color: tokens.fg4,
                            fontFamily: tokens.font,
                            display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                            <Phone size={11} />
                            No hay dispositivo vinculado
                        </span>

                        <SubtleButton onClick={notImplemented} icon={<ChevronRight size={12} />}>
                            Más opciones
                        </SubtleButton>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}