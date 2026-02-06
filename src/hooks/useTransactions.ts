import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';


export interface Transaction {
    id: string;
    definition_id: string | null;
    title: string;
    amount: number;
    due_date: string;
    status: 'bekliyor' | 'odendi' | 'ertelendi' | 'iptal';
    category: string;
    is_installment: boolean;
    installment_number?: number;
    total_installments?: number;
    document_no?: string | null;
}

export function useTransactions() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('due_date', { ascending: true });

            if (error) throw error;
            setTransactions(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: Transaction['status']) => {
        try {
            const { error } = await supabase
                .from('transactions')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            await fetchTransactions(); // Refresh
        } catch (err: any) {
            console.error('Error updating status:', err);
            // Optimistic update could be added here
        }
    };

    const updateAmount = async (id: string, amount: number) => {
        try {
            const { error } = await supabase
                .from('transactions')
                .update({ amount })
                .eq('id', id);

            if (error) throw error;
            await fetchTransactions();
        } catch (err: any) {
            console.error('Error updating amount:', err);
        }
    };

    const deleteTransaction = async (id: string) => {
        try {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchTransactions();
        } catch (err: any) {
            console.error('Error deleting transaction:', err);
        }
    };

    const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
        try {
            const { error } = await supabase
                .from('transactions')
                .insert(transaction);

            if (error) throw error;
            await fetchTransactions();
        } catch (err: any) {
            console.error('Error adding transaction:', err);
        }
    };

    const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
        try {
            const { error } = await supabase
                .from('transactions')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            await fetchTransactions();
        } catch (err: any) {
            console.error('Error updating transaction:', err);
            throw err;
        }
    };

    useEffect(() => {
        if (!user) return;

        const init = async () => {
            await fetchTransactions();
            const { generateRecurringTransactions } = await import('../lib/paymentGenerator');
            await generateRecurringTransactions(user.id);
            await fetchTransactions(); // Yeni oluşanları çek
        };

        init();
    }, [user?.id]); // Sadece user değiştiğinde bir kere çalışsın

    return { transactions, loading, error, refresh: fetchTransactions, updateStatus, updateAmount, updateTransaction, deleteTransaction, addTransaction };
}
