import { useState, useEffect } from 'react';
import { OdontogramEntry, getOdontogramByPatient, updateToothCondition } from '../../hooks/useOdontogram';
import { motion } from 'motion/react';

interface OdontogramProps {
    patientId: number;
}

// Notación FDI: vista desde la perspectiva del odontólogo
// Cuadrante 1 (11-18): Superior derecho del PACIENTE (aparece a la izquierda en pantalla)
// Cuadrante 2 (21-28): Superior izquierdo del PACIENTE (aparece a la derecha en pantalla)
// Cuadrante 4 (41-48): Inferior derecho del PACIENTE (aparece a la izquierda en pantalla)
// Cuadrante 3 (31-38): Inferior izquierdo del PACIENTE (aparece a la derecha en pantalla)
const TEETH_FDI = {
    upper: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
    lower: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
};

const CONDITION_COLORS: Record<string, string> = {
    healthy: '#4ade80',
    caries: '#ef4444',
    endodoncia: '#3b82f6',
    corona: '#fbbf24',
    ausente: '#6b7280',
    fractura: '#f97316',
    obturacion: '#10b981',
};

export function Odontogram({ patientId }: OdontogramProps) {
    const [entries, setEntries] = useState<OdontogramEntry[]>([]);
    const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
    const [selectedCondition, setSelectedCondition] = useState('healthy');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadOdontogram();
    }, [patientId]);

    const loadOdontogram = async () => {
        setIsLoading(true);
        try {
            const data = await getOdontogramByPatient(patientId);
            setEntries(data);
        } catch (error) {
            console.error('Error cargando odontograma:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getToothCondition = (toothNumber: number): string => {
        const entry = entries.find(e => e.tooth_number === toothNumber.toString());
        return entry?.condition || 'healthy';
    };

    const handleToothClick = (toothNumber: number) => {
        setSelectedTooth(toothNumber);
        const entry = entries.find(e => e.tooth_number === toothNumber.toString());
        if (entry) {
            setSelectedCondition(entry.condition);
            setNotes(entry.notes || '');
        } else {
            setSelectedCondition('healthy');
            setNotes('');
        }
    };

    const handleSaveCondition = async () => {
        if (!selectedTooth) return;

        try {
            await updateToothCondition({
                patient_id: patientId,
                tooth_number: selectedTooth.toString(),
                condition: selectedCondition,
                notes: notes || undefined,
            });
            await loadOdontogram();
            setSelectedTooth(null);
        } catch (error) {
            console.error('Error guardando condición:', error);
            alert('Error guardando la condición del diente');
        }
    };

    const renderTooth = (toothNumber: number) => {
        const condition = getToothCondition(toothNumber);
        const color = CONDITION_COLORS[condition] || CONDITION_COLORS.healthy;
        const isSelected = selectedTooth === toothNumber;

        return (
            <motion.button
                key={toothNumber}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleToothClick(toothNumber)}
                className={`relative w-9 h-14 rounded-[2px] transition-all flex items-center justify-center ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2c2c2c] z-10' : ''
                    }`}
                style={{ backgroundColor: color }}
            >
                <span className="text-[10px] font-semibold text-black/50 bg-white/30 px-1 rounded-sm">
                    {toothNumber}
                </span>
            </motion.button>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#005FB8] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col items-center gap-8 py-6 bg-[#202020] rounded-[8px] border border-white/5">
                {/* Odontograma Superior */}
                <div className="w-full px-6">
                    <div className="text-xs text-white/40 mb-3 text-center uppercase tracking-widest font-semibold">Arcada Superior</div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                        {TEETH_FDI.upper.map(renderTooth)}
                    </div>
                </div>

                {/* Separator */}
                <div className="w-32 h-px bg-white/10" />

                {/* Odontograma Inferior */}
                <div className="w-full px-6">
                    <div className="text-xs text-white/40 mb-3 text-center uppercase tracking-widest font-semibold">Arcada Inferior</div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                        {TEETH_FDI.lower.map(renderTooth)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Leyenda */}
                <div className="lg:col-span-2 bg-[#272727] rounded-[8px] p-5 border border-white/5">
                    <div className="text-xs font-semibold text-white/90 mb-4 tracking-wide">REFERENCIAS</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Object.entries(CONDITION_COLORS).map(([key, color]) => (
                            <div key={key} className="flex items-center gap-2.5">
                                <div
                                    className="w-3 h-3 rounded-[2px] shadow-sm"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="text-xs text-white/70 capitalize">
                                    {key}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Panel de Edición */}
                {selectedTooth ? (
                    <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#323232] border border-white/5 rounded-[8px] p-5 shadow-lg"
                    >
                        <h3 className="text-sm font-semibold text-white/90 mb-4 pb-3 border-b border-white/5">
                            Pieza {selectedTooth}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-white/70 mb-2">
                                    Condición Clínica
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedCondition}
                                        onChange={(e) => setSelectedCondition(e.target.value)}
                                        className="w-full h-9 bg-[#252525] hover:bg-[#2a2a2a] border border-white/10 rounded-[4px] px-3 text-sm text-white focus:outline-none focus:border-b-2 focus:border-b-[#60cdff] transition-all appearance-none"
                                    >
                                        {Object.keys(CONDITION_COLORS).map(condition => (
                                            <option key={condition} value={condition}>
                                                {condition.charAt(0).toUpperCase() + condition.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/70 mb-2">
                                    Observaciones
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full bg-[#252525] hover:bg-[#2a2a2a] border border-white/10 rounded-[4px] px-3 py-2 text-sm text-white focus:outline-none focus:border-b-2 focus:border-b-[#60cdff] transition-all resize-none"
                                    placeholder="Detalles adicionales..."
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleSaveCondition}
                                    className="flex-1 py-1.5 text-sm font-medium text-white bg-[#005FB8] hover:bg-[#1874D0] rounded-[4px] transition-colors shadow-sm"
                                >
                                    Guardar
                                </button>
                                <button
                                    onClick={() => setSelectedTooth(null)}
                                    className="px-4 py-1.5 text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-[4px] transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="bg-[#272727] border border-white/5 rounded-[8px] p-5 flex items-center justify-center text-center">
                        <p className="text-sm text-white/40">
                            Seleccione una pieza dental para editar su estado
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
