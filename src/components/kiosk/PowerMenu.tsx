import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Power, LogOut, RotateCcw, X, ShieldCheck } from 'lucide-react';

interface PowerMenuProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: { name: string; username: string } | null;
    onLogout: () => void;
    onShutdown: () => void;
}

export function PowerMenu({ isOpen, onClose, currentUser, onLogout, onShutdown }: PowerMenuProps) {
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop: Grayscale con desenfoque profundo */}
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'grayscale(0%) blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'grayscale(100%) blur(12px)' }}
                        exit={{ opacity: 0, backdropFilter: 'grayscale(0%) blur(0px)' }}
                        transition={{ duration: 0.8 }}
                        className="fixed inset-0 z-[100] bg-black/50"
                        onClick={onClose}
                    />

                    {/* Diálogo Central: Nuevo Galeno Edition */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]"
                    >
                        <div className="w-[440px] overflow-hidden rounded-2xl border border-white/10 bg-[#0f1115]/80 backdrop-blur-3xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.7)]">

                            {/* Barra Superior con gradiente distintivo de Nuevo Galeno */}
                            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-400 to-blue-600" />

                            <div className="flex items-center justify-between px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <ShieldCheck className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-white text-sm font-bold tracking-tight">Apagar el equipo</h2>
                                        <p className="text-[10px] text-blue-400/80 font-mono uppercase tracking-widest">OS: Nuevo Galeno</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                                >
                                    <X className="w-4 h-4 text-white/30 group-hover:text-white" />
                                </button>
                            </div>

                            {/* Panel de Acciones Estilo XP Modernizado */}
                            <div className="px-10 pb-12 pt-4 flex justify-between items-center relative">
                                {/* Decoración de fondo sutil */}
                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 bg-blue-500/5 blur-[60px] pointer-events-none" />

                                {/* Opción: Cerrar Sesión */}
                                <div className="flex flex-col items-center gap-4 relative">
                                    <motion.button
                                        whileHover={{ y: -5, scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={onLogout}
                                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center group hover:from-amber-500 hover:to-amber-600 transition-all duration-300 shadow-lg shadow-amber-900/20"
                                    >
                                        <LogOut className="w-7 h-7 text-amber-500 group-hover:text-white transition-colors" />
                                    </motion.button>
                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.15em]">Sesión</span>
                                </div>

                                {/* Opción: Apagar (Foco principal) */}
                                <div className="flex flex-col items-center gap-4 relative">
                                    <motion.button
                                        whileHover={{ y: -5, scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={onShutdown}
                                        className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-red-500/20 to-red-700/10 border border-red-500/40 flex items-center justify-center group hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-xl shadow-red-900/30"
                                    >
                                        <Power className="w-9 h-9 text-red-500 group-hover:text-white transition-colors" />
                                    </motion.button>
                                    <span className="text-xs font-black text-white uppercase tracking-[0.25em]">Apagar</span>
                                </div>

                                {/* Opción: Reiniciar */}
                                <div className="flex flex-col items-center gap-4 relative">
                                    <motion.button
                                        whileHover={{ y: -5, scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center group hover:from-emerald-500 hover:to-emerald-600 transition-all duration-300 shadow-lg shadow-emerald-900/20"
                                    >
                                        <RotateCcw className="w-7 h-7 text-emerald-500 group-hover:text-white transition-colors" />
                                    </motion.button>
                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.15em]">Reiniciar</span>
                                </div>
                            </div>

                            {/* Footer de Identidad */}
                            <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-white/30 uppercase tracking-tighter">Usuario Actual</span>
                                    <span className="text-xs text-blue-400 font-semibold">{currentUser?.name || 'Administrador'}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[11px] text-white/20 font-light block italic">Sistema Operativo</span>
                                    <span className="text-[13px] text-white/60 font-black tracking-tighter hover:text-blue-400 transition-colors cursor-default">
                                        NUEVO GALENO
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}