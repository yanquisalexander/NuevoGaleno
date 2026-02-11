import { useWindowManager } from '../../contexts/WindowManagerContext';
import { Settings, Activity, Bell, Power } from 'lucide-react';

interface TaskbarContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
}

export function TaskbarContextMenu({ x, y, onClose }: TaskbarContextMenuProps) {
    const { openWindow } = useWindowManager();

    const menuItems = [
        {
            label: 'Administrador de Tareas',
            icon: Activity,
            action: () => {
                openWindow('task-manager');
                onClose();
            }
        },
        {
            label: 'Centro de Notificaciones',
            icon: Bell,
            action: () => {
                // TODO: Toggle notifications panel
                onClose();
            }
        },
        {
            label: 'Configuración',
            icon: Settings,
            action: () => {
                openWindow('settings');
                onClose();
            }
        },
        {
            label: 'Apagar',
            icon: Power,
            action: () => {
                // TODO: Show power menu
                onClose();
            }
        },
    ];

    return (
        <>
            <div
                className="fixed inset-0 z-[60]"
                onClick={onClose}
                onContextMenu={(e) => e.preventDefault()}
            />
            <div
                className="
          fixed z-[61] min-w-[200px]
          bg-white/90 dark:bg-black/80 backdrop-blur-xl rounded-md shadow-lg
          border border-white/30 dark:border-white/10
          overflow-hidden
        "
                style={{ left: x, top: y }}
            >
                {menuItems.map((item, i) => (
                    <button
                        key={i}
                        onClick={item.action}
                        className="
              w-full flex items-center gap-3 px-4 py-3
              text-on-surface dark:text-white hover:bg-black/10 dark:hover:bg-white/10
              transition-colors text-left
            "
                    >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                    </button>
                ))}
            </div>
        </>
    );
}