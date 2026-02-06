import { useState, useEffect, useCallback } from 'react';
import { MedicalViewPreferences, DEFAULT_MEDICAL_VIEW, MedicalWidget } from '@/types/medical-view';
import { toast } from 'sonner';

const STORAGE_KEY = 'medical_view_preferences';

export function useMedicalView() {
    const [preferences, setPreferences] = useState<MedicalViewPreferences>(DEFAULT_MEDICAL_VIEW);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);

    // Cargar preferencias guardadas
    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = useCallback(async () => {
        setIsLoading(true);
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as MedicalViewPreferences;
                setPreferences(parsed);
            } else {
                setPreferences(DEFAULT_MEDICAL_VIEW);
            }
        } catch (error) {
            console.error('Error cargando preferencias de vista médica:', error);
            setPreferences(DEFAULT_MEDICAL_VIEW);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const savePreferences = useCallback(async (newPreferences: MedicalViewPreferences) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
            setPreferences(newPreferences);
            toast.success('Preferencias guardadas');
        } catch (error) {
            console.error('Error guardando preferencias:', error);
            toast.error('Error al guardar preferencias');
        }
    }, []);

    const toggleMedicalView = useCallback(async () => {
        const newPrefs = {
            ...preferences,
            enabled: !preferences.enabled,
        };
        await savePreferences(newPrefs);
    }, [preferences, savePreferences]);

    const updateWidget = useCallback((widgetId: string, updates: Partial<MedicalWidget>) => {
        setPreferences(prev => ({
            ...prev,
            layout: {
                ...prev.layout,
                widgets: prev.layout.widgets.map(w =>
                    w.id === widgetId ? { ...w, ...updates } : w
                ),
            },
        }));
    }, []);

    const addWidget = useCallback((widget: MedicalWidget) => {
        setPreferences(prev => ({
            ...prev,
            layout: {
                ...prev.layout,
                widgets: [...prev.layout.widgets, widget],
            },
        }));
    }, []);

    const removeWidget = useCallback((widgetId: string) => {
        setPreferences(prev => ({
            ...prev,
            layout: {
                ...prev.layout,
                widgets: prev.layout.widgets.filter(w => w.id !== widgetId),
            },
        }));
    }, []);

    const resetToDefault = useCallback(async () => {
        await savePreferences(DEFAULT_MEDICAL_VIEW);
        toast.success('Vista médica restaurada');
    }, [savePreferences]);

    const saveLayout = useCallback(async () => {
        await savePreferences(preferences);
        setIsEditMode(false);
    }, [preferences, savePreferences]);

    return {
        preferences,
        isLoading,
        isEditMode,
        setIsEditMode,
        toggleMedicalView,
        updateWidget,
        addWidget,
        removeWidget,
        resetToDefault,
        saveLayout,
    };
}
