import { useState, useEffect } from 'react';
import { OdontogramEntry, getOdontogramByPatient, updateToothCondition } from '../../hooks/useOdontogram';
import { motion } from 'motion/react';

interface OdontogramProps {
    patientId: number;
}

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
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleToothClick(toothNumber)}
                className={`relative w-8 h-12 rounded-sm transition-all ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#2c2c2c]' : ''
                    }`}
                style={{ backgroundColor: color }}
            >
                <span className="text-[10px] font-bold text-white/90">
                    {toothNumber}
                </span>
            </motion.button>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Odontograma Superior */}
            <div>
                <div className="text-xs text-white/60 mb-2 text-center">Arcada Superior</div>
                <div className="flex justify-center gap-1 p-4 bg-white/5 rounded-lg">
                    {TEETH_FDI.upper.map(renderTooth)}
                </div>
            </div>

            {/* Odontograma Inferior */}
            <div>
                <div className="text-xs text-white/60 mb-2 text-center">Arcada Inferior</div>
                <div className="flex justify-center gap-1 p-4 bg-white/5 rounded-lg">
                    {TEETH_FDI.lower.map(renderTooth)}
                </div>
            </div>

            {/* Leyenda */}
            <div className="bg-white/5 rounded-lg p-4">
                <div className="text-xs font-medium text-white mb-3">Leyenda</div>
                <div className="grid grid-cols-4 gap-2">
                    {Object.entries(CONDITION_COLORS).map(([key, color]) => (
                        <div key={key} className="flex items-center gap-2">
                            <div
                                className="w-4 h-4 rounded"
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
            {selectedTooth && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-4"
                >
                    <h3 className="text-sm font-medium text-white mb-4">
                        Editar Pieza {selectedTooth}
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-white/60 mb-2">
                                Condición
                            </label>
                            <select
                                value={selectedCondition}
                                onChange={(e) => setSelectedCondition(e.target.value)}
                                className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                            >
                                {Object.keys(CONDITION_COLORS).map(condition => (
                                    <option key={condition} value={condition} className="bg-[#2c2c2c]">
                                        {condition.charAt(0).toUpperCase() + condition.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-white/60 mb-2">
                                Notas
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                                placeholder="Observaciones adicionales..."
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveCondition}
                                className="flex-1 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                            >
                                Guardar
                            </button>
                            <button
                                onClick={() => setSelectedTooth(null)}
                                className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
