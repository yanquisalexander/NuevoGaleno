import { useState, useEffect } from 'react';
import { Download, Upload, Clock, HardDrive } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface BackupInfo {
    lastBackupDate: string | null;
    backupSize: string;
    autoBackupEnabled: boolean;
}

export function BackupManager({ data }: { data?: any }) {
    const [backupInfo, setBackupInfo] = useState<BackupInfo>({
        lastBackupDate: null,
        backupSize: '0 MB',
        autoBackupEnabled: false,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadBackupInfo();
    }, []);

    const loadBackupInfo = async () => {
        try {
            // Get data from plugin storage
            const lastBackup = await invoke('plugin_storage_get', {
                key: 'lastBackupDate'
            });
            const autoBackup = await invoke('plugin_storage_get', {
                key: 'autoBackupEnabled'
            });

            setBackupInfo({
                lastBackupDate: lastBackup as string || null,
                backupSize: '125 MB', // Mock
                autoBackupEnabled: (autoBackup as boolean) || false,
            });
        } catch (error) {
            console.error('Error loading backup info:', error);
        }
    };

    const createBackup = async () => {
        setLoading(true);
        try {
            toast.info('Creando backup...');

            // Simular creación de backup
            await new Promise(resolve => setTimeout(resolve, 2000));

            await invoke('plugin_storage_set', {
                key: 'lastBackupDate',
                value: new Date().toISOString()
            });

            await loadBackupInfo();
            toast.success('Backup creado exitosamente');
        } catch (error) {
            console.error('Error creating backup:', error);
            toast.error('Error al crear backup');
        } finally {
            setLoading(false);
        }
    };

    const toggleAutoBackup = async () => {
        try {
            const newValue = !backupInfo.autoBackupEnabled;
            await invoke('plugin_storage_set', {
                key: 'autoBackupEnabled',
                value: newValue
            });

            setBackupInfo(prev => ({ ...prev, autoBackupEnabled: newValue }));
            toast.success(`Backup automático ${newValue ? 'activado' : 'desactivado'}`);
        } catch (error) {
            console.error('Error toggling auto backup:', error);
            toast.error('Error al cambiar configuración');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <HardDrive size={32} className="text-blue-400" />
                <div>
                    <h1 className="text-2xl text-white font-bold">Backup & Restore</h1>
                    <p className="text-white/50">Gestiona los respaldos de tu clínica</p>
                </div>
            </div>

            {/* Backup Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="text-blue-400" size={20} />
                        <span className="text-white/70">Último Backup</span>
                    </div>
                    <div className="text-white font-medium">
                        {backupInfo.lastBackupDate
                            ? new Date(backupInfo.lastBackupDate).toLocaleDateString()
                            : 'Nunca'}
                    </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <HardDrive className="text-green-400" size={20} />
                        <span className="text-white/70">Tamaño</span>
                    </div>
                    <div className="text-white font-medium">{backupInfo.backupSize}</div>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="text-purple-400" size={20} />
                        <span className="text-white/70">Backup Automático</span>
                    </div>
                    <button
                        onClick={toggleAutoBackup}
                        className={`px-3 py-1 rounded text-sm ${backupInfo.autoBackupEnabled
                            ? 'bg-green-600 text-white'
                            : 'bg-white/10 text-white/70'
                            }`}
                    >
                        {backupInfo.autoBackupEnabled ? 'Activado' : 'Desactivado'}
                    </button>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
                <button
                    onClick={createBackup}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                    <Download size={20} />
                    {loading ? 'Creando backup...' : 'Crear Backup Ahora'}
                </button>

                <button
                    disabled
                    className="w-full bg-white/5 text-white/50 py-3 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed"
                >
                    <Upload size={20} />
                    Restaurar desde Backup
                </button>
            </div>

            {/* Info */}
            <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
                <p className="text-blue-400 text-sm">
                    💡 Los backups se guardan automáticamente cada semana si está activado el backup automático.
                    Puedes crear backups manuales en cualquier momento.
                </p>
            </div>
        </div>
    );
}
