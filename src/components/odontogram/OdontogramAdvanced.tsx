import { useState, useEffect, useRef } from 'react';
import {
    OdontogramSurface,
    SurfaceHistoryEntry,
    getOdontogramSurfacesByPatient,
    getSurfaceTreatments,
    addToothSurfaceTreatment,
    deactivateSurfaceTreatment,
    getSurfaceHistory,
    OdontogramToothTreatment,
    getToothTreatmentsByPatient,
    getToothTreatments,
    addToothTreatment,
    deactivateToothTreatment,
    OdontogramBridge,
    getBridgesByPatient,
    addBridge,
    deactivateBridge,
} from '../../hooks/useOdontogram';
import {
    TreatmentCatalogEntry,
    TreatmentCatalogItem,
    getAllTreatmentCatalog,
    getTreatmentCatalogItems,
} from '../../hooks/useTreatmentCatalog';
import { createTreatment } from '../../hooks/useTreatments';
import { motion, AnimatePresence } from 'motion/react';
import {
    Baby, User as UserIcon, Save, X, CheckCircle2, Clock,
    Loader2, XCircle, Eye, Trash2, Edit3, EyeOff, Plus,
    ChevronRight, AlertCircle, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { IndependentTreatments } from './IndependentTreatments';
import { TreatmentTimeline } from './TreatmentTimeline';

// ─── Fluent UI v9 Design Tokens ─────────────────────────────────────────────
const tokens = {
    // Neutrals
    colorNeutralBackground1: '#1c1c1c',
    colorNeutralBackground2: '#242424',
    colorNeutralBackground3: '#2e2e2e',
    colorNeutralBackground4: '#383838',
    colorNeutralForeground1: '#ffffff',
    colorNeutralForeground2: 'rgba(255,255,255,0.72)',
    colorNeutralForeground3: 'rgba(255,255,255,0.48)',
    colorNeutralForeground4: 'rgba(255,255,255,0.28)',
    colorNeutralStroke1: 'rgba(255,255,255,0.10)',
    colorNeutralStroke2: 'rgba(255,255,255,0.06)',
    colorNeutralShadow: '0 2px 8px rgba(0,0,0,0.40)',

    // Brand / Accent
    colorBrandBackground: '#0078d4',
    colorBrandBackgroundHover: '#106ebe',
    colorBrandBackgroundPressed: '#005a9e',
    colorBrandForeground: '#4da6ff',

    // Status
    colorPaletteGreenBackground: 'rgba(107,191,89,0.12)',
    colorPaletteGreenForeground: '#73c765',
    colorPaletteRedBackground: 'rgba(232,17,35,0.12)',
    colorPaletteRedForeground: '#f1707a',
    colorPaletteYellowBackground: 'rgba(255,185,0,0.12)',
    colorPaletteYellowForeground: '#ffb900',
    colorPaletteMarigoldBackground: 'rgba(224,140,0,0.14)',
    colorPaletteMarigoldForeground: '#e08c00',

    // Border radius
    borderRadiusMedium: '6px',
    borderRadiusLarge: '8px',
    borderRadiusXLarge: '12px',

    // Transitions
    durationNormal: '150ms',
    curveEasyEase: 'cubic-bezier(0.33,0,0.67,1)',
} as const;

interface OdontogramProps {
    patientId: number;
}

const TEETH_FDI_PERMANENT = {
    upper: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
    lower: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
};

const TEETH_FDI_DECIDUOUS = {
    upper: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
    lower: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
};

const TOOTH_SURFACES = ['whole_tooth', 'mesial', 'distal', 'vestibular', 'palatina', 'lingual', 'oclusal'] as const;
type Surface = typeof TOOTH_SURFACES[number];

type ViewMode = 'view' | 'edit';

const isUpperTooth = (n: number) => (n >= 11 && n <= 28) || (n >= 51 && n <= 65);
const isRightSideTooth = (n: number) =>
    (n >= 11 && n <= 18) || (n >= 41 && n <= 48) || (n >= 51 && n <= 55) || (n >= 81 && n <= 85);
const isDeciduousTooth = (n: number) => n >= 51 && n <= 85;

const SURFACE_LABELS: Record<Surface, string> = {
    whole_tooth: 'Diente Completo',
    mesial: 'Mesial',
    distal: 'Distal',
    vestibular: 'Vestibular',
    palatina: 'Palatina',
    lingual: 'Lingual',
    oclusal: 'Oclusal',
};

const STATUS_CONFIG = {
    Pending: { label: 'Pendiente', icon: Clock, color: tokens.colorPaletteYellowForeground, bg: tokens.colorPaletteYellowBackground },
    InProgress: { label: 'En Proceso', icon: Loader2, color: tokens.colorBrandForeground, bg: 'rgba(77,166,255,0.12)' },
    Completed: { label: 'Completado', icon: CheckCircle2, color: tokens.colorPaletteGreenForeground, bg: tokens.colorPaletteGreenBackground },
    Cancelled: { label: 'Cancelado', icon: XCircle, color: tokens.colorPaletteRedForeground, bg: tokens.colorPaletteRedBackground },
} as const;

// ─── Tooth SVG Component ─────────────────────────────────────────────────────
interface ToothSVGProps {
    toothNumber: number;
    isSelected: boolean;
    isDeciduous: boolean;
    getSurfaceColor: (t: number, s: Surface) => string;
    visualEffect: string | null;
    onSurfaceClick: (e: React.MouseEvent, t: number, s: Surface) => void;
    selectedSurface: Surface | null;
    isEditMode: boolean;
    bridgeColor?: string;
}

function ToothSVG({
    toothNumber, isSelected, isDeciduous, getSurfaceColor, visualEffect,
    onSurfaceClick, selectedSurface, isEditMode, bridgeColor
}: ToothSVGProps) {
    const isUpper = isUpperTooth(toothNumber);
    const isRight = isRightSideTooth(toothNumber);
    const W = 36, H = 54;
    const cx = W / 2, cy = H / 2;
    const r = 8; // oclusal radius

    // Surface hit areas
    const topSurface: Surface = isUpper ? 'vestibular' : 'lingual';
    const bottomSurface: Surface = isUpper ? 'palatina' : 'vestibular';
    const leftSurface: Surface = isRight ? 'distal' : 'mesial';
    const rightSurface: Surface = isRight ? 'mesial' : 'distal';

    const surfaceSelected = (s: Surface) => isSelected && selectedSurface === s;

    const highlightStroke = (s: Surface) =>
        surfaceSelected(s) ? 'rgba(255,255,255,0.9)' : 'transparent';

    // Check if surface has treatment (for glow effect)
    const surfaceHasTreatment = (s: Surface) => {
        const color = getSurfaceColor(toothNumber, s);
        return color !== tokens.colorNeutralBackground4 && color !== '#1a1a1a';
    };

    return (
        <svg
            width={W} height={H} viewBox={`0 0 ${W} ${H}`}
            style={{ cursor: isEditMode ? 'pointer' : 'default', overflow: 'visible' }}
        >
            {/* SVG Filters for glow effect */}
            <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Bridge indicator bar above tooth */}
            {bridgeColor && (
                <rect x={-2} y={-6} width={W + 4} height={4} rx={2}
                    fill={bridgeColor} opacity={0.85}
                />
            )}

            {/* Outer tooth shape - DARKER for better contrast */}
            <rect x={1} y={1} width={W - 2} height={H - 2} rx={4}
                fill="#1a1a1a"
                stroke={isSelected ? '#2196f3' : 'rgba(255,255,255,0.15)'}
                strokeWidth={isSelected ? 2 : 1}
            />

            {/* Top surface */}
            <rect
                x={1} y={1} width={W - 2} height={10} rx={4}
                fill={getSurfaceColor(toothNumber, topSurface)}
                stroke={highlightStroke(topSurface)}
                strokeWidth={1.5}
                filter={surfaceHasTreatment(topSurface) ? 'url(#glow)' : undefined}
                onClick={(e) => isEditMode && onSurfaceClick(e, toothNumber, topSurface)}
                style={{ cursor: isEditMode ? 'pointer' : 'default' }}
            />
            {/* clip top corners */}
            <rect x={1} y={7} width={W - 2} height={4}
                fill={getSurfaceColor(toothNumber, topSurface)}
                filter={surfaceHasTreatment(topSurface) ? 'url(#glow)' : undefined}
                onClick={(e) => isEditMode && onSurfaceClick(e, toothNumber, topSurface)}
            />

            {/* Bottom surface */}
            <rect
                x={1} y={H - 11} width={W - 2} height={10} rx={4}
                fill={getSurfaceColor(toothNumber, bottomSurface)}
                stroke={highlightStroke(bottomSurface)}
                strokeWidth={1.5}
                filter={surfaceHasTreatment(bottomSurface) ? 'url(#glow)' : undefined}
                onClick={(e) => isEditMode && onSurfaceClick(e, toothNumber, bottomSurface)}
                style={{ cursor: isEditMode ? 'pointer' : 'default' }}
            />
            <rect x={1} y={H - 11} width={W - 2} height={4}
                fill={getSurfaceColor(toothNumber, bottomSurface)}
                filter={surfaceHasTreatment(bottomSurface) ? 'url(#glow)' : undefined}
                onClick={(e) => isEditMode && onSurfaceClick(e, toothNumber, bottomSurface)}
            />

            {/* Left surface */}
            <rect
                x={1} y={11} width={9} height={H - 22}
                fill={getSurfaceColor(toothNumber, leftSurface)}
                stroke={highlightStroke(leftSurface)}
                strokeWidth={1.5}
                filter={surfaceHasTreatment(leftSurface) ? 'url(#glow)' : undefined}
                onClick={(e) => isEditMode && onSurfaceClick(e, toothNumber, leftSurface)}
                style={{ cursor: isEditMode ? 'pointer' : 'default' }}
            />

            {/* Right surface */}
            <rect
                x={W - 10} y={11} width={9} height={H - 22}
                fill={getSurfaceColor(toothNumber, rightSurface)}
                stroke={highlightStroke(rightSurface)}
                strokeWidth={1.5}
                filter={surfaceHasTreatment(rightSurface) ? 'url(#glow)' : undefined}
                onClick={(e) => isEditMode && onSurfaceClick(e, toothNumber, rightSurface)}
                style={{ cursor: isEditMode ? 'pointer' : 'default' }}
            />

            {/* Oclusal center */}
            <rect
                x={10} y={11} width={W - 20} height={H - 22}
                rx={3}
                fill={getSurfaceColor(toothNumber, 'oclusal')}
                stroke={highlightStroke('oclusal')}
                strokeWidth={1.5}
                filter={surfaceHasTreatment('oclusal') ? 'url(#glow)' : undefined}
                onClick={(e) => isEditMode && onSurfaceClick(e, toothNumber, 'oclusal')}
                style={{ cursor: isEditMode ? 'pointer' : 'default' }}
            />

            {/* Tooth number label - MORE VISIBLE */}
            <text
                x={cx} y={cy + 4}
                textAnchor="middle"
                fontSize={10}
                fontFamily="'Geist Mono', monospace"
                fontWeight="700"
                fill="rgba(255,255,255,0.85)"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth={0.5}
                pointerEvents="none"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
            >
                {toothNumber}
            </text>

            {/* Visual effects overlay */}
            {visualEffect === 'absent' && (
                <>
                    <rect x={1} y={1} width={W - 2} height={H - 2} rx={4}
                        fill="rgba(0,0,0,0.55)" pointerEvents="none" />
                    <line x1={6} y1={6} x2={W - 6} y2={H - 6}
                        stroke="#f1707a" strokeWidth={2.5} strokeLinecap="round" pointerEvents="none" />
                    <line x1={W - 6} y1={6} x2={6} y2={H - 6}
                        stroke="#f1707a" strokeWidth={2.5} strokeLinecap="round" pointerEvents="none" />
                </>
            )}
            {visualEffect === 'darken' && (
                <rect x={1} y={1} width={W - 2} height={H - 2} rx={4}
                    fill="rgba(0,0,0,0.48)" pointerEvents="none" />
            )}
            {visualEffect === 'implant' && (
                <>
                    <rect x={cx - 1.5} y={4} width={3} height={H - 8} rx={1.5}
                        fill="url(#implantGrad)" pointerEvents="none" />
                    <defs>
                        <linearGradient id="implantGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#c8c8c8" />
                            <stop offset="50%" stopColor="#8a8a8a" />
                            <stop offset="100%" stopColor="#5a5a5a" />
                        </linearGradient>
                    </defs>
                </>
            )}

            {/* Deciduous indicator */}
            {isDeciduous && (
                <circle cx={W - 5} cy={5} r={3.5}
                    fill="rgba(77,166,255,0.6)" pointerEvents="none" />
            )}

            {/* Selection ring */}
            {isSelected && (
                <rect x={0} y={0} width={W} height={H} rx={5}
                    fill="none"
                    stroke={tokens.colorBrandForeground}
                    strokeWidth={2}
                    opacity={0.7}
                    pointerEvents="none"
                />
            )}
        </svg>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function OdontogramAdvanced({ patientId }: OdontogramProps) {
    const [surfaces, setSurfaces] = useState<OdontogramSurface[]>([]);
    const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
    const [selectedSurface, setSelectedSurface] = useState<Surface | null>(null);
    const [surfaceTreatments, setSurfaceTreatments] = useState<OdontogramSurface[]>([]);
    const [surfaceHistory, setSurfaceHistory] = useState<SurfaceHistoryEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [toothLevelTreatments, setToothLevelTreatments] = useState<OdontogramToothTreatment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('view');

    const [toothTreatments, setToothTreatments] = useState<OdontogramToothTreatment[]>([]);
    const [bridges, setBridges] = useState<OdontogramBridge[]>([]);

    // Map of treatment_id -> status for color coding
    const [treatmentStatusMap, setTreatmentStatusMap] = useState<Map<number, string>>(new Map());

    const [catalog, setCatalog] = useState<TreatmentCatalogEntry[]>([]);
    const [catalogItems, setCatalogItems] = useState<TreatmentCatalogItem[]>([]);
    const [selectedTreatment, setSelectedTreatment] = useState<number | null>(null);
    const [selectedTreatmentItem, setSelectedTreatmentItem] = useState<number | null>(null);
    const [notes, setNotes] = useState('');
    const [treatmentStatus, setTreatmentStatus] = useState<'Pending' | 'InProgress' | 'Completed' | 'Cancelled'>('Pending');
    const [createTreatmentRecord, setCreateTreatmentRecord] = useState(true);
    const [customCost, setCustomCost] = useState<number>(0);

    const [showBridgeDialog, setShowBridgeDialog] = useState(false);
    const [bridgeName, setBridgeName] = useState('');
    const [bridgeStart, setBridgeStart] = useState('');
    const [bridgeEnd, setBridgeEnd] = useState('');
    const [bridgeTreatment, setBridgeTreatment] = useState<number | null>(null);
    const [bridgeNotes, setBridgeNotes] = useState('');

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{
        type: 'surface' | 'tooth' | 'bridge';
        id: number;
        treatmentId?: number;
        name?: string;
    } | null>(null);

    // Refresh trigger for TreatmentTimeline
    const [timelineRefresh, setTimelineRefresh] = useState(0);

    useEffect(() => { loadData(); }, [patientId]);

    useEffect(() => {
        if (selectedTreatment) {
            loadCatalogItems(selectedTreatment);
        } else {
            setCatalogItems([]);
            setSelectedTreatmentItem(null);
            setCustomCost(0);
        }
    }, [selectedTreatment]);

    useEffect(() => {
        if (selectedTreatmentItem) {
            const item = catalogItems.find((i) => i.id === selectedTreatmentItem);
            if (item) setCustomCost(item.default_cost);
        } else {
            setCustomCost(0);
        }
    }, [selectedTreatmentItem, catalogItems]);

    useEffect(() => {
        if (selectedTooth && selectedSurface) {
            loadSurfaceData();
            if (selectedSurface === 'whole_tooth') {
                loadToothLevelTreatments();
            } else {
                loadSurfaceTreatments();
            }
        } else {
            setSurfaceTreatments([]);
            setToothLevelTreatments([]);
            setSurfaceHistory([]);
            setShowHistory(false);
        }
    }, [selectedTooth, selectedSurface]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [surfaceData, catalogData, toothTreatmentsData, bridgesData, allTreatments] = await Promise.all([
                getOdontogramSurfacesByPatient(patientId),
                getAllTreatmentCatalog(),
                getToothTreatmentsByPatient(patientId),
                getBridgesByPatient(patientId),
                (async () => {
                    const { getTreatmentsByPatient } = await import('../../hooks/useTreatments');
                    return getTreatmentsByPatient(patientId);
                })(),
            ]);

            setSurfaces(surfaceData);
            setCatalog(catalogData);
            setToothTreatments(toothTreatmentsData);
            setBridges(bridgesData);

            // Create treatment status map
            const statusMap = new Map<number, string>();
            (allTreatments || []).forEach((treatment: any) => {
                statusMap.set(treatment.id, treatment.status);
            });
            setTreatmentStatusMap(statusMap);

            // Trigger timeline refresh
            setTimelineRefresh(prev => prev + 1);
        } catch {
            toast.error('Error al cargar el odontograma');
        } finally {
            setIsLoading(false);
        }
    };

    const loadCatalogItems = async (treatmentId: number) => {
        try {
            const items = await getTreatmentCatalogItems(treatmentId);
            setCatalogItems(items);
        } catch { /* noop */ }
    };

    const loadSurfaceData = async () => {
        setSelectedTreatment(null);
        setSelectedTreatmentItem(null);
        setNotes('');
    };

    const loadSurfaceTreatments = async () => {
        if (!selectedTooth || !selectedSurface) return;
        try {
            const treatments = await getSurfaceTreatments(patientId, selectedTooth.toString(), selectedSurface);
            setSurfaceTreatments(treatments);
        } catch { /* noop */ }
    };

    const loadToothLevelTreatments = async () => {
        if (!selectedTooth) return;
        try {
            const treatments = await getToothTreatments(patientId, selectedTooth.toString());
            setToothLevelTreatments(treatments);
        } catch { /* noop */ }
    };

    const loadSurfaceHistoryData = async () => {
        if (!selectedTooth || !selectedSurface) return;
        try {
            const history = await getSurfaceHistory(patientId, selectedTooth.toString(), selectedSurface);
            setSurfaceHistory(history);
            setShowHistory(true);
        } catch {
            toast.error('Error al cargar el historial');
        }
    };

    const getSurfaceData = (toothNumber: number, surface: Surface): OdontogramSurface[] =>
        surfaces.filter(s => s.tooth_number === toothNumber.toString() && s.surface === surface && s.is_active);

    const getToothTreatmentsForTooth = (toothNumber: number): OdontogramToothTreatment[] =>
        toothTreatments.filter(t => t.tooth_number === toothNumber.toString() && t.is_active);

    const getToothVisualEffect = (toothNumber: number): string | null => {
        const treatments = getToothTreatmentsForTooth(toothNumber);
        if (treatments.length === 0) return null;
        const mostRecent = treatments[0];
        if (mostRecent.treatment_catalog_item_id) {
            const item = catalogItems.find(i => i.id === mostRecent.treatment_catalog_item_id);
            if (item?.visual_effect) return item.visual_effect;
        }
        if (mostRecent.treatment_catalog_id) {
            const treatment = catalog.find(t => t.id === mostRecent.treatment_catalog_id);
            if (treatment?.visual_effect) return treatment.visual_effect;
        }
        return null;
    };

    const getToothBridge = (toothNumber: number): OdontogramBridge | null => {
        return bridges.find(bridge => {
            const start = parseInt(bridge.tooth_start);
            const end = parseInt(bridge.tooth_end);
            return toothNumber >= Math.min(start, end) && toothNumber <= Math.max(start, end);
        }) || null;
    };

    // Get color based on treatment status - VIBRANT COLORS for dark theme
    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'Pending':
                return '#ffc107'; // Bright amber/yellow
            case 'InProgress':
                return '#2196f3'; // Bright blue
            case 'Completed':
                return '#4caf50'; // Bright green
            case 'Cancelled':
                return '#f44336'; // Bright red
            default:
                return tokens.colorNeutralBackground4; // Gray for unknown
        }
    };

    const getSurfaceColor = (toothNumber: number, surface: Surface): string => {
        const surfaceData = getSurfaceData(toothNumber, surface);
        if (surfaceData.length === 0) return tokens.colorNeutralBackground4;

        const mostRecent = surfaceData[0];

        // If there's a treatment_id, use the status color
        if (mostRecent.treatment_id) {
            const status = treatmentStatusMap.get(mostRecent.treatment_id);
            if (status) {
                return getStatusColor(status);
            }
        }

        // If there's a treatment_catalog_id but no treatment_id, show yellow (pending)
        if (mostRecent.treatment_catalog_id) {
            return '#ffc107';
        }

        // Fallback to default color if no treatment or status found
        return tokens.colorNeutralBackground4;
    };

    const handleSurfaceClick = (e: React.MouseEvent, toothNumber: number, surface: Surface) => {
        e.stopPropagation();
        if (viewMode !== 'edit') return;
        setSelectedTooth(toothNumber);
        setSelectedSurface(surface);
    };

    const handleToothClick = (toothNumber: number) => {
        if (viewMode !== 'edit') return;
        setSelectedTooth(toothNumber);
        setSelectedSurface('whole_tooth');
    };

    const handleAddTreatment = async () => {
        if (!selectedTooth || !selectedSurface) return;
        if (!selectedTreatment) { toast.error('Seleccione un tratamiento'); return; }
        if (catalogItems.length > 0 && !selectedTreatmentItem) { toast.error('Seleccione un sub-tratamiento'); return; }

        try {
            let treatmentId: number | undefined;
            if (createTreatmentRecord) {
                const treatment = catalog.find(t => t.id === selectedTreatment);
                const item = selectedTreatmentItem ? catalogItems.find(i => i.id === selectedTreatmentItem) : null;
                if (treatment) {
                    const treatmentName = item ? `${treatment.name} - ${item.name}` : treatment.name;
                    const treatmentCost = customCost > 0 ? customCost : (item?.default_cost || treatment.default_cost);
                    treatmentId = await createTreatment({
                        patient_id: patientId,
                        name: treatmentName,
                        tooth_number: selectedTooth.toString(),
                        sector: selectedSurface === 'whole_tooth' ? 'Diente completo' : selectedSurface,
                        total_cost: treatmentCost,
                        notes: notes || `${treatment.name} ${selectedSurface === 'whole_tooth' ? 'en diente completo' : `en superficie ${selectedSurface}`}`,
                    });
                    if (treatmentStatus !== 'Pending') {
                        const { updateTreatmentStatus } = await import('../../hooks/useTreatments');
                        await updateTreatmentStatus(treatmentId, treatmentStatus);
                    }
                    toast.success('Tratamiento creado');
                }
            }

            if (selectedSurface === 'whole_tooth') {
                await addToothTreatment({
                    patient_id: patientId, tooth_number: selectedTooth.toString(),
                    treatment_catalog_id: selectedTreatment,
                    treatment_catalog_item_id: selectedTreatmentItem || undefined,
                    condition: 'treatment', notes: notes || undefined, treatment_id: treatmentId,
                });
            } else {
                await addToothSurfaceTreatment({
                    patient_id: patientId, tooth_number: selectedTooth.toString(), surface: selectedSurface,
                    treatment_catalog_id: selectedTreatment,
                    treatment_catalog_item_id: selectedTreatmentItem || undefined,
                    condition: 'treatment', notes: notes || undefined, treatment_id: treatmentId,
                });
            }

            await loadData();
            await loadSurfaceTreatments();
            await loadToothLevelTreatments();
            toast.success('Tratamiento añadido al odontograma');
            setSelectedTreatment(null); setSelectedTreatmentItem(null); setNotes('');
        } catch {
            toast.error('Error al añadir tratamiento');
        }
    };

    const confirmDelete = async (alsoDeleteTreatment: boolean) => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.type === 'surface') {
                await deactivateSurfaceTreatment(deleteTarget.id);
                await loadSurfaceTreatments();
            } else if (deleteTarget.type === 'tooth') {
                await deactivateToothTreatment(deleteTarget.id);
                await loadToothLevelTreatments();
            } else if (deleteTarget.type === 'bridge') {
                await deactivateBridge(deleteTarget.id);
            }
            if (alsoDeleteTreatment && deleteTarget.treatmentId) {
                const { deleteTreatment } = await import('../../hooks/useTreatments');
                await deleteTreatment(deleteTarget.treatmentId);
            }
            await loadData();
            toast.success(alsoDeleteTreatment ? 'Eliminado del odontograma y registros' : 'Eliminado del odontograma');
        } catch {
            toast.error('Error al eliminar tratamiento');
        } finally {
            setShowDeleteDialog(false);
            setDeleteTarget(null);
        }
    };

    const handleCreateBridge = async () => {
        if (!bridgeName || !bridgeStart || !bridgeEnd) { toast.error('Complete todos los campos requeridos'); return; }
        try {
            let treatmentId: number | undefined;
            if (createTreatmentRecord && bridgeTreatment) {
                const treatment = catalog.find(t => t.id === bridgeTreatment);
                if (treatment) {
                    treatmentId = await createTreatment({
                        patient_id: patientId, name: `${treatment.name} - ${bridgeName}`,
                        tooth_number: `${bridgeStart}-${bridgeEnd}`, sector: 'Puente dental',
                        total_cost: treatment.default_cost,
                        notes: bridgeNotes || `Puente dental: ${bridgeName} (piezas ${bridgeStart} a ${bridgeEnd})`,
                    });
                    if (treatmentStatus !== 'Pending') {
                        const { updateTreatmentStatus } = await import('../../hooks/useTreatments');
                        await updateTreatmentStatus(treatmentId, treatmentStatus);
                    }
                }
            }
            await addBridge({
                patient_id: patientId, bridge_name: bridgeName,
                tooth_start: bridgeStart, tooth_end: bridgeEnd,
                treatment_catalog_id: bridgeTreatment || undefined,
                notes: bridgeNotes || undefined, treatment_id: treatmentId,
            });
            await loadData();
            toast.success('Puente dental creado');
            setShowBridgeDialog(false); setBridgeName(''); setBridgeStart(''); setBridgeEnd('');
            setBridgeTreatment(null); setBridgeNotes('');
        } catch {
            toast.error('Error al crear el puente');
        }
    };

    // ─── Render helpers ────────────────────────────────────────────────────
    const renderToothWrapper = (toothNumber: number) => {
        const isDeciduous = isDeciduousTooth(toothNumber);
        const isSelected = selectedTooth === toothNumber;
        const visualEffect = getToothVisualEffect(toothNumber);
        const bridge = getToothBridge(toothNumber);
        const bridgeColor = bridge ? '#e08c00' : undefined;

        return (
            <motion.div
                key={toothNumber}
                className="flex flex-col items-center gap-1"
                whileHover={viewMode === 'edit' ? { scale: 1.06 } : {}}
                transition={{ duration: 0.12 }}
                onClick={() => handleToothClick(toothNumber)}
            >
                <ToothSVG
                    toothNumber={toothNumber}
                    isSelected={isSelected}
                    isDeciduous={isDeciduous}
                    getSurfaceColor={getSurfaceColor}
                    visualEffect={visualEffect}
                    onSurfaceClick={handleSurfaceClick}
                    selectedSurface={selectedSurface}
                    isEditMode={viewMode === 'edit'}
                    bridgeColor={bridgeColor}
                />
            </motion.div>
        );
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', gap: '12px' }}>
                <Loader2 className="animate-spin" style={{ color: tokens.colorBrandForeground, width: 20, height: 20 }} />
                <span style={{ color: tokens.colorNeutralForeground3, fontSize: 14 }}>Cargando odontograma...</span>
            </div>
        );
    }

    // Count treatments for badge
    const activeTreatmentCount = toothTreatments.filter(t => t.is_active).length
        + surfaces.filter(s => s.is_active).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Header bar ─────────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: tokens.colorNeutralBackground2,
                border: `1px solid ${tokens.colorNeutralStroke1}`,
                borderRadius: tokens.borderRadiusLarge,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: tokens.colorNeutralForeground1 }}>
                        Odontograma
                    </span>
                    {activeTreatmentCount > 0 && (
                        <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px',
                            background: 'rgba(77,166,255,0.15)',
                            color: tokens.colorBrandForeground,
                            borderRadius: 20, border: `1px solid rgba(77,166,255,0.25)`,
                        }}>
                            {activeTreatmentCount} tratamientos
                        </span>
                    )}
                    {bridges.length > 0 && (
                        <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px',
                            background: tokens.colorPaletteMarigoldBackground,
                            color: tokens.colorPaletteMarigoldForeground,
                            borderRadius: 20, border: `1px solid rgba(224,140,0,0.25)`,
                        }}>
                            {bridges.length} puentes
                        </span>
                    )}
                </div>

                {/* View/Edit toggle */}
                <div style={{
                    display: 'flex', padding: 3,
                    background: tokens.colorNeutralBackground3,
                    borderRadius: tokens.borderRadiusLarge,
                    border: `1px solid ${tokens.colorNeutralStroke1}`,
                }}>
                    {(['view', 'edit'] as ViewMode[]).map(mode => (
                        <button
                            key={mode}
                            onClick={() => {
                                setViewMode(mode);
                                if (mode === 'view') { setSelectedTooth(null); setSelectedSurface(null); }
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '5px 12px', borderRadius: 6, border: 'none',
                                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                                transition: `all ${tokens.durationNormal} ${tokens.curveEasyEase}`,
                                background: viewMode === mode ? tokens.colorBrandBackground : 'transparent',
                                color: viewMode === mode ? '#fff' : tokens.colorNeutralForeground3,
                            }}
                        >
                            {mode === 'view' ? <Eye style={{ width: 13, height: 13 }} /> : <Edit3 style={{ width: 13, height: 13 }} />}
                            {mode === 'view' ? 'Visualizar' : 'Editar'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Legend ─────────────────────────────────────────── */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 14px',
                background: tokens.colorNeutralBackground2,
                border: `1px solid ${tokens.colorNeutralStroke1}`,
                borderRadius: tokens.borderRadiusLarge,
                fontSize: 12,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tokens.colorNeutralForeground2 }}>
                    <UserIcon style={{ width: 13, height: 13, color: tokens.colorNeutralForeground3 }} />
                    Permanentes (11-48)
                </div>
                <div style={{ width: 1, height: 14, background: tokens.colorNeutralStroke1, alignSelf: 'center' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tokens.colorBrandForeground }}>
                    <Baby style={{ width: 13, height: 13 }} />
                    Temporales (51-85)
                </div>
                <div style={{ width: 1, height: 14, background: tokens.colorNeutralStroke1, alignSelf: 'center' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tokens.colorPaletteMarigoldForeground }}>
                    <div style={{ width: 20, height: 4, background: tokens.colorPaletteMarigoldForeground, borderRadius: 2, opacity: 0.85 }} />
                    Puente dental
                </div>
                <div style={{ width: 1, height: 14, background: tokens.colorNeutralStroke1, alignSelf: 'center' }} />
                {/* Status color legend - VIBRANT COLORS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, background: '#ffc107', borderRadius: 2, boxShadow: '0 0 8px rgba(255,193,7,0.4)' }} />
                    <span style={{ color: tokens.colorNeutralForeground2, fontWeight: 500 }}>Pendiente</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, background: '#2196f3', borderRadius: 2, boxShadow: '0 0 8px rgba(33,150,243,0.4)' }} />
                    <span style={{ color: tokens.colorNeutralForeground2, fontWeight: 500 }}>En Proceso</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, background: '#4caf50', borderRadius: 2, boxShadow: '0 0 8px rgba(76,175,80,0.4)' }} />
                    <span style={{ color: tokens.colorNeutralForeground2, fontWeight: 500 }}>Completado</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, background: '#f44336', borderRadius: 2, boxShadow: '0 0 8px rgba(244,67,54,0.4)' }} />
                    <span style={{ color: tokens.colorNeutralForeground2, fontWeight: 500 }}>Cancelado</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, color: tokens.colorNeutralForeground4, fontSize: 11 }}>
                    <span>← Derecha del paciente</span>
                    <span>Izquierda del paciente →</span>
                </div>
            </div>

            {/* ── Odontogram grid ────────────────────────────────── */}
            <div style={{
                background: tokens.colorNeutralBackground2,
                border: `1px solid ${tokens.colorNeutralStroke1}`,
                borderRadius: tokens.borderRadiusXLarge,
                padding: '24px 16px',
                display: 'flex', flexDirection: 'column', gap: 24,
            }}>
                {/* Upper arch */}
                <div>
                    <div style={{
                        textAlign: 'center', fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: tokens.colorNeutralForeground4, marginBottom: 14,
                    }}>
                        Arcada Superior
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                        {TEETH_FDI_PERMANENT.upper.map(renderToothWrapper)}
                    </div>
                    <div style={{
                        borderTop: `1px dashed ${tokens.colorNeutralStroke1}`,
                        paddingTop: 10,
                        display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 4,
                    }}>
                        {TEETH_FDI_DECIDUOUS.upper.map(renderToothWrapper)}
                    </div>
                </div>

                {/* Midline */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, height: 1, background: tokens.colorNeutralStroke1 }} />
                    <span style={{ fontSize: 10, color: tokens.colorNeutralForeground4, letterSpacing: '0.08em' }}>LÍNEA MEDIA</span>
                    <div style={{ flex: 1, height: 1, background: tokens.colorNeutralStroke1 }} />
                </div>

                {/* Lower arch */}
                <div>
                    <div style={{
                        textAlign: 'center', fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: tokens.colorNeutralForeground4, marginBottom: 14,
                    }}>
                        Arcada Inferior
                    </div>
                    <div style={{
                        borderBottom: `1px dashed ${tokens.colorNeutralStroke1}`,
                        paddingBottom: 10, marginBottom: 10,
                        display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 4,
                    }}>
                        {TEETH_FDI_DECIDUOUS.lower.map(renderToothWrapper)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 4 }}>
                        {TEETH_FDI_PERMANENT.lower.map(renderToothWrapper)}
                    </div>
                </div>
            </div>

            {/* ── Edit panel (animated side panel / bottom panel) ── */}
            <AnimatePresence>
                {selectedTooth && viewMode === 'edit' && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.18, ease: [0.33, 0, 0.67, 1] }}
                        style={{
                            background: tokens.colorNeutralBackground2,
                            border: `1px solid ${tokens.colorNeutralStroke1}`,
                            borderRadius: tokens.borderRadiusXLarge,
                            overflow: 'hidden',
                        }}
                    >
                        {/* Panel header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 20px',
                            background: tokens.colorNeutralBackground3,
                            borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: tokens.colorNeutralForeground1 }}>
                                        Pieza {selectedTooth}
                                    </span>
                                    {isDeciduousTooth(selectedTooth) && (
                                        <span style={{
                                            fontSize: 10, padding: '1px 6px',
                                            background: 'rgba(77,166,255,0.12)',
                                            color: tokens.colorBrandForeground,
                                            borderRadius: 10, border: `1px solid rgba(77,166,255,0.2)`,
                                        }}>Temporal</span>
                                    )}
                                </div>
                                {selectedSurface && (
                                    <span style={{ fontSize: 12, color: tokens.colorNeutralForeground3, marginTop: 2, display: 'block' }}>
                                        {SURFACE_LABELS[selectedSurface]}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => { setSelectedTooth(null); setSelectedSurface(null); }}
                                style={{
                                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer',
                                    color: tokens.colorNeutralForeground3,
                                    transition: `background ${tokens.durationNormal}`,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = tokens.colorNeutralBackground4)}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <X style={{ width: 15, height: 15 }} />
                            </button>
                        </div>

                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Surface selector */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: tokens.colorNeutralForeground2, marginBottom: 8 }}>
                                    Superficie
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {TOOTH_SURFACES.map(surface => (
                                        <button
                                            key={surface}
                                            onClick={() => setSelectedSurface(surface)}
                                            style={{
                                                padding: surface === 'whole_tooth' ? '6px 14px' : '5px 10px',
                                                fontSize: 12, fontWeight: 500, borderRadius: 6,
                                                border: selectedSurface === surface
                                                    ? `1px solid ${tokens.colorBrandForeground}`
                                                    : `1px solid ${tokens.colorNeutralStroke1}`,
                                                background: selectedSurface === surface
                                                    ? `rgba(77,166,255,0.16)`
                                                    : tokens.colorNeutralBackground3,
                                                color: selectedSurface === surface
                                                    ? tokens.colorBrandForeground
                                                    : tokens.colorNeutralForeground2,
                                                cursor: 'pointer',
                                                transition: `all ${tokens.durationNormal}`,
                                            }}
                                        >
                                            {surface === 'whole_tooth' ? '🦷 Diente Completo' : SURFACE_LABELS[surface]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Treatment form */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                                {/* Treatment catalog */}
                                <div>
                                    <label style={labelStyle}>Tratamiento</label>
                                    <select
                                        value={selectedTreatment || ''}
                                        onChange={e => setSelectedTreatment(e.target.value ? parseInt(e.target.value) : null)}
                                        style={selectStyle}
                                    >
                                        <option value="">Sin tratamiento</option>
                                        {catalog.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>

                                {/* Sub-treatment */}
                                {selectedTreatment && catalogItems.length > 0 && (
                                    <div>
                                        <label style={labelStyle}>Sub-tratamiento</label>
                                        <select
                                            value={selectedTreatmentItem || ''}
                                            onChange={e => setSelectedTreatmentItem(e.target.value ? parseInt(e.target.value) : null)}
                                            style={selectStyle}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {catalogItems.map(i => <option key={i.id} value={i.id}>{i.name} (${i.default_cost})</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* Cost */}
                                {selectedTreatment && selectedTreatmentItem && (
                                    <div>
                                        <label style={labelStyle}>Costo</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: tokens.colorNeutralForeground3, fontSize: 13 }}>$</span>
                                            <input
                                                type="number" value={customCost}
                                                onChange={e => setCustomCost(parseFloat(e.target.value) || 0)}
                                                min="0" step="0.01"
                                                style={{ ...inputStyle, paddingLeft: 24 }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Create treatment record toggle */}
                            {selectedTreatment && selectedTreatmentItem && (
                                <div style={{
                                    padding: '10px 14px',
                                    background: 'rgba(77,166,255,0.06)',
                                    border: `1px solid rgba(77,166,255,0.16)`,
                                    borderRadius: tokens.borderRadiusMedium,
                                    display: 'flex', alignItems: 'center', gap: 10,
                                }}>
                                    <input
                                        type="checkbox" id="createTreatmentRec"
                                        checked={createTreatmentRecord}
                                        onChange={e => setCreateTreatmentRecord(e.target.checked)}
                                        style={{ width: 14, height: 14, accentColor: tokens.colorBrandBackground }}
                                    />
                                    <label htmlFor="createTreatmentRec" style={{ fontSize: 12, color: tokens.colorNeutralForeground2, cursor: 'pointer' }}>
                                        Crear registro de tratamiento automáticamente
                                    </label>
                                </div>
                            )}

                            {/* Status buttons */}
                            {selectedTreatment && selectedTreatmentItem && createTreatmentRecord && (
                                <div>
                                    <label style={labelStyle}>Estado</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {(Object.entries(STATUS_CONFIG) as [keyof typeof STATUS_CONFIG, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => {
                                            const Icon = cfg.icon;
                                            const isActive = treatmentStatus === key;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => setTreatmentStatus(key)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 6,
                                                        padding: '5px 12px', fontSize: 12, fontWeight: 500,
                                                        borderRadius: 6, border: `1px solid`,
                                                        borderColor: isActive ? cfg.color : tokens.colorNeutralStroke1,
                                                        background: isActive ? cfg.bg : tokens.colorNeutralBackground3,
                                                        color: isActive ? cfg.color : tokens.colorNeutralForeground3,
                                                        cursor: 'pointer',
                                                        transition: `all ${tokens.durationNormal}`,
                                                    }}
                                                >
                                                    <Icon style={{ width: 12, height: 12 }} />
                                                    {cfg.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <label style={labelStyle}>Observaciones</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Detalles adicionales..."
                                    style={{
                                        ...inputStyle,
                                        resize: 'none', height: 'auto', fontFamily: 'inherit',
                                    }}
                                />
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={handleAddTreatment}
                                    disabled={!selectedTreatment || (catalogItems.length > 0 && !selectedTreatmentItem)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '7px 16px', fontSize: 13, fontWeight: 500,
                                        borderRadius: tokens.borderRadiusMedium, border: 'none',
                                        background: (!selectedTreatment || (catalogItems.length > 0 && !selectedTreatmentItem))
                                            ? 'rgba(0,120,212,0.35)' : tokens.colorBrandBackground,
                                        color: '#fff', cursor: (!selectedTreatment || (catalogItems.length > 0 && !selectedTreatmentItem)) ? 'not-allowed' : 'pointer',
                                        transition: `background ${tokens.durationNormal}`,
                                    }}
                                >
                                    <Save style={{ width: 13, height: 13 }} />
                                    Añadir Tratamiento
                                </button>
                            </div>

                            {/* Active treatments list */}
                            {(() => {
                                const treatmentList = selectedSurface === 'whole_tooth' ? toothLevelTreatments : surfaceTreatments;
                                if (treatmentList.length === 0) return null;
                                return (
                                    <div style={{ borderTop: `1px solid ${tokens.colorNeutralStroke2}`, paddingTop: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: tokens.colorNeutralForeground2 }}>
                                                Tratamientos Activos
                                            </span>
                                            {selectedSurface !== 'whole_tooth' && (
                                                <button
                                                    onClick={loadSurfaceHistoryData}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 5,
                                                        padding: '4px 10px', fontSize: 11, borderRadius: 5,
                                                        border: `1px solid ${tokens.colorNeutralStroke1}`,
                                                        background: 'transparent', color: tokens.colorNeutralForeground3,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <Eye style={{ width: 11, height: 11 }} />
                                                    Historial
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {treatmentList.map((treatment: any) => {
                                                const catalogEntry = catalog.find(c => c.id === treatment.treatment_catalog_id);
                                                const itemEntry = catalogItems.find(i => i.id === treatment.treatment_catalog_item_id);
                                                return (
                                                    <div key={treatment.id} style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '8px 12px',
                                                        background: tokens.colorNeutralBackground3,
                                                        border: `1px solid ${tokens.colorNeutralStroke2}`,
                                                        borderRadius: tokens.borderRadiusMedium,
                                                    }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <div style={{
                                                                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                                                    background: catalogEntry?.color || '#4ade80',
                                                                }} />
                                                                <span style={{ fontSize: 12, fontWeight: 500, color: tokens.colorNeutralForeground1 }}>
                                                                    {itemEntry?.name || catalogEntry?.name || 'Sin nombre'}
                                                                </span>
                                                            </div>
                                                            <span style={{ fontSize: 10, color: tokens.colorNeutralForeground4, marginLeft: 16 }}>
                                                                {new Date(treatment.applied_date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setDeleteTarget({
                                                                    type: selectedSurface === 'whole_tooth' ? 'tooth' : 'surface',
                                                                    id: treatment.id,
                                                                    treatmentId: treatment.treatment_id,
                                                                    name: itemEntry?.name || catalogEntry?.name || 'Sin nombre',
                                                                });
                                                                setShowDeleteDialog(true);
                                                            }}
                                                            style={{
                                                                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                border: 'none', background: 'transparent', borderRadius: 5, cursor: 'pointer',
                                                                color: tokens.colorNeutralForeground4,
                                                                transition: `all ${tokens.durationNormal}`,
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(241,112,122,0.14)'; e.currentTarget.style.color = tokens.colorPaletteRedForeground; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = tokens.colorNeutralForeground4; }}
                                                        >
                                                            <Trash2 style={{ width: 13, height: 13 }} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* History */}
                            <AnimatePresence>
                                {showHistory && surfaceHistory.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        style={{ borderTop: `1px solid ${tokens.colorNeutralStroke2}`, paddingTop: 14 }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: tokens.colorNeutralForeground2 }}>
                                                Historial — {selectedSurface}
                                            </span>
                                            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.colorNeutralForeground3 }}>
                                                <X style={{ width: 13, height: 13 }} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                                            {surfaceHistory.map(entry => {
                                                const catalogEntry = catalog.find(c => c.id === entry.treatment_catalog_id);
                                                const itemEntry = catalogItems.find(i => i.id === entry.treatment_catalog_item_id);
                                                const actionColor = { created: tokens.colorPaletteGreenForeground, updated: tokens.colorBrandForeground, deactivated: tokens.colorPaletteRedForeground }[entry.action] || tokens.colorNeutralForeground3;
                                                return (
                                                    <div key={entry.id} style={{
                                                        padding: '7px 10px',
                                                        background: tokens.colorNeutralBackground3,
                                                        borderRadius: tokens.borderRadiusMedium,
                                                        border: `1px solid ${tokens.colorNeutralStroke2}`,
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ fontSize: 10, fontWeight: 700, color: actionColor, textTransform: 'uppercase' }}>{entry.action}</span>
                                                            <span style={{ fontSize: 10, color: tokens.colorNeutralForeground4 }}>{new Date(entry.recorded_at).toLocaleString()}</span>
                                                        </div>
                                                        <div style={{ fontSize: 12, color: tokens.colorNeutralForeground2, marginTop: 2 }}>
                                                            {itemEntry?.name || catalogEntry?.name || entry.condition}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Bridges section ─────────────────────────────────── */}
            <div style={{
                background: tokens.colorNeutralBackground2,
                border: `1px solid ${tokens.colorNeutralStroke1}`,
                borderRadius: tokens.borderRadiusXLarge,
                overflow: 'hidden',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px',
                    background: tokens.colorNeutralBackground3,
                    borderBottom: bridges.length > 0 ? `1px solid ${tokens.colorNeutralStroke1}` : 'none',
                }}>
                    <div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: tokens.colorNeutralForeground1 }}>Puentes Dentales</span>
                        <p style={{ fontSize: 12, color: tokens.colorNeutralForeground3, marginTop: 2 }}>
                            Prótesis fijas que conectan múltiples piezas
                        </p>
                    </div>
                    <button
                        onClick={() => setShowBridgeDialog(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', fontSize: 12, fontWeight: 500,
                            borderRadius: tokens.borderRadiusMedium, border: `1px solid rgba(224,140,0,0.3)`,
                            background: tokens.colorPaletteMarigoldBackground,
                            color: tokens.colorPaletteMarigoldForeground, cursor: 'pointer',
                            transition: `all ${tokens.durationNormal}`,
                        }}
                    >
                        <Plus style={{ width: 13, height: 13 }} />
                        Nuevo Puente
                    </button>
                </div>

                {bridges.length > 0 ? (
                    <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                        {bridges.map(bridge => {
                            const treatment = catalog.find(t => t.id === bridge.treatment_catalog_id);
                            return (
                                <div key={bridge.id} style={{
                                    padding: '12px 14px',
                                    background: tokens.colorPaletteMarigoldBackground,
                                    border: `1px solid rgba(224,140,0,0.2)`,
                                    borderRadius: tokens.borderRadiusLarge,
                                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <span style={{ fontSize: 15 }}>🌉</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: tokens.colorNeutralForeground1 }}>{bridge.bridge_name}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <span style={{
                                                padding: '2px 8px', fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
                                                background: 'rgba(224,140,0,0.2)', color: tokens.colorPaletteMarigoldForeground,
                                                borderRadius: 5,
                                            }}>{bridge.tooth_start}</span>
                                            <ChevronRight style={{ width: 10, height: 10, color: tokens.colorNeutralForeground4 }} />
                                            <span style={{
                                                padding: '2px 8px', fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
                                                background: 'rgba(224,140,0,0.2)', color: tokens.colorPaletteMarigoldForeground,
                                                borderRadius: 5,
                                            }}>{bridge.tooth_end}</span>
                                        </div>
                                        {treatment && (
                                            <span style={{ fontSize: 11, color: tokens.colorNeutralForeground3 }}>{treatment.name}</span>
                                        )}
                                        {bridge.notes && (
                                            <p style={{ fontSize: 11, color: tokens.colorNeutralForeground4, marginTop: 2, fontStyle: 'italic' }}>{bridge.notes}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setDeleteTarget({ type: 'bridge', id: bridge.id, treatmentId: bridge.treatment_id, name: bridge.bridge_name });
                                            setShowDeleteDialog(true);
                                        }}
                                        style={{
                                            width: 26, height: 26, flexShrink: 0, marginLeft: 8,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: 'none', background: 'transparent', borderRadius: 5, cursor: 'pointer',
                                            color: tokens.colorNeutralForeground4,
                                            transition: `all ${tokens.durationNormal}`,
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(241,112,122,0.14)'; e.currentTarget.style.color = tokens.colorPaletteRedForeground; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = tokens.colorNeutralForeground4; }}
                                    >
                                        <Trash2 style={{ width: 13, height: 13 }} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ padding: '28px 20px', textAlign: 'center', color: tokens.colorNeutralForeground4, fontSize: 13 }}>
                        No hay puentes dentales registrados
                    </div>
                )}
            </div>

            {/* ── Bridge dialog ────────────────────────────────────── */}
            <AnimatePresence>
                {showBridgeDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 50,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
                            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                        }}
                        onClick={() => setShowBridgeDialog(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.93, opacity: 0, y: 8 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.93, opacity: 0, y: 8 }}
                            transition={{ duration: 0.18 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%', maxWidth: 440,
                                background: tokens.colorNeutralBackground1,
                                border: `1px solid ${tokens.colorNeutralStroke1}`,
                                borderRadius: tokens.borderRadiusXLarge,
                                boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                                overflow: 'hidden',
                            }}
                        >
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '16px 20px',
                                background: tokens.colorNeutralBackground2,
                                borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
                            }}>
                                <span style={{ fontSize: 15, fontWeight: 600, color: tokens.colorNeutralForeground1 }}>
                                    🌉 Crear Puente Dental
                                </span>
                                <button onClick={() => setShowBridgeDialog(false)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.colorNeutralForeground3 }}>
                                    <X style={{ width: 16, height: 16 }} />
                                </button>
                            </div>
                            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label style={labelStyle}>Nombre del Puente *</label>
                                    <input type="text" value={bridgeName} onChange={e => setBridgeName(e.target.value)}
                                        placeholder="Ej: Puente anterior superior" style={inputStyle} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div>
                                        <label style={labelStyle}>Pieza Inicial *</label>
                                        <input type="text" value={bridgeStart} onChange={e => setBridgeStart(e.target.value)}
                                            placeholder="Ej: 11" style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Pieza Final *</label>
                                        <input type="text" value={bridgeEnd} onChange={e => setBridgeEnd(e.target.value)}
                                            placeholder="Ej: 14" style={inputStyle} />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Tratamiento Asociado</label>
                                    <select value={bridgeTreatment || ''} onChange={e => setBridgeTreatment(e.target.value ? parseInt(e.target.value) : null)} style={selectStyle}>
                                        <option value="">Sin tratamiento</option>
                                        {catalog.filter(t => t.is_bridge_component).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Notas</label>
                                    <textarea value={bridgeNotes} onChange={e => setBridgeNotes(e.target.value)}
                                        placeholder="Detalles adicionales..." rows={3}
                                        style={{ ...inputStyle, resize: 'none', height: 'auto', fontFamily: 'inherit' }} />
                                </div>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'flex-end', gap: 8,
                                padding: '12px 20px',
                                background: tokens.colorNeutralBackground2,
                                borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
                            }}>
                                <button onClick={() => setShowBridgeDialog(false)} style={{ ...secondaryBtnStyle }}>
                                    Cancelar
                                </button>
                                <button onClick={handleCreateBridge} style={{ ...primaryBtnStyle, background: '#c47f00' }}>
                                    <Save style={{ width: 13, height: 13 }} />
                                    Crear Puente
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Delete confirmation dialog ───────────────────────── */}
            <AnimatePresence>
                {showDeleteDialog && deleteTarget && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 100,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
                            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                        }}
                        onClick={() => { setShowDeleteDialog(false); setDeleteTarget(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.94, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%', maxWidth: 400,
                                background: tokens.colorNeutralBackground1,
                                border: `1px solid ${tokens.colorNeutralStroke1}`,
                                borderRadius: tokens.borderRadiusXLarge,
                                boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                                padding: 24,
                            }}
                        >
                            <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                                <div style={{
                                    width: 40, height: 40, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: tokens.colorPaletteRedBackground,
                                    borderRadius: tokens.borderRadiusLarge,
                                }}>
                                    <AlertCircle style={{ width: 18, height: 18, color: tokens.colorPaletteRedForeground }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: tokens.colorNeutralForeground1, marginBottom: 2 }}>
                                        Eliminar {deleteTarget.type === 'bridge' ? 'Puente' : 'Tratamiento'}
                                    </p>
                                    <p style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>{deleteTarget.name}</p>
                                </div>
                            </div>

                            {deleteTarget.treatmentId && (
                                <div style={{
                                    padding: '10px 12px', marginBottom: 16,
                                    background: tokens.colorPaletteYellowBackground,
                                    border: `1px solid rgba(255,185,0,0.2)`,
                                    borderRadius: tokens.borderRadiusMedium,
                                }}>
                                    <p style={{ fontSize: 12, color: tokens.colorPaletteYellowForeground, fontWeight: 500, marginBottom: 2 }}>
                                        Este elemento tiene un registro asociado
                                    </p>
                                    <p style={{ fontSize: 11, color: tokens.colorNeutralForeground3 }}>
                                        Puedes eliminarlo solo del odontograma o también borrar el registro de tratamiento.
                                    </p>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <button onClick={() => confirmDelete(false)} style={{ ...secondaryBtnStyle, width: '100%', justifyContent: 'center' }}>
                                    Solo del Odontograma
                                </button>
                                {deleteTarget.treatmentId && (
                                    <button onClick={() => confirmDelete(true)} style={{
                                        ...primaryBtnStyle, width: '100%', justifyContent: 'center',
                                        background: '#c0392b',
                                    }}>
                                        <Trash2 style={{ width: 13, height: 13 }} />
                                        Del Odontograma y Registros
                                    </button>
                                )}
                                <button onClick={() => { setShowDeleteDialog(false); setDeleteTarget(null); }} style={{
                                    ...secondaryBtnStyle, width: '100%', justifyContent: 'center',
                                    color: tokens.colorNeutralForeground3,
                                }}>
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Treatment Timeline ──────────────────────────────── */}
            <TreatmentTimeline
                patientId={patientId}
                selectedTooth={selectedTooth}
                refreshTrigger={timelineRefresh}
                onTreatmentClick={(treatmentId, toothNumber) => {
                    // Navigate to the tooth when clicking a treatment
                    const tooth = parseInt(toothNumber);
                    if (!isNaN(tooth)) {
                        setSelectedTooth(tooth);
                        setSelectedSurface('whole_tooth');
                        setViewMode('view');
                    }
                }}
            />

            {/* ── Independent treatments ───────────────────────────── */}
            <IndependentTreatments patientId={patientId} onRefresh={loadData} />
        </div>
    );
}

// ─── Shared inline styles ────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 500,
    color: 'rgba(255,255,255,0.6)', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
    width: '100%', height: 34, padding: '0 10px',
    background: '#2e2e2e', border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 6, fontSize: 13, color: '#fff',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
};

const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 28,
};

const primaryBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', fontSize: 12, fontWeight: 500,
    borderRadius: 6, border: 'none',
    background: '#0078d4', color: '#fff', cursor: 'pointer',
};

const secondaryBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', fontSize: 12, fontWeight: 500,
    borderRadius: 6, border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
};