import { useState } from 'react';
import { Bell, CheckCircle, XCircle, AlertTriangle, Info, Zap, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from '../hooks/useToast';

export function NotificationDemo() {
    const toast = useToast();
    const [soundEnabled, setSoundEnabled] = useState(true);

    const examples = [
        {
            label: 'Success',
            icon: <CheckCircle className="w-4 h-4" />,
            color: 'from-green-500 to-emerald-600',
            action: () => toast.success(
                'Operación exitosa',
                'El paciente ha sido guardado correctamente',
                { sound: soundEnabled }
            )
        },
        {
            label: 'Error',
            icon: <XCircle className="w-4 h-4" />,
            color: 'from-red-500 to-rose-600',
            action: () => toast.error(
                'Error en la operación',
                'No se pudo conectar con el servidor. Intenta nuevamente.',
                { sound: soundEnabled }
            )
        },
        {
            label: 'Warning',
            icon: <AlertTriangle className="w-4 h-4" />,
            color: 'from-yellow-500 to-orange-600',
            action: () => toast.warning(
                'Advertencia del sistema',
                'El espacio en disco está por debajo del 10%',
                { sound: soundEnabled }
            )
        },
        {
            label: 'Info',
            icon: <Info className="w-4 h-4" />,
            color: 'from-blue-500 to-cyan-600',
            action: () => toast.info(
                'Nueva actualización disponible',
                'Versión 2.5.0 está lista para instalar',
                { sound: soundEnabled }
            )
        },
        {
            label: 'Con Acciones',
            icon: <Bell className="w-4 h-4" />,
            color: 'from-purple-500 to-pink-600',
            action: () => toast.info(
                'Cita pendiente',
                'Juan Pérez tiene una cita en 15 minutos',
                {
                    sound: soundEnabled,
                    actions: [
                        { label: 'Ver detalles', onClick: () => console.log('Ver detalles') },
                        { label: 'Posponer', onClick: () => console.log('Posponer') }
                    ]
                }
            )
        },
        {
            label: 'Persistente',
            icon: <Zap className="w-4 h-4" />,
            color: 'from-indigo-500 to-blue-600',
            action: () => toast.persistent(
                'Acción requerida',
                'Por favor confirma la operación antes de continuar',
                [
                    { label: 'Confirmar', onClick: () => console.log('Confirmado') },
                    { label: 'Cancelar', onClick: () => console.log('Cancelado') }
                ]
            )
        },
        {
            label: 'Urgente',
            icon: <XCircle className="w-4 h-4 animate-pulse" />,
            color: 'from-red-600 to-red-700',
            action: () => toast.urgent(
                '⚠️ Alerta crítica',
                'El servidor de base de datos no responde',
                [
                    { label: 'Reintentar', onClick: () => console.log('Reintentar') },
                    { label: 'Ver log', onClick: () => console.log('Ver log') }
                ]
            )
        }
    ];

    return (
        <div className="p-6 bg-gradient-to-br from-[#2c2c2c] to-[#1c1c1c] rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">Sistema de Notificaciones</h3>
                    <p className="text-sm text-white/60 mt-1">Prueba los diferentes tipos de notificaciones</p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-3 rounded-xl transition-colors ${soundEnabled
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-white/5 text-white/40'
                        }`}
                >
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </motion.button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {examples.map((example, index) => (
                    <motion.button
                        key={index}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={example.action}
                        className={`p-4 bg-gradient-to-br ${example.color} rounded-xl flex items-center gap-3 text-white font-medium text-sm shadow-lg hover:shadow-xl transition-shadow`}
                    >
                        {example.icon}
                        {example.label}
                    </motion.button>
                ))}
            </div>

            <div className="mt-6 p-4 bg-black/20 rounded-xl border border-white/5">
                <h4 className="text-xs font-semibold text-white/70 mb-2">Características:</h4>
                <ul className="text-xs text-white/50 space-y-1">
                    <li>• Animaciones suaves estilo Windows 11</li>
                    <li>• Sonidos del sistema personalizados</li>
                    <li>• Notificaciones persistentes y temporales</li>
                    <li>• Soporte para acciones y botones</li>
                    <li>• Sistema de prioridades (normal, high, urgent)</li>
                    <li>• Stack de hasta 5 notificaciones visibles</li>
                </ul>
            </div>
        </div>
    );
}
