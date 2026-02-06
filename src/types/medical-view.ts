export type WidgetType =
    | 'quick-notes'
    | 'vital-signs'
    | 'recent-treatments'
    | 'pending-payments'
    | 'allergies-alert'
    | 'medical-history'
    | 'next-appointment'
    | 'odontogram-preview';

export interface MedicalWidget {
    id: string;
    type: WidgetType;
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
    config?: Record<string, any>;
}

export interface MedicalViewLayout {
    widgets: MedicalWidget[];
    gridColumns: number;
    gridRows: number;
}

export interface MedicalViewPreferences {
    enabled: boolean;
    layout: MedicalViewLayout;
}

export const DEFAULT_MEDICAL_VIEW: MedicalViewPreferences = {
    enabled: false,
    layout: {
        gridColumns: 12,
        gridRows: 8,
        widgets: [
            {
                id: 'allergies-1',
                type: 'allergies-alert',
                position: { x: 0, y: 0 },
                size: { width: 6, height: 2 },
            },
            {
                id: 'vitals-1',
                type: 'vital-signs',
                position: { x: 6, y: 0 },
                size: { width: 6, height: 2 },
            },
            {
                id: 'notes-1',
                type: 'quick-notes',
                position: { x: 0, y: 2 },
                size: { width: 8, height: 4 },
            },
            {
                id: 'treatments-1',
                type: 'recent-treatments',
                position: { x: 8, y: 2 },
                size: { width: 4, height: 4 },
            },
            {
                id: 'payments-1',
                type: 'pending-payments',
                position: { x: 0, y: 6 },
                size: { width: 6, height: 2 },
            },
            {
                id: 'appointment-1',
                type: 'next-appointment',
                position: { x: 6, y: 6 },
                size: { width: 6, height: 2 },
            },
        ],
    },
};
