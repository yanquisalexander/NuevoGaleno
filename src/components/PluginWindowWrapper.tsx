import { useState, useEffect } from 'react';
import type { PluginWindow as PluginWindowType } from './PluginWindow';

interface PluginWindowWrapperProps {
    pluginId: string;
    data?: any;
}

export function PluginWindowWrapper({ pluginId, data }: PluginWindowWrapperProps) {
    const [PluginWindowComponent, setPluginWindowComponent] = useState<typeof PluginWindowType | null>(null);

    useEffect(() => {
        import('./PluginWindow').then(module => {
            setPluginWindowComponent(() => module.PluginWindow);
        });
    }, []);

    if (!PluginWindowComponent) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-white/50">Cargando plugin...</div>
            </div>
        );
    }

    return <PluginWindowComponent pluginId={pluginId} data={data} />;
}
