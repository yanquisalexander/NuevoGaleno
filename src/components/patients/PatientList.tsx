import { useState, useEffect } from 'react';
import { Patient, usePatients } from '../../hooks/usePatients';
import { User, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

const tokens = {
    colorNeutralBackground1: '#292929',
    colorNeutralBackground1Hover: '#333333',
    colorNeutralBackground1Selected: '#383838',
    colorNeutralForeground1: '#ffffff',
    colorNeutralForeground2: '#d6d6d6',
    colorNeutralForeground3: '#adadad',
    colorNeutralForeground4: '#707070',
    colorNeutralStroke2: '#404040',
    colorBrandBackground: '#0078D4',
    colorBrandForeground1: '#479ef5',
    fontFamilyBase: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
    fontSizeBase200: '11px',
    fontSizeBase300: '12px',
    fontSizeBase400: '14px',
    fontWeightRegular: 400,
    fontWeightSemibold: 600,
    borderRadiusMedium: '4px',
};

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
    const { getPatients } = usePatients();

    useEffect(() => { loadPatients(); }, [page]);

    useEffect(() => {
        if (refreshTrigger !== undefined && refreshTrigger > 0) {
            setPage(0); setPatients([]); loadPatients(true);
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
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: tokens.fontFamilyBase }}>
            {/* Lista */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {patients.map((patient, index) => (
                    <motion.button
                        key={patient.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(index * 0.025, 0.2) }}
                        onClick={() => onSelectPatient(patient)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '7px 8px',
                            marginBottom: 1,
                            background: 'transparent',
                            border: 'none',
                            borderRadius: tokens.borderRadiusMedium,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.08s',
                        }}
                        onMouseOver={e => (e.currentTarget.style.background = tokens.colorNeutralBackground1Hover)}
                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                        onMouseDown={e => (e.currentTarget.style.background = tokens.colorNeutralBackground1Selected)}
                        onMouseUp={e => (e.currentTarget.style.background = tokens.colorNeutralBackground1Hover)}
                    >
                        {/* Avatar */}
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'rgba(71,158,245,0.15)',
                            border: `1px solid rgba(71,158,245,0.25)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: 12,
                            fontWeight: tokens.fontWeightSemibold,
                            color: tokens.colorBrandForeground1,
                        }}>
                            {patient.first_name[0]}{patient.last_name[0]}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: tokens.fontSizeBase400,
                                fontWeight: tokens.fontWeightSemibold,
                                color: tokens.colorNeutralForeground1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {patient.first_name} {patient.last_name}
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginTop: 1,
                                fontSize: tokens.fontSizeBase300,
                                color: tokens.colorNeutralForeground4,
                            }}>
                                {patient.document_number && (
                                    <span>{patient.document_number}</span>
                                )}
                                {patient.document_number && patient.phone && (
                                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: tokens.colorNeutralForeground4, display: 'inline-block' }} />
                                )}
                                {patient.phone && <span>{patient.phone}</span>}
                            </div>
                        </div>

                        <ChevronRight size={14} style={{ color: tokens.colorNeutralForeground4, flexShrink: 0 }} />
                    </motion.button>
                ))}

                {/* Spinner */}
                {isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                        <div style={{
                            width: 20, height: 20,
                            border: `2px solid ${tokens.colorNeutralStroke2}`,
                            borderTopColor: tokens.colorBrandBackground,
                            borderRadius: '50%',
                            animation: 'spin 0.7s linear infinite',
                        }} />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && patients.length === 0 && (
                    <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '64px 0',
                        color: tokens.colorNeutralForeground4,
                        gap: 8,
                    }}>
                        <User size={32} style={{ opacity: 0.3 }} />
                        <span style={{ fontSize: tokens.fontSizeBase400 }}>No hay pacientes registrados</span>
                    </div>
                )}
            </div>

            {/* Load more */}
            {hasMore && !isLoading && patients.length > 0 && (
                <div style={{ padding: '12px 0', textAlign: 'center', borderTop: `1px solid ${tokens.colorNeutralStroke2}` }}>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: tokens.fontSizeBase300,
                            color: tokens.colorBrandForeground1,
                            padding: '4px 16px',
                            borderRadius: tokens.borderRadiusMedium,
                            transition: 'background 0.08s',
                            fontFamily: tokens.fontFamilyBase,
                        }}
                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(71,158,245,0.1)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'none')}
                    >
                        Cargar más
                    </button>
                </div>
            )}
        </div>
    );
}