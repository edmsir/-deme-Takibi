import React, { useMemo } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { format, parseISO, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Wallet, TrendingUp, CreditCard } from 'lucide-react';
import clsx from 'clsx';

export default function Reports() {
    const { transactions, loading } = useTransactions();
    const { categories } = useCategories();

    const [dateRange, setDateRange] = React.useState<{ start: string; end: string }>({
        start: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });
    const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
    const [searchTerm, setSearchTerm] = React.useState('');

    // Filtrelenmiş ve Sıralanmış Veriler
    const filteredTransactions = useMemo(() => {
        if (!transactions.length) return [];

        return transactions.filter(t => {
            // Tarih Filtresi
            const tDate = t.due_date;
            const start = dateRange.start;
            const end = dateRange.end;

            // Tarih karşılaştırması (String formatı yyyy-MM-dd olduğu için karşılaştırma güvenli)
            const isDateInRange = tDate >= start && tDate <= end;

            // Kategori Filtresi
            const isCategoryMatch = selectedCategory === 'all' || t.category === selectedCategory;

            // Arama Filtresi (Başlık veya Belge No)
            const searchLower = searchTerm.toLowerCase();
            const isSearchMatch =
                t.title.toLowerCase().includes(searchLower) ||
                (t.document_no && t.document_no.toLowerCase().includes(searchLower));

            return isDateInRange && isCategoryMatch && isSearchMatch;
        });
    }, [transactions, dateRange, selectedCategory, searchTerm]);

    // İstatistikler (Filtrelenmiş veriye göre)
    const stats = useMemo(() => {
        // Grafikler filtrelenmiş veriyi kullansın, ancak boşsa (filtre sonucu 0 ise) grafikler boş döner.
        // Eğer hiç işlem yoksa (başlangıçta) null dön.
        if (transactions.length === 0 && !loading) return null;

        // Raporlama verisi 'filteredTransactions' üzerinden hesaplanacak
        const dataToUse = filteredTransactions;

        const totalSpent = dataToUse
            .filter(t => t.status === 'odendi')
            .reduce((sum, t) => sum + t.amount, 0);

        const pendingAmount = dataToUse
            .filter(t => t.status === 'bekliyor' || t.status === 'ertelendi')
            .reduce((sum, t) => sum + t.amount, 0);

        const monthlyAverage = totalSpent / (new Set(dataToUse.map(t => t.due_date.substring(0, 7))).size || 1);

        // Grafik: Aylık Trend (Sadece seçili aralık mı, yoksa hep son 6 ay mı? 
        // Kullanıcı filtrelemesi burada grafiği etkilesin istiyoruz.
        // Ancak "Son 6 Ay" grafiği genelde sabit periyodu gösterir. 
        // Kullanıcı "Geçen Yıl" seçerse grafik ona uymalı. 
        // Şimdilik grafiği dinamik yapalım: Seçili aralıktaki ayları gösterelim.)

        // Dinamik Grafik Verisi Hazırlama
        const monthMap = new Map<string, { name: string, spent: number, pending: number }>();

        dataToUse.forEach(t => {
            const dateKey = t.due_date.substring(0, 7); // yyyy-MM
            if (!monthMap.has(dateKey)) {
                monthMap.set(dateKey, {
                    name: format(parseISO(t.due_date), 'MMMM yyyy', { locale: tr }),
                    spent: 0,
                    pending: 0
                });
            }
            const record = monthMap.get(dateKey)!;
            if (t.status === 'odendi') {
                record.spent += t.amount;
            } else if (t.status !== 'iptal') {
                record.pending += t.amount;
            }
        });

        // Map'i array'e çevirip tarihe göre sırala
        const chartData = Array.from(monthMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([, val]) => ({
                name: val.name,
                Ödenen: val.spent,
                Bekleyen: val.pending
            }));

        // Kategori dağılımı (Filtrelenmiş veri üzerinden)
        // Eğer kategori filtresi seçiliyse sadece o kategori görünür (Pie chart tek dilim olur), mantıklı.
        const categoryMap = new Map<string, number>();
        dataToUse.forEach(t => {
            if (t.status !== 'iptal') {
                const cat = t.category || 'Diğer';
                categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.amount);
            }
        });

        const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
            name,
            value
        }));

        // Renk paleti
        const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

        return {
            totalSpent,
            pendingAmount,
            monthlyAverage,
            chartData, // last6Months yerine dinamik chartData
            categoryData,
            COLORS
        };
    }, [filteredTransactions, transactions.length, loading]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Raporlar & Analiz</h1>
                <p className="text-slate-400">Harcamalarınızın detaylı analizi ve grafikleri.</p>
            </div>

            {/* Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <Wallet className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Toplam Ödenen</p>
                            <h3 className="text-2xl font-bold text-white">{stats.totalSpent.toLocaleString('tr-TR')} ₺</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl">
                            <TrendingUp className="w-8 h-8 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Bekleyen Ödemeler</p>
                            <h3 className="text-2xl font-bold text-white">{stats.pendingAmount.toLocaleString('tr-TR')} ₺</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-xl">
                            <CreditCard className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Aylık Ortalama</p>
                            <h3 className="text-2xl font-bold text-white">{Math.round(stats.monthlyAverage).toLocaleString('tr-TR')} ₺</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtreler */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">Arama</label>
                    <input
                        type="text"
                        placeholder="Başlık veya Belge No Ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">Kategori</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full md:w-48 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500 transition-colors"
                    >
                        <option value="all">Tüm Kategoriler</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-2">
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Başlangıç</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Bitiş</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Aylık Harcama Grafiği */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <h2 className="text-xl font-bold text-white mb-6">Aylık Harcama Trendi</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Legend />
                                <Bar dataKey="Ödenen" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="Bekleyen" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Kategori Dağılımı Grafiği */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <h2 className="text-xl font-bold text-white mb-6">Kategori Bazlı Harcama Dağılımı</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: any) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {stats.categoryData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={stats.COLORS[index % stats.COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    formatter={(value: any) => [`${Number(value).toLocaleString('tr-TR')} ₺`]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* İşlem Listesi */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mt-8">
                    <div className="p-6 border-b border-slate-800">
                        <h2 className="text-xl font-bold text-white">İşlem Detayları</h2>
                        <p className="text-slate-400 text-sm">Filtrelenen kriterlere uyan toplam {filteredTransactions.length} kayıt bulundu.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Tarih</th>
                                    <th className="px-6 py-4">Başlık</th>
                                    <th className="px-6 py-4">Kategori</th>
                                    <th className="px-6 py-4">Belge No</th>
                                    <th className="px-6 py-4">Tutar</th>
                                    <th className="px-6 py-4">Durum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                                            {format(parseISO(t.due_date), 'd MMMM yyyy', { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-white">
                                            {t.title}
                                            {t.is_installment && <span className="text-slate-500 text-xs ml-2">({t.installment_number}/{t.total_installments})</span>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-medium">
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-sm font-mono">
                                            {t.document_no || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-white font-bold">
                                            {t.amount.toLocaleString('tr-TR')} ₺
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "px-2.5 py-1 rounded-full text-xs font-medium border",
                                                t.status === 'odendi' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                                t.status === 'bekliyor' && "bg-slate-800 text-slate-400 border-slate-700",
                                                t.status === 'ertelendi' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                                                t.status === 'iptal' && "bg-red-500/10 text-red-400 border-red-500/20"
                                            )}>
                                                {t.status === 'odendi' ? 'Ödendi' :
                                                    t.status === 'bekliyor' ? 'Bekliyor' :
                                                        t.status === 'ertelendi' ? 'Ertelendi' : 'İptal'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            Kriterlere uygun kayıt bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
