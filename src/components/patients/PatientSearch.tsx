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
        <div className="relative w-full max-w-sm">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 group-focus-within:text-blue-400 transition-colors" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    placeholder={placeholder}
                    className="w-full h-9 bg-[#2d2d2d] hover:bg-[#323232] border border-white/5 rounded-[4px] pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:bg-[#1f1f1f] focus:border-b-2 focus:border-b-[#60cdff] transition-all"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-[#60cdff] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showResults && results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-[#2c2c2c] border border-[#1a1a1a] rounded-[8px] shadow-2xl z-50 max-h-96 overflow-y-auto p-1 ring-1 ring-white/5"
                    >
                        {results.map((patient) => (
                            <button
                                key={patient.id}
                                onClick={() => handleSelect(patient)}
                                className="w-full flex items-center gap-3 p-2 hover:bg-white/5 transition-colors rounded-[4px] group"
                            >
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
                                    <User className="w-4 h-4 text-white/70" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="text-sm font-medium text-white/90">
                                        {patient.first_name} {patient.last_name}
                                    </div>
                                    <div className="text-xs text-white/50">
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
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-[#2c2c2c] border border-[#1a1a1a] rounded-[8px] shadow-2xl z-50 p-4 text-center ring-1 ring-white/5"
                >
                    <p className="text-sm text-white/50">No se encontraron pacientes</p>
                </motion.div>
            )}
        </div>
    );
}
