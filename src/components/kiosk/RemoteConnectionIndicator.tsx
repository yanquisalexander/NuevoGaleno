import { Globe, Server, Activity } from 'lucide-react';
import { useNode } from '@/contexts/NodeContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface RemoteConnectionIndicatorProps {
    variant?: 'macos' | 'windows';
}

export function RemoteConnectionIndicator({ variant = 'windows' }: RemoteConnectionIndicatorProps) {
    const { activeContext } = useNode();
    const [showTooltip, setShowTooltip] = useState(false);

    if (!activeContext || activeContext.mode === 'local') return null;

    const isMacOS = variant === 'macos';

    // --- Estilos Windows 11 (Fluent Design) ---
    const winStyles = {
        pill: "bg-[#ffffff0a] border border-[#ffffff15] hover:bg-[#ffffff12] active:scale-95 transition-all duration-200",
        tooltip: "bg-[#2c2c2c] border border-[#454545] shadow-[0_8px_20px_rgba(0,0,0,0.4)] rounded-[4px] backdrop-blur-md",
        text: "font-['Segoe_UI',_sans-serif] text-[11px] tracking-tight",
        status: "bg-[#60cdff]" // Windows Cyan
    };

    // --- Estilos macOS (Apple Design Resources) ---
    const macStyles = {
        pill: "hover:bg-white/[0.15] backdrop-blur-xl transition-colors duration-150",
        tooltip: "bg-[#1e1e1e]/80 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] rounded-lg backdrop-blur-2xl",
        text: "font-['-apple-system','BlinkMacSystemFont',_sans-serif] text-[12px] tracking-wide",
        status: "bg-[#34c759]" // Apple Green
    };

    const s = isMacOS ? macStyles : winStyles;

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {/* Pill Indicator */}
            <div className={`flex items-center gap-2 px-2.5 py-1 ${isMacOS ? 'rounded-full' : 'rounded'} ${s.pill} cursor-default`}>
                <Globe className={`${isMacOS ? 'w-3 h-3 text-white/70' : 'w-3.5 h-3.5 text-blue-400'}`} />
                <span className={`font-medium text-white/90 ${s.text}`}>
                    Remoto
                </span>
                <span className="relative flex h-2 w-2">
                    <span className={` absolute inline-flex h-full w-full rounded-full opacity-75 ${s.status}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${s.status}`}></span>
                </span>
            </div>

            {/* Tooltip */}
            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={isMacOS ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: -8 }}
                        animate={isMacOS ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }}
                        exit={isMacOS ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: -8 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className={`absolute ${isMacOS ? 'top-full mt-3' : 'bottom-full mb-3'} left-1/2 -translate-x-1/2 z-50`}
                    >
                        <div className={`px-4 py-3 min-w-[220px] ${s.tooltip}`}>
                            <div className="flex items-center gap-2.5 mb-2.5 border-b border-white/5 pb-2">
                                <div className={`p-1 rounded ${isMacOS ? 'bg-blue-500' : 'bg-[#0078d4]'}`}>
                                    <Server className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span className={`font-semibold text-white/95 ${s.text} text-[13px]`}>
                                    Conexión Activa
                                </span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Nodo</span>
                                    <span className={`text-white/80 ${s.text}`}>{activeContext.nodeName}</span>
                                </div>

                                {activeContext.apiBaseUrl && (
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Endpoint</span>
                                        <span className="text-blue-400/80 font-mono text-[10px] truncate max-w-[180px]">
                                            {activeContext.apiBaseUrl}
                                        </span>
                                    </div>
                                )}

                                <div className={`flex items-center gap-2 mt-2 pt-2 border-t border-white/5`}>
                                    <Activity className={`w-3 h-3 ${isMacOS ? 'text-green-400' : 'text-[#60cdff]'}`} />
                                    <span className={`${isMacOS ? 'text-green-400' : 'text-[#60cdff]'} font-medium text-[11px]`}>
                                        Latencia optimizada
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Drop Shadow Arrow (Solo Windows) */}
                        {!isMacOS && (
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-5px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#454545]" />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}