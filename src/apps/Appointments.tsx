import { useState, useEffect } from 'react';
import { View, Views } from 'react-big-calendar';
import { Calendar, Plus, Bell, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { AppointmentCalendar } from '../components/appointments/AppointmentCalendar';
import { AppointmentForm } from '../components/appointments/AppointmentForm';
import { AppointmentDetails } from '../components/appointments/AppointmentDetails';
import { useAppointments } from '../hooks/useAppointments';
import { useNotifications } from '../contexts/NotificationContext';
import { Appointment, CalendarEvent, AppointmentFilter } from '../types/appointments';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useWindowManager } from '../contexts/WindowManagerContext';

import { fluentDarkCompact as F } from '@/consts/fluent-tokens';

// ── Micro-components ─────────────────────────────────────────────────────────

function Divider({ vertical = false }: { vertical?: boolean }) {
    return (
        <div style={{
            flexShrink: 0,
            ...(vertical
                ? { width: '1px', alignSelf: 'stretch', background: F.border }
                : { height: '1px', width: '100%', background: F.border }),
        }} />
    );
}

function ToolbarButton({
    onClick, active = false, children, title,
}: { onClick?: () => void; active?: boolean; children: React.ReactNode; title?: string }) {
    const [hov, setHov] = useState(false);
    return (
        <button
            title={title}
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '6px',
                border: `1px solid ${active ? F.borderMed : 'transparent'}`,
                borderRadius: '6px',
                background: active ? F.overlay : hov ? F.hover : 'transparent',
                color: active ? F.textPrimary : hov ? F.textPrimary : F.textSecondary,
                cursor: 'pointer',
                transition: 'background 0.1s, color 0.1s, border-color 0.1s',
                fontFamily: F.font,
            }}
        >
            {children}
        </button>
    );
}

function TodayButton({ onClick }: { onClick: () => void }) {
    const [hov, setHov] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                padding: '5px 12px',
                fontSize: '12px', fontWeight: 500,
                fontFamily: F.font,
                color: hov ? F.textPrimary : F.textSecondary,
                background: hov ? F.hover : 'transparent',
                border: `1px solid ${hov ? F.borderMed : F.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.1s',
            }}
        >
            Hoy
        </button>
    );
}

function NewAppointmentButton({ onClick }: { onClick: () => void }) {
    const [hov, setHov] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px',
                fontSize: '13px', fontWeight: 600,
                fontFamily: F.font,
                color: '#fff',
                background: hov ? F.brandHover : F.brandBg,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background 0.12s',
                flexShrink: 0,
            }}
        >
            <Plus style={{ width: '15px', height: '15px' }} />
            Nueva cita
        </button>
    );
}

function ViewTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    const [hov, setHov] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: active ? 600 : 400,
                fontFamily: F.font,
                color: active ? F.textPrimary : hov ? F.textPrimary : F.textSecondary,
                background: active ? F.overlay : hov ? F.hover : 'transparent',
                border: `1px solid ${active ? F.borderMed : 'transparent'}`,
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'all 0.1s',
                whiteSpace: 'nowrap',
            }}
        >
            {label}
        </button>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Appointments() {
    const {
        appointments, loading,
        fetchAppointments, createAppointment, updateAppointment, deleteAppointment,
    } = useAppointments();

    const { addNotification } = useNotifications();
    const { windows } = useWindowManager();

    const [view, setView] = useState<View>(Views.WEEK);
    const [date, setDate] = useState(new Date());
    const [showForm, setShowForm] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [filter] = useState<AppointmentFilter>({});

    useEffect(() => {
        const win = windows.find(w => w.appId === 'appointments');
        if (win?.data?.appointmentId && win.data.action === 'view') {
            const appt = appointments.find(a => a.id === win.data?.appointmentId);
            if (appt) { setSelectedAppointment(appt); setShowDetails(true); }
        }
    }, [windows, appointments]);

    useEffect(() => { fetchAppointments(filter); }, [fetchAppointments, filter]);

    const handleSelectSlot = ({ start }: { start: Date; end: Date }) => {
        setSelectedDate(start); setSelectedAppointment(undefined); setShowForm(true);
    };
    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedAppointment(event.resource); setShowDetails(true);
    };

    const handleCreate = async (appt: Appointment) => {
        try {
            await createAppointment(appt); setShowForm(false);
            addNotification({ type: 'success', title: 'Cita creada', message: 'Agendada correctamente' });
        } catch {
            addNotification({ type: 'error', title: 'Error', message: 'No se pudo crear la cita' });
        }
    };
    const handleUpdate = async (appt: Appointment) => {
        if (!appt.id) return;
        try {
            await updateAppointment(appt.id, appt); setShowForm(false); setShowDetails(false);
            addNotification({ type: 'success', title: 'Cita actualizada', message: 'Cambios guardados' });
        } catch {
            addNotification({ type: 'error', title: 'Error', message: 'No se pudo actualizar' });
        }
    };
    const handleDelete = async () => {
        if (!selectedAppointment?.id) return;
        try {
            await deleteAppointment(selectedAppointment.id); setShowDetails(false); setShowForm(false);
            addNotification({ type: 'success', title: 'Cita eliminada', message: 'Eliminada del calendario' });
        } catch {
            addNotification({ type: 'error', title: 'Error', message: 'No se pudo eliminar' });
        }
    };

    const navigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
        if (action === 'TODAY') { setDate(new Date()); return; }
        const d = new Date(date);
        const delta = action === 'NEXT' ? 1 : -1;
        if (view === Views.MONTH) d.setMonth(d.getMonth() + delta);
        else if (view === Views.WEEK) d.setDate(d.getDate() + delta * 7);
        else d.setDate(d.getDate() + delta);
        setDate(d);
    };

    const VIEWS = [
        { id: Views.MONTH, label: 'Mes' },
        { id: Views.WEEK, label: 'Semana' },
        { id: Views.DAY, label: 'Día' },
        { id: Views.AGENDA, label: 'Lista' },
    ];

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
            background: F.bg,
            fontFamily: F.font,
            overflow: 'hidden',
        }}>

            {/* ── Toolbar ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: F.surface,
                borderBottom: `1px solid ${F.border}`,
                flexShrink: 0,
            }}>

                {/* App icon + title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '4px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: F.brandMuted,
                        border: `1px solid ${F.brandBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <Calendar style={{ width: '16px', height: '16px', color: F.brand }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: F.textPrimary, lineHeight: 1.2 }}>
                            Agenda
                        </div>
                        <div style={{ fontSize: '11px', color: F.textDisabled, lineHeight: 1.2, marginTop: '1px' }}>
                            {loading ? 'Cargando…' : `${appointments.length} eventos`}
                            {' · '}
                            <span style={{ color: F.brand }}>
                                {format(date, "MMMM yyyy", { locale: es })}
                            </span>
                        </div>
                    </div>
                </div>

                <Divider vertical />

                {/* View switcher */}
                <div style={{
                    display: 'flex', gap: '2px',
                    padding: '3px',
                    background: F.bg,
                    border: `1px solid ${F.border}`,
                    borderRadius: '7px',
                }}>
                    {VIEWS.map(v => (
                        <ViewTab
                            key={v.id}
                            label={v.label}
                            active={view === v.id}
                            onClick={() => setView(v.id as View)}
                        />
                    ))}
                </div>

                <Divider vertical />

                {/* Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <ToolbarButton onClick={() => navigate('PREV')} title="Anterior">
                        <ChevronLeft style={{ width: '16px', height: '16px' }} />
                    </ToolbarButton>

                    <TodayButton onClick={() => navigate('TODAY')} />

                    <ToolbarButton onClick={() => navigate('NEXT')} title="Siguiente">
                        <ChevronRight style={{ width: '16px', height: '16px' }} />
                    </ToolbarButton>
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Bell */}
                <ToolbarButton title="Recordatorios">
                    <Bell style={{ width: '16px', height: '16px' }} />
                </ToolbarButton>

                <Divider vertical />

                {/* Nueva cita */}
                <NewAppointmentButton onClick={() => { setSelectedDate(new Date()); setSelectedAppointment(undefined); setShowForm(true); }} />
            </div>

            {/* ── Calendar area ── */}
            <div style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                background: F.surfaceRaised,
            }}>
                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 20,
                        background: 'rgba(20,20,20,0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Loader2 style={{ width: '28px', height: '28px', color: F.brand, animation: 'spin 1s linear infinite' }} />
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

            {/* ── Modales ── */}
            <AnimatePresence>
                {showForm && (
                    <AppointmentForm
                        open={showForm}
                        appointment={selectedAppointment}
                        selectedDate={selectedDate}
                        onSubmit={selectedAppointment ? handleUpdate : handleCreate}
                        onCancel={() => setShowForm(false)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDetails && selectedAppointment && (
                    <AppointmentDetails
                        open={showDetails}
                        appointment={selectedAppointment as any}
                        onEdit={() => { setShowDetails(false); setShowForm(true); }}
                        onDelete={handleDelete}
                        onClose={() => setShowDetails(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}