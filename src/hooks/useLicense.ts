import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type {
    LicenseStatus,
    LemonSqueezyActivateResponse,
    LemonSqueezyDeactivateResponse,
    LicenseRestrictions,
} from '@/types/licensing';
import { LICENSE_RESTRICTIONS } from '@/types/licensing';

export function useLicense() {
    const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Validar licencia
    const validateLicense = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const status = await invoke<LicenseStatus>('validate_license');
            setLicenseStatus(status);
            return status;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(errorMsg);
            console.error('Error validating license:', errorMsg);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Activar licencia
    const activateLicense = useCallback(
        async (licenseKey: string, customerEmail: string, instanceName = 'Nuevo Galeno') => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await invoke<LemonSqueezyActivateResponse>('activate_license', {
                    licenseKey,
                    customerEmail,
                    instanceName,
                });

                if (response.activated) {
                    // Validar después de activar para obtener el estado actualizado
                    await validateLicense();
                    return { success: true, message: 'Licencia activada correctamente' };
                } else {
                    throw new Error(response.error || 'Error al activar licencia');
                }
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                setError(errorMsg);
                return { success: false, message: errorMsg };
            } finally {
                setIsLoading(false);
            }
        },
        [validateLicense]
    );

    // Desactivar licencia
    const deactivateLicense = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await invoke<LemonSqueezyDeactivateResponse>('deactivate_license');

            if (response.deactivated) {
                setLicenseStatus(null);
                return { success: true, message: 'Licencia desactivada correctamente' };
            } else {
                throw new Error(response.error || 'Error al desactivar licencia');
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(errorMsg);
            return { success: false, message: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Iniciar trial
    const startTrial = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            await invoke('start_trial');
            await validateLicense();

            return { success: true, message: 'Trial iniciado correctamente' };
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(errorMsg);
            return { success: false, message: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, [validateLicense]);

    // Obtener estado inicial de licencia
    const getLicenseStatus = useCallback(async () => {
        try {
            setIsLoading(true);
            const status = await invoke<LicenseStatus>('get_license_status');
            setLicenseStatus(status);
            return status;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(errorMsg);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Obtener restricciones basadas en el estado actual
    const getRestrictions = useCallback((): LicenseRestrictions => {
        if (!licenseStatus) {
            return LICENSE_RESTRICTIONS.unlicensed;
        }

        if (licenseStatus.is_active && licenseStatus.is_licensed) {
            return LICENSE_RESTRICTIONS.active;
        }

        if (licenseStatus.is_trial && !licenseStatus.trial_expired) {
            return {
                ...LICENSE_RESTRICTIONS.trial,
                watermark: LICENSE_RESTRICTIONS.trial.watermark?.replace(
                    '{days}',
                    String(licenseStatus.trial_days_remaining)
                ),
            };
        }

        return LICENSE_RESTRICTIONS.unlicensed;
    }, [licenseStatus]);

    // Verificar si una feature está disponible
    const hasFeature = useCallback(
        (feature: keyof LicenseRestrictions): boolean => {
            const restrictions = getRestrictions();
            const value = restrictions[feature];

            if (typeof value === 'boolean') {
                return value;
            }

            return true; // Si no es boolean, asumimos que está disponible
        },
        [getRestrictions]
    );

    // Verificar si se alcanzó un límite
    const isLimitReached = useCallback(
        (limitKey: 'max_patients' | 'max_appointments' | 'max_treatments', currentCount: number): boolean => {
            const restrictions = getRestrictions();
            const limit = restrictions[limitKey];

            if (typeof limit === 'number') {
                return currentCount >= limit;
            }

            return false; // Sin límite
        },
        [getRestrictions]
    );

    // Obtener mensaje de límite alcanzado
    const getLimitMessage = useCallback(
        (limitKey: 'max_patients' | 'max_appointments' | 'max_treatments'): string => {
            const restrictions = getRestrictions();
            const limit = restrictions[limitKey];

            if (typeof limit === 'number') {
                const labels = {
                    max_patients: 'pacientes',
                    max_appointments: 'citas',
                    max_treatments: 'tratamientos',
                };

                return `Has alcanzado el límite de ${limit} ${labels[limitKey]}. Activa una licencia para continuar.`;
            }

            return '';
        },
        [getRestrictions]
    );

    // Cargar estado inicial al montar
    useEffect(() => {
        getLicenseStatus();

        // Escuchar eventos de cambio de licencia
        const unlisten = listen('license-status-changed', () => {
            console.log('License status changed event received, refreshing...');
            getLicenseStatus();
        });

        // Validar cada 24 horas
        const interval = setInterval(
            () => {
                validateLicense();
            },
            24 * 60 * 60 * 1000
        ); // 24 horas

        return () => {
            unlisten.then(fn => fn());
            clearInterval(interval);
        };
    }, [getLicenseStatus, validateLicense]);

    return {
        licenseStatus,
        isLoading,
        error,
        activateLicense,
        deactivateLicense,
        validateLicense,
        startTrial,
        getLicenseStatus,
        getRestrictions,
        hasFeature,
        isLimitReached,
        getLimitMessage,
        // Helpers
        isLicensed: licenseStatus?.is_licensed ?? false,
        isActive: licenseStatus?.is_active ?? false,
        isTrial: licenseStatus?.is_trial ?? false,
        isExpired: licenseStatus?.trial_expired ?? false,
        trialDaysRemaining: licenseStatus?.trial_days_remaining ?? 0,
        isOfflineMode: licenseStatus?.offline_mode ?? false,
    };
}
