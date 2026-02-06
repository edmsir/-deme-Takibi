import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Transaction } from '../hooks/useTransactions';

/**
 * Strips installment patterns like " (1/8)" from a title.
 */
export const normalizeTitle = (title: string): string => {
    if (!title || typeof title !== 'string') return '';
    return title.replace(/\s*\(\d+\/\d+\)$/, '').trim();
};

/**
 * Standard Turkish date formatter.
 */
export const formatDate = (dateStr: string, pattern: string = 'd MMMM yyyy'): string => {
    try {
        return format(parseISO(dateStr), pattern, { locale: tr });
    } catch (e) {
        return dateStr;
    }
};

/**
 * Groups transactions for Dashboard accordion view.
 */
export const groupTransactions = (transactions: Transaction[], definitions: any[]) => {
    const groups: Record<string, { title: string; category: string; transactions: Transaction[] }> = {};

    if (!Array.isArray(transactions)) return [];

    transactions.forEach((t) => {
        if (!t) return;
        const baseTitle = normalizeTitle(t.title || 'İsimsiz Ödeme');
        const key = t.definition_id || baseTitle;

        if (!groups[key]) {
            const def = Array.isArray(definitions) ? definitions.find(d => d.id === key) : null;
            groups[key] = {
                title: def?.title || baseTitle,
                category: def?.category || t.category || 'Genel',
                transactions: []
            };
        }
        groups[key].transactions.push(t);
    });

    return Object.entries(groups).sort(([, a], [, b]) =>
        (a.title || '').localeCompare(b.title || '', 'tr')
    );
};

/**
 * Calculates financial statistics in a single pass.
 */
export const calculateStats = (transactions: Transaction[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalUnpaid = 0;
    let monthlyTotal = 0;
    let monthlyPaid = 0;
    let overdueCount = 0;

    if (!Array.isArray(transactions)) {
        return { totalUnpaid: 0, monthlyTotal: 0, monthlyPaid: 0, overdueCount: 0 };
    }

    transactions.forEach(t => {
        if (!t || !t.due_date) return;

        try {
            const d = parseISO(t.due_date);
            const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            const amount = Number(t.amount) || 0;

            if (t.status === 'bekliyor') {
                totalUnpaid += amount;
                if (d < now) overdueCount++;
            }

            if (isCurrentMonth) {
                monthlyTotal += amount;
                if (t.status === 'odendi') monthlyPaid += amount;
            }
        } catch (err) {
            console.error('Stat calculation error for transaction:', t, err);
        }
    });

    return {
        totalUnpaid,
        monthlyTotal,
        monthlyPaid,
        overdueCount
    };
};

/**
 * Currency formatter for Turkish Lira.
 */
export const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
};
