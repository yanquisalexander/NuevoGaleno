import { useState, useEffect } from 'react';
import { View, Views } from 'react-big-calendar';
import { Calendar, Plus, Filter, Bell, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppointmentCalendar } from '../components/appointments/AppointmentCalendar';
import { AppointmentForm } from '../components/appointments/AppointmentForm';
import { AppointmentDetails } from '../components/appointments/AppointmentDetails';
import { useAppointments } from '../hooks/useAppointments';
import { useNotifications } from '../contexts/NotificationContext';
import { Appointment, CalendarEvent, AppointmentFilter } from '../types/appointments';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useWindowManager } from '../contexts/WindowManagerContext';

export default function Appointments() {
    const {
        appointments,
        loading,
        fetchAppointments,
        createAppointment,
        updateAppointment,
        deleteAppointment,
    } = useAppointments();

    const { addNotification } = useNotifications();
    const { windows } = useWindowManager();

    const [view, setView] = useState<View>(Views.WEEK);
    const [date, setDate] = useState(new Date());
    const [showForm, setShowForm] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();

    const [filter, setFilter] = useState<AppointmentFilter>({});

    // Handle window data for opening specific appointment
    useEffect(() => {
        const currentWindow = windows.find(w => w.appId === 'appointments');
        if (currentWindow?.data?.appointmentId && currentWindow.data.action === 'view') {
            const appointment = appointments.find(a => a.id === currentWindow.data?.appointmentId);
            if (appointment) {
                setSelectedAppointment(appointment);
                setShowDetails(true);
            }
        }
    }, [windows, appointments]);

    // Cargar citas
    useEffect(() => {
        fetchAppointments(filter);
    }, [fetchAppointments, filter]);

    const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
        setSelectedDate(slotInfo.start);
        setSelectedAppointment(undefined);
        setShowForm(true);
    };

    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedAppointment(event.resource);
        setShowDetails(true);
    };

    const handleCreateAppointment = async (appointment: Appointment) => {
        try {
            await createAppointment(appointment);
            setShowForm(false);
            addNotification({
                type: 'success',
                title: 'Cita creada',
                message: 'La cita ha sido agendada correctamente',
                icon: '✓',
            });
        } catch (error) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudo crear la cita',
                icon: '✕',
            });
        }
    };

    const handleUpdateAppointment = async (appointment: Appointment) => {
        if (!appointment.id) return;
        try {
            await updateAppointment(appointment.id, appointment);
            setShowForm(false);
            setShowDetails(false);
            addNotification({
                type: 'success',
                title: 'Cita actualizada',
                message: 'Los cambios se han guardado correctamente',
                icon: '✓',
            });
        } catch (error) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudo actualizar la cita',
                icon: '✕',
            });
        }
    };

    const handleDeleteAppointment = async () => {
        if (!selectedAppointment?.id) return;
        try {
            await deleteAppointment(selectedAppointment.id);
            setShowDetails(false);
            setShowForm(false);
            addNotification({
                type: 'success',
                title: 'Cita eliminada',
                message: 'La cita ha sido eliminada del calendario',
                icon: 'trash',
            });
        } catch (error) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudo eliminar la cita',
                icon: '✕',
            });
        }
    };

    const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
        const newDate = new Date(date);
        if (action === 'TODAY') {
            setDate(new Date());
            return;
        }

        switch (view) {
            case Views.MONTH:
                newDate.setMonth(date.getMonth() + (action === 'NEXT' ? 1 : -1));
                break;
            case Views.WEEK:
                newDate.setDate(date.getDate() + (action === 'NEXT' ? 7 : -7));
                break;
            case Views.DAY:
                newDate.setDate(date.getDate() + (action === 'NEXT' ? 1 : -1));
                break;
            default:
                break;
        }
        setDate(newDate);
    };

    return (
        <div className="h-full flex flex-col space-y-4 p-2 overflow-hidden">
            {/* Header / Toolbar Principal */}
            <div className="flex items-center justify-between shrink-0 bg-[#202020] p-3 rounded-[8px] border border-white/5 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[8px] bg-[#2d2d2d] flex items-center justify-center border border-white/5 shadow-sm text-[#005FB8]">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-white/90 leading-tight">Agenda</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-white/50">{loading ? 'Cargando...' : `${appointments.length} eventos`}</span>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-xs font-medium text-[#005FB8]">
                                {format(date, 'MMMM yyyy', { locale: es })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Switcher */}
                    <div className="flex bg-[#272727] p-1 rounded-[6px] border border-white/5">
                        {[
                            { id: Views.MONTH, label: 'Mes' },
                            { id: Views.WEEK, label: 'Semana' },
                            { id: Views.DAY, label: 'Día' },
                            { id: Views.AGENDA, label: 'Lista' },
                        ].map((v) => (
                            <button
                                key={v.id}
                                onClick={() => setView(v.id as View)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all",
                                    view === v.id
                                        ? "bg-[#353535] text-white shadow-sm"
                                        : "text-white/60 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>

                    <div className="h-8 w-[1px] bg-white/10" />

                    {/* Navigation */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleNavigate('PREV')}
                            className="p-1.5 rounded-[4px] hover:bg-white/5 text-white/70 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleNavigate('TODAY')}
                            className="px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white bg-[#272727] hover:bg-[#333] border border-white/5 rounded-[4px] transition-colors"
                        >
                            Hoy
                        </button>
                        <button
                            onClick={() => handleNavigate('NEXT')}
                            className="p-1.5 rounded-[4px] hover:bg-white/5 text-white/70 hover:text-white transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="h-8 w-[1px] bg-white/10" />

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setSelectedDate(new Date());
                                setSelectedAppointment(undefined);
                                setShowForm(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#005FB8] hover:bg-[#005FB8]/90 text-white text-sm font-medium rounded-[4px] shadow-sm transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Nueva Cita</span>
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center rounded-[4px] text-white/70 hover:bg-white/5 hover:text-white transition-colors relative">
                            <Bell className="w-4 h-4" />
                            {/* <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#005FB8] rounded-full border border-[#202020]" /> */}
                        </button>
                    </div>
                </div>
            </div>

            {/* Contenedor del Calendario */}
            <div className="flex-1 bg-[#272727] rounded-[8px] shadow-sm border border-white/5 overflow-hidden flex flex-col relative text-sm">
                {loading && (
                    <div className="absolute inset-0 z-20 bg-[#272727]/80 backdrop-blur-[2px] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-[#005FB8] animate-spin" />
                    </div>
                )}

                <AppointmentCalendar
                    appointments={appointments}
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    view={view}
                    onViewChange={setView}
                    date={date}
                    onNavigate={setDate}
                />
            </div>

            {/* Modales */}
            <AnimatePresence>
                {showForm && (
                    <AppointmentForm
                        open={showForm}
                        appointment={selectedAppointment}
                        selectedDate={selectedDate}
                        onSubmit={selectedAppointment ? handleUpdateAppointment : handleCreateAppointment}
                        onCancel={() => setShowForm(false)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDetails && selectedAppointment && (
                    <AppointmentDetails
                        open={showDetails}
                        appointment={selectedAppointment as any}
                        onEdit={() => {
                            setShowDetails(false);
                            setShowForm(true);
                        }}
                        onDelete={handleDeleteAppointment}
                        onClose={() => setShowDetails(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}