import { Treatment } from '../../hooks/useTreatments';
import { motion } from 'motion/react';

interface TreatmentStatusBadgeProps {
    status: Treatment['status'];
    size?: 'sm' | 'md';
}

const statusConfig = {
    Pending: {
        label: 'Por Hacer',
        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        icon: '⏳'
    },
    InProgress: {
        label: 'En Tratamiento',
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: '🔄'
    },
    Completed: {
        label: 'Terminado',
        color: 'bg-green-500/20 text-green-400 border-green-500/30',
        icon: '✅'
    },
    Cancelled: {
        label: 'Cancelado',
        color: 'bg-red-500/20 text-red-400 border-red-500/30',
        icon: '❌'
    }
};

export function TreatmentStatusBadge({ status, size = 'md' }: TreatmentStatusBadgeProps) {
    const config = statusConfig[status];
    const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

    return (
        <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.color} ${sizeClass}`}
        >
            <span>{config.icon}</span>
            {config.label}
        </motion.span>
    );
}
