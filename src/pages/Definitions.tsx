import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { Plus, Trash2, Calendar as CalendarIcon, Edit2, Loader2 } from 'lucide-react';
import Modal from '../components/Modal';
import { setDate, format, parseISO, setMonth, setDay } from 'date-fns';
import clsx from 'clsx';

interface PaymentDefinition {
    id: string;
    title: string;
    amount: number | null;
    category: string;
    recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    recurrence_day: number;
    recurrence_month?: number; // 0-11
}

const MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const WEEKDAYS = [
    'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
];

export default function Definitions() {
    const { user } = useAuth();
    const { categories } = useCategories();
    const [definitions, setDefinitions] = useState<PaymentDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: 'Fatura',
        recurrence_type: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
        recurrence_day: '1',
        recurrence_month: new Date().getMonth().toString(),
    });

    const fetchDefinitions = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('payment_definitions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDefinitions(data || []);
        } catch (error) {
            console.error('Error fetching definitions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDefinitions();
    }, [user]);

    const handleEdit = (def: PaymentDefinition) => {
        setEditingId(def.id);
        setFormData({
            title: def.title,
            amount: def.amount?.toString() || '',
            category: def.category,
            recurrence_type: def.recurrence_type,
            recurrence_day: def.recurrence_day.toString(),
            recurrence_month: (def.recurrence_month ?? new Date().getMonth()).toString(),
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);

        const newAmount = formData.amount ? parseFloat(formData.amount) : null;
        const recurrence_month = formData.recurrence_type === 'yearly' ? parseInt(formData.recurrence_month) : null;

        try {
            const payload = {
                title: formData.title,
                amount: newAmount,
                category: formData.category,
                recurrence_type: formData.recurrence_type,
                recurrence_day: parseInt(formData.recurrence_day),
                recurrence_month: recurrence_month,
            };

            if (editingId) {
                const { error: updateError } = await supabase
                    .from('payment_definitions')
                    .update(payload)
                    .eq('id', editingId);

                if (updateError) throw updateError;

                const updates: any = {
                    title: formData.title,
                    category: formData.category,
                };
                if (newAmount !== null) updates.amount = newAmount;

                await supabase
                    .from('transactions')
                    .update(updates)
                    .eq('definition_id', editingId)
                    .eq('status', 'bekliyor')
                    .gte('due_date', new Date().toISOString().split('T')[0]);

                // Date Propagation for weekly/monthly/yearly
                const oldDef = definitions.find(d => d.id === editingId);
                const newDay = parseInt(formData.recurrence_day);
                if (oldDef && (oldDef.recurrence_day !== newDay || oldDef.recurrence_month !== recurrence_month || oldDef.recurrence_type !== formData.recurrence_type)) {
                    // If recurrence logic changes profoundly, it might be better to let generator re-run
                    // But for simple day/month changes on same type:
                    if (oldDef.recurrence_type === formData.recurrence_type) {
                        const { data: pendingTrans } = await supabase
                            .from('transactions')
                            .select('id, due_date')
                            .eq('definition_id', editingId)
                            .eq('status', 'bekliyor')
                            .gte('due_date', new Date().toISOString().split('T')[0]);

                        if (pendingTrans) {
                            for (const trans of pendingTrans) {
                                let newDate = parseISO(trans.due_date);
                                if (formData.recurrence_type === 'monthly') newDate = setDate(newDate, newDay);
                                if (formData.recurrence_type === 'yearly') {
                                    newDate = setDate(newDate, newDay);
                                    if (recurrence_month !== null) newDate = setMonth(newDate, recurrence_month);
                                }
                                if (formData.recurrence_type === 'weekly') newDate = setDay(newDate, newDay);

                                await supabase
                                    .from('transactions')
                                    .update({ due_date: format(newDate, 'yyyy-MM-dd') })
                                    .eq('id', trans.id);
                            }
                        }
                    }
                }
            } else {
                const { error } = await supabase.from('payment_definitions').insert({
                    user_id: user.id,
                    ...payload
                });
                if (error) throw error;
            }

            setIsModalOpen(false);
            setEditingId(null);
            setFormData({
                title: '',
                amount: '',
                category: 'Fatura',
                recurrence_type: 'monthly',
                recurrence_day: '1',
                recurrence_month: new Date().getMonth().toString(),
            });
            await fetchDefinitions();
            alert(editingId ? 'Tanım başarıyla güncellendi.' : 'Yeni tanım başarıyla eklendi.');
        } catch (error) {
            console.error('Submit error:', error);
            alert('İşlem başarısız oldu: ' + (error as any).message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu tanımı ve bu tanıma ait tüm BEKLEYEN ödemeleri silmek istediğinize emin misiniz?')) return;
        try {
            // Önce bekleyen işlemleri sil
            await supabase
                .from('transactions')
                .delete()
                .eq('definition_id', id)
                .eq('status', 'bekliyor');

            // Sonra tanımı sil
            const { error } = await supabase
                .from('payment_definitions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setDefinitions(prev => prev.filter(p => p.id !== id));
            alert('Tanım ve bekleyen ödemeler başarıyla silindi.');
        } catch (error) {
            console.error('Delete error:', error);
            alert('Silme işlemi sırasında bir hata oluştu.');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
    );

    const getRecurrenceLabel = (def: PaymentDefinition) => {
        switch (def.recurrence_type) {
            case 'daily': return 'Her Gün';
            case 'weekly': return `Her Hafta ${WEEKDAYS[def.recurrence_day]}`;
            case 'monthly': return `Her Ayın ${def.recurrence_day}. Günü`;
            case 'yearly': return `Her Yıl, ${MONTHS[def.recurrence_month || 0]} ${def.recurrence_day}`;
            default: return '';
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Ödeme Tanımları</h2>
                    <p className="text-slate-400">Düzenli ödemelerinizi (Günlük, Haftalık, Aylık vb.) buradan yönetin.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({
                            title: '',
                            amount: '',
                            category: 'Fatura',
                            recurrence_type: 'monthly',
                            recurrence_day: '1',
                            recurrence_month: new Date().getMonth().toString(),
                        });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Tanım Ekle
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {definitions.map((def) => (
                    <div key={def.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 group hover:border-indigo-500/30 transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <CalendarIcon className="w-6 h-6" />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(def)}
                                    className="p-2 hover:bg-indigo-500/10 hover:text-indigo-400 text-slate-500 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(def.id)}
                                    className="p-2 hover:bg-red-500/10 hover:text-red-400 text-slate-500 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-1">{def.title}</h3>
                        <p className="text-slate-400 text-sm mb-4">{def.category}</p>

                        <div className="space-y-2 border-t border-slate-800 pt-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Tutar</span>
                                <span className="text-white font-medium">
                                    {def.amount ? `${def.amount.toLocaleString('tr-TR')} ₺` : 'Değişken'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Dönem</span>
                                <span className="text-white font-medium text-right">
                                    {getRecurrenceLabel(def)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Tanımı Düzenle" : "Yeni Ödeme Tanımı"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Başlık</label>
                        <input
                            type="text"
                            required
                            placeholder="Örn: Ev Kirası"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Tutar (Opsiyonel)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Kategori</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                                <option value="">Seçiniz</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className={clsx(formData.recurrence_type === 'daily' ? "col-span-2" : "col-span-1")}>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Tekrar Tipi</label>
                            <select
                                value={formData.recurrence_type}
                                onChange={e => setFormData({ ...formData, recurrence_type: e.target.value as any })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                                <option value="daily">Günlük</option>
                                <option value="weekly">Haftalık</option>
                                <option value="monthly">Aylık</option>
                                <option value="yearly">Yıllık</option>
                            </select>
                        </div>

                        {formData.recurrence_type === 'weekly' && (
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-400 mb-1">Gün</label>
                                <select
                                    value={formData.recurrence_day}
                                    onChange={e => setFormData({ ...formData, recurrence_day: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    {WEEKDAYS.map((day, idx) => (
                                        <option key={idx} value={idx}>{day}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {formData.recurrence_type === 'yearly' && (
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-400 mb-1">Ay</label>
                                <select
                                    value={formData.recurrence_month}
                                    onChange={e => setFormData({ ...formData, recurrence_month: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    {MONTHS.map((month, idx) => (
                                        <option key={idx} value={idx}>{month}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {(formData.recurrence_type === 'monthly' || formData.recurrence_type === 'yearly') && (
                            <div className={clsx(formData.recurrence_type === 'monthly' ? "col-span-1" : "col-span-2")}>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Günü (1-31)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    required
                                    value={formData.recurrence_day}
                                    onChange={e => setFormData({ ...formData, recurrence_day: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
