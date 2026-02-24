import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    Bell,
    X,
    ChevronRight,
    Settings,
    Clock,
    Globe,
    Server,
    Laptop,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Info
} from 'lucide-react';
import { useNotifications, Notification } from '../contexts/NotificationContext';
import { useNode } from '../contexts/NodeContext';

interface NotificationCenterPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// Fluent UI v9 — Dark Mode Design Tokens
const fluent = {
    // Surface (dark)
    surfacePrimary: '#1C1C1C',
    surfaceSecondary: '#141414',
    surfaceTertiary: '#282828',
    surfaceOverlay: 'rgba(0,0,0,0.55)',
    surfaceHover: 'rgba(255,255,255,0.06)',
    surfacePressed: 'rgba(255,255,255,0.04)',
    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#B3B3B3',
    textDisabled: '#666666',
    // Brand (dark variant — Fluent uses #479EF5 on dark)
    brand: '#479EF5',
    brandHover: '#62ABFF',
    brandLight: 'rgba(71,158,245,0.1)',
    brandBorder: 'rgba(71,158,245,0.3)',
    // Status (dark variants)
    success: '#6CCB5F',
    successBg: 'rgba(108,203,95,0.1)',
    successBorder: 'rgba(108,203,95,0.25)',
    error: '#F1707B',
    errorBg: 'rgba(241,112,123,0.1)',
    errorBorder: 'rgba(241,112,123,0.25)',
    warning: '#FCE100',
    warningBg: 'rgba(252,225,0,0.08)',
    warningBorder: 'rgba(252,225,0,0.22)',
    info: '#479EF5',
    infoBg: 'rgba(71,158,245,0.1)',
    infoBorder: 'rgba(71,158,245,0.25)',
    // Borders
    borderSubtle: 'rgba(255,255,255,0.08)',
    borderMedium: 'rgba(255,255,255,0.12)',
    // Shadows (más pronunciadas en dark)
    shadow64: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
};

const notificationConfig = {
    success: {
        icon: CheckCircle2,
        color: fluent.success,
        bg: fluent.successBg,
        border: fluent.successBorder,
    },
    error: {
        icon: AlertCircle,
        color: fluent.error,
        bg: fluent.errorBg,
        border: fluent.errorBorder,
    },
    warning: {
        icon: AlertTriangle,
        color: '#B07C00',
        bg: fluent.warningBg,
        border: fluent.warningBorder,
    },
    info: {
        icon: Info,
        color: fluent.info,
        bg: fluent.infoBg,
        border: fluent.infoBorder,
    },
};

function NotificationItem({ notification }: { notification: Notification }) {
    const { removeNotification } = useNotifications();
    const cfg = notificationConfig[notification.type as keyof typeof notificationConfig] ?? notificationConfig.info;
    const IconComponent = cfg.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.15, ease: [0.33, 1, 0.68, 1] }}
            style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: '6px',
                position: 'relative',
                cursor: 'default',
            }}
            className="fluent-notification-item"
        >
            {/* Left accent bar */}
            <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '3px',
                borderRadius: '6px 0 0 6px',
                background: cfg.color,
            }} />

            <div style={{ flexShrink: 0, paddingLeft: '4px' }}>
                <IconComponent style={{ width: '16px', height: '16px', color: cfg.color, marginTop: '1px' }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: fluent.textPrimary,
                        fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
                        lineHeight: '18px',
                    }}>
                        {notification.title}
                    </span>
                    <button
                        onClick={() => removeNotification(notification.id)}
                        style={{
                            flexShrink: 0,
                            padding: '2px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            color: fluent.textSecondary,
                            transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        aria-label="Cerrar notificación"
                    >
                        <X style={{ width: '14px', height: '14px' }} />
                    </button>
                </div>

                {notification.message && (
                    <p style={{
                        fontSize: '12px',
                        color: fluent.textSecondary,
                        marginTop: '2px',
                        lineHeight: '16px',
                        fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
                    }}>
                        {notification.message}
                    </p>
                )}

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '6px',
                    color: fluent.textDisabled,
                }}>
                    <Clock style={{ width: '11px', height: '11px' }} />
                    <span style={{
                        fontSize: '11px',
                        fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
                    }}>
                        {notification.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

// Fluent Divider
function Divider() {
    return (
        <div style={{
            height: '1px',
            background: fluent.borderSubtle,
            margin: '0',
        }} />
    );
}

// Fluent Section Header
function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: fluent.textDisabled,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
        }}>
            {children}
        </span>
    );
}

export function NotificationCenterPanel({ isOpen, onClose }: NotificationCenterPanelProps) {
    const { notifications, clearAll } = useNotifications();
    const { activeContext } = useNode();

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: fluent.surfaceOverlay,
                            zIndex: 60,
                        }}
                    />

                    {/* Drawer — Fluent UI v9 Drawer pattern */}
                    <motion.div
                        initial={{ x: 380 }}
                        animate={{ x: 0 }}
                        exit={{ x: 380 }}
                        transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            height: '100%',
                            width: '360px',
                            background: fluent.surfacePrimary,
                            backdropFilter: 'saturate(180%) blur(20px)',
                            WebkitBackdropFilter: 'saturate(180%) blur(20px)',
                            boxShadow: fluent.shadow64,
                            zIndex: 61,
                            display: 'flex',
                            flexDirection: 'column',
                            fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
                            borderLeft: `1px solid ${fluent.borderMedium}`,
                        }}
                    >
                        {/* ── Header ── */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px 15px',
                            borderBottom: `1px solid ${fluent.borderSubtle}`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Bell style={{ width: '18px', height: '18px', color: fluent.brand }} />
                                <span style={{
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    color: fluent.textPrimary,
                                    letterSpacing: '-0.01em',
                                }}>
                                    Notificaciones
                                </span>
                                {notifications.length > 0 && (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minWidth: '20px',
                                        height: '20px',
                                        padding: '0 6px',
                                        background: fluent.brand,
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        borderRadius: '10px',
                                    }}>
                                        {notifications.length}
                                    </span>
                                )}
                            </div>

                            {/* Fluent Close Button */}
                            <button
                                onClick={onClose}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    border: `1px solid transparent`,
                                    background: 'transparent',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: fluent.textSecondary,
                                    transition: 'background 0.1s, border-color 0.1s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(0,0,0,0.06)';
                                    e.currentTarget.style.borderColor = fluent.borderSubtle;
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                                aria-label="Cerrar panel"
                            >
                                <X style={{ width: '16px', height: '16px' }} />
                            </button>
                        </div>

                        {/* ── Body (scrollable) ── */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>

                            {/* Estado del Sistema */}
                            {activeContext && (
                                <>
                                    <div style={{ padding: '16px 20px 12px' }}>
                                        <SectionHeader>Estado del Sistema</SectionHeader>

                                        <div style={{
                                            marginTop: '10px',
                                            padding: '12px 14px',
                                            background: activeContext.mode === 'remote'
                                                ? fluent.brandLight
                                                : fluent.surfaceSecondary,
                                            border: `1px solid ${activeContext.mode === 'remote' ? fluent.brandBorder : fluent.borderSubtle}`,
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '12px',
                                        }}>
                                            <div style={{
                                                flexShrink: 0,
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '6px',
                                                background: activeContext.mode === 'remote'
                                                    ? fluent.brand
                                                    : 'rgba(0,0,0,0.08)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                                {activeContext.mode === 'remote' ? (
                                                    <Globe style={{ width: '16px', height: '16px', color: '#fff' }} />
                                                ) : (
                                                    <Laptop style={{ width: '16px', height: '16px', color: fluent.textSecondary }} />
                                                )}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                                    <span style={{
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: fluent.textPrimary,
                                                    }}>
                                                        {activeContext.mode === 'remote' ? 'Servidor Remoto' : 'Modo Local'}
                                                    </span>

                                                    {activeContext.mode === 'remote' && (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            padding: '1px 7px',
                                                            background: fluent.successBg,
                                                            border: `1px solid ${fluent.successBorder}`,
                                                            borderRadius: '10px',
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            color: fluent.success,
                                                        }}>
                                                            <span style={{
                                                                width: '6px',
                                                                height: '6px',
                                                                borderRadius: '50%',
                                                                background: fluent.success,
                                                                display: 'inline-block',
                                                            }} />
                                                            Conectado
                                                        </span>
                                                    )}
                                                </div>

                                                <span style={{
                                                    fontSize: '12px',
                                                    color: fluent.textSecondary,
                                                    display: 'block',
                                                    marginBottom: activeContext.apiBaseUrl ? '8px' : 0,
                                                }}>
                                                    {activeContext.nodeName}
                                                </span>

                                                {activeContext.mode === 'remote' && activeContext.apiBaseUrl && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '4px 8px',
                                                        background: 'rgba(0,0,0,0.05)',
                                                        border: `1px solid ${fluent.borderSubtle}`,
                                                        borderRadius: '4px',
                                                    }}>
                                                        <Server style={{ width: '11px', height: '11px', color: fluent.textDisabled, flexShrink: 0 }} />
                                                        <span style={{
                                                            fontSize: '11px',
                                                            color: fluent.textSecondary,
                                                            fontFamily: "'Cascadia Code', 'Consolas', monospace",
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            {activeContext.apiBaseUrl}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Divider />
                                </>
                            )}

                            {/* Lista de Notificaciones */}
                            <div style={{ padding: '16px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <SectionHeader>Recientes</SectionHeader>
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={clearAll}
                                            style={{
                                                fontSize: '12px',
                                                color: fluent.brand,
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
                                                fontWeight: 500,
                                                transition: 'background 0.1s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = fluent.brandLight}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            Limpiar todo
                                        </button>
                                    )}
                                </div>

                                {notifications.length === 0 ? (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '40px 20px',
                                        textAlign: 'center',
                                        gap: '8px',
                                    }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            background: fluent.surfaceSecondary,
                                            border: `1px solid ${fluent.borderSubtle}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: '4px',
                                        }}>
                                            <Bell style={{ width: '22px', height: '22px', color: fluent.textDisabled }} />
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: fluent.textSecondary }}>
                                            Sin notificaciones
                                        </span>
                                        <span style={{ fontSize: '12px', color: fluent.textDisabled, maxWidth: '200px', lineHeight: '16px' }}>
                                            Las nuevas notificaciones del sistema aparecerán aquí
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <AnimatePresence mode="popLayout">
                                            {notifications.map((notification) => (
                                                <NotificationItem
                                                    key={notification.id}
                                                    notification={notification}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Footer ── */}
                        <div style={{
                            borderTop: `1px solid ${fluent.borderSubtle}`,
                            padding: '12px 20px',
                            background: fluent.surfaceSecondary,
                        }}>
                            <button
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    background: 'transparent',
                                    border: `1px solid transparent`,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'background 0.1s, border-color 0.1s',
                                    fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                                    e.currentTarget.style.borderColor = fluent.borderSubtle;
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Settings style={{ width: '16px', height: '16px', color: fluent.textSecondary }} />
                                    <span style={{ fontSize: '13px', fontWeight: 500, color: fluent.textPrimary }}>
                                        Configuración de notificaciones
                                    </span>
                                </div>
                                <ChevronRight style={{ width: '14px', height: '14px', color: fluent.textDisabled }} />
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}