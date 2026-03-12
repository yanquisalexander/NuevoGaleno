/**
 * DynamicIslandToaster — iPhone Dynamic Island–style toasts
 *
 * Uses useSonner() to subscribe to the sonner toast store and renders
 * each toast with framer-motion spring animations. The <Toaster /> from
 * sonner should be removed from App.tsx and this component placed instead.
 */

import { useEffect, useRef } from 'react';
import { useSonner, toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react';
import type { ToastT, Action } from 'sonner';

// ─── Design tokens ──────────────────────────────────────────────────────────

const TYPE_CONFIG = {
    success: {
        iconColor: '#34c759',
        glow: 'rgba(52,199,89,0.20)',
        border: 'rgba(52,199,89,0.22)',
        Icon: CheckCircle2,
    },
    error: {
        iconColor: '#ff453a',
        glow: 'rgba(255,69,58,0.20)',
        border: 'rgba(255,69,58,0.22)',
        Icon: XCircle,
    },
    warning: {
        iconColor: '#ff9f0a',
        glow: 'rgba(255,159,10,0.18)',
        border: 'rgba(255,159,10,0.22)',
        Icon: AlertTriangle,
    },
    info: {
        iconColor: '#0a84ff',
        glow: 'rgba(10,132,255,0.20)',
        border: 'rgba(10,132,255,0.22)',
        Icon: Info,
    },
    loading: {
        iconColor: 'rgba(255,255,255,0.5)',
        glow: 'transparent',
        border: 'rgba(255,255,255,0.10)',
        Icon: Loader2,
    },
    default: {
        iconColor: 'rgba(255,255,255,0.6)',
        glow: 'transparent',
        border: 'rgba(255,255,255,0.10)',
        Icon: Info,
    },
} as const;

// ─── Individual toast ────────────────────────────────────────────────────────

function ToastItem({ t, onDismiss }: { t: ToastT; onDismiss: () => void }) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const type = (t.type ?? 'default') as keyof typeof TYPE_CONFIG;
    const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.default;
    const { Icon } = cfg;
    const isLoading = type === 'loading';

    const duration = t.duration ?? 4000;

    useEffect(() => {
        if (duration === Infinity || duration === 0) return;
        timerRef.current = setTimeout(onDismiss, duration);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [duration, onDismiss]);

    const title = typeof t.title === 'function' ? t.title() : t.title;
    const description = typeof t.description === 'function' ? t.description() : t.description;

    if (t.jsx) {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, scaleX: 0.2, scaleY: 0.3, y: -24 }}
                animate={{ opacity: 1, scaleX: 1, scaleY: 1, y: 0 }}
                exit={{ opacity: 0, scaleX: 0.15, scaleY: 0.25, y: -20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.8 }}
                style={{ originX: '50%', originY: '0%' }}
            >
                {t.jsx}
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            /* Dynamic Island spring — small pill → full size from top-center */
            initial={{ opacity: 0, scaleX: 0.15, scaleY: 0.25, y: -20 }}
            animate={{ opacity: 1, scaleX: 1, scaleY: 1, y: 0 }}
            exit={{ opacity: 0, scaleX: 0.15, scaleY: 0.2, y: -18 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.75 }}
            style={{ originX: '50%', originY: '0%' }}
            onClick={() => { if (t.dismissible !== false) onDismiss(); }}
            role="status"
            aria-live="polite"
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px 10px 12px',
                    borderRadius: '26px',
                    background: 'rgba(10,10,10,0.88)',
                    backdropFilter: 'blur(28px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(160%)',
                    border: `1px solid ${cfg.border}`,
                    boxShadow: [
                        'inset 0 1px 0 rgba(255,255,255,0.07)',
                        '0 4px 12px rgba(0,0,0,0.6)',
                        '0 16px 40px rgba(0,0,0,0.5)',
                        `0 0 28px ${cfg.glow}`,
                    ].join(', '),
                    maxWidth: '360px',
                    userSelect: 'none',
                    cursor: t.dismissible !== false ? 'pointer' : 'default',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Subtle glass highlight */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: '50%',
                    borderRadius: '26px 26px 0 0',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
                    pointerEvents: 'none',
                }} />

                {/* Icon */}
                <div style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: cfg.iconColor,
                }}>
                    <Icon
                        size={17}
                        style={isLoading ? { animation: 'di-spin 1s linear infinite' } : undefined}
                    />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {title && (
                        <div style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.96)',
                            lineHeight: 1.3,
                            letterSpacing: '-0.01em',
                            whiteSpace: description ? 'nowrap' : 'normal',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {title}
                        </div>
                    )}
                    {description && (
                        <div style={{
                            fontSize: '11.5px',
                            fontWeight: 400,
                            color: 'rgba(255,255,255,0.48)',
                            lineHeight: 1.3,
                            marginTop: '2px',
                            letterSpacing: '-0.005em',
                        }}>
                            {description}
                        </div>
                    )}
                </div>

                {/* Action button */}
                {t.action && 'label' in (t.action as object) && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            (t.action as unknown as Action).onClick(e);
                            onDismiss();
                        }}
                        style={{
                            flexShrink: 0,
                            padding: '4px 11px',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.14)',
                            background: 'rgba(255,255,255,0.09)',
                            color: 'rgba(255,255,255,0.88)',
                            fontSize: '11.5px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            letterSpacing: '-0.01em',
                            transition: 'background 0.15s',
                            fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
                    >
                        {(t.action as { label: string }).label}
                    </button>
                )}

                {/* Close button (shown on hover via CSS) */}
                {t.closeButton && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                        style={{
                            flexShrink: 0,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'background 0.15s, color 0.15s',
                            fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                        }}
                    >
                        <X size={11} />
                    </button>
                )}
            </div>
        </motion.div>
    );
}

// ─── Container ───────────────────────────────────────────────────────────────

export function DynamicIslandToaster() {
    const { toasts } = useSonner();

    // Only show non-dismissed toasts
    const visible = toasts.filter(t => !('delete' in t && t.delete));

    return (
        <>
            {/* Keyframe for loading spinner */}
            <style>{`@keyframes di-spin { to { transform: rotate(360deg); } }`}</style>

            <div
                aria-label="Notificaciones"
                style={{
                    position: 'fixed',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    pointerEvents: 'none',
                }}
            >
                <AnimatePresence mode="sync">
                    {visible.map((t) => (
                        <div key={t.id} style={{ pointerEvents: 'auto' }}>
                            <ToastItem
                                t={t as ToastT}
                                onDismiss={() => toast.dismiss(t.id)}
                            />
                        </div>
                    ))}
                </AnimatePresence>
            </div>
        </>
    );
}
