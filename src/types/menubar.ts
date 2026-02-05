export interface MenuBarItem {
    id: string;
    label: string;
    type: 'item' | 'separator' | 'submenu';
    action?: () => void;
    shortcut?: string;
    disabled?: boolean;
    submenu?: MenuBarItem[];
}

export interface MenuBarMenu {
    id: string;
    label: string;
    items: MenuBarItem[];
}

export interface MenuBarConfig {
    appName?: string;
    menus: MenuBarMenu[];
}
