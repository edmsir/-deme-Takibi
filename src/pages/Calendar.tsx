import { useState, useMemo } from 'react';
import type { Transaction } from '../hooks/useTransactions';
import { useTransactions } from '../hooks/useTransactions';
import {
    ChevronLeft,
    ChevronRight,
    Info,
    AlertCircle,
    CheckCircle2,
    Clock,
    XCircle
} from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    parseISO,
    isWeekend,
    getMonth,
    getDate
} from 'date-fns';
import { tr } from 'date-fns/locale';
import clsx from 'clsx';
import Modal from '../components/Modal';

// Turkish Holidays Helper
const getTurkishHoliday = (date: Date) => {
    const month = getMonth(date) + 1;
    const day = getDate(date);

    // Fixed Holidays
    if (month === 1 && day === 1) return 'Yılbaşı';
    if (month === 4 && day === 23) return 'Ulusal Egemenlik ve Çocuk Bayramı';
    if (month === 5 && day === 1) return 'Emek ve Dayanışma Günü';
    if (month === 5 && day === 19) return 'Atatürk’ü Anma, Gençlik ve Spor Bayramı';
    if (month === 7 && day === 15) return 'Demokrasi ve Milli Birlik Günü';
    if (month === 8 && day === 30) return 'Zafer Bayramı';
    if (month === 10 && day === 29) return 'Cumhuriyet Bayramı';

    // Note: Religious holidays (Ramadan/Sacrifice) vary each year and would ideally need an API or larger map.
    // For now, we cover the main fixed national holidays.
    return null;
};

export default function CalendarView() {
    const { transactions, loading } = useTransactions();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    const days = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const rows = [];
        let day = startDate;

        while (day <= endDate) {
            rows.push(day);
            day = addDays(day, 1);
        }
        return rows;
    }, [currentMonth]);

    const getDayPayments = (day: Date) => {
        return transactions.filter(t => isSameDay(parseISO(t.due_date), day));
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const selectedDayPayments = useMemo(() => {
        return selectedDay ? getDayPayments(selectedDay) : [];
    }, [selectedDay, transactions]);

    const dailyTotal = useMemo(() => {
        return selectedDayPayments.reduce((sum, t) => sum + t.amount, 0);
    }, [selectedDayPayments]);

    const getStatusIcon = (status: Transaction['status']) => {
        switch (status) {
            case 'odendi': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            case 'ertelendi': return <Clock className="w-4 h-4 text-amber-400" />;
            case 'iptal': return <XCircle className="w-4 h-4 text-red-400" />;
            default: return <AlertCircle className="w-4 h-4 text-blue-400" />;
        }
    };

    if (loading) return <div className="p-8 text-white">Yükleniyor...</div>;

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Banka Takvimi</h2>
                    <p className="text-slate-400 text-sm">Haftasonu ve resmi tatiller işaretlenmiş aylık görünüm</p>
                </div>

                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="px-6 font-bold text-white min-w-[160px] text-center text-lg">
                        {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                    </span>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                {/* Days of week header */}
                <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/50">
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, idx) => (
                        <div key={day} className={clsx(
                            "py-4 text-center text-xs font-bold uppercase tracking-widest",
                            idx >= 5 ? "text-red-400/80" : "text-slate-500"
                        )}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 md:min-h-[800px] min-h-[500px]">
                    {days.map((day, idx) => {
                        const payments = getDayPayments(day);
                        const isSelectedMonth = isSameMonth(day, currentMonth);
                        const holiday = getTurkishHoliday(day);
                        const isToday = isSameDay(day, new Date());
                        const weekend = isWeekend(day);

                        return (
                            <div
                                key={idx}
                                onClick={() => setSelectedDay(day)}
                                className={clsx(
                                    "border-r border-b border-slate-800 p-2 transition-all cursor-pointer flex flex-col gap-1.5 relative group",
                                    !isSelectedMonth ? "bg-slate-950/40 opacity-40" : "hover:bg-slate-800/30",
                                    weekend && isSelectedMonth && "bg-red-500/[0.03]",
                                    idx % 7 === 6 && "border-r-0"
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <span className={clsx(
                                        "w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-colors",
                                        isToday ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" :
                                            (isSelectedMonth ? (weekend || holiday ? "text-red-400" : "text-slate-300") : "text-slate-600"),
                                        holiday && isSelectedMonth && "ring-1 ring-red-500/50"
                                    )}>
                                        {format(day, 'd')}
                                    </span>

                                    {holiday && isSelectedMonth && (
                                        <div className="hidden lg:block text-[9px] font-bold text-red-500 uppercase truncate max-w-[60px]" title={holiday}>
                                            {holiday}
                                        </div>
                                    )}
                                </div>

                                {weekend && isSelectedMonth && (
                                    <div className="text-[10px] font-medium text-red-500/50 uppercase tracking-tighter hidden sm:block">
                                        Banka Kapalı
                                    </div>
                                )}

                                <div className="flex-1 space-y-1 mt-1 overflow-hidden">
                                    {payments.slice(0, 4).map(p => (
                                        <div
                                            key={p.id}
                                            className={clsx(
                                                "text-[10px] px-1.5 py-0.5 rounded-md border backdrop-blur-sm truncate transition-transform group-hover:scale-[1.02]",
                                                p.status === 'odendi' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                    p.status === 'ertelendi' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                        p.status === 'iptal' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                            "bg-slate-800/80 text-white border-slate-700 font-medium"
                                            )}
                                        >
                                            {p.title}
                                        </div>
                                    ))}
                                    {payments.length > 4 && (
                                        <div className="text-[9px] text-slate-500 font-bold px-1">
                                            + {payments.length - 4} diğer
                                        </div>
                                    )}
                                </div>

                                {payments.length > 0 && isSelectedMonth && (
                                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full sm:hidden"></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Day Detail Modal */}
            <Modal
                isOpen={!!selectedDay}
                onClose={() => setSelectedDay(null)}
                title={selectedDay ? format(selectedDay, 'd MMMM yyyy, EEEE', { locale: tr }) : ''}
            >
                <div className="space-y-6">
                    {getTurkishHoliday(selectedDay || new Date()) && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                            <Info className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-bold uppercase tracking-wide">
                                RESMİ TATİL: {getTurkishHoliday(selectedDay || new Date())}
                            </p>
                        </div>
                    )}

                    {isWeekend(selectedDay || new Date()) && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-amber-400">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-bold">HAFTASONU: BANKALAR KAPALIDIR</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Ödemeler</h4>
                        {selectedDayPayments.length > 0 ? (
                            <div className="space-y-2">
                                {selectedDayPayments.map(p => (
                                    <div key={p.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-slate-800 rounded-lg">
                                                {getStatusIcon(p.status)}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">{p.title}</p>
                                                <p className="text-slate-500 text-xs">{p.category}</p>
                                            </div>
                                        </div>
                                        <p className="text-white font-black">
                                            {p.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-slate-500 italic">
                                Bu gün için kayıtlı bir ödeme bulunmuyor.
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                        <p className="text-slate-400 font-bold uppercase tracking-wider">Günlük Toplam</p>
                        <p className="text-3xl font-black text-indigo-400">
                            {dailyTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </p>
                    </div>

                    <button
                        onClick={() => setSelectedDay(null)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-xl transition-colors mt-4"
                    >
                        Kapat
                    </button>
                </div>
            </Modal>
        </div>
    );
}
