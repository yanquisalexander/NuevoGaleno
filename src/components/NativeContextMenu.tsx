import React, { ReactNode } from "react";

interface NativeContextMenuProps {
    children: ReactNode;
    onMinimize: () => void;
    onMaximize: () => void;
    onRestore: () => void;
    onCloseWindow: () => void;
    isMaximized: boolean;
}

export const NativeContextMenu: React.FC<NativeContextMenuProps> = ({
    children,
    onMinimize,
    onMaximize,
    onRestore,
    onCloseWindow,
    isMaximized
}) => {
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        // Aquí se podría implementar un menú contextual nativo usando Tauri
        // Por simplicidad, solo prevenir el menú por defecto
    };

    return (
        <div onContextMenu={handleContextMenu}>
            {children}
        </div>
    );
};