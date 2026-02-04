// Ejemplo de integración de Auto-Update en App.tsx o componente principal

import { useAutoUpdate } from '@/hooks/useAutoUpdate';
import { useConfig } from '@/hooks/useConfig';

export function App() {
    const { values } = useConfig();

    // Activar auto-update si está habilitado en la configuración
    // Puedes agregar una opción en config_schema.yml para esto:
    // auto_update_check:
    //   type: boolean
    //   default: true
    //   description: "Buscar actualizaciones automáticamente al iniciar"
    const autoUpdateEnabled = values.auto_update_check !== false;

    useAutoUpdate(autoUpdateEnabled);

    return (
        // ... resto de tu aplicación
    );
}

// Alternativamente, puedes agregar el hook en tu ShellContext o similar
// para que esté disponible globalmente
