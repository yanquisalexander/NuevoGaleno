import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface StartupContext {
    app_version: string;
    updated_from: string | null;
    was_updated: boolean;
    migrations_applied: number;
    schema_version: number;
    temp_dirs_cleaned: number;
    bytes_freed: number;
}

// XP-style segmented progress bar (the iconic "worm")
function XPProgressBar({ active }: { active: boolean }) {
    const SEGMENTS = 3;
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        if (!active) return;
        const id = setInterval(() => setOffset(o => (o + 1) % 15), 80);
        return () => clearInterval(id);
    }, [active]);

    // 15 cells total, 3 lit segments travel across
    const cells = Array.from({ length: 15 }, (_, i) => {
        const pos = (i - offset + 15) % 15;
        const lit = pos < SEGMENTS;
        // Gradient: leading cell brightest
        const brightness = lit ? 1 - (SEGMENTS - 1 - pos) * 0.28 : 0;
        return brightness;
    });

    return (
        <div style={{
            display: 'flex',
            gap: '3px',
            alignItems: 'center',
        }}>
            {cells.map((b, i) => (
                <div
                    key={i}
                    style={{
                        width: 12,
                        height: 12,
                        borderRadius: '2px',
                        background: b > 0
                            ? `rgba(96,205,255,${b})`
                            : 'rgba(255,255,255,0.06)',
                        boxShadow: b > 0.8
                            ? `0 0 6px #60cdff, 0 0 12px rgba(96,205,255,0.4)`
                            : b > 0
                                ? `0 0 4px rgba(96,205,255,0.3)`
                                : 'none',
                        transition: 'background 0.05s, box-shadow 0.05s',
                        border: '1px solid rgba(255,255,255,0.04)',
                    }}
                />
            ))}
        </div>
    );
}

function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function buildStartupMessages(ctx: StartupContext): string[] {
    const msgs: string[] = [];

    if (ctx.was_updated && ctx.updated_from) {
        msgs.push(`Actualizando desde v${ctx.updated_from}...`);
    }

    if (ctx.migrations_applied > 0) {
        const plural = ctx.migrations_applied === 1 ? 'migración' : 'migraciones';
        msgs.push(`Aplicando ${ctx.migrations_applied} ${plural} de base de datos...`);
    }

    if (ctx.temp_dirs_cleaned > 0) {
        const label = ctx.bytes_freed > 0
            ? `Liberando ${formatBytes(ctx.bytes_freed)} de importaciones anteriores...`
            : `Limpiando ${ctx.temp_dirs_cleaned} archivo${ctx.temp_dirs_cleaned > 1 ? 's' : ''} temporal${ctx.temp_dirs_cleaned > 1 ? 'es' : ''}...`;
        msgs.push(label);
    }

    msgs.push('Cargando configuración...');
    msgs.push('Preparando entorno...');
    return msgs;
}

const MSG_VISIBLE_MS = 700;
const MSG_FADE_MS = 180;
const MIN_SPLASH_MS = 2800;

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [statusMsg, setStatusMsg] = useState('Iniciando Nuevo Galeno...');
    const [msgVisible, setMsgVisible] = useState(true);
    const cancelledRef = useRef(false);

    useEffect(() => {
        cancelledRef.current = false;
        const startTime = Date.now();

        const t1 = setTimeout(() => setVisible(true), 100);

        const changeMessage = (msg: string, onShown?: () => void) => {
            setMsgVisible(false);
            setTimeout(() => {
                if (cancelledRef.current) return;
                setStatusMsg(msg);
                setMsgVisible(true);
                if (onShown) setTimeout(onShown, MSG_VISIBLE_MS);
            }, MSG_FADE_MS);
        };

        const playMessages = (msgs: string[], onDone: () => void) => {
            if (msgs.length === 0) { onDone(); return; }
            const [first, ...rest] = msgs;
            changeMessage(first, () => playMessages(rest, onDone));
        };

        const finish = () => {
            if (cancelledRef.current) return;
            const elapsed = Date.now() - startTime;
            const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
            setTimeout(() => {
                if (cancelledRef.current) return;
                setExiting(true);
                setTimeout(() => { if (!cancelledRef.current) onComplete?.(); }, 700);
            }, wait);
        };

        invoke<StartupContext>('run_startup_sequence')
            .then(ctx => {
                if (cancelledRef.current) return;
                playMessages(buildStartupMessages(ctx), finish);
            })
            .catch(() => {
                // Si el comando falla (ej: en web dev sin backend), continúa con mensajes genéricos
                if (cancelledRef.current) return;
                playMessages(['Cargando configuración...', 'Preparando entorno...'], finish);
            });

        return () => {
            cancelledRef.current = true;
            clearTimeout(t1);
        };
    }, []);

    return (
        <>
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 1.5px solid rgba(255,255,255,0.15);
          border-top-color: rgba(255,255,255,0.75);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>

            <div style={{
                position: "fixed", inset: 0, zIndex: 9999,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                background: "#1a1a1a",
                fontFamily: '-apple-system, "Helvetica Neue", sans-serif',
                transition: "opacity 0.7s ease",
                opacity: exiting ? 0 : visible ? 1 : 0,
                pointerEvents: exiting ? "none" : "auto",
            }}>

                {/* App icon */}
                <div style={{
                    width: 80, height: 80,
                    borderRadius: 18,
                    background: "linear-gradient(145deg, #2a9df4, #1a6fc4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 20,
                    boxShadow: "0 8px 32px rgba(42,157,244,0.3), 0 2px 8px rgba(0,0,0,0.4)",
                    transition: "opacity 0.6s ease, transform 0.6s ease",
                    opacity: visible ? 1 : 0,
                    transform: visible ? "scale(1)" : "scale(0.85)",
                }}>
                    <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
                        <path d="M21 8C14 8 9 14 9 21s5 13 12 13 12-6 12-13S28 8 21 8z"
                            fill="white" fillOpacity="0.9" />
                        <path d="M21 14v7l5 3" stroke="#1a6fc4" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                {/* App name */}
                <div style={{
                    fontSize: 17,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.9)",
                    letterSpacing: "-0.01em",
                    marginBottom: 4,
                    transition: "opacity 0.6s 0.15s ease",
                    opacity: visible ? 1 : 0,
                }}>
                    Nuevo Galeno
                </div>

                {/* Subtitle */}
                <div style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.35)",
                    letterSpacing: "0.01em",
                    marginBottom: 36,
                    transition: "opacity 0.6s 0.25s ease",
                    opacity: visible ? 1 : 0,
                }}>
                    Alexitoo.Dev
                </div>

                {/* macOS spinner */}
                <div style={{
                    transition: "opacity 0.6s 0.4s ease",
                    opacity: visible ? 1 : 0,
                }}>
                    <div className="spinner" />
                </div>

                {/* Status message */}
                <div style={{
                    marginTop: 20,
                    fontSize: 11.5,
                    color: "rgba(255,255,255,0.38)",
                    letterSpacing: "0.01em",
                    fontWeight: 400,
                    minHeight: 18,
                    transition: `opacity ${MSG_FADE_MS}ms ease`,
                    opacity: visible && msgVisible ? 1 : 0,
                    userSelect: "none",
                }}>
                    {statusMsg}
                </div>
            </div>
        </>
    );
}