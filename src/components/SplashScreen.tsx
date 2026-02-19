import { useEffect, useState } from 'react';

const t = {
    bg: '#0a0a0a',
    fg1: '#ffffff',
    fg4: '#707070',
    brand: '#60cdff',
    brandDim: 'rgba(96,205,255,0.15)',
    fontFamily: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
};

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
                            ? `0 0 6px ${t.brand}, 0 0 12px rgba(96,205,255,0.4)`
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

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
    const [phase, setPhase] = useState<'enter' | 'boot' | 'exiting'>('enter');
    const [statusText, setStatusText] = useState('');
    const [progress, setProgress] = useState(0);
    const [logoVisible, setLogoVisible] = useState(false);
    const [taglineVisible, setTaglineVisible] = useState(false);
    const [barVisible, setBarVisible] = useState(false);
    const [statusVisible, setStatusVisible] = useState(false);

    useEffect(() => {
        // Staggered entrance — mimics XP boot sequence timing
        const t0 = setTimeout(() => setLogoVisible(true), 300);
        const t1 = setTimeout(() => setTaglineVisible(true), 700);
        const t2 = setTimeout(() => { setBarVisible(true); setPhase('boot'); }, 1100);
        const t3 = setTimeout(() => setStatusVisible(true), 1300);
        return () => [t0, t1, t2, t3].forEach(clearTimeout);
    }, []);

    useEffect(() => {
        if (phase !== 'boot') return;
        const steps = [
            { at: 200, pct: 15, text: 'Iniciando servicios…' },
            { at: 900, pct: 35, text: 'Cargando módulos…' },
            { at: 1800, pct: 58, text: 'Aplicando configuración…' },
            { at: 2800, pct: 78, text: 'Preparando interfaz…' },
            { at: 3600, pct: 92, text: 'Finalizando…' },
            { at: 4400, pct: 100, text: 'Listo' },
        ];
        const timers = steps.map(s =>
            setTimeout(() => {
                setProgress(s.pct);
                setStatusText(s.text);
                if (s.pct === 100) {
                    setTimeout(() => setPhase('exiting'), 600);
                    setTimeout(onComplete, 1500);
                }
            }, s.at)
        );
        return () => timers.forEach(clearTimeout);
    }, [phase, onComplete]);

    const isExiting = phase === 'exiting';

    return (
        <>
            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes logoPulse {
                    0%,100% { filter: drop-shadow(0 0 0px rgba(96,205,255,0)); }
                    50%     { filter: drop-shadow(0 0 24px rgba(96,205,255,0.18)); }
                }
                @keyframes scanline {
                    0%   { transform: translateY(-100%); }
                    100% { transform: translateY(100vh); }
                }
                .splash-logo    { animation: fadeUp   0.7s cubic-bezier(0,0,0.2,1) both, logoPulse 4s 1s ease-in-out infinite; }
                .splash-tagline { animation: fadeUp   0.6s cubic-bezier(0,0,0.2,1) both; }
                .splash-bar     { animation: fadeIn   0.5s cubic-bezier(0,0,0.2,1) both; }
                .splash-status  { animation: fadeIn   0.4s cubic-bezier(0,0,0.2,1) both; }
                .scanline {
                    position: absolute; left: 0; right: 0;
                    height: 120px;
                    background: linear-gradient(to bottom,
                        transparent 0%,
                        rgba(96,205,255,0.018) 50%,
                        transparent 100%);
                    animation: scanline 6s linear infinite;
                    pointer-events: none;
                }
            `}</style>

            <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: t.bg,
                fontFamily: t.fontFamily,
                userSelect: 'none', cursor: 'wait',
                overflow: 'hidden',
                // Exit: scale-up + fade, exact XP vibe
                transition: 'opacity 1.1s cubic-bezier(0.1,0,0,1), transform 1.1s cubic-bezier(0.1,0,0,1)',
                opacity: isExiting ? 0 : 1,
                transform: isExiting ? 'scale(1.06)' : 'scale(1)',
                pointerEvents: isExiting ? 'none' : 'auto',
            }}>

                {/* Subtle scanline sweep */}
                <div className="scanline" />

                {/* Subtle radial glow behind logo */}
                <div style={{
                    position: 'absolute',
                    width: 480, height: 480,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(96,205,255,0.04) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    transform: 'translateY(-40px)',
                    transition: 'opacity 1s',
                    opacity: logoVisible ? 1 : 0,
                }} />

                {/* ── Central column ── */}
                <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 0,
                    width: 340,
                }}>

                    {/* Logo mark — XP had a flag, we use a Fluent-style mark */}
                    <div
                        className={logoVisible ? 'splash-logo' : ''}
                        style={{
                            opacity: logoVisible ? 1 : 0,
                            marginBottom: 20,
                        }}
                    >
                        <FluentLogoMark />
                    </div>

                    {/* Product name — XP's bold "Windows XP" treatment */}
                    <div
                        className={taglineVisible ? 'splash-tagline' : ''}
                        style={{
                            opacity: taglineVisible ? 1 : 0,
                            textAlign: 'center',
                            marginBottom: 8,
                        }}
                    >
                        {/* Eyebrow — "Microsoft" equivalent */}
                        <p style={{
                            margin: '0 0 4px',
                            fontSize: 11,
                            fontWeight: 400,
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.35)',
                        }}>
                            Alexitoo.Dev
                        </p>

                        {/* Main product name */}
                        <h1 style={{
                            margin: 0,
                            fontSize: 32,
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            lineHeight: 1.15,
                            color: t.fg1,
                            // Subtle gradient like XP's rendered text
                            background: 'linear-gradient(160deg, #ffffff 40%, rgba(255,255,255,0.7) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            Nuevo Galeno
                        </h1>
                    </div>

                    {/* Thin divider — XP had a subtle separator */}
                    <div style={{
                        width: 200,
                        height: 1,
                        background: 'linear-gradient(90deg, transparent, rgba(96,205,255,0.25), transparent)',
                        marginBottom: 36,
                        opacity: taglineVisible ? 1 : 0,
                        transition: 'opacity 0.5s 0.2s',
                    }} />

                    {/* XP-style segmented "worm" progress bar */}
                    <div
                        className={barVisible ? 'splash-bar' : ''}
                        style={{ opacity: barVisible ? 1 : 0, marginBottom: 14 }}
                    >
                        <XPProgressBar active={barVisible && !isExiting} />
                    </div>

                    {/* Status text — small, muted, like XP's "Please wait..." */}
                    <div
                        className={statusVisible ? 'splash-status' : ''}
                        style={{
                            opacity: statusVisible ? 1 : 0,
                            height: 16,
                            textAlign: 'center',
                        }}
                    >
                        <span style={{
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.28)',
                            letterSpacing: '0.02em',
                            transition: 'opacity 0.3s',
                        }}>
                            {statusText}
                        </span>
                    </div>
                </div>

                {/* Bottom edge — XP had version/copyright */}
                <div style={{
                    position: 'absolute', bottom: 32,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    opacity: taglineVisible ? 1 : 0,
                    transition: 'opacity 0.6s 0.5s',
                }}>
                    <span style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.13)',
                        letterSpacing: '0.08em',
                    }}>
                        © 2025 Alexitoo.Dev · Todos los derechos reservados
                    </span>
                </div>
            </div>
        </>
    );
}

// ── Fluent logo mark — four squares, Fluent "Windows" spirit ─────────
function FluentLogoMark() {
    return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            {/* Top-left */}
            <rect x="4" y="4" width="26" height="26" rx="6"
                fill="rgba(96,205,255,0.85)"
            />
            {/* Top-right */}
            <rect x="34" y="4" width="26" height="26" rx="6"
                fill="rgba(96,205,255,0.55)"
            />
            {/* Bottom-left */}
            <rect x="4" y="34" width="26" height="26" rx="6"
                fill="rgba(96,205,255,0.55)"
            />
            {/* Bottom-right */}
            <rect x="34" y="34" width="26" height="26" rx="6"
                fill="rgba(96,205,255,0.30)"
            />
        </svg>
    );
}