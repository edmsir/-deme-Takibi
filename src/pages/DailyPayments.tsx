import { useState, useMemo } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CheckCircle2, Circle, AlertCircle, Save } from 'lucide-react';
import clsx from 'clsx';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

export default function DailyPayments() {
    const { transactions, loading, updateStatus, updateAmount } = useTransactions();
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // İşlemleri tarihe göre grupla
    const groupedTransactions = useMemo(() => {
        const groups: Record<string, any[]> = {};

        // Tarihe göre sırala
        const sorted = [...transactions].sort((a, b) =>
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        );

        sorted.forEach(t => {
            const date = parseISO(t.due_date);
            let key = format(date, 'yyyy-MM-dd');

            // Özel başlıklar
            if (isToday(date)) key = 'Bugün';
            else if (isTomorrow(date)) key = 'Yarın';
            else key = format(date, 'd MMMM EEEE', { locale: tr });

            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });

        return groups;
    }, [transactions]);

    const handleTransactionClick = (t: any) => {
        // Create a local copy to edit
        setSelectedTransaction({ ...t });
        setIsModalOpen(true);
    };

    const handleSaveAndPay = async () => {
        if (!selectedTransaction) return;

        if (selectedTransaction.amount <= 0) {
            alert('Lütfen geçerli bir tutar girin.');
            return;
        }

        setIsSaving(true);
        try {
            // Tutar değişmişse güncelle
            const original = transactions.find(t => t.id === selectedTransaction.id);
            if (original && original.amount !== selectedTransaction.amount) {
                await updateAmount(selectedTransaction.id, selectedTransaction.amount);
            }

            // Ödendi yap
            await updateStatus(selectedTransaction.id, 'odendi');
            setIsModalOpen(false);
        } catch (error) {
            console.error('Update failed:', error);
            alert('Güncelleme sırasında bir hata oluştu.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Yükleniyor...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Günlük Ödemeler</h1>
                <p className="text-slate-400">Tüm ödemeleriniz gün gün sıralanmıştır.</p>
            </div>

            <div className="space-y-8">
                {Object.entries(groupedTransactions).map(([dateLabel, items]) => (
                    <div key={dateLabel} className="relative pl-8 border-l-2 border-slate-800">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-800 border-4 border-slate-950" />

                        <h3 className={clsx(
                            "text-lg font-bold mb-4 flex items-center gap-2",
                            dateLabel === 'Bugün' ? "text-indigo-400" :
                                dateLabel === 'Yarın' ? "text-indigo-300" : "text-slate-300"
                        )}>
                            {dateLabel}
                            <span className="text-xs font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">
                                {items.length} İşlem
                            </span>
                        </h3>

                        <div className="grid gap-3">
                            {items.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => handleTransactionClick(t)}
                                    className="group flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-800 border border-slate-800/50 hover:border-indigo-500/30 rounded-xl transition-all text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "p-2.5 rounded-full transition-colors",
                                            t.status === 'odendi' ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400 group-hover:bg-slate-700"
                                        )}>
                                            {t.status === 'odendi' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className={clsx("font-medium", t.status === 'odendi' ? "text-slate-400 line-through" : "text-white")}>
                                                {t.title}
                                            </h4>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <span>{t.category}</span>
                                                {t.document_no && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="font-mono text-slate-400">{t.document_no}</span>
                                                    </>
                                                )}
                                                {t.is_installment && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{t.installment_number}/{t.total_installments}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            {t.amount === 0 ? (
                                                <span className="flex items-center gap-1 text-amber-500 font-bold text-sm animate-pulse">
                                                    <AlertCircle className="w-4 h-4" />
                                                    Tutar Bekleniyor
                                                </span>
                                            ) : (
                                                <p className="font-bold text-white">{t.amount.toLocaleString('tr-TR')} ₺</p>
                                            )}
                                        </div>
                                        <Badge status={t.status} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {Object.keys(groupedTransactions).length === 0 && (
                    <div className="text-center py-20 text-slate-500">
                        Gösterilecek ödeme bulunamadı.
                    </div>
                )}
            </div>

            {/* Detay Modalı */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="İşlem Detayları"
            >
                {selectedTransaction && (
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                            <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Ödeme Tutarı</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    step="0.01"
                                    autoFocus
                                    value={selectedTransaction.amount || ''}
                                    onChange={(e) => setSelectedTransaction({ ...selectedTransaction, amount: parseFloat(e.target.value) || 0 })}
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-xl font-bold text-white focus:border-indigo-500 outline-none"
                                    placeholder="0,00"
                                />
                                <span className="text-xl font-bold text-slate-500">₺</span>
                            </div>
                            {selectedTransaction.amount === 0 && (
                                <p className="text-xs text-amber-500 mt-2 flex items-center gap-1 font-medium">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Bu bir değişken ödemedir. Lütfen tutarı giriniz.
                                </p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">Başlık</label>
                                <p className="text-white bg-slate-800/50 p-3 rounded-lg mt-1 border border-slate-700">{selectedTransaction.title}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">Kategori</label>
                                    <p className="text-white bg-slate-800/50 p-3 rounded-lg mt-1 border border-slate-700">{selectedTransaction.category}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">Tarih</label>
                                    <p className="text-white bg-slate-800/50 p-3 rounded-lg mt-1 border border-slate-700">
                                        {format(parseISO(selectedTransaction.due_date), 'd MMMM yyyy', { locale: tr })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
                            {selectedTransaction.status !== 'odendi' && (
                                <button
                                    disabled={isSaving}
                                    onClick={handleSaveAndPay}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50"
                                >
                                    {isSaving ? 'Kaydediliyor...' : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            Tutarı Kaydet ve Ödendi İşaretle
                                        </>
                                    )}
                                </button>
                            )}

                            <button
                                disabled={isSaving}
                                onClick={async () => {
                                    await updateAmount(selectedTransaction.id, selectedTransaction.amount);
                                    setIsModalOpen(false);
                                }}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4 text-slate-400" />
                                Sadece Tutarı Güncelle
                            </button>

                            {selectedTransaction.status === 'odendi' && (
                                <button
                                    onClick={async () => {
                                        await updateStatus(selectedTransaction.id, 'bekliyor');
                                        setIsModalOpen(false);
                                    }}
                                    className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium transition-colors"
                                >
                                    Ödemeyi Geri Al (Bekliyor)
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
