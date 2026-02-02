import { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface PaymentFormProps {
    treatmentId: number;
    remainingBalance: number;
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
}

export function PaymentForm({ treatmentId, remainingBalance, onSave, onCancel }: PaymentFormProps) {
    const [formData, setFormData] = useState({
        amount: remainingBalance,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.amount <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }

        if (formData.amount > remainingBalance) {
            setError(`El monto no puede ser mayor al saldo pendiente (${formatCurrency(remainingBalance)})`);
            return;
        }

        if (!formData.payment_date) {
            setError('La fecha de pago es obligatoria');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave({
                ...formData,
                treatment_id: treatmentId,
            });
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
                onClick={onCancel}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-[#1e1e1e] rounded-xl shadow-2xl border border-white/10 overflow-hidden"
                    style={{
                        backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                        <div>
                            <h2 className="text-xl font-semibold text-white">Registrar Pago</h2>
                            <p className="text-sm text-white/60 mt-1">
                                Saldo pendiente: <span className="font-semibold text-green-400">{formatCurrency(remainingBalance)}</span>
                            </p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Monto a Pagar *
                                </label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        max={remainingBalance}
                                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 rounded-lg h-12 text-lg font-semibold pl-8"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">$</span>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, amount: remainingBalance / 2 })}
                                        className="flex-1 text-xs bg-white/5 hover:bg-white/10 text-white/70 rounded-lg py-2 transition-colors"
                                    >
                                        50%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, amount: remainingBalance })}
                                        className="flex-1 text-xs bg-white/5 hover:bg-white/10 text-white/70 rounded-lg py-2 transition-colors"
                                    >
                                        100%
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Fecha de Pago *
                                </label>
                                <Input
                                    type="date"
                                    value={formData.payment_date}
                                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 rounded-lg h-11"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Método de Pago
                                </label>
                                <select
                                    value={formData.payment_method}
                                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 focus:outline-none h-11"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                                    <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                                    <option value="Transferencia">Transferencia</option>
                                    <option value="MercadoPago">MercadoPago</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Notas
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Información adicional sobre el pago..."
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 focus:outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                            <Button
                                type="button"
                                onClick={onCancel}
                                variant="outline"
                                className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 rounded-lg h-10 px-5"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg h-10 px-6 shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
