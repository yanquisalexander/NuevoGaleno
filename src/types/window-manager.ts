// Types for the Window Manager System

export type WindowId = string;

export interface WindowState {
    id: WindowId;
    appId: string;
    title: string;
    icon?: string;
    isMinimized: boolean;
    isMaximized: boolean;
    isFocused: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
    zIndex: number;
    data?: Record<string, any>; // App-specific data (e.g., patient ID for patient record)
}

export interface AppDefinition {
    id: string;
    name: string;
    icon: string;
    allowMultipleInstances: boolean;
    defaultSize: { width: number; height: number };
    minSize?: { width: number; height: number };
    component: React.ComponentType<{ windowId: WindowId; data?: any }>;
    showOnDesktop?: boolean;
}

export type WindowAction =
    | { type: 'OPEN_WINDOW'; appId: string; data?: any }
    | { type: 'CLOSE_WINDOW'; windowId: WindowId }
    | { type: 'MINIMIZE_WINDOW'; windowId: WindowId }
    | { type: 'MAXIMIZE_WINDOW'; windowId: WindowId }
    | { type: 'RESTORE_WINDOW'; windowId: WindowId }
    | { type: 'FOCUS_WINDOW'; windowId: WindowId }
    | { type: 'UPDATE_POSITION'; windowId: WindowId; position: { x: number; y: number } }
    | { type: 'UPDATE_SIZE'; windowId: WindowId; size: { width: number; height: number } };
