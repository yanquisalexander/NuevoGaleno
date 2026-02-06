import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    Search,
    User,
    Calendar,
    FileText,
    Settings,
    Shield,
    X,
    Clock,
    TrendingUp,
    ChevronRight
} from 'lucide-react';
import { useWindowManager } from '../../contexts/WindowManagerContext';
import { invoke } from '@tauri-apps/api/core';
import { useSession } from '../../hooks/useSession';

interface Patient {
    id: number;
    first_name: string;
    last_name: string;
    document_number: string | null;
    phone: string | null;
    email?: string | null;
}

interface SearchResult {
    id: string;
    type: 'app' | 'patient' | 'recent' | 'action' | 'manual';
    title: string;
    subtitle?: string;
    icon: JSX.Element;
    action: () => void;
}

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { apps, openWindow } = useWindowManager();
    const manualIndexRef = useRef<any | null>(null);
    const { currentUser } = useSession();
    const isAdmin = currentUser?.role === 'admin';

    // Focus automático cuando se abre
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Buscar en tiempo real
    useEffect(() => {
        if (!isOpen) return;

        const searchAll = async () => {
            if (query.trim().length === 0) {
                // Mostrar resultados recientes y sugerencias
                const recentResults: SearchResult[] = [
                    {
                        id: 'recent-1',
                        type: 'recent',
                        title: 'Pacientes visitados recientemente',
                        icon: <Clock className="w-5 h-5 text-blue-400" />,
                        action: () => { openWindow('patients'); onClose(); }
                    },
                    {
                        id: 'recent-2',
                        type: 'recent',
                        title: 'Estadísticas del día',
                        icon: <TrendingUp className="w-5 h-5 text-green-400" />,
                        action: () => { openWindow('dashboard'); onClose(); }
                    }
                ];
                setResults(recentResults);
                return;
            }

            setIsLoading(true);
            const allResults: SearchResult[] = [];
            const searchTerm = query.toLowerCase();

            // 1. Buscar en Apps
            Array.from(apps.values()).forEach(app => {
                if (app.name.toLowerCase().includes(searchTerm) ||
                    app.description?.toLowerCase().includes(searchTerm)) {
                    allResults.push({
                        id: `app-${app.id}`,
                        type: 'app',
                        title: app.name,
                        subtitle: app.description || 'Aplicación',
                        icon: <span className="text-2xl">{app.icon}</span>,
                        action: () => {
                            openWindow(app.id);
                            onClose();
                        }
                    });
                }
            });

            // 1.b Buscar en el Manual (index.json)
            try {
                if (!manualIndexRef.current) {
                    const res = await fetch('/manual/index.json');
                    if (res.ok) manualIndexRef.current = await res.json();
                }

                const manualIndex = manualIndexRef.current;
                if (manualIndex && manualIndex.categories) {
                    manualIndex.categories.forEach((cat: any) => {
                        cat.items.forEach((item: any) => {
                            const title = (item.title || '').toLowerCase();
                            const catTitle = (cat.title || '').toLowerCase();
                            const keywords: string[] = (item.keywords || []).map((k: string) => k.toLowerCase());
                            const matches = title.includes(searchTerm) || catTitle.includes(searchTerm) || keywords.some(k => k.includes(searchTerm) || searchTerm.includes(k));
                            if (matches) {
                                allResults.push({
                                    id: `manual-${cat.id}-${item.id}`,
                                    type: 'manual',
                                    title: item.title,
                                    subtitle: cat.title,
                                    icon: <FileText className="w-5 h-5 text-orange-400" />,
                                    action: () => {
                                        openWindow('manual-galeno', { path: `${cat.id}/${item.id}` });
                                        onClose();
                                    }
                                });
                            }
                        });
                    });
                }
            } catch (err) {
                console.error('Error loading manual index for search', err);
            }

            // 2. Buscar en Pacientes
            try {
                const patients: Patient[] = await invoke('search_patients', { query: searchTerm });
                patients.forEach(patient => {
                    allResults.push({
                        id: `patient-${patient.id}`,
                        type: 'patient',
                        title: `${patient.first_name} ${patient.last_name}`,
                        subtitle: `DNI: ${patient.document_number || 'Sin DNI'} • Tel: ${patient.phone || 'Sin teléfono'}`,
                        icon: <User className="w-5 h-5 text-purple-400" />,
                        action: () => {
                            openWindow('patient-record', { patientId: patient.id });
                            onClose();
                        }
                    });
                });
            } catch (error) {
                console.error('Error buscando pacientes:', error);
            }

            // 3. Acciones rápidas
            const quickActions = [
                {
                    keywords: ['nuevo', 'agregar', 'crear', 'paciente'],
                    result: {
                        id: 'action-new-patient',
                        type: 'action' as const,
                        title: 'Nuevo Paciente',
                        subtitle: 'Agregar un nuevo paciente al sistema',
                        icon: <User className="w-5 h-5 text-green-400" />,
                        action: () => {
                            openWindow('patients');
                            onClose();
                        }
                    }
                },
                {
                    keywords: ['configuración', 'ajustes', 'settings', 'config'],
                    result: {
                        id: 'action-settings',
                        type: 'action' as const,
                        title: 'Configuración',
                        subtitle: 'Abrir configuración del sistema',
                        icon: <Settings className="w-5 h-5 text-gray-400" />,
                        action: () => {
                            openWindow('settings');
                            onClose();
                        }
                    }
                },
                {
                    keywords: ['agenda', 'cita', 'turnos', 'calendario'],
                    result: {
                        id: 'action-calendar',
                        type: 'action' as const,
                        title: 'Agenda',
                        subtitle: 'Ver agenda y turnos',
                        icon: <Calendar className="w-5 h-5 text-blue-400" />,
                        action: () => {
                            openWindow('calendar');
                            onClose();
                        }
                    }
                }
            ];

            if (isAdmin) {
                quickActions.push({
                    keywords: ['sistema', 'mantenimiento', 'administración'],
                    result: {
                        id: 'action-system-tools',
                        type: 'action' as const,
                        title: 'Mantenimiento del sistema',
                        subtitle: 'Abrir herramientas críticas del sistema',
                        icon: <Shield className="w-5 h-5 text-yellow-400" />,
                        action: () => {
                            openWindow('system-tools');
                            onClose();
                        }
                    }
                });
            }

            quickActions.forEach(({ keywords, result }) => {
                if (keywords.some(kw => searchTerm.includes(kw))) {
                    allResults.push(result);
                }
            });

            setResults(allResults);
            setSelectedIndex(0);
            setIsLoading(false);
        };

        const debounce = setTimeout(searchAll, 200);
        return () => clearTimeout(debounce);
    }, [query, isOpen, apps, openWindow, onClose]);

    // Navegación con teclado
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (results[selectedIndex]) {
                        results[selectedIndex].action();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    // Resetear al cerrar
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'app': return 'Aplicación';
            case 'patient': return 'Paciente';
            case 'manual': return 'Manual';
            case 'action': return 'Acción rápida';
            case 'recent': return 'Reciente';
            default: return '';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'app': return 'text-blue-400';
            case 'patient': return 'text-purple-400';
            case 'manual': return 'text-orange-400';
            case 'action': return 'text-green-400';
            case 'recent': return 'text-orange-400';
            default: return 'text-gray-400';
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop con blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
                    />

                    {/* Panel de búsqueda - centrado */}
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.9 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[680px] max-h-[560px] bg-[#2c2c2c]/95 backdrop-blur-[40px] rounded-2xl shadow-2xl border border-white/10 z-[61] flex flex-col overflow-hidden"
                    >
                        {/* Header con input */}
                        <div className="relative p-6 pb-4 border-b border-white/5">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Buscar aplicaciones, pacientes, documentos..."
                                    className="w-full h-14 bg-black/30 border-none rounded-xl pl-14 pr-12 text-base text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                                {query && (
                                    <motion.button
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setQuery('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-white/60" />
                                    </motion.button>
                                )}
                            </div>
                            {query && (
                                <div className="flex items-center gap-2 mt-3 text-xs text-white/50">
                                    <span>{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
                                    {isLoading && <span>• Buscando...</span>}
                                </div>
                            )}
                        </div>

                        {/* Resultados */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {results.length === 0 && query.length > 0 && !isLoading && (
                                <div className="flex flex-col items-center justify-center h-32 text-center">
                                    <FileText className="w-12 h-12 text-white/20 mb-2" />
                                    <span className="text-sm text-white/50">No se encontraron resultados</span>
                                    <span className="text-xs text-white/30 mt-1">Intenta con otros términos</span>
                                </div>
                            )}

                            {results.length === 0 && query.length === 0 && (
                                <div className="space-y-2">
                                    <span className="text-xs text-white/50 px-2">Sugerencias</span>
                                    {results.map((result) => (
                                        <div key={result.id} className="text-white/30 text-sm px-2">
                                            {result.title}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-1">
                                {results.map((result, index) => (
                                    <motion.button
                                        key={result.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        onClick={result.action}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all group ${index === selectedIndex
                                            ? 'bg-white/15 shadow-lg'
                                            : 'hover:bg-white/8'
                                            }`}
                                    >
                                        {/* Icono */}
                                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${index === selectedIndex ? 'bg-white/10' : 'bg-white/5'
                                            }`}>
                                            {result.icon}
                                        </div>

                                        {/* Contenido */}
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-white truncate">
                                                    {result.title}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${getTypeColor(result.type)} bg-current/10`}>
                                                    {getTypeLabel(result.type)}
                                                </span>
                                            </div>
                                            {result.subtitle && (
                                                <span className="text-xs text-white/50 truncate block">
                                                    {result.subtitle}
                                                </span>
                                            )}
                                        </div>

                                        {/* Flecha */}
                                        <ChevronRight className={`w-5 h-5 text-white/30 transition-all ${index === selectedIndex ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                                            }`} />
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Footer con atajos */}
                        <div className="h-10 bg-black/20 backdrop-blur-md flex items-center justify-center gap-6 px-6 border-t border-white/5">
                            <div className="flex items-center gap-2 text-[10px] text-white/40">
                                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/10">↑↓</kbd>
                                <span>Navegar</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-white/40">
                                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/10">Enter</kbd>
                                <span>Abrir</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-white/40">
                                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/10">Esc</kbd>
                                <span>Cerrar</span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
