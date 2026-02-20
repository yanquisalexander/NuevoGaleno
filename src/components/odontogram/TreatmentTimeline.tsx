import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Calendar,
    DollarSign,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Filter,
    Search,
    Download,
} from 'lucide-react';
import { getTreatmentsByPatient } from '../../hooks/useTreatments';
import { toast } from 'sonner';

const tokens = {
    colorNeutralBackground1: '#1c1c1c',
    colorNeutralBackground2: '#242424',
    colorNeutralBackground3: '#2e2e2e',
    colorNeutralForeground1: '#ffffff',
    colorNeutralForeground2: 'rgba(255,255,255,0.72)',
    colorNeutralForeground3: 'rgba(255,255,255,0.48)',
    colorNeutralStroke1: 'rgba(255,255,255,0.10)',
    colorBrandForeground: '#4da6ff',
    colorPaletteGreenForeground: '#73c765',
    colorPaletteRedForeground: '#f1707a',
    colorPaletteYellowForeground: '#ffb900',
    borderRadiusLarge: '8px',
    borderRadiusXLarge: '12px',
} as const;

interface TreatmentTimelineProps {
    patientId: number;
    selectedTooth?: number | null;
    onTreatmentClick?: (treatmentId: number, toothNumber: string) => void;
    refreshTrigger?: number; // Add refresh trigger
}

interface Treatment {
    id: number;
    name: string;
    tooth_number: string;
    sector: string;
    status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
    total_cost: number;
    balance: number;
    created_at: string;
    notes?: string;
}

const STATUS_CONFIG = {
    Pending: { label: 'Pendiente', color: tokens.colorPaletteYellowForeground, icon: Clock },
    InProgress: { label: 'En Proceso', color: tokens.colorBrandForeground, icon: AlertCircle },
    Completed: { label: 'Completado', color: tokens.colorPaletteGreenForeground, icon: CheckCircle2 },
    Cancelled: { label: 'Cancelado', color: tokens.colorPaletteRedForeground, icon: AlertCircle },
} as const;

export function TreatmentTimeline({ patientId, selectedTooth, onTreatmentClick, refreshTrigger }: TreatmentTimelineProps) {
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [filteredTreatments, setFilteredTreatments] = useState<Treatment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadTreatments();
    }, [patientId, refreshTrigger]); // Add refreshTrigger to dependencies

    useEffect(() => {
        filterTreatments();
    }, [treatments, searchTerm, statusFilter, selectedTooth]);

    const loadTreatments = async () => {
        setLoading(true);
        try {
            const data = await getTreatmentsByPatient(patientId);
            setTreatments(data || []);
        } catch (error) {
            toast.error('Error al cargar tratamientos');
        } finally {
            setLoading(false);
        }
    };

    const filterTreatments = () => {
        let filtered = [...treatments];

        // Filter by selected tooth
        if (selectedTooth) {
            filtered = filtered.filter(t => t.tooth_number === selectedTooth.toString());
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.tooth_number.includes(searchTerm) ||
                t.sector.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => t.status === statusFilter);
        }

        // Sort by date (most recent first)
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setFilteredTreatments(filtered);
    };

    const calculateTotals = () => {
        return filteredTreatments.reduce(
            (acc, t) => ({
                total: acc.total + t.total_cost,
                pending: acc.pending + t.balance,
                paid: acc.paid + (t.total_cost - t.balance),
            }),
            { total: 0, pending: 0, paid: 0 }
        );
    };

    const totals = calculateTotals();

    const exportToCSV = () => {
        const headers = ['Fecha', 'Tratamiento', 'Pieza', 'Sector', 'Estado', 'Costo', 'Saldo'];
        const rows = filteredTreatments.map(t => [
            new Date(t.created_at).toLocaleDateString(),
            t.name,
            t.tooth_number,
            t.sector,
            STATUS_CONFIG[t.status].label,
            `$${t.total_cost.toFixed(2)}`,
            `$${t.balance.toFixed(2)}`,
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tratamientos_${patientId}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
                color: tokens.colorNeutralForeground3,
            }}>
                Cargando tratamientos...
            </div>
        );
    }

    return (
        <div style={{
            background: tokens.colorNeutralBackground2,
            border: `1px solid ${tokens.colorNeutralStroke1}`,
            borderRadius: tokens.borderRadiusXLarge,
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                background: tokens.colorNeutralBackground3,
                borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: tokens.colorNeutralForeground1, marginBottom: 4 }}>
                            Tratamientos Aplicados
                        </h3>
                        <p style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                            {filteredTreatments.length} tratamiento{filteredTreatments.length !== 1 ? 's' : ''}
                            {selectedTooth && ` en pieza ${selectedTooth}`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                fontSize: 12,
                                fontWeight: 500,
                                borderRadius: tokens.borderRadiusLarge,
                                border: `1px solid ${tokens.colorNeutralStroke1}`,
                                background: showFilters ? 'rgba(77,166,255,0.12)' : tokens.colorNeutralBackground2,
                                color: showFilters ? tokens.colorBrandForeground : tokens.colorNeutralForeground2,
                                cursor: 'pointer',
                            }}
                        >
                            <Filter style={{ width: 13, height: 13 }} />
                            Filtros
                        </button>
                        <button
                            onClick={exportToCSV}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                fontSize: 12,
                                fontWeight: 500,
                                borderRadius: tokens.borderRadiusLarge,
                                border: `1px solid ${tokens.colorNeutralStroke1}`,
                                background: tokens.colorNeutralBackground2,
                                color: tokens.colorNeutralForeground2,
                                cursor: 'pointer',
                            }}
                        >
                            <Download style={{ width: 13, height: 13 }} />
                            Exportar
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                                {/* Search */}
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <Search style={{
                                        position: 'absolute',
                                        left: 10,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 14,
                                        height: 14,
                                        color: tokens.colorNeutralForeground3,
                                    }} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Buscar tratamiento, pieza..."
                                        style={{
                                            width: '100%',
                                            height: 32,
                                            paddingLeft: 32,
                                            paddingRight: 10,
                                            background: tokens.colorNeutralBackground1,
                                            border: `1px solid ${tokens.colorNeutralStroke1}`,
                                            borderRadius: tokens.borderRadiusLarge,
                                            fontSize: 13,
                                            color: tokens.colorNeutralForeground1,
                                            outline: 'none',
                                        }}
                                    />
                                </div>

                                {/* Status filter */}
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    style={{
                                        height: 32,
                                        padding: '0 10px',
                                        background: tokens.colorNeutralBackground1,
                                        border: `1px solid ${tokens.colorNeutralStroke1}`,
                                        borderRadius: tokens.borderRadiusLarge,
                                        fontSize: 13,
                                        color: tokens.colorNeutralForeground1,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <option value="all">Todos los estados</option>
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                padding: '16px 20px',
                background: tokens.colorNeutralBackground1,
                borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
            }}>
                <div style={{
                    padding: 12,
                    background: tokens.colorNeutralBackground3,
                    borderRadius: tokens.borderRadiusLarge,
                    border: `1px solid ${tokens.colorNeutralStroke1}`,
                }}>
                    <div style={{ fontSize: 11, color: tokens.colorNeutralForeground3, marginBottom: 4 }}>
                        Total Facturado
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: tokens.colorNeutralForeground1 }}>
                        ${totals.total.toFixed(2)}
                    </div>
                </div>
                <div style={{
                    padding: 12,
                    background: tokens.colorNeutralBackground3,
                    borderRadius: tokens.borderRadiusLarge,
                    border: `1px solid ${tokens.colorNeutralStroke1}`,
                }}>
                    <div style={{ fontSize: 11, color: tokens.colorNeutralForeground3, marginBottom: 4 }}>
                        Pagado
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: tokens.colorPaletteGreenForeground }}>
                        ${totals.paid.toFixed(2)}
                    </div>
                </div>
                <div style={{
                    padding: 12,
                    background: tokens.colorNeutralBackground3,
                    borderRadius: tokens.borderRadiusLarge,
                    border: `1px solid ${tokens.colorNeutralStroke1}`,
                }}>
                    <div style={{ fontSize: 11, color: tokens.colorNeutralForeground3, marginBottom: 4 }}>
                        Saldo Pendiente
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: tokens.colorPaletteYellowForeground }}>
                        ${totals.pending.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Treatment List */}
            <div style={{
                maxHeight: 500,
                overflowY: 'auto',
                padding: '12px 20px',
            }}>
                {filteredTreatments.length === 0 ? (
                    <div style={{
                        padding: 32,
                        textAlign: 'center',
                        color: tokens.colorNeutralForeground3,
                        fontSize: 13,
                    }}>
                        No se encontraron tratamientos
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filteredTreatments.map(treatment => {
                            const StatusIcon = STATUS_CONFIG[treatment.status].icon;
                            const isExpanded = expandedId === treatment.id;

                            return (
                                <motion.div
                                    key={treatment.id}
                                    layout
                                    style={{
                                        background: tokens.colorNeutralBackground3,
                                        border: `1px solid ${tokens.colorNeutralStroke1}`,
                                        borderRadius: tokens.borderRadiusLarge,
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => setExpandedId(isExpanded ? null : treatment.id)}
                                >
                                    {/* Main row */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr auto auto auto auto',
                                        gap: 16,
                                        alignItems: 'center',
                                        padding: '12px 16px',
                                    }}>
                                        {/* Treatment info */}
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                                color: tokens.colorNeutralForeground1,
                                                marginBottom: 4,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {treatment.name}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                fontSize: 11,
                                                color: tokens.colorNeutralForeground3,
                                            }}>
                                                <span>Pieza {treatment.tooth_number}</span>
                                                <span>•</span>
                                                <span>{treatment.sector}</span>
                                            </div>
                                        </div>

                                        {/* Date */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: 12,
                                            color: tokens.colorNeutralForeground2,
                                        }}>
                                            <Calendar style={{ width: 13, height: 13 }} />
                                            {new Date(treatment.created_at).toLocaleDateString()}
                                        </div>

                                        {/* Status */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '4px 10px',
                                            background: `${STATUS_CONFIG[treatment.status].color}20`,
                                            borderRadius: 20,
                                            fontSize: 11,
                                            fontWeight: 500,
                                            color: STATUS_CONFIG[treatment.status].color,
                                        }}>
                                            <StatusIcon style={{ width: 12, height: 12 }} />
                                            {STATUS_CONFIG[treatment.status].label}
                                        </div>

                                        {/* Cost */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: tokens.colorNeutralForeground1,
                                        }}>
                                            <DollarSign style={{ width: 13, height: 13 }} />
                                            {treatment.total_cost.toFixed(2)}
                                        </div>

                                        {/* Expand icon */}
                                        <div>
                                            {isExpanded ? (
                                                <ChevronUp style={{ width: 16, height: 16, color: tokens.colorNeutralForeground3 }} />
                                            ) : (
                                                <ChevronDown style={{ width: 16, height: 16, color: tokens.colorNeutralForeground3 }} />
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded details */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                style={{
                                                    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
                                                    padding: '12px 16px',
                                                    background: tokens.colorNeutralBackground2,
                                                }}
                                            >
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                                                    <div>
                                                        <div style={{ color: tokens.colorNeutralForeground3, marginBottom: 4 }}>
                                                            Saldo Pendiente
                                                        </div>
                                                        <div style={{
                                                            fontSize: 15,
                                                            fontWeight: 600,
                                                            color: treatment.balance > 0 ? tokens.colorPaletteYellowForeground : tokens.colorPaletteGreenForeground,
                                                        }}>
                                                            ${treatment.balance.toFixed(2)}
                                                        </div>
                                                    </div>
                                                    {treatment.notes && (
                                                        <div>
                                                            <div style={{ color: tokens.colorNeutralForeground3, marginBottom: 4 }}>
                                                                Notas
                                                            </div>
                                                            <div style={{ color: tokens.colorNeutralForeground2 }}>
                                                                {treatment.notes}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
