import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, Tag } from 'lucide-react';
import clsx from 'clsx';

export default function Categories() {
    const { categories, loading, addCategory, deleteCategory, updateCategory } = useCategories();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = async () => {
        if (!newCategoryName.trim()) return;

        try {
            setIsAdding(true);
            await addCategory(newCategoryName.trim());
            setNewCategoryName('');
        } catch (err: any) {
            alert('Kategori eklenirken hata: ' + err.message);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`"${name}" kategorisini silmek istediğinize emin misiniz?`)) return;

        try {
            await deleteCategory(id);
        } catch (err: any) {
            alert('Kategori silinirken hata: ' + err.message);
        }
    };

    const startEditing = (id: string, name: string) => {
        setEditingId(id);
        setEditingName(name);
    };

    const handleUpdate = async () => {
        if (!editingName.trim() || !editingId) return;

        try {
            await updateCategory(editingId, editingName.trim());
            setEditingId(null);
            setEditingName('');
        } catch (err: any) {
            alert('Kategori güncellenirken hata: ' + err.message);
        }
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingName('');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Kategoriler</h1>
                <p className="text-slate-400">Ödeme kategorilerinizi buradan yönetin.</p>
            </div>

            {/* Yeni Kategori Ekleme */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-indigo-400" />
                    Yeni Kategori Ekle
                </h2>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder="Kategori adı..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={isAdding}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={isAdding || !newCategoryName.trim()}
                        className={clsx(
                            "px-6 py-2 rounded-lg font-medium transition-colors",
                            isAdding || !newCategoryName.trim()
                                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                        )}
                    >
                        {isAdding ? 'Ekleniyor...' : 'Ekle'}
                    </button>
                </div>
            </div>

            {/* Kategori Listesi */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-emerald-400" />
                    Mevcut Kategoriler ({categories.length})
                </h2>

                {categories.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        Henüz kategori eklenmemiş. Yukarıdan yeni kategori ekleyebilirsiniz.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map((category) => (
                            <div
                                key={category.id}
                                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
                            >
                                {editingId === category.id ? (
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleUpdate()}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleUpdate}
                                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700 transition-colors"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Kaydet
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-slate-300 px-3 py-2 rounded hover:bg-slate-600 transition-colors"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                İptal
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <span className="text-white font-medium">{category.name}</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => startEditing(category.id, category.name)}
                                                className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                                                title="Düzenle"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category.id, category.name)}
                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                title="Sil"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
