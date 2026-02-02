import { useState, useEffect } from 'react';
import { Patient, searchPatients } from '../../hooks/usePatients';
import { Search, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PatientSearchProps {
    onSelectPatient: (patient: Patient) => void;
    placeholder?: string;
}

export function PatientSearch({ onSelectPatient, placeholder = "Buscar paciente..." }: PatientSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setShowResults(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const patients = await searchPatients(query);
                setResults(patients);
                setShowResults(true);
            } catch (error) {
                console.error('Error buscando pacientes:', error);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (patient: Patient) => {
        onSelectPatient(patient);
        setQuery('');
        setShowResults(false);
    };

    return (
        <div className="relative w-full">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    placeholder={placeholder}
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500 transition-colors"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showResults && results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#2c2c2c] border border-white/10 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto"
                    >
                        {results.map((patient) => (
                            <button
                                key={patient.id}
                                onClick={() => handleSelect(patient)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="text-sm font-medium text-white">
                                        {patient.first_name} {patient.last_name}
                                    </div>
                                    <div className="text-xs text-white/60">
                                        {patient.document_number && `DNI: ${patient.document_number}`}
                                        {patient.phone && ` • ${patient.phone}`}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {showResults && query.length >= 2 && results.length === 0 && !isLoading && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[#2c2c2c] border border-white/10 rounded-lg shadow-2xl z-50 p-4 text-center"
                >
                    <p className="text-sm text-white/60">No se encontraron pacientes</p>
                </motion.div>
            )}
        </div>
    );
}
