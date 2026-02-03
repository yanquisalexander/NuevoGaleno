import { Calendar as BigCalendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarEvent, AppointmentWithPatient, APPOINTMENT_STATUS_COLORS } from '../../types/appointments';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar-styles.css';

const locales = {
    es: es,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { locale: es }),
    getDay,
    locales,
});

interface AppointmentCalendarProps {
    appointments: AppointmentWithPatient[];
    onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
    onSelectEvent?: (event: CalendarEvent) => void;
    view?: View;
    onViewChange?: (view: View) => void;
    date?: Date;
    onNavigate?: (date: Date) => void;
}

export function AppointmentCalendar({
    appointments,
    onSelectSlot,
    onSelectEvent,
    view = Views.WEEK,
    onViewChange,
    date,
    onNavigate,
}: AppointmentCalendarProps) {
    // Convertir appointments a eventos del calendario
    const events: CalendarEvent[] = appointments.map((apt) => ({
        id: apt.id!,
        title: `${apt.patient_name} - ${apt.title}`,
        start: new Date(apt.start_time),
        end: new Date(apt.end_time),
        resource: apt,
    }));

    const eventStyleGetter = (event: CalendarEvent) => {
        const status = event.resource.status;
        const backgroundColor = event.resource.color || APPOINTMENT_STATUS_COLORS[status];

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: status === 'cancelled' || status === 'completed' ? 0.6 : 1,
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'block',
                fontSize: '11px',
                fontWeight: '500',
                padding: '2px 4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            },
        };
    };

    const dayPropGetter = (date: Date) => {
        const isWeekend = getDay(date) === 0 || getDay(date) === 6;
        return {
            className: isWeekend ? 'rbc-weekend-day' : '',
            style: {
                backgroundColor: isWeekend ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
            },
        };
    };

    return (
        <div className="h-full bg-transparent overflow-hidden">
            <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%', minHeight: '600px' }}
                selectable
                onSelectSlot={onSelectSlot}
                onSelectEvent={onSelectEvent}
                eventPropGetter={eventStyleGetter}
                dayPropGetter={dayPropGetter}
                view={view}
                onView={onViewChange}
                date={date}
                onNavigate={onNavigate}
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                messages={{
                    month: 'Mes',
                    week: 'Semana',
                    day: 'Día',
                    agenda: 'Agenda',
                    today: 'Hoy',
                    previous: 'Anterior',
                    next: 'Siguiente',
                    noEventsInRange: 'No hay citas en este rango de fechas',
                    showMore: (total) => `+ Ver más (${total})`,
                }}
                formats={{
                    timeGutterFormat: (date, culture, localizer) =>
                        localizer?.format(date, 'HH:mm', culture) ?? '',
                    eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
                        `${localizer?.format(start, 'HH:mm', culture)} - ${localizer?.format(end, 'HH:mm', culture)}`,
                    agendaTimeRangeFormat: ({ start, end }, culture, localizer) =>
                        `${localizer?.format(start, 'HH:mm', culture)} - ${localizer?.format(end, 'HH:mm', culture)}`,
                    dayHeaderFormat: (date, culture, localizer) =>
                        localizer?.format(date, 'EEEE, d MMMM', culture) ?? '',
                    dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
                        `${localizer?.format(start, 'd MMMM', culture)} - ${localizer?.format(end, 'd MMMM', culture)}`,
                }}
                step={15}
                timeslots={4}
                min={new Date(2000, 1, 1, 8, 0, 0)}
                max={new Date(2000, 1, 1, 20, 0, 0)}
                scrollToTime={new Date(2000, 1, 1, 8, 0, 0)}
            />
        </div>
    );
}
