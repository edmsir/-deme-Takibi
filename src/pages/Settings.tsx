import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
    User,
    Lock,
    Trash2,
    Shield,
    Bell,
    Moon,
    Loader2,
    Check
} from 'lucide-react';

export default function Settings() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Şifreler uyuşmuyor.');
            return;
        }
        if (password.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setSuccess(true);
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!confirm('360 günden eski tüm ödeme kayıtlarını silmek istediğinize emin misiniz? (Ödeme tanımları silinmez)')) return;

        setLoading(true);
        try {
            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - 360);
            const formattedLimit = dateLimit.toISOString().split('T')[0];

            const { error } = await supabase
                .from('transactions')
                .delete()
                .lt('due_date', formattedLimit);

            if (error) throw error;
            alert('Eski kayıtlar başarıyla temizlendi.');
        } catch (err: any) {
            alert('Hata: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">Ayarlar</h2>
                <p className="text-slate-400 text-sm">Hesap ve sistem tercihlerinizi yönetin</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Summary */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                            <User className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h3 className="text-white font-bold truncate px-2">{user?.email}</h3>
                        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-medium">Aktif Kullanıcı</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 divide-y divide-slate-800">
                        <div className="flex items-center gap-3 py-3 px-2 text-slate-400 hover:text-white cursor-pointer transition-colors group">
                            <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">Bildirimler</span>
                        </div>
                        <div className="flex items-center gap-3 py-3 px-2 text-slate-400 hover:text-white cursor-pointer transition-colors group">
                            <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">Güvenlik</span>
                        </div>
                        <div className="flex items-center gap-3 py-3 px-2 text-indigo-400 bg-indigo-500/5 rounded-lg my-1">
                            <Moon className="w-5 h-5" />
                            <span className="text-sm font-medium">Koyu Tema</span>
                        </div>
                    </div>
                </div>

                {/* Main Settings */}
                <div className="md:col-span-2 space-y-8">
                    {/* Password Section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <Lock className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Şifre Değiştir</h3>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Yeni Şifre</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Şifre Tekrar</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-sm">{error}</p>}
                            {success && (
                                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                                    <Check className="w-4 h-4" /> Şifreniz başarıyla güncellendi.
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Güncelle'}
                            </button>
                        </form>
                    </div>

                    {/* Data Management Section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <Trash2 className="w-5 h-5 text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Veri Yönetimi</h3>
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800">
                            <h4 className="text-white text-sm font-bold mb-1">Eski Kayıtları Temizle</h4>
                            <p className="text-slate-400 text-xs mb-4">
                                360 günden daha eski ödeme kayıtlarını (işlem geçmişini) veritabanından kalıcı olarak siler. Bu işlem geri alınamaz.
                            </p>
                            <button
                                onClick={handleClearHistory}
                                className="text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg text-sm font-medium border border-red-500/20 transition-all hover:border-red-500/50"
                            >
                                360+ Günlük Kayıtları Sil
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
