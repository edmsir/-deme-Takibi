import { useTransactions } from '../hooks/useTransactions';
import StatCard from '../components/StatCard';
import { Wallet, AlertOctagon, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, parseISO, isPast, addDays, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Dashboard() {
    const { transactions, loading } = useTransactions();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    // İstatistikler
    const totalPending = transactions
        .filter(t => t.status === 'bekliyor' || t.status === 'ertelendi')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalPaidThisMonth = transactions
        .filter(t => t.status === 'odendi' && t.due_date.startsWith(format(new Date(), 'yyyy-MM')))
        .reduce((sum, t) => sum + t.amount, 0);

    const overdueTransactions = transactions.filter(t =>
        (t.status === 'bekliyor' || t.status === 'ertelendi') &&
        isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))
    );

    const variableAmountTransactions = transactions.filter(t =>
        (t.status === 'bekliyor' || t.status === 'ertelendi') &&
        t.amount === 0
    );

    const upcomingTransactions = transactions
        .filter(t => {
            const date = parseISO(t.due_date);
            const today = new Date();
            const nextWeek = addDays(today, 7);
            return (t.status === 'bekliyor' || t.status === 'ertelendi') &&
                date >= today && date <= nextWeek;
        })
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 5); // İlk 5 yaklaşan

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Genel Bakış</h1>
                <p className="text-slate-400">Finansal durumunuzun özeti.</p>
            </div>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Bu Ay Ödenen"
                    value={`${totalPaidThisMonth.toLocaleString('tr-TR')} ₺`}
                    icon={CheckCircle2}
                    color="emerald"
                />
                <StatCard
                    label="Bekleyen Toplam"
                    value={`${totalPending.toLocaleString('tr-TR')} ₺`}
                    icon={Wallet}
                    color="amber"
                />
                <StatCard
                    label="Gecikmiş Ödemeler"
                    value={overdueTransactions.length.toString()}
                    icon={AlertOctagon}
                    color="red"
                />
                <StatCard
                    label="Tutar Bekleyen"
                    value={variableAmountTransactions.length.toString()}
                    icon={AlertCircle}
                    color="amber"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Değişken Tutarlar Uyarısı */}
                {variableAmountTransactions.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="w-6 h-6 text-amber-400" />
                            <h2 className="text-xl font-bold text-white">Tutar Bekleyenler</h2>
                        </div>
                        <div className="space-y-3">
                            {variableAmountTransactions.slice(0, 5).map(t => (
                                <div key={t.id} className="flex items-center justify-between bg-amber-500/10 p-3 rounded-xl border border-amber-500/10">
                                    <div>
                                        <p className="font-medium text-amber-200">{t.title}</p>
                                        <p className="text-xs text-amber-300/70">{format(parseISO(t.due_date), 'd MMMM yyyy', { locale: tr })}</p>
                                    </div>
                                    <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg">Tutar Girilmeli</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Gecikenler Uyarısı */}
                {overdueTransactions.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertOctagon className="w-6 h-6 text-red-400" />
                            <h2 className="text-xl font-bold text-white">Geciken Ödemeler</h2>
                        </div>
                        <div className="space-y-3">
                            {overdueTransactions.slice(0, 5).map(t => (
                                <div key={t.id} className="flex items-center justify-between bg-red-500/10 p-3 rounded-xl border border-red-500/10">
                                    <div>
                                        <p className="font-medium text-red-200">{t.title}</p>
                                        <p className="text-xs text-red-300/70">{format(parseISO(t.due_date), 'd MMMM yyyy', { locale: tr })}</p>
                                    </div>
                                    <span className="font-bold text-red-300">{t.amount.toLocaleString('tr-TR')} ₺</span>
                                </div>
                            ))}
                            {overdueTransactions.length > 5 && (
                                <p className="text-center text-xs text-red-400 mt-2">ve {overdueTransactions.length - 5} diğer geciken ödeme...</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Yaklaşanlar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 col-span-full">
                    <div className="flex items-center gap-3 mb-4">
                        <Calendar className="w-6 h-6 text-indigo-400" />
                        <h2 className="text-xl font-bold text-white">Yaklaşan Ödemeler (7 Gün)</h2>
                    </div>
                    {upcomingTransactions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {upcomingTransactions.map(t => (
                                <div key={t.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl hover:bg-slate-800 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400 font-bold text-xs flex flex-col items-center leading-none w-10">
                                            <span>{format(parseISO(t.due_date), 'd')}</span>
                                            <span className="text-[10px] uppercase">{format(parseISO(t.due_date), 'MMM', { locale: tr })}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-200">{t.title}</p>
                                            <p className="text-xs text-slate-500">{t.category}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-white">
                                        {t.amount === 0 ? 'Değişken' : `${t.amount.toLocaleString('tr-TR')} ₺`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-8">Yakın tarihli ödeme bulunmuyor.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
