import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    UserPlus,
    Trash2,
    Shield,
    Mail,
    Loader2,
    AlertCircle,
    Users as UsersIcon
} from 'lucide-react';
import Modal from '../components/Modal';

interface Profile {
    id: string;
    email: string;
    role: 'admin' | 'user';
    created_at: string;
}

export default function Users() {
    const { role } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'user' as 'admin' | 'user'
    });

    const fetchProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data || []);
        } catch (err: any) {
            console.error('Error fetching profiles:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (role === 'admin') {
            fetchProfiles();
        }
    }, [role]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const internalEmail = formData.username.includes('@')
                ? formData.username
                : `${formData.username}@takip.com`;

            // Call Netlify Function instead of direct Supabase Admin
            const response = await fetch('/.netlify/functions/manage-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'createUser',
                    data: {
                        email: internalEmail,
                        password: formData.password,
                        role: formData.role
                    }
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Kullanıcı oluşturulamadı.');

            alert('Kullanıcı başarıyla oluşturuldu.');
            setFormData({ username: '', password: '', role: 'user' });
            setIsModalOpen(false);
            fetchProfiles();
        } catch (err: any) {
            setError(err.message === 'User already exists' ? 'Bu kullanıcı adı zaten alınmış.' : err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (id: string, email: string) => {
        const username = email.split('@')[0];
        if (username === 'admin.edm') {
            alert('Ana yönetici silinemez.');
            return;
        }

        if (!confirm(`${username} kullanıcısını silmek istediğinize emin misiniz?`)) return;

        try {
            // Call Netlify Function instead of direct Supabase Admin
            const response = await fetch('/.netlify/functions/manage-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteUser',
                    data: { id }
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Kullanıcı silinemez.');

            setProfiles(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            alert('Hata: ' + err.message);
        }
    };

    if (role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <Shield className="w-16 h-16 text-red-500/20 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Yetkisiz Erişim</h2>
                <p className="text-slate-400">Bu sayfayı görüntülemek için yönetici yetkiniz olmalıdır.</p>
            </div>
        );
    }

    if (loading) return <div className="text-white">Yükleniyor...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                        <UsersIcon className="w-8 h-8 text-indigo-500" />
                        Kullanıcı Yönetimi
                    </h2>
                    <p className="text-slate-400 text-sm">Sisteme erişimi olan kullanıcıları yönetin</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    Yeni Kullanıcı
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-950/50 border-b border-slate-800">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kullanıcı Adı</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Yetki</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kayıt Tarihi</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {profiles.map(p => (
                            <tr key={p.id} className="hover:bg-slate-800/20 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                            <Mail className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <span className="text-white font-medium">{p.email.split('@')[0]}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${p.role === 'admin'
                                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                                        }`}>
                                        {p.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {new Date(p.created_at).toLocaleDateString('tr-TR')}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDeleteUser(p.id, p.email)}
                                        disabled={p.email.split('@')[0] === 'admin.edm'}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni Kullanıcı Tanımla">
                <form onSubmit={handleAddUser} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Kullanıcı Adı</label>
                        <input
                            type="text" required value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="örn: mehmet.can"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Şifre</label>
                        <input
                            type="password" required value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Yetki Seviyesi</label>
                        <select
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="user">Standart Kullanıcı</option>
                            <option value="admin">Yönetici (Admin)</option>
                        </select>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm flex items-center gap-2 mb-4">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit" disabled={submitting}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
                    >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kullanıcıyı Kaydet'}
                    </button>
                </form>
            </Modal>
        </div>
    );
}
