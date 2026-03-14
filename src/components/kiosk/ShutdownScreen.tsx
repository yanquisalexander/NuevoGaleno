import { motion } from 'motion/react';
import { useEffect } from 'react';

interface ShutdownScreenProps {
    onComplete?: () => void;
}

export function ShutdownScreen({ onComplete }: ShutdownScreenProps) {
    useEffect(() => {
        // Auto-complete después de 2 segundos
        const timer = setTimeout(() => {
            onComplete?.();
        }, 2000);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <>
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .shutdown-spinner {
                    width: 20px;
                    height: 20px;
                    border: 1.5px solid rgba(255,255,255,0.15);
                    border-top-color: rgba(255,255,255,0.75);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
            `}</style>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#1a1a1a',
                    fontFamily: '-apple-system, "Helvetica Neue", sans-serif',
                }}
            >
                <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: 18,
                    background: 'linear-gradient(145deg, #2a9df4, #1a6fc4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                    boxShadow: '0 8px 32px rgba(42,157,244,0.3), 0 2px 8px rgba(0,0,0,0.4)',
                }}>
                    <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
                        <path d="M21 8C14 8 9 14 9 21s5 13 12 13 12-6 12-13S28 8 21 8z" fill="white" fillOpacity="0.9" />
                        <path d="M21 14v7l5 3" stroke="#1a6fc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                <div style={{
                    fontSize: 17,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.9)',
                    letterSpacing: '-0.01em',
                    marginBottom: 4,
                }}>
                    Nuevo Galeno
                </div>

                <div style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.35)',
                    letterSpacing: '0.01em',
                    marginBottom: 28,
                }}>
                    Cerrando la aplicación...
                </div>

                <div className="shutdown-spinner" />
            </motion.div>
        </>
    );
}
