import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { invoke } from '@tauri-apps/api/core';
import type { AppointmentWithPatient } from '../../types/appointments';

interface CalendarWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CalendarWidget({ isOpen, onClose }: CalendarWidgetProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        if (isOpen) {
            loadAppointments();
        }
    }, [isOpen, currentMonth]);

    const loadAppointments = async () => {
        try {
            const start = startOfMonth(currentMonth);
            const end = endOfMonth(currentMonth);

            const result = await invoke<AppointmentWithPatient[]>('list_appointments', {
                filter: {
                    start_date: start.toISOString(),
                    end_date: end.toISOString(),
                },
            });
            setAppointments(result);
        } catch (error) {
            console.error('Error loading appointments:', error);
        }
    };

    const renderCalendar = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { locale: es, weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { locale: es, weekStartsOn: 1 });

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const currentDay = day;
                const hasAppointments = appointments.some(apt =>
                    isSameDay(new Date(apt.start_time), currentDay)
                );

                days.push(
                    <button
                        key={day.toString()}
                        onClick={() => setSelectedDate(currentDay)}
                        className={`
                            relative h-10 flex items-center justify-center text-sm rounded-md transition-all
                            ${!isSameMonth(currentDay, monthStart) ? 'text-white/30' : 'text-white/90'}
                            ${isSameDay(currentDay, selectedDate) ? 'bg-[#60cdff] text-black font-semibold' : 'hover:bg-white/5'}
                            ${isToday(currentDay) && !isSameDay(currentDay, selectedDate) ? 'bg-white/10 font-semibold' : ''}
                        `}
                    >
                        {format(currentDay, 'd')}
                        {hasAppointments && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#60cdff]" />
                        )}
                    </button>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div key={day.toString()} className="grid grid-cols-7 gap-1">
                    {days}
                </div>
            );
            days = [];
        }
        return rows;
    };

    const getAppointmentsForSelectedDate = () => {
        return appointments.filter(apt =>
            isSameDay(new Date(apt.start_time), selectedDate)
        );
    };

    const appointmentsForDay = getAppointmentsForSelectedDate();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[47]"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 400 }}
                        className="fixed bottom-14 right-3 w-[360px] bg-[#2c2c2c]/95 backdrop-blur-[30px] rounded-xl shadow-2xl border border-white/10 z-[48] overflow-hidden"
                    >
                        {/* Header con mes y año */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <button
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-white/70" />
                            </button>
                            <h3 className="text-sm font-semibold text-white capitalize">
                                {format(currentMonth, 'MMMM yyyy', { locale: es })}
                            </h3>
                            <button
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-white/70" />
                            </button>
                        </div>

                        {/* Calendario */}
                        <div className="p-4 space-y-2">
                            {/* Días de la semana */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
                                    <div key={i} className="h-8 flex items-center justify-center text-xs font-medium text-white/50">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Días del mes */}
                            {renderCalendar()}
                        </div>

                        {/* Citas del día seleccionado */}
                        {appointmentsForDay.length > 0 && (
                            <div className="border-t border-white/10 p-4 max-h-[200px] overflow-y-auto">
                                <div className="text-xs font-semibold text-white/70 mb-2">
                                    Citas para {format(selectedDate, 'd MMMM', { locale: es })}
                                </div>
                                <div className="space-y-2">
                                    {appointmentsForDay.map(apt => (
                                        <div
                                            key={apt.id}
                                            className="flex items-start gap-2 p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                                        >
                                            <div
                                                className="w-1 h-full rounded-full flex-shrink-0"
                                                style={{ backgroundColor: apt.color || '#60cdff' }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium text-white truncate">
                                                    {apt.patient_name}
                                                </div>
                                                <div className="text-[11px] text-white/60 truncate">
                                                    {format(new Date(apt.start_time), 'HH:mm')} - {apt.title}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="border-t border-white/10 px-4 py-2 bg-black/20">
                            <div className="text-[11px] text-white/50">
                                Hoy: {format(new Date(), 'd MMMM yyyy', { locale: es })}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
