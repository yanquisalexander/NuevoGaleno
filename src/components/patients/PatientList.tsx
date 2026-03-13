import { useState, useEffect, useRef } from 'react';
import { Patient, usePatients } from '../../hooks/usePatients';
import { User, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

import { fluentDarkOverlay as tokens } from '@/consts/fluent-tokens';

interface PatientListProps {
    onSelectPatient: (patient: Patient) => void;
    refreshTrigger?: number;
}

export function PatientList({ onSelectPatient, refreshTrigger }: PatientListProps) {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const loadingNextPageRef = useRef(false);
    const listRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const pageSize = 20;
    const { getPatients } = usePatients();

    useEffect(() => { loadPatients(); }, [page]);

    useEffect(() => {
        if (refreshTrigger !== undefined && refreshTrigger > 0) {
            loadingNextPageRef.current = false;
            setPatients([]);
            setHasMore(true);
            if (page === 0) {
                loadPatients(true);
            } else {
                setPage(0);
            }
        }
    }, [refreshTrigger, page]);

    useEffect(() => {
        if (!hasMore || isLoading || !listRef.current || !sentinelRef.current) return;

        const observer = new IntersectionObserver(
            entries => {
                const first = entries[0];
                if (!first?.isIntersecting || loadingNextPageRef.current) return;
                loadingNextPageRef.current = true;
                setPage(prev => prev + 1);
            },
            {
                root: listRef.current,
                rootMargin: '180px 0px',
                threshold: 0,
            }
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, isLoading]);

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
            loadingNextPageRef.current = false;
            setIsLoading(false);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: tokens.fontFamilyBase }}>
            {/* Lista */}
            <div style={{ flex: 1, overflowY: 'auto' }} ref={listRef}>
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

                <div ref={sentinelRef} style={{ height: 1 }} />
            </div>

            {!hasMore && patients.length > 0 && (
                <div style={{ padding: '10px 0', textAlign: 'center', borderTop: `1px solid ${tokens.colorNeutralStroke2}`, fontSize: tokens.fontSizeBase300, color: tokens.colorNeutralForeground4 }}>
                    Fin de la lista
                </div>
            )}
        </div>
    );
}