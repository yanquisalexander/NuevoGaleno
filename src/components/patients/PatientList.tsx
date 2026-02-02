import { useState, useEffect } from 'react';
import { Patient, getPatients } from '../../hooks/usePatients';
import { User, Phone, FileText, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface PatientListProps {
    onSelectPatient: (patient: Patient) => void;
    refreshTrigger?: number;
}

export function PatientList({ onSelectPatient, refreshTrigger }: PatientListProps) {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const pageSize = 20;

    useEffect(() => {
        loadPatients();
    }, [page]);

    useEffect(() => {
        // Recargar desde cero cuando cambia refreshTrigger
        if (refreshTrigger !== undefined && refreshTrigger > 0) {
            setPage(0);
            setPatients([]);
            loadPatients(true);
        }
    }, [refreshTrigger]);

    const loadPatients = async (reset = false) => {
        setIsLoading(true);
        try {
            const currentPage = reset ? 0 : page;
            const data = await getPatients(pageSize, currentPage * pageSize);
            setPatients(prev => reset || currentPage === 0 ? data : [...prev, ...data]);
            setHasMore(data.length === pageSize);
        } catch (error) {
            console.error('Error cargando pacientes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
                {patients.map((patient, index) => (
                    <motion.button
                        key={patient.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => onSelectPatient(patient)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-medium text-white">
                                {patient.first_name} {patient.last_name}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
                                {patient.document_number && (
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        {patient.document_number}
                                    </span>
                                )}
                                {patient.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {patient.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/40" />
                    </motion.button>
                ))}

                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {!isLoading && patients.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-white/60">
                        <User className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-sm">No hay pacientes registrados</p>
                    </div>
                )}
            </div>

            {/* Load More */}
            {hasMore && !isLoading && patients.length > 0 && (
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => setPage(p => p + 1)}
                        className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Cargar más pacientes
                    </button>
                </div>
            )}
        </div>
    );
}
