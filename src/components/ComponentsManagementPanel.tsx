import { useState } from 'react';
import { Download, Trash2, Check, AlertCircle, HardDrive, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Component {
    id: string;
    name: string;
    description: string;
    version: string;
    size: string;
    dependencies: string[];
    isInstalled: boolean;
    isUpdating?: boolean;
    isDeleting?: boolean;
    status?: 'idle' | 'downloading' | 'installed' | 'error';
}

const AVAILABLE_COMPONENTS: Component[] = [
    {
        id: 'tinyllama',
        name: 'TinyLlama',
        description: 'Modelo de lenguaje pequeño para procesamientos locales e IA asistente.',
        version: '1.2.0',
        size: '2.8 GB',
        dependencies: ['ONNX Runtime'],
        isInstalled: false,
        status: 'idle',
    },
    {
        id: 'odontogram-ai',
        name: 'Odontograma AI',
        description: 'Asistente de IA especializado en análisis de odontogramas.',
        version: '1.0.0',
        size: '450 MB',
        dependencies: ['TinyLlama'],
        isInstalled: false,
        status: 'idle',
    },
    {
        id: 'diagnosis-assist',
        name: 'Asistente de Diagnóstico',
        description: 'Herramienta inteligente para sugerencias de diagnósticos basados en síntomas.',
        version: '0.9.1',
        size: '620 MB',
        dependencies: ['TinyLlama'],
        isInstalled: false,
        status: 'idle',
    },
];

export function ComponentsManagementPanel() {
    const [components, setComponents] = useState<Component[]>(AVAILABLE_COMPONENTS);

    const handleDownload = (id: string) => {
        setComponents(prev => prev.map(c =>
            c.id === id ? { ...c, isUpdating: true, status: 'downloading' } : c
        ));

        // Simular descarga
        setTimeout(() => {
            setComponents(prev => prev.map(c =>
                c.id === id ? { ...c, isInstalled: true, isUpdating: false, status: 'installed' } : c
            ));
        }, 2000);
    };

    const handleDelete = (id: string) => {
        setComponents(prev => prev.map(c =>
            c.id === id ? { ...c, isDeleting: true } : c
        ));

        setTimeout(() => {
            setComponents(prev => prev.map(c =>
                c.id === id ? { ...c, isInstalled: false, isDeleting: false, status: 'idle' } : c
            ));
        }, 1000);
    };

    const installedSize = components
        .filter(c => c.isInstalled)
        .reduce((acc, c) => acc + parseFloat(c.size), 0);

    return (
        <div className="space-y-6">
            {/* Storage Info */}
            <div className="rounded-lg border border-white/[0.08] bg-[#2b2b2b]/40 backdrop-blur-sm p-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                        <HardDrive className="h-5 w-5 text-[#0078d4]" strokeWidth={1.5} />
                    </div>
                    <div>
                        <p className="text-[12px] text-white/50 mb-1">Espacio utilizado por componentes</p>
                        <p className="text-[13px] font-semibold text-white/85">
                            {installedSize.toFixed(1)} GB instalado
                        </p>
                    </div>
                </div>
            </div>

            {/* Components Grid */}
            <div className="space-y-3">
                {components.map((component) => (
                    <div
                        key={component.id}
                        className={cn(
                            "rounded-lg border border-white/[0.08] bg-[#2b2b2b]/40 backdrop-blur-sm p-4 transition-all",
                            component.isInstalled && "border-[#0078d4]/20 bg-[#0078d4]/5"
                        )}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-[13px] font-semibold text-white/90">
                                        {component.name}
                                    </h3>
                                    {component.isInstalled && (
                                        <Check className="h-4 w-4 text-[#6ccb5f] flex-shrink-0" />
                                    )}
                                </div>

                                <p className="text-[12px] text-white/50 mb-3 line-clamp-2">
                                    {component.description}
                                </p>

                                <div className="flex flex-wrap gap-3 text-[11px] text-white/40 mb-3">
                                    <span>v{component.version}</span>
                                    <span>•</span>
                                    <span>{component.size}</span>
                                </div>

                                {/* Dependencies */}
                                {component.dependencies.length > 0 && (
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
                                        <span className="text-[11px] text-white/40">
                                            Requiere: {component.dependencies.join(', ')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex-shrink-0 flex gap-2">
                                {component.isInstalled ? (
                                    <button
                                        onClick={() => handleDelete(component.id)}
                                        disabled={component.isDeleting}
                                        className={cn(
                                            "p-2 rounded-md transition-all",
                                            "hover:bg-[#f1707b]/10 active:bg-[#f1707b]/15",
                                            "border border-transparent hover:border-[#f1707b]/20",
                                            "text-white/50 hover:text-[#f1707b]",
                                            component.isDeleting && "opacity-50 cursor-not-allowed"
                                        )}
                                        aria-label="Desinstalar componente"
                                    >
                                        {component.isDeleting ? (
                                            <Loader className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleDownload(component.id)}
                                        disabled={component.isUpdating}
                                        className={cn(
                                            "px-3 py-2 text-[12px] font-medium rounded-md transition-all",
                                            "bg-[#0078d4] hover:bg-[#1084d7] active:bg-[#0066b2]",
                                            "text-white flex items-center gap-2",
                                            "disabled:opacity-50 disabled:cursor-not-allowed"
                                        )}
                                    >
                                        {component.isUpdating ? (
                                            <>
                                                <Loader className="h-3.5 w-3.5 animate-spin" />
                                                <span>Descargando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-3.5 w-3.5" />
                                                <span>Descargar</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        {component.isUpdating && (
                            <div className="mt-4 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#0078d4] rounded-full animate-pulse"
                                    style={{
                                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Info Card */}
            <div className="rounded-lg border border-white/[0.08] bg-[#2b2b2b]/40 backdrop-blur-sm p-4">
                <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-[#479ef5] flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[12px] font-semibold text-white/85 mb-1">Sobre módulos descargables</p>
                        <p className="text-[11px] text-white/50 leading-relaxed">
                            Los componentes descargables amplían la funcionalidad de Galeno con herramientas especializadas.
                            Se descargan localmente y requieren ciertas dependencias. Descarga solo los que necesites.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
