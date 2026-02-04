import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Power, RotateCcw, X, Moon } from 'lucide-react';

interface PowerMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onSuspend: () => void; // Cambiado a 'Suspender' (Sleep) para el primer botón
    onShutdown: () => void;
    onRestart: () => void;
}

export function PowerMenu({ isOpen, onClose, onSuspend, onShutdown, onRestart }: PowerMenuProps) {
    // Animación del contenedor del diálogo
    const dialogVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 10 },
        show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", duration: 0.4, bounce: 0.2 } },
        exit: { opacity: 0, scale: 0.98, y: 10, transition: { duration: 0.2 } }
    };

    // Animación para los items (botones)
    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop: Mantenemos el grayscale solicitado */}
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'grayscale(0%) ' }}
                        animate={{ opacity: 1, backdropFilter: 'grayscale(100%) ' }}
                        exit={{ opacity: 0, backdropFilter: 'grayscale(0%)', animationDuration: '0.3s' }}
                        transition={{ duration: 2 }}
                        className="fixed inset-0 z-[100] bg-black/40"
                        onClick={onClose}
                    />

                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                        <motion.div
                            variants={dialogVariants}
                            initial="hidden"
                            animate="show"
                            exit="exit"
                            // Contenedor estilo Windows 11 Mica Dark
                            className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-[#1c1c1c]/95 backdrop-blur-2xl border border-white/[0.07] shadow-2xl ring-1 ring-black/20"
                        >
                            {/* Cabecera Simple W11 */}
                            <div className="flex items-center justify-between p-6 pb-2">
                                <h2 className="text-xl font-semibold text-white">Apagar</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Grid de los 3 Botones */}
                            <motion.div
                                initial="hidden"
                                animate="show"
                                transition={{ staggerChildren: 0.05, delayChildren: 0.1 }}
                                className="grid grid-cols-3 gap-4 p-6"
                            >
                                {/* Botón 1: Suspender (Acento Ámbar sutil) */}
                                <PowerButton
                                    icon={<Moon size={32} />}
                                    label="Suspender"
                                    onClick={onSuspend}
                                    accentColor="amber"
                                    variants={itemVariants}
                                />

                                {/* Botón 2: Apagar (Acento Rojo sutil) */}
                                <PowerButton
                                    icon={<Power size={32} />}
                                    label="Apagar"
                                    onClick={onShutdown}
                                    accentColor="red"
                                    variants={itemVariants}
                                    isPrimary // Ligeramente destacado
                                />

                                {/* Botón 3: Reiniciar (Acento Esmeralda sutil) */}
                                <PowerButton
                                    icon={<RotateCcw size={32} />}
                                    label="Reiniciar"
                                    onClick={onRestart}
                                    accentColor="emerald"
                                    variants={itemVariants}
                                />
                            </motion.div>

                            {/* Footer con botón Cancelar estilo W11 */}
                            <div className="p-4 border-t border-white/[0.05] bg-white/[0.02]">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onClose}
                                    className="w-full py-2.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.05] text-sm font-medium text-white transition-colors"
                                >
                                    Cancelar
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}

// Subcomponente para los botones individuales para mantener el código limpio
interface PowerButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    accentColor: 'amber' | 'red' | 'emerald';
    variants: any;
    isPrimary?: boolean;
}

function PowerButton({ icon, label, onClick, accentColor, variants, isPrimary }: PowerButtonProps) {
    const colorClasses = {
        amber: "group-hover:text-amber-400 group-hover:shadow-[0_0_25px_-5px_rgba(251,191,36,0.3)] after:bg-amber-500/20",
        red: "group-hover:text-red-400 group-hover:shadow-[0_0_25px_-5px_rgba(248,113,113,0.3)] after:bg-red-500/20",
        emerald: "group-hover:text-emerald-400 group-hover:shadow-[0_0_25px_-5px_rgba(52,211,153,0.3)] after:bg-emerald-500/20",
    };

    return (
        <motion.button
            variants={variants}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={onClick}
            className={`group relative flex flex-col items-center justify-center gap-4 p-4 rounded-xl border transition-all duration-300 overflow-hidden
              
                    bg-white/[0.04] border-white/[0.05] hover:bg-white/[0.06] h-[130px]
                }
            `}
        >
            {/* Subtle colorful glow effect on hover using pseudo-element underneath */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl z-0 ${colorClasses[accentColor].split(' ')[2]}`} />

            {/* Icon with accent color transition */}
            <div className={`relative z-10 text-white/70 transition-colors duration-300 ${colorClasses[accentColor].split(' ')[0]} ${isPrimary ? 'scale-110' : ''}`}>
                {icon}
            </div>

            {/* Label */}
            <span className="relative z-10 text-sm font-medium text-white/90 group-hover:text-white">{label}</span>
        </motion.button>
    );
}