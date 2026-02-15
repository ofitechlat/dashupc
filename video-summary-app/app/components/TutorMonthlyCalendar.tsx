'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, BookOpen } from 'lucide-react';

interface ClassSession {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    student_name?: string;
    subject_name?: string;
}

interface TutorMonthlyCalendarProps {
    classes: ClassSession[];
}

export default function TutorMonthlyCalendar({ classes }: TutorMonthlyCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    // Adjust firstDayOfMonth to start on Monday (0=Mon, 6=Sun)
    // original: 0=Sun, 1=Mon...
    const firstDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const monthName = currentDate.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const getClassesForDay = (day: number) => {
        return classes.filter(c => {
            const date = new Date(c.scheduled_at);
            return date.getDate() === day &&
                date.getMonth() === currentDate.getMonth() &&
                date.getFullYear() === currentDate.getFullYear();
        }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    };

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);

    const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    return (
        <div className="bg-[#1a1c1e] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-purple-600/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                        <CalendarIcon size={20} />
                    </div>
                    <h3 className="text-xl font-bold capitalize">{monthName}</h3>
                </div>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-bold bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                        Hoy
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAY_LABELS.map(day => (
                        <div key={day} className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest py-2">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {blanks.map(i => (
                        <div key={`blank-${i}`} className="aspect-square bg-white/[0.01] rounded-xl border border-transparent" />
                    ))}
                    {days.map(day => {
                        const dayClasses = getClassesForDay(day);
                        const isToday = day === new Date().getDate() &&
                            currentDate.getMonth() === new Date().getMonth() &&
                            currentDate.getFullYear() === new Date().getFullYear();

                        return (
                            <div
                                key={day}
                                className={`aspect-square p-2 rounded-2xl border transition-all flex flex-col gap-1 overflow-hidden 
                                    ${isToday ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/[0.03] border-white/5 hover:border-white/20'}`}
                            >
                                <span className={`text-xs font-bold ${isToday ? 'text-blue-400' : 'text-gray-500'}`}>
                                    {day}
                                </span>
                                <div className="flex flex-col gap-0.5 overflow-y-auto custom-scrollbar pr-1">
                                    {dayClasses.map(cls => (
                                        <div
                                            key={cls.id}
                                            title={`${cls.subject_name} - ${cls.student_name}`}
                                            className={`text-[8px] px-1.5 py-0.5 rounded leading-tight truncate 
                                                ${cls.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/20' :
                                                    cls.status === 'cancelled' ? 'bg-red-500/20 text-red-400 border border-red-500/20 text-decoration-line-through' :
                                                        'bg-blue-500/20 text-blue-300 border border-blue-500/20'}`}
                                        >
                                            {new Date(cls.scheduled_at).toLocaleTimeString('es-CR', { hour: 'numeric', minute: '2-digit', hour12: false })}
                                            <span className="ml-1 opacity-70">{cls.subject_name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="p-4 border-t border-white/5 bg-black/20 flex flex-wrap gap-4 justify-center text-[10px] uppercase font-bold tracking-wider text-gray-500">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500/50" /> Programada/Confirmada
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" /> Completada
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" /> Cancelada
                </div>
            </div>
        </div>
    );
}
