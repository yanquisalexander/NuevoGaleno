import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
    value: string;
    onChange: (emoji: string) => void;
    onClose: () => void;
}

// Emojis comunes para tratamientos dentales y médicos
const EMOJI_CATEGORIES = {
    dental: {
        label: 'Dental',
        emojis: ['🦷', '🪥', '🦴', '💊', '💉', '🩹', '🔬', '🧪', '🩺', '⚕️'],
    },
    procedures: {
        label: 'Procedimientos',
        emojis: ['✂️', '🔨', '🔧', '⚙️', '🛠️', '🪛', '📏', '📐', '🎯', '✅'],
    },
    orthodontics: {
        label: 'Ortodoncia',
        emojis: ['🦷', '🦴', '🧲', '⛓️', '🔗', '🎗️', '📍', '⚡', '🌟', '✨'],
    },
    prosthetics: {
        label: 'Prótesis',
        emojis: ['👄', '💎', '💍', '👑', '🦴', '🎭', '🌈', '⚪', '🔘', '⭕'],
    },
    surgery: {
        label: 'Cirugía',
        emojis: ['🔪', '✂️', '🩸', '💉', '🧬', '🔬', '⚕️', '🏥', '🚑', '📋'],
    },
    general: {
        label: 'General',
        emojis: ['📝', '📄', '📊', '📈', '💰', '💳', '⏰', '📅', '🔔', '⚠️'],
    },
};

export function EmojiPicker({ value, onChange, onClose }: EmojiPickerProps) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<keyof typeof EMOJI_CATEGORIES>('dental');

    const categories = Object.entries(EMOJI_CATEGORIES);
    const currentEmojis = EMOJI_CATEGORIES[selectedCategory].emojis;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#2c2c2c] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl max-w-md w-full"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Seleccionar Ícono</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                    >
                        <X className="w-5 h-5 text-white/50" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-4 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar ícono..."
                            className="w-full h-10 bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="px-6 py-4 flex gap-2 overflow-x-auto scrollbar-thin border-b border-white/5">
                    {categories.map(([key, cat]) => (
                        <button
                            key={key}
                            onClick={() => setSelectedCategory(key as keyof typeof EMOJI_CATEGORIES)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                                selectedCategory === key
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                            )}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Emoji Grid */}
                <div className="p-6">
                    <div className="grid grid-cols-5 gap-3">
                        {currentEmojis.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    onChange(emoji);
                                    onClose();
                                }}
                                className={cn(
                                    'relative h-14 flex items-center justify-center text-3xl rounded-xl transition-all',
                                    value === emoji
                                        ? 'bg-blue-500/20 ring-2 ring-blue-500'
                                        : 'bg-white/5 hover:bg-white/10 hover:scale-110'
                                )}
                            >
                                {emoji}
                                {value === emoji && (
                                    <motion.div
                                        layoutId="selected-emoji"
                                        className="absolute inset-0 bg-blue-500/10 rounded-xl"
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <span className="text-xs text-white/40">
                        {value ? `Seleccionado: ${value}` : 'Ninguno seleccionado'}
                    </span>
                    <button
                        onClick={() => {
                            onChange('');
                            onClose();
                        }}
                        className="text-xs text-white/60 hover:text-white transition-colors"
                    >
                        Limpiar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
