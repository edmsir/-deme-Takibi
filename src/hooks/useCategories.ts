import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Category {
    id: string;
    name: string;
    created_at: string;
}

export function useCategories() {
    const { user } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCategories = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const addCategory = async (name: string) => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('categories')
                .insert([{ name, user_id: user.id }])
                .select()
                .single();

            if (error) throw error;
            await fetchCategories();
            return data;
        } catch (err: any) {
            console.error('Error adding category:', err);
            throw err;
        }
    };

    const deleteCategory = async (id: string) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchCategories();
        } catch (err: any) {
            console.error('Error deleting category:', err);
            throw err;
        }
    };

    const updateCategory = async (id: string, name: string) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('categories')
                .update({ name })
                .eq('id', id);

            if (error) throw error;
            await fetchCategories();
        } catch (err: any) {
            console.error('Error updating category:', err);
            throw err;
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [user]);

    return {
        categories,
        loading,
        addCategory,
        deleteCategory,
        updateCategory,
        refresh: fetchCategories
    };
}
