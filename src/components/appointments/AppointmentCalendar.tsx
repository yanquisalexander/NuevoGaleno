import { useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarEvent, AppointmentWithPatient, APPOINTMENT_STATUS_COLORS } from '../../types/appointments';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// ── Fluent dark tokens (en sync con el resto del sistema) ────────────────────
const F = {
    bg: '#161616',
    surface: '#1c1c1c',
    surfaceRaised: '#222222',
    hover: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.07)',
    borderMed: 'rgba(255,255,255,0.12)',
    brand: '#479ef5',
    brandBg: '#0078D4',
    brandMuted: 'rgba(71,158,245,0.12)',
    brandBorder: 'rgba(71,158,245,0.22)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.55)',
    textDisabled: 'rgba(255,255,255,0.28)',
    weekend: 'rgba(255,255,255,0.018)',
    today: 'rgba(71,158,245,0.07)',
    todayBorder: '#479ef5',
    font: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
    fontMono: "'Cascadia Code', 'Consolas', monospace",
};

// ── CSS override inyectado una sola vez ──────────────────────────────────────
const CALENDAR_CSS = `
.rbc-fluent * {
    font-family: ${F.font};
    box-sizing: border-box;
}

/* ── Estructura base ── */
.rbc-fluent .rbc-calendar { background: transparent; }
.rbc-fluent .rbc-time-view,
.rbc-fluent .rbc-month-view,
.rbc-fluent .rbc-agenda-view { background: transparent; border: none; }

/* ── Header oculto (lo maneja el padre) ── */
.rbc-fluent .rbc-toolbar { display: none; }

/* ── Bordes globales ── */
.rbc-fluent .rbc-time-content,
.rbc-fluent .rbc-time-header,
.rbc-fluent .rbc-month-view { border-color: ${F.border}; }

.rbc-fluent .rbc-day-bg + .rbc-day-bg,
.rbc-fluent .rbc-time-header-cell,
.rbc-fluent .rbc-header,
.rbc-fluent .rbc-timeslot-group,
.rbc-fluent .rbc-time-slot,
.rbc-fluent .rbc-day-slot .rbc-time-slot { border-color: ${F.border} !important; }

.rbc-fluent .rbc-time-content > * + * > * { border-color: ${F.border}; }

/* ── Time gutter ── */
.rbc-fluent .rbc-time-gutter .rbc-timeslot-group {
    border: none;
    border-bottom: 1px solid ${F.border};
    min-width: 52px;
}
.rbc-fluent .rbc-label {
    font-size: 10px;
    font-family: ${F.fontMono};
    color: ${F.textDisabled};
    padding: 0 8px;
    letter-spacing: 0.3px;
}

/* ── Headers de columna (días) ── */
.rbc-fluent .rbc-header {
    background: ${F.surface};
    border-bottom: 1px solid ${F.border};
    padding: 8px 4px;
    font-size: 11px;
    font-weight: 500;
    color: ${F.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.rbc-fluent .rbc-header a,
.rbc-fluent .rbc-header a:visited { color: inherit; text-decoration: none; }
.rbc-fluent .rbc-header a:hover { color: ${F.textPrimary}; }

/* ── Día actual ── */
.rbc-fluent .rbc-today {
    background-color: ${F.today} !important;
    position: relative;
}
.rbc-fluent .rbc-header.rbc-today {
    color: ${F.brand};
    border-bottom: 2px solid ${F.todayBorder};
    background: ${F.brandMuted};
}

/* ── Fondo de celdas ── */
.rbc-fluent .rbc-day-bg { background: transparent; transition: background 0.1s; }
.rbc-fluent .rbc-day-bg:hover { background: ${F.hover}; }
.rbc-fluent .rbc-off-range-bg { background: rgba(0,0,0,0.15); }

/* ── Slots de tiempo ── */
.rbc-fluent .rbc-time-slot { border-top: none; }
.rbc-fluent .rbc-timeslot-group { border-bottom: 1px solid ${F.border}; }

/* ── Selección ── */
.rbc-fluent .rbc-slot-selection {
    background: rgba(71,158,245,0.18);
    border: 1px solid ${F.brand};
    border-radius: 4px;
}

/* ── Eventos (estilos base, el resto via eventStyleGetter) ── */
.rbc-fluent .rbc-event {
    border-radius: 4px !important;
    border: none !important;
    padding: 3px 6px !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    line-height: 1.4 !important;
    cursor: pointer;
    transition: filter 0.12s, opacity 0.12s;
}
.rbc-fluent .rbc-event:hover { filter: brightness(1.18); }
.rbc-fluent .rbc-event:focus { outline: 2px solid ${F.brand}; outline-offset: 1px; }
.rbc-fluent .rbc-event-label {
    font-family: ${F.fontMono};
    font-size: 10px;
    opacity: 0.75;
    margin-bottom: 1px;
}
.rbc-fluent .rbc-event-content { font-size: 11px; }

/* Show more link */
.rbc-fluent .rbc-show-more {
    font-size: 10px;
    font-weight: 600;
    color: ${F.brand};
    background: ${F.brandMuted};
    border-radius: 3px;
    padding: 1px 6px;
    margin: 1px 2px;
}
.rbc-fluent .rbc-show-more:hover { background: rgba(71,158,245,0.2); }

/* ── Vista agenda ── */
.rbc-fluent .rbc-agenda-view table {
    border-color: ${F.border};
    font-size: 12px;
}
.rbc-fluent .rbc-agenda-date-cell,
.rbc-fluent .rbc-agenda-time-cell {
    color: ${F.textSecondary};
    font-size: 11px;
    border-color: ${F.border};
    padding: 8px 12px;
    vertical-align: top;
    white-space: nowrap;
}
.rbc-fluent .rbc-agenda-time-cell { font-family: ${F.fontMono}; font-size: 10px; }
.rbc-fluent .rbc-agenda-event-cell {
    padding: 6px 12px;
    border-color: ${F.border};
    color: ${F.textPrimary};
}
.rbc-fluent .rbc-agenda-empty {
    color: ${F.textDisabled};
    font-size: 13px;
    padding: 32px;
    text-align: center;
}
.rbc-fluent tbody > tr > td + td { border-left: 1px solid ${F.border}; }
.rbc-fluent .rbc-agenda-view table thead td { border-bottom: 2px solid ${F.borderMed}; }
.rbc-fluent .rbc-agenda-view table tbody tr:hover td { background: ${F.hover}; }

/* ── Vista mes: filas ── */
.rbc-fluent .rbc-month-row { border-color: ${F.border}; }
.rbc-fluent .rbc-date-cell {
    font-size: 11px;
    font-weight: 500;
    color: ${F.textSecondary};
    padding: 4px 6px;
}
.rbc-fluent .rbc-date-cell.rbc-now a { color: ${F.brand}; font-weight: 700; }
.rbc-fluent .rbc-date-cell.rbc-off-range a { color: ${F.textDisabled}; }

/* ── Scrollbar ── */
.rbc-fluent .rbc-time-content::-webkit-scrollbar { width: 5px; }
.rbc-fluent .rbc-time-content::-webkit-scrollbar-track { background: transparent; }
.rbc-fluent .rbc-time-content::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.10);
    border-radius: 3px;
}
.rbc-fluent .rbc-time-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.18);
}

/* ── Time header corner ── */
.rbc-fluent .rbc-time-header-gutter {
    background: ${F.surface};
    border-bottom: 1px solid ${F.border};
    min-width: 52px;
}

/* ── Overlapping events ── */
.rbc-fluent .rbc-day-slot .rbc-events-container { margin-right: 4px; }
`;

// ── Localizer ────────────────────────────────────────────────────────────────
const locales = { es };
const localizer = dateFnsLocalizer({
    format, parse,
    startOfWeek: () => startOfWeek(new Date(), { locale: es }),
    getDay, locales,
});

// ── Props ────────────────────────────────────────────────────────────────────
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

    // Inyectar CSS override una sola vez
    useEffect(() => {
        const id = 'rbc-fluent-styles';
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = CALENDAR_CSS;
        document.head.appendChild(style);
        return () => { document.getElementById(id)?.remove(); };
    }, []);

    // Convertir appointments → eventos
    const events: CalendarEvent[] = appointments.map((apt) => ({
        id: apt.id!,
        title: `${apt.patient_name} — ${apt.title}`,
        start: new Date(apt.start_time),
        end: new Date(apt.end_time),
        resource: apt,
    }));

    const eventStyleGetter = (event: CalendarEvent) => {
        const status = event.resource.status;
        const color = event.resource.color || APPOINTMENT_STATUS_COLORS[status];
        const isDimmed = status === 'cancelled' || status === 'completed';

        return {
            style: {
                backgroundColor: color,
                // Borde izquierdo más oscuro para dar sensación de profundidad
                borderLeft: `3px solid ${adjustBrightness(color, -30)} !important`,
                borderRadius: '4px',
                opacity: isDimmed ? 0.5 : 1,
                color: '#ffffff',
                boxShadow: 'none',
            },
        };
    };

    const dayPropGetter = (d: Date) => {
        const isWeekend = getDay(d) === 0 || getDay(d) === 6;
        return {
            style: {
                backgroundColor: isWeekend ? F.weekend : 'transparent',
            },
        };
    };

    const slotPropGetter = () => ({
        style: { borderColor: F.border },
    });

    return (
        <div
            className="rbc-fluent"
            style={{ height: '100%', background: F.bg, overflow: 'hidden' }}
        >
            <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                selectable
                onSelectSlot={onSelectSlot}
                onSelectEvent={onSelectEvent}
                eventPropGetter={eventStyleGetter}
                dayPropGetter={dayPropGetter}
                slotPropGetter={slotPropGetter}
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
                    noEventsInRange: 'Sin citas en este período',
                    showMore: (total) => `+${total} más`,
                }}
                formats={{
                    timeGutterFormat: (d, culture, loc) =>
                        loc?.format(d, 'HH:mm', culture) ?? '',
                    eventTimeRangeFormat: ({ start, end }, culture, loc) =>
                        `${loc?.format(start, 'HH:mm', culture)}–${loc?.format(end, 'HH:mm', culture)}`,
                    agendaTimeRangeFormat: ({ start, end }, culture, loc) =>
                        `${loc?.format(start, 'HH:mm', culture)}–${loc?.format(end, 'HH:mm', culture)}`,
                    dayHeaderFormat: (d, culture, loc) =>
                        loc?.format(d, 'EEEE d MMMM', culture) ?? '',
                    dayRangeHeaderFormat: ({ start, end }, culture, loc) =>
                        `${loc?.format(start, 'd MMM', culture)} – ${loc?.format(end, 'd MMM yyyy', culture)}`,
                    monthHeaderFormat: (d, culture, loc) =>
                        loc?.format(d, 'MMMM yyyy', culture) ?? '',
                    agendaDateFormat: (d, culture, loc) =>
                        loc?.format(d, 'EEE d MMM', culture) ?? '',
                    weekdayFormat: (d, culture, loc) =>
                        loc?.format(d, 'EEE', culture)?.toUpperCase() ?? '',
                }}
                step={15}
                timeslots={4}
                min={new Date(2000, 1, 1, 8, 0, 0)}
                max={new Date(2000, 1, 1, 20, 0, 0)}
                scrollToTime={new Date(2000, 1, 1, 8, 0, 0)}
                popup
                popupOffset={10}
            />
        </div>
    );
}

// ── Util: oscurecer un color hex ─────────────────────────────────────────────
function adjustBrightness(hex: string, amount: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    const clamp = (n: number) => Math.max(0, Math.min(255, n));
    const r = clamp(parseInt(result[1], 16) + amount);
    const g = clamp(parseInt(result[2], 16) + amount);
    const b = clamp(parseInt(result[3], 16) + amount);
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}