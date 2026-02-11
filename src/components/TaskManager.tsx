import React, { useState, useEffect, useMemo } from 'react';
import { useWindowManager } from '../contexts/WindowManagerContext';
import {
    Activity, Search, RefreshCcw, Pause,
    Play, XSquare, Cpu, Database, LayoutGrid, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// --- Helpers para el "Mapa de Calor" estilo Windows ---
const getUsageStyle = (type: 'cpu' | 'ram', value: number) => {
    // Definimos umbrales simulados para el color de fondo
    const isCpu = type === 'cpu';
    const warning = isCpu ? 50 : 500; // 50% CPU o 500MB RAM
    const critical = isCpu ? 80 : 1024; // 80% CPU o 1GB RAM

    if (value >= critical) return 'bg-[#ca5010]/20 text-[#ffb38e] font-medium'; // Naranja oscuro/Rojo
    if (value >= warning) return 'bg-[#986f0b]/20 text-[#ffd36b] font-medium'; // Amarillo/Naranja
    return 'text-white/80'; // Normal
};

export const TaskManager: React.FC = () => {
    const { getRuntimeApps, windows, apps: appDefinitions, closeWindow, minimizeWindow, restoreWindow } = useWindowManager();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Get processes (windows) that are running
    const processes = useMemo(() => windows.map(window => {
        const appDef = appDefinitions.get(window.appId);
        const runtimeApp = getRuntimeApps().find(app => app.id === window.appId);
        return {
            windowId: window.id,
            appId: window.appId,
            name: window.title || appDef?.name || 'Unknown',
            status: runtimeApp?.status || 'idle',
            cpu: runtimeApp?.cpu || 0,
            ram: runtimeApp?.ram || 0,
            isMinimized: window.isMinimized,
        };
    }), [windows, appDefinitions, getRuntimeApps, refreshTrigger]);

    // Auto-refresh
    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshTrigger(prev => prev + 1);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const refresh = () => {
        setRefreshTrigger(prev => prev + 1);
        toast.success('Procesos actualizados');
    };

    const handleKill = (windowId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        closeWindow(windowId);
        toast.info('Se ha finalizado la tarea');
        refresh();
    };

    const handleFreeze = (windowId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        minimizeWindow(windowId);
        refresh();
    };

    const handleResume = (windowId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        restoreWindow(windowId);
        refresh();
    };

    const filteredProcesses = processes.filter(process =>
        process.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full w-full flex flex-col bg-[#202020] text-white font-segoe select-none overflow-hidden">

            {/* --- Header & Command Bar --- */}
            <div className="flex-none bg-[#202020]/95 backdrop-blur-xl border-b border-[#383838]">
                {/* Título y Búsqueda */}
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <Activity className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Administrador de tareas</h1>
                            <p className="text-xs text-white/50">{processes.length} procesos en ejecución</p>
                        </div>
                    </div>

                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Escriba un nombre para buscar"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#2d2d2d] border border-white/5 border-b-white/20 hover:bg-[#323232] focus:bg-[#1e1e1e] focus:border-b-blue-500 rounded-md py-1.5 pl-9 pr-3 text-sm text-white placeholder-white/40 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Toolbar de Acciones (Estilo Win11) */}
                <div className="flex items-center gap-1 px-4 py-2 border-t border-[#383838]/50 bg-[#252525]">
                    <button
                        onClick={() => selectedWindowId && handleKill(selectedWindowId)}
                        disabled={!selectedWindowId}
                        className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-white/90 hover:bg-[#333] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                    >
                        <XSquare className="w-4 h-4 text-red-400" />
                        Finalizar tarea
                    </button>
                    <div className="w-[1px] h-4 bg-white/10 mx-2" />
                    <button
                        onClick={refresh}
                        className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-white/90 hover:bg-[#333] transition-colors"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* --- Tabla de Procesos --- */}
            <div className="flex-1 overflow-auto custom-scrollbar bg-[#1e1e1e]">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-[#252525] border-b border-[#383838] shadow-sm">
                        <tr>
                            <th className="py-3 px-6 text-xs font-medium text-white/70 w-1/3 hover:bg-[#2d2d2d] cursor-pointer transition-colors">
                                Nombre
                            </th>
                            <th className="py-3 px-4 text-xs font-medium text-white/70 w-32 hover:bg-[#2d2d2d] cursor-pointer transition-colors border-l border-white/5">
                                Estado
                            </th>
                            <th className="py-3 px-4 text-xs font-medium text-white/70 w-32 hover:bg-[#2d2d2d] cursor-pointer transition-colors border-l border-white/5">
                                <div className="flex items-center gap-2">
                                    <Cpu className="w-3.5 h-3.5 opacity-70" /> CPU
                                </div>
                            </th>
                            <th className="py-3 px-4 text-xs font-medium text-white/70 w-32 hover:bg-[#2d2d2d] cursor-pointer transition-colors border-l border-white/5">
                                <div className="flex items-center gap-2">
                                    <Database className="w-3.5 h-3.5 opacity-70" /> Memoria
                                </div>
                            </th>
                            <th className="py-3 px-6 text-xs font-medium text-white/70 w-32 border-l border-white/5">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#383838]/50">
                        {filteredProcesses.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-white/40 text-sm">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                    No se encontraron procesos en ejecución
                                </td>
                            </tr>
                        ) : (
                            filteredProcesses.map((process) => {
                                const isSelected = selectedWindowId === process.windowId;
                                const isFrozen = process.status === 'frozen' || process.isMinimized;

                                return (
                                    <tr
                                        key={process.windowId}
                                        onClick={() => setSelectedWindowId(isSelected ? null : process.windowId)}
                                        className={`
                                            group relative cursor-default transition-colors
                                            ${isSelected ? 'bg-[#353535]' : 'hover:bg-[#2d2d2d] bg-transparent'}
                                        `}
                                    >
                                        {/* Indicador azul lateral para selección */}
                                        {isSelected && (
                                            <td className="absolute left-0 top-0 bottom-0 w-1 bg-[#0078d4]" />
                                        )}

                                        {/* Nombre del Proceso */}
                                        <td className="py-2.5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-white/5 rounded-md border border-white/10">
                                                    <LayoutGrid className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-white/90'} ${isFrozen ? 'opacity-50' : ''}`}>
                                                    {process.name}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Estado */}
                                        <td className="py-2.5 px-4">
                                            <span className={`text-xs flex items-center gap-1.5 ${isFrozen ? 'text-blue-400' : 'text-emerald-400'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${isFrozen ? 'bg-blue-400' : 'bg-emerald-400 animate-pulse'}`} />
                                                {isFrozen ? 'Suspendido' : 'En ejecución'}
                                            </span>
                                        </td>

                                        {/* CPU (Con mapa de calor) */}
                                        <td className="py-2.5 px-1 border-l border-transparent group-hover:border-white/5">
                                            <div className={`mx-2 px-2 py-1 rounded text-sm text-right ${getUsageStyle('cpu', process.cpu)}`}>
                                                {process.cpu.toFixed(1)}%
                                            </div>
                                        </td>

                                        {/* RAM (Con mapa de calor) */}
                                        <td className="py-2.5 px-1 border-l border-transparent group-hover:border-white/5">
                                            <div className={`mx-2 px-2 py-1 rounded text-sm text-right ${getUsageStyle('ram', process.ram)}`}>
                                                {process.ram.toFixed(0)} MB
                                            </div>
                                        </td>

                                        {/* Botones de Acción Inline (Aparecen al hover) */}
                                        <td className="py-2.5 px-6 border-l border-transparent group-hover:border-white/5">
                                            <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''}`}>
                                                {isFrozen ? (
                                                    <button onClick={(e) => handleResume(process.windowId, e)} className="p-1.5 hover:bg-white/10 rounded-md text-white/70 hover:text-white transition-colors" title="Reanudar">
                                                        <Play className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button onClick={(e) => handleFreeze(process.windowId, e)} className="p-1.5 hover:bg-white/10 rounded-md text-white/70 hover:text-white transition-colors" title="Suspender">
                                                        <Pause className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={(e) => handleKill(process.windowId, e)} className="p-1.5 hover:bg-red-500/20 rounded-md text-red-400 hover:text-red-300 transition-colors" title="Finalizar tarea">
                                                    <XSquare className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Status Bar */}
            <div className="flex-none bg-[#1e1e1e] border-t border-[#383838] px-4 py-1.5 flex items-center justify-between text-[11px] text-white/50">
                <span>{filteredProcesses.length} procesos listados</span>
                <span>Uso del sistema: Estable</span>
            </div>
        </div>
    );
};