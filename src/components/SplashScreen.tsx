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
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const t1 = setTimeout(() => setVisible(true), 100);
        const t2 = setTimeout(() => setExiting(true), 3200);
        const t3 = setTimeout(() => onComplete?.(), 3900);
        return () => [t1, t2, t3].forEach(clearTimeout);
    }, []);

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400&display=swap');

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.85);
          animation: spin 1s linear infinite;
          transform-origin: center;
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
            </div>
        </>
    );
}

