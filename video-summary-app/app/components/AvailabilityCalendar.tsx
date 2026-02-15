'use client';

import { useState } from 'react';
import { AvailabilitySlot } from '../types/tutoring';
import { Plus, Trash2, Repeat, Calendar } from 'lucide-react';

interface AvailabilityCalendarProps {
    value: AvailabilitySlot[];
    onChange: (slots: AvailabilitySlot[]) => void;
}

const DAYS = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
] as const;

const TIME_SLOTS = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

export default function AvailabilityCalendar({ value, onChange }: AvailabilityCalendarProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const toggleSlot = (day: AvailabilitySlot['day'], startTime: string) => {
        const endTime = `${parseInt(startTime.split(':')[0]) + 1}:00`;
        const existingIndex = value.findIndex(
            slot => slot.day === day && slot.startTime === startTime
        );

        if (existingIndex >= 0) {
            onChange(value.filter((_, i) => i !== existingIndex));
        } else {
            onChange([...value, {
                day,
                startTime,
                endTime,
                recurring: true
            }]);
        }
    };

    const isSlotSelected = (day: AvailabilitySlot['day'], startTime: string) => {
        return value.some(slot => slot.day === day && slot.startTime === startTime);
    };

    const addCustomSlot = () => {
        const newSlot: AvailabilitySlot = {
            day: 'monday',
            startTime: '09:00',
            endTime: '10:00',
            recurring: false,
            specificDate: new Date().toISOString().split('T')[0]
        };
        onChange([...value, newSlot]);
    };

    const updateSlot = (index: number, updates: Partial<AvailabilitySlot>) => {
        const newSlots = [...value];
        newSlots[index] = { ...newSlots[index], ...updates };
        onChange(newSlots);
    };

    const removeSlot = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const toggleRecurring = (index: number) => {
        const newSlots = [...value];
        newSlots[index] = {
            ...newSlots[index],
            recurring: !newSlots[index].recurring,
            specificDate: newSlots[index].recurring ? new Date().toISOString().split('T')[0] : undefined
        };
        onChange(newSlots);
    };

    return (
        <div className="space-y-4">
            {/* View Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-[#0f1113] rounded-xl p-1">
                    <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Cuadrícula
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Lista
                    </button>
                </div>
                <button
                    type="button"
                    onClick={addCustomSlot}
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                    <Plus size={16} />
                    Fecha específica
                </button>
            </div>

            {viewMode === 'grid' ? (
                /* Grid View - Google Calendar Style */
                <div className="overflow-x-auto">
                    <div className="min-w-[700px]">
                        {/* Header */}
                        <div className="grid grid-cols-8 gap-1 mb-2">
                            <div className="text-xs text-gray-500 py-2"></div>
                            {DAYS.map(day => (
                                <div key={day.key} className="text-xs text-center text-gray-400 py-2 font-medium">
                                    {day.label}
                                </div>
                            ))}
                        </div>

                        {/* Time Grid */}
                        <div className="grid grid-cols-8 gap-1">
                            {TIME_SLOTS.map(time => (
                                <div key={`row-${time}`} className="contents">
                                    <div className="text-xs text-gray-500 py-2 text-right pr-2">
                                        {time}
                                    </div>
                                    {DAYS.map(day => {
                                        const selected = isSlotSelected(day.key, time);
                                        return (
                                            <button
                                                key={`${day.key}-${time}`}
                                                type="button"
                                                onClick={() => toggleSlot(day.key, time)}
                                                className={`h-8 rounded transition-all ${selected
                                                    ? 'bg-blue-500 hover:bg-blue-600'
                                                    : 'bg-[#0f1113] hover:bg-white/10 border border-white/5'
                                                    }`}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* List View */
                <div className="space-y-3">
                    {value.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <Calendar size={40} className="mx-auto mb-3 opacity-50" />
                            <p>No hay horarios configurados</p>
                            <p className="text-sm">Usa la cuadrícula o agrega una fecha específica</p>
                        </div>
                    ) : (
                        value.map((slot, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-4 bg-[#0f1113] rounded-xl p-4 border border-white/5"
                            >
                                {/* Day */}
                                <select
                                    value={slot.day}
                                    onChange={(e) => updateSlot(index, { day: e.target.value as AvailabilitySlot['day'] })}
                                    className="bg-transparent border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                >
                                    {DAYS.map(d => (
                                        <option key={d.key} value={d.key}>{d.label}</option>
                                    ))}
                                </select>

                                {/* Time Range */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={slot.startTime}
                                        onChange={(e) => updateSlot(index, { startTime: e.target.value })}
                                        className="bg-transparent border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                    />
                                    <span className="text-gray-500">a</span>
                                    <input
                                        type="time"
                                        value={slot.endTime}
                                        onChange={(e) => updateSlot(index, { endTime: e.target.value })}
                                        className="bg-transparent border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {/* Recurring Toggle */}
                                <button
                                    type="button"
                                    onClick={() => toggleRecurring(index)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${slot.recurring
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    <Repeat size={16} />
                                    <span className="text-sm">{slot.recurring ? 'Semanal' : 'Una vez'}</span>
                                </button>

                                {/* Specific Date (if not recurring) */}
                                {!slot.recurring && (
                                    <input
                                        type="date"
                                        value={slot.specificDate || ''}
                                        onChange={(e) => updateSlot(index, { specificDate: e.target.value })}
                                        className="bg-transparent border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                    />
                                )}

                                {/* Remove */}
                                <button
                                    type="button"
                                    onClick={() => removeSlot(index)}
                                    className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors ml-auto"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Summary */}
            <div className="text-sm text-gray-400 bg-[#0f1113] rounded-xl p-4 border border-white/5">
                <strong className="text-white">{value.length}</strong> bloques de disponibilidad configurados
                {value.filter(s => s.recurring).length > 0 && (
                    <span> • <strong className="text-green-400">{value.filter(s => s.recurring).length}</strong> semanales</span>
                )}
                {value.filter(s => !s.recurring).length > 0 && (
                    <span> • <strong className="text-blue-400">{value.filter(s => !s.recurring).length}</strong> fechas específicas</span>
                )}
            </div>
        </div>
    );
}
