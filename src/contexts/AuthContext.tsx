import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: 'admin' | 'user' | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    role: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<'admin' | 'user' | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRole = async (userId: string) => {
        try {
            // Profil çekme işlemini başlat
            const rolePromise = supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            // Timeout süresini 2 saniyeye çekiyoruz (kullanıcıyı çok bekletmemek için)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 2000)
            );

            const result: any = await Promise.race([rolePromise, timeoutPromise]);

            if (result.error) {
                // PGRST116: Profil bulunamadı hatası, normal bir durumdur.
                if (result.error.code !== 'PGRST116') {
                    console.warn('Profil bilgisi alınamadı:', result.error.message);
                }
                return 'user';
            }
            return result.data?.role || 'user';
        } catch (err) {
            // Hata veya timeout durumunda log bas ama akışı bozma
            console.warn('Rol belirleme sırasında gecikme veya hata oluştu, "user" olarak devam ediliyor.');
            return 'user';
        }
    };

    useEffect(() => {
        let mounted = true;

        // onAuthStateChange zaten ilk açılışta mevcut session ile tetiklenir.
        // initializeAuth'a gerek yoktur ve çift tetiklenmeye neden olur.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                const r = await fetchRole(session.user.id);
                if (mounted) {
                    setRole(r as any);
                    setLoading(false);
                }
            } else {
                if (mounted) {
                    setRole(null);
                    setLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, role, loading, signOut }}>
            {loading ? (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-indigo-500 font-medium">Oturum açılıyor...</p>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
