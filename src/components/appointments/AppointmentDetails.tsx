import { X, Calendar, Clock, User, Phone, MapPin, FileText, Tag, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { AppointmentWithPatient, APPOINTMENT_STATUS_LABELS } from '../../types/appointments';
import { Button } from '../ui/button';

interface AppointmentDetailsProps {
    open: boolean;
    appointment: AppointmentWithPatient;
    onEdit: () => void;
    onDelete: () => void;
    onClose: () => void;
}

export function AppointmentDetails({
    open,
    appointment,
    onEdit,
    onDelete,
    onClose,
}: AppointmentDetailsProps) {
    const startDate = new Date(appointment.start_time);
    const endDate = new Date(appointment.end_time);

    if (!open) return null;

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed left-0 right-0 bottom-0 top-8 z-50 flex items-center justify-center py-4 px-6 bg-black/40 backdrop-blur-sm" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative w-full max-w-lg bg-[#202020] border border-white/10 rounded-[8px] shadow-2xl flex flex-col max-h-full overflow-hidden"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#272727]">
                            <h2 className="text-lg font-semibold text-white/90">Detalles de la Cita</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={onEdit}
                                    className="p-1.5 rounded-[4px] hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                                    title="Editar"
                                >
                                    <FileText className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-[4px] hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                                    title="Cerrar"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-[#202020]">
                            {/* Título y Estado */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-semibold text-white tracking-tight">{appointment.title}</h3>
                                    <p className="text-sm text-white/40 mt-1">{appointment.appointment_type || 'Cita General'}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${appointment.status === 'completed'
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                    : appointment.status === 'cancelled'
                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}>
                                    {APPOINTMENT_STATUS_LABELS[appointment.status]}
                                </span>
                            </div>

                            {/* Info Card - Paciente */}
                            <div className="bg-[#272727] rounded-[6px] border border-white/5 p-4 flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 text-white/60" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase font-semibold text-white/40 mb-0.5">Paciente</p>
                                    <p className="text-white font-medium text-lg">{appointment.patient_name}</p>
                                    {appointment.patient_phone && (
                                        <div className="flex items-center gap-2 mt-1 text-white/50 text-sm">
                                            <Phone className="w-3.5 h-3.5" />
                                            <span>{appointment.patient_phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Detalles Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>Fecha</span>
                                    </div>
                                    <p className="text-white/90 font-medium">
                                        {format(startDate, 'EEEE, d MMMM yyyy', { locale: es })}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">
                                        <Clock className="w-4 h-4" />
                                        <span>Horario</span>
                                    </div>
                                    <p className="text-white/90 font-medium">
                                        {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                                    </p>
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <div className="flex items-center gap-2 text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>Ubicación</span>
                                    </div>
                                    <p className="text-white/90 font-medium">
                                        {appointment.location || 'Consultorio Principal'}
                                    </p>
                                </div>
                            </div>

                            {/* Descripción */}
                            {appointment.description && (
                                <div className="bg-[#272727] rounded-[6px] border border-white/5 p-4">
                                    <div className="flex items-center gap-2 text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">
                                        <FileText className="w-4 h-4" />
                                        <span>Notas</span>
                                    </div>
                                    <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                                        {appointment.description}
                                    </p>
                                </div>
                            )}

                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 border-t border-white/5 bg-[#272727] flex justify-between gap-3">
                            <button
                                onClick={onDelete}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-[4px] border border-red-500/20 transition-colors"
                            >
                                Eliminar Cita
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-[#333] hover:bg-[#3d3d3d] text-white/90 text-sm font-medium rounded-[4px] border border-white/5 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
