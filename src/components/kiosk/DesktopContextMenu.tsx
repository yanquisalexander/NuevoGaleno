import { useWindowManager } from '../../contexts/WindowManagerContext';
import { Settings, Image } from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onNextWallpaper?: () => void;
}

export function DesktopContextMenu({ x, y, onClose, onNextWallpaper }: ContextMenuProps) {
    const { openWindow } = useWindowManager();

    const menuItems = [
        {
            label: 'Siguiente fondo',
            icon: Image,
            action: () => {
                onNextWallpaper?.();
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
          bg-white/90 dark:bg-black/80 backdrop-blur-xl rounded-md3-md shadow-md3-5
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
              text-md3-on-surface dark:text-white hover:bg-black/10 dark:hover:bg-white/10
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
