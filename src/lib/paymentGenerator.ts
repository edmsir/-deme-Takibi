import { supabase } from './supabase';
import { addMonths, setDate, addYears, startOfDay, setMonth, addDays, addWeeks, setDay } from 'date-fns';

let isGenerating = false;

export async function generateRecurringTransactions(userId: string) {
    if (isGenerating) return;
    isGenerating = true;

    try {
        const { data: definitions, error } = await supabase
            .from('payment_definitions')
            .select('*');

        if (error || !definitions) return;

        const today = startOfDay(new Date());
        const sixMonthsLater = addMonths(today, 6); // Optimize: 12 ay yerine 6 ay yeterli olabilir

        for (const def of definitions) {
            const { data: existingTransactions } = await supabase
                .from('transactions')
                .select('due_date')
                .eq('definition_id', def.id)
                .gte('due_date', today.toISOString().split('T')[0]);

            const existingDates = new Set(existingTransactions?.map(t => t.due_date) || []);

            let nextDate: Date;

            if (def.last_generated_date) {
                const lastDate = new Date(def.last_generated_date);
                switch (def.recurrence_type) {
                    case 'daily': nextDate = addDays(lastDate, 1); break;
                    case 'weekly': nextDate = addWeeks(lastDate, 1); break;
                    case 'monthly': nextDate = addMonths(lastDate, 1); break;
                    case 'yearly': nextDate = addYears(lastDate, 1); break;
                    default: nextDate = addMonths(lastDate, 1);
                }
            } else {
                nextDate = today;
                if (def.recurrence_type === 'monthly') nextDate = setDate(today, def.recurrence_day);
                if (def.recurrence_type === 'yearly') {
                    nextDate = setDate(today, def.recurrence_day);
                    if (def.recurrence_month !== null && def.recurrence_month !== undefined) {
                        nextDate = setMonth(nextDate, def.recurrence_month);
                    }
                }
                if (def.recurrence_type === 'weekly') {
                    nextDate = setDay(today, def.recurrence_day);
                }

                while (nextDate < today) {
                    switch (def.recurrence_type) {
                        case 'daily': nextDate = addDays(nextDate, 1); break;
                        case 'weekly': nextDate = addWeeks(nextDate, 1); break;
                        case 'monthly': nextDate = addMonths(nextDate, 1); break;
                        case 'yearly': nextDate = addYears(nextDate, 1); break;
                        default: nextDate = addMonths(nextDate, 1);
                    }
                }
            }

            const transactionsToInsert = [];
            let lastDateRecord = def.last_generated_date ? new Date(def.last_generated_date) : null;

            while (nextDate <= sixMonthsLater) {
                const dateStr = nextDate.toISOString().split('T')[0];

                if (!existingDates.has(dateStr)) {
                    transactionsToInsert.push({
                        user_id: userId,
                        definition_id: def.id,
                        title: def.title,
                        amount: def.amount || 0,
                        due_date: dateStr,
                        status: 'bekliyor',
                        category: def.category,
                        created_at: new Date().toISOString()
                    });
                }

                lastDateRecord = nextDate;

                switch (def.recurrence_type) {
                    case 'daily': nextDate = addDays(nextDate, 1); break;
                    case 'weekly': nextDate = addWeeks(nextDate, 1); break;
                    case 'monthly': nextDate = addMonths(nextDate, 1); break;
                    case 'yearly': nextDate = addYears(nextDate, 1); break;
                    default: nextDate = addMonths(nextDate, 1);
                }
            }

            if (transactionsToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('transactions')
                    .insert(transactionsToInsert);

                if (!insertError && lastDateRecord) {
                    await supabase
                        .from('payment_definitions')
                        .update({ last_generated_date: lastDateRecord.toISOString().split('T')[0] })
                        .eq('id', def.id);
                }
            } else if (lastDateRecord) {
                await supabase
                    .from('payment_definitions')
                    .update({ last_generated_date: lastDateRecord.toISOString().split('T')[0] })
                    .eq('id', def.id);
            }
        }
    } finally {
        isGenerating = false;
    }
}
