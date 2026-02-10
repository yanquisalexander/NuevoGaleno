import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, MapPin, Bell, Tag, Save, ChevronDown } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Appointment, APPOINTMENT_TYPES, AppointmentStatus } from '../../types/appointments';
import { usePatients, type Patient } from '../../hooks/usePatients';
import { cn } from '@/lib/utils';

interface AppointmentFormProps {
    open: boolean;
    appointment?: Appointment;
    selectedDate?: Date;
    onSubmit: (appointment: Appointment) => Promise<void>;
    onCancel: () => void;
}

export function AppointmentForm({
    open,
    appointment,
    selectedDate,
    onSubmit,
    onCancel,
}: AppointmentFormProps) {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { getPatients } = usePatients();
    const [formData, setFormData] = useState<Partial<Appointment>>({
        patient_id: appointment?.patient_id || 0,
        title: appointment?.title || '',
        description: appointment?.description || '',
        start_time: appointment?.start_time || (selectedDate ? selectedDate.toISOString() : new Date().toISOString()),
        end_time: appointment?.end_time || (selectedDate ? addMinutes(selectedDate, 30).toISOString() : addMinutes(new Date(), 30).toISOString()),
        status: appointment?.status || 'scheduled',
        appointment_type: appointment?.appointment_type || '',
        location: appointment?.location || 'Consultorio Principal',
        reminder_minutes: appointment?.reminder_minutes ?? 30,
        color: appointment?.color || '#60cdff',
    });

    useEffect(() => {
        const loadPatients = async () => {
            try {
                const data = await getPatients();
                setPatients(data);

                // Si estamos editando, encontrar el nombre de paciente para mostrar si es necesario
                if (appointment?.patient_id) {
                    // Ya lo tenemos en data
                }
            } catch (error) {
                console.error('Error loading patients:', error);
            }
        };
        loadPatients();
    }, [appointment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.patient_id || !formData.title || !formData.start_time || !formData.end_time) {
            return;
        }

        setLoading(true);
        try {
            await onSubmit({
                ...appointment,
                ...formData,
                patient_id: formData.patient_id,
                title: formData.title,
                start_time: formData.start_time,
                end_time: formData.end_time,
                status: formData.status as AppointmentStatus,
            } as Appointment);
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: keyof Appointment, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // Filtrar pacientes para búsqueda
    const filteredPatients = patients.filter(p => {
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        const docNum = p.document_number || '';
        return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            docNum.includes(searchTerm);
    });

    if (!open) return null;

    return (
        <AnimatePresence>
            {open && (
                <div className="absolute inset-0 z-50 flex items-center justify-center py-4 px-6 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative w-full max-w-2xl bg-[#202020] border border-white/10 rounded-[8px] shadow-2xl flex flex-col max-h-full overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#272727]">
                            <h2 className="text-lg font-semibold text-white/90">
                                {appointment ? 'Editar Cita' : 'Nueva Cita'}
                            </h2>
                            <button
                                onClick={onCancel}
                                className="p-1.5 rounded-[4px] hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Paciente Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block">Paciente</label>
                                <div className="relative">
                                    <select
                                        className="w-full h-10 px-3 bg-[#2b2b2b] border border-white/10 rounded-[4px] text-white/90 text-sm focus:outline-none focus:border-[#005FB8] focus:ring-1 focus:ring-[#005FB8] appearance-none"
                                        value={formData.patient_id}
                                        onChange={(e) => updateField('patient_id', Number(e.target.value))}
                                    >
                                        <option value={0} disabled>Seleccione un paciente</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.first_name} {p.last_name} - {p.document_number}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-white/40 pointer-events-none" />
                                </div>
                            </div>

                            {/* Título de la Cita */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block">Título</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Consulta General"
                                    className="w-full h-10 px-3 bg-[#2b2b2b] border border-white/10 rounded-[4px] text-white/90 text-sm focus:outline-none focus:border-[#005FB8] focus:ring-1 focus:ring-[#005FB8]"
                                    value={formData.title}
                                    onChange={(e) => updateField('title', e.target.value)}
                                />
                            </div>

                            {/* Fecha y Hora - Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block">Inicio</label>
                                    <div className="relative">
                                        <input
                                            type="datetime-local"
                                            className="w-full h-10 px-3 bg-[#2b2b2b] border border-white/10 rounded-[4px] text-white/90 text-sm focus:outline-none focus:border-[#005FB8] focus:ring-1 focus:ring-[#005FB8] appearance-none"
                                            value={formData.start_time ? (() => {
                                                const date = new Date(formData.start_time);
                                                const year = date.getFullYear();
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const day = String(date.getDate()).padStart(2, '0');
                                                const hours = String(date.getHours()).padStart(2, '0');
                                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                                return `${year}-${month}-${day}T${hours}:${minutes}`;
                                            })() : ''}
                                            onChange={(e) => {
                                                const localDate = new Date(e.target.value);
                                                updateField('start_time', localDate.toISOString());
                                            }}
                                        />
                                        <Calendar className="absolute right-3 top-2.5 w-5 h-5 text-white/40 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block">Fin</label>
                                    <div className="relative">
                                        <input
                                            type="datetime-local"
                                            className="w-full h-10 px-3 bg-[#2b2b2b] border border-white/10 rounded-[4px] text-white/90 text-sm focus:outline-none focus:border-[#005FB8] focus:ring-1 focus:ring-[#005FB8] appearance-none"
                                            value={formData.end_time ? (() => {
                                                const date = new Date(formData.end_time);
                                                const year = date.getFullYear();
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const day = String(date.getDate()).padStart(2, '0');
                                                const hours = String(date.getHours()).padStart(2, '0');
                                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                                return `${year}-${month}-${day}T${hours}:${minutes}`;
                                            })() : ''}
                                            onChange={(e) => {
                                                const localDate = new Date(e.target.value);
                                                updateField('end_time', localDate.toISOString());
                                            }}
                                        />
                                        <Clock className="absolute right-3 top-2.5 w-5 h-5 text-white/40 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Tipo y Estado - Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block">Tipo</label>
                                    <div className="relative">
                                        <select
                                            className="w-full h-10 px-3 bg-[#2b2b2b] border border-white/10 rounded-[4px] text-white/90 text-sm focus:outline-none focus:border-[#005FB8] focus:ring-1 focus:ring-[#005FB8] appearance-none"
                                            value={formData.appointment_type}
                                            onChange={(e) => updateField('appointment_type', e.target.value)}
                                        >
                                            <option value="">Seleccione tipo...</option>
                                            {APPOINTMENT_TYPES.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-white/40 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block">Estado</label>
                                    <div className="relative">
                                        <select
                                            className="w-full h-10 px-3 bg-[#2b2b2b] border border-white/10 rounded-[4px] text-white/90 text-sm focus:outline-none focus:border-[#005FB8] focus:ring-1 focus:ring-[#005FB8] appearance-none"
                                            value={formData.status}
                                            onChange={(e) => updateField('status', e.target.value)}
                                        >
                                            <option value="scheduled">Programada</option>
                                            <option value="confirmed">Confirmada</option>
                                            <option value="completed">Completada</option>
                                            <option value="cancelled">Cancelada</option>
                                            <option value="no_show">No Asistió</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-white/40 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Ubicación */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    Ubicación
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Consultorio 1"
                                    className="w-full h-10 px-3 bg-[#2b2b2b] border border-white/10 rounded-[4px] text-white/90 text-sm focus:outline-none focus:border-[#005FB8] focus:ring-1 focus:ring-[#005FB8]"
                                    value={formData.location}
                                    onChange={(e) => updateField('location', e.target.value)}
                                />
                            </div>

                            {/* Color y Recordatorio - Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5" />
                                        Color
                                    </label>
                                    <div className="flex gap-2">
                                        {['#60cdff', '#00d084', '#eb144c', '#fcb900', '#9900ef'].map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => updateField('color', color)}
                                                className={cn(
                                                    "w-8 h-8 rounded-full border border-white/10 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50",
                                                    formData.color === color ? "ring-2 ring-white scale-110" : ""
                                                )}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                                        <Bell className="w-3.5 h-3.5" />
                                        Recordatorio
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full h-10 px-3 bg-[#2b2b2b] border border-white/10 rounded-[4px] text-white/90 text-sm focus:outline-none focus:border-[#005FB8] focus:ring-1 focus:ring-[#005FB8] appearance-none"
                                            value={formData.reminder_minutes ?? 30}
                                            onChange={(e) => updateField('reminder_minutes', Number(e.target.value))}
                                        >
                                            <option value={0}>Sin recordatorio</option>
                                            <option value={15}>15 minutos antes</option>
                                            <option value={30}>30 minutos antes</option>
                                            <option value={60}>1 hora antes</option>
                                            <option value={1440}>1 día antes</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-white/40 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Notas / Descripción */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block">Notas</label>
                                <textarea
                                    className="w-full min-h-[100px] px-3 py-2 bg-[#2b2b2b] border border-white/10 rounded-[4px] text-white/90 text-sm focus:outline-none focus:border-[#005FB8] focus:ring-1 focus:ring-[#005FB8] resize-none"
                                    placeholder="Detalles adicionales de la cita..."
                                    value={formData.description}
                                    onChange={(e) => updateField('description', e.target.value)}
                                />
                            </div>
                        </form>

                        {/* Footer Buttons */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 bg-[#272727]">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white bg-[#333] hover:bg-[#3d3d3d] border border-white/5 rounded-[4px] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#005FB8] hover:bg-[#005FB8]/90 rounded-[4px] shadow-sm transition-all active:scale-95 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>Guardando...</>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Guardar Cita
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
