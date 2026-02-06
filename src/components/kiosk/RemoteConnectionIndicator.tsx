import { Globe, Server } from 'lucide-react';
import { useNode } from '@/contexts/NodeContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface RemoteConnectionIndicatorProps {
    variant?: 'macos' | 'windows';
}

export function RemoteConnectionIndicator({ variant = 'windows' }: RemoteConnectionIndicatorProps) {
    const { activeContext } = useNode();
    const [showTooltip, setShowTooltip] = useState(false);

    if (!activeContext || activeContext.mode === 'local') {
        return null;
    }

    const isMacOS = variant === 'macos';

    return (
        <div
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${isMacOS
                    ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                    : 'bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                }`}>
                <Globe className={isMacOS ? "w-3 h-3" : "w-3.5 h-3.5"} />
                <span className={`font-medium ${isMacOS ? 'text-[11px]' : 'text-[10px]'}`}>
                    Remoto
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </div>

            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: isMacOS ? 5 : -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: isMacOS ? 5 : -5 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute ${isMacOS ? 'top-full mt-2' : 'bottom-full mb-2'
                            } left-1/2 -translate-x-1/2 z-50`}
                    >
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl px-3 py-2 min-w-[200px] backdrop-blur-xl">
                            <div className="flex items-center gap-2 mb-1">
                                <Server className="w-4 h-4 text-blue-400" />
                                <span className="text-xs font-semibold text-white">
                                    Servidor Remoto
                                </span>
                            </div>
                            <div className="text-[10px] text-white/60 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-white/40">Nodo:</span>
                                    <span className="text-white/80 font-medium">{activeContext.nodeName}</span>
                                </div>
                                {activeContext.apiBaseUrl && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-white/40">URL:</span>
                                        <span className="text-white/70 font-mono truncate">
                                            {activeContext.apiBaseUrl}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-white/10">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    <span className="text-green-400">Conectado</span>
                                </div>
                            </div>
                        </div>
                        {/* Flecha del tooltip */}
                        <div className={`absolute left-1/2 -translate-x-1/2 ${isMacOS
                                ? 'top-0 -translate-y-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-white/10'
                                : 'bottom-0 translate-y-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/10'
                            }`} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
