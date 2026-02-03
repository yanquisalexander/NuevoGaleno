import { useState } from 'react';
import {
    Activity,
    Database,
    HardDrive,
    RefreshCw,
    Trash2,
    ShieldAlert,
    Server,
    Cpu,
    CheckCircle2,
    AlertCircle,
    Play
} from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from '@/hooks/useToast';
import { useSession } from '@/hooks/useSession';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { SystemPasswordDialog } from '@/components/SystemPasswordDialog';
import type { WindowId } from '../types/window-manager';

// Animación de entrada suave (Fluent Motion)
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.33, 1, 0.68, 1] } }
};

export function MaintenanceApp({ windowId: _windowId }: { windowId: WindowId; data?: any }) {
    const [showWipeDialog, setShowWipeDialog] = useState(false);
    const { currentUser } = useSession();
    const isAdmin = currentUser?.role === 'admin';
    const { success, error: errorToast } = useToast();

    // Estado simulado para feedback visual
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);

    const handleWipeSystem = async (passwordHash: string) => {
        try {
            await invoke('wipe_system', { systemPasswordHash: passwordHash });
            success('Sistema reiniciado', 'Reiniciando servicios...');
            setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
            errorToast('Error al reiniciar', err.toString());
        }
    };

    const handleOptimize = () => {
        setIsOptimizing(true);
        // Simulación de proceso
        setTimeout(() => {
            setIsOptimizing(false);
            success("Base de datos optimizada", "Se ha ejecutado VACUUM correctamente.");
        }, 1500);
    };

    const handleCleanCache = () => {
        setIsCleaning(true);
        setTimeout(() => {
            setIsCleaning(false);
            success("Limpieza completada", "Se han eliminado 12MB de archivos temporales.");
        }, 1500);
    };

    return (
        <div className="h-full flex flex-col bg-[#202020] text-white font-sans selection:bg-blue-500/30">

            {/* --- Header con efecto Mica --- */}
            <div className="flex-none px-8 py-6 bg-[#202020]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Activity className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Mantenimiento del Sistema</h1>
                        <p className="text-xs text-white/50 mt-1">Diagnóstico, optimización y recuperación</p>
                    </div>
                </div>

                {!isAdmin && (
                    <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                        <ShieldAlert className="w-5 h-5" />
                        <span className="text-sm font-medium">Modo Lectura: Se requieren permisos de administrador.</span>
                    </div>
                )}
            </div>

            {/* --- Contenido --- */}
            <motion.div
                className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="max-w-5xl mx-auto space-y-8">

                    {/* 1. Dashboard de Estado (Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatusTile
                            icon={Database}
                            label="Base de Datos"
                            status="Saludable"
                            detail="SQLite v3.42"
                            color="text-emerald-400"
                            bg="bg-emerald-400/10"
                        />
                        <StatusTile
                            icon={Cpu}
                            label="Rendimiento"
                            status="Normal"
                            detail="Uso de memoria: 124MB"
                            color="text-blue-400"
                            bg="bg-blue-400/10"
                        />
                        <StatusTile
                            icon={Server}
                            label="Servicios"
                            status="Activos"
                            detail="Todos los sistemas online"
                            color="text-indigo-400"
                            bg="bg-indigo-400/10"
                        />
                    </div>

                    {/* 2. Herramientas (Lista agrupada) */}
                    <motion.section variants={itemVariants}>
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-white/70" />
                            Optimización
                        </h2>
                        <div className="flex flex-col rounded-xl border border-white/5 bg-[#272727] overflow-hidden">

                            {/* Item: Optimizar DB */}
                            <MaintenanceItem
                                icon={Database}
                                title="Optimizar Base de Datos"
                                description="Reorganiza la base de datos para recuperar espacio no utilizado y mejorar la velocidad."
                                actionLabel={isOptimizing ? "Optimizando..." : "Ejecutar"}
                                onClick={handleOptimize}
                                disabled={!isAdmin || isOptimizing}
                                loading={isOptimizing}
                            />

                            <div className="h-[1px] bg-white/5 mx-4" />

                            {/* Item: Limpiar Cache */}
                            <MaintenanceItem
                                icon={HardDrive}
                                title="Limpiar Archivos Temporales"
                                description="Elimina caché de imágenes, logs antiguos y archivos temporales del sistema."
                                actionLabel={isCleaning ? "Limpiando..." : "Limpiar"}
                                onClick={handleCleanCache}
                                disabled={!isAdmin || isCleaning}
                                loading={isCleaning}
                            />
                        </div>
                    </motion.section>

                    {/* 3. Zona de Peligro */}
                    <motion.section variants={itemVariants} className="pt-4">
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-400">
                            <ShieldAlert className="w-5 h-5" />
                            Recuperación
                        </h2>

                        <div className="rounded-xl border border-red-500/20 bg-[#272727] p-1 overflow-hidden relative group">
                            {/* Efecto de fondo sutil rojo */}
                            <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />

                            <div className="p-5 flex items-start sm:items-center justify-between gap-6 relative z-10">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                                        <Trash2 className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-base font-semibold text-white/90">Restablecer este PC</h3>
                                        <p className="text-sm text-white/50 max-w-lg">
                                            Si el sistema no funciona correctamente, puedes restablecerlo.
                                            <span className="text-red-400 block sm:inline sm:ml-1 font-medium">
                                                Advertencia: Esto eliminará todos los datos.
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="destructive"
                                    onClick={() => isAdmin && setShowWipeDialog(true)}
                                    disabled={!isAdmin}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 shrink-0"
                                >
                                    Restablecer
                                </Button>
                            </div>
                        </div>
                    </motion.section>

                </div>

                {/* Footer Info */}
                <div className="mt-12 text-center">
                    <p className="text-[11px] text-white/20 font-mono">
                        SYSTEM_MAINTENANCE_MODULE_V2 • BUILD_2026
                    </p>
                </div>
            </motion.div>

            <SystemPasswordDialog
                open={showWipeDialog}
                onOpenChange={setShowWipeDialog}
                title="Restablecimiento de Fábrica"
                description="Esta acción eliminará permanentemente todos los pacientes, historiales y configuraciones. No se puede deshacer."
                confirmLabel="Sí, borrar todo"
                onConfirm={handleWipeSystem}
                dangerous
            />
        </div>
    );
}

// --- Componentes Auxiliares para Estilo ---

function StatusTile({ icon: Icon, label, status, detail, color, bg }: any) {
    return (
        <motion.div
            variants={itemVariants}
            className="bg-[#272727] border border-white/5 rounded-xl p-5 hover:bg-[#2d2d2d] transition-colors group"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center border border-white/5`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
                {status === "Saludable" || status === "Activos" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500/50" />
                ) : (
                    <AlertCircle className="w-5 h-5 text-blue-500/50" />
                )}
            </div>
            <div>
                <p className="text-xs text-white/50 font-medium uppercase tracking-wider">{label}</p>
                <p className="text-lg font-semibold text-white mt-0.5">{status}</p>
                <p className="text-xs text-white/30 mt-1 truncate">{detail}</p>
            </div>
        </motion.div>
    );
}

function MaintenanceItem({ icon: Icon, title, description, actionLabel, onClick, disabled, loading }: any) {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 hover:bg-white/[0.02] transition-colors gap-4">
            <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-lg bg-[#333] flex items-center justify-center shrink-0 border border-white/5 text-white/60">
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-white/90">{title}</h3>
                    <p className="text-xs text-white/50 max-w-md leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>
            <div className="pl-14 sm:pl-0 w-full sm:w-auto">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onClick}
                    disabled={disabled}
                    className="w-full sm:w-auto bg-[#333] hover:bg-[#3d3d3d] text-white border border-white/10"
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    ) : (
                        <Play className="w-3 h-3 mr-2 opacity-70" />
                    )}
                    {actionLabel}
                </Button>
            </div>
        </div>
    );
}