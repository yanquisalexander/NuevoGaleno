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
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {patients.map((patient, index) => (
                    <motion.button
                        key={patient.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        onClick={() => onSelectPatient(patient)}
                        className="w-full flex items-center gap-4 p-3 hover:bg-white/5 active:bg-white/10 transition-colors rounded-[4px] group mb-1"
                    >
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/5 group-hover:bg-white/10 transition-colors">
                            <span className="text-sm font-medium text-white/70">
                                {patient.first_name[0]}{patient.last_name[0]}
                            </span>
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-semibold text-white/90 text-[15px]">
                                {patient.first_name} {patient.last_name}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-white/50">
                                {patient.document_number && (
                                    <span className="flex items-center gap-1.5">
                                        {patient.document_number}
                                    </span>
                                )}
                                {patient.phone && (
                                    <>
                                        <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
                                        <span className="flex items-center gap-1.5">
                                            {patient.phone}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                    </motion.button>
                ))}

                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-[#60cdff] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {!isLoading && patients.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-white/40">
                        <User className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm font-medium">No hay pacientes registrados</p>
                    </div>
                )}
            </div>

            {/* Load More */}
            {hasMore && !isLoading && patients.length > 0 && (
                <div className="py-4 text-center">
                    <button
                        onClick={() => setPage(p => p + 1)}
                        className="px-6 py-1.5 text-sm text-[#60cdff] hover:bg-[#60cdff]/10 rounded-[4px] transition-colors"
                    >
                        Cargar más
                    </button>
                </div>
            )}
        </div>
    );
}
