import React, { useState } from 'react';
import { useWindowManager } from '../../contexts/WindowManagerContext';
import { Settings, Image } from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onNextWallpaper?: () => void;
}

// ── Fluent UI v9 Dark tokens ──────────────────────────────────────────
const dark = {
    // Backgrounds
    colorNeutralBackground1: '#292929',       // menu surface
    colorNeutralBackground1Hover: '#3d3d3d',  // item hover
    colorNeutralBackground1Pressed: '#333333',// item pressed

    // Stroke
    colorNeutralStroke1: 'rgba(255,255,255,0.1)', // border

    // Text
    colorNeutralForeground1: '#ffffff',
    colorNeutralForeground2: '#d6d6d6',
    colorNeutralForeground3: '#adadad',

    // Brand
    colorBrandForeground1: '#479ef5',

    // Shadow (Fluent dark elevation)
    shadow: '0 8px 16px rgba(0,0,0,0.48), 0 2px 4px rgba(0,0,0,0.36), 0 0 1px rgba(0,0,0,0.56)',

    // Radii / spacing (same as light)
    borderRadiusMedium: '4px',
    borderRadiusLarge: '8px',
    fontFamilyBase: '"Segoe UI", "Segoe UI Variable", system-ui, sans-serif',
    fontSizeBase300: '14px',
    fontWeightRegular: '400',
    fontWeightMedium: '500',
};

// ── MenuItem sub-component ────────────────────────────────────────────
interface MenuItemProps {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    first?: boolean;
    last?: boolean;
}

function MenuItem({ icon: Icon, label, onClick, first, last }: MenuItemProps) {
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);

    const bg = pressed
        ? dark.colorNeutralBackground1Pressed
        : hovered
            ? dark.colorNeutralBackground1Hover
            : 'transparent';

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false); }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                background: bg,
                border: 'none',
                borderRadius: dark.borderRadiusMedium,
                cursor: 'default',
                textAlign: 'left',
                fontFamily: dark.fontFamilyBase,
                fontSize: dark.fontSizeBase300,
                fontWeight: dark.fontWeightRegular,
                color: dark.colorNeutralForeground1,
                transition: 'background 0.1s ease',
                userSelect: 'none',
                // Slightly inset the first/last items to respect menu padding
                ...(first ? { marginTop: '2px' } : {}),
                ...(last ? { marginBottom: '2px' } : {}),
            }}
        >
            <Icon
                size={16}
                style={{
                    color: dark.colorNeutralForeground2,
                    flexShrink: 0,
                    transition: 'color 0.1s ease',
                    ...(hovered ? { color: dark.colorBrandForeground1 } : {}),
                }}
            />
            <span>{label}</span>
        </button>
    );
}

// ── Main component ────────────────────────────────────────────────────
export function DesktopContextMenu({ x, y, onClose, onNextWallpaper }: ContextMenuProps) {
    const { openWindow } = useWindowManager();

    const menuItems = [
        {
            label: 'Siguiente fondo',
            icon: Image,
            action: () => { onNextWallpaper?.(); onClose(); },
        },
        {
            label: 'Configuración',
            icon: Settings,
            action: () => { openWindow('settings'); onClose(); },
        },
    ];

    return (
        <>
            {/* Backdrop to capture outside clicks */}
            <div
                style={{ position: 'fixed', inset: 0, zIndex: 60 }}
                onClick={onClose}
                onContextMenu={e => e.preventDefault()}
            />

            {/* Menu surface */}
            <div
                style={{
                    position: 'fixed',
                    zIndex: 61,
                    left: x,
                    top: y,
                    minWidth: '200px',
                    background: dark.colorNeutralBackground1,
                    border: `1px solid ${dark.colorNeutralStroke1}`,
                    borderRadius: dark.borderRadiusLarge,
                    boxShadow: dark.shadow,
                    padding: '4px',
                    overflow: 'hidden',
                    // Fluent acrylic / frosted glass effect
                    backdropFilter: 'blur(40px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
                }}
            >
                {menuItems.map((item, i) => (
                    <MenuItem
                        key={i}
                        icon={item.icon}
                        label={item.label}
                        onClick={item.action}
                        first={i === 0}
                        last={i === menuItems.length - 1}
                    />
                ))}
            </div>
        </>
    );
}