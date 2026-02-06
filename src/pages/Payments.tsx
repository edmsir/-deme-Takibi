import React, { useState, useMemo } from 'react';
import { useTransactions, type Transaction } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { Plus, Search, Filter, ChevronDown, ChevronRight, Trash2, Edit2 } from 'lucide-react';
import { format, parseISO, addMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import clsx from 'clsx';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TransactionGroup {
  id: string;
  title: string;
  isGroup: boolean;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalInstallments?: number;
  paidInstallments?: number;
  items: Transaction[];
  category: string;
  dueDateRange?: { start: string, end: string };
  nextDueDate?: string;
  status: string;
}

export default function Payments() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const { transactions, loading, deleteTransaction, updateTransaction, refresh } = useTransactions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [submitting, setSubmitting] = useState(false);
  const [paymentType, setPaymentType] = useState<'single' | 'installment'>('single');
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Diğer',
    date: format(new Date(), 'yyyy-MM-dd'),
    installments: '1',
    document_no: ''
  });

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groupedItems = useMemo(() => {
    const normalizeTitle = (title: string) => {
      return (title || '').replace(/\s*\(\d+\/\d+\)$/, '').trim();
    };

    const manualTransactions = transactions.filter(t => !t.definition_id);
    const filtered = manualTransactions.filter(t => {
      const matchesSearch = (t.title?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (t.document_no?.toLowerCase() ?? '').includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    const groups: TransactionGroup[] = [];
    const processedIds = new Set<string>();
    filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    filtered.forEach((t: Transaction) => {
      if (processedIds.has(t.id)) return;

      if (t.is_installment && t.total_installments && t.total_installments > 1) {
        const baseTitle = normalizeTitle(t.title);
        const groupItems = filtered.filter(sib =>
          !processedIds.has(sib.id) &&
          sib.is_installment &&
          normalizeTitle(sib.title) === baseTitle &&
          sib.total_installments === t.total_installments
        );

        if (groupItems.length > 0) {
          groupItems.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
          groupItems.forEach(item => processedIds.add(item.id));

          const totalAmount = groupItems.reduce((sum, item) => sum + item.amount, 0);
          const paidItems = groupItems.filter(item => item.status === 'odendi');
          const paidAmount = paidItems.reduce((sum, item) => sum + item.amount, 0);
          const nextUnpaid = groupItems.find(item => item.status !== 'odendi');

          groups.push({
            id: `group-${t.id}`,
            title: baseTitle,
            isGroup: true,
            totalAmount,
            paidAmount,
            remainingAmount: totalAmount - paidAmount,
            totalInstallments: t.total_installments,
            paidInstallments: paidItems.length,
            items: groupItems,
            category: t.category,
            dueDateRange: {
              start: groupItems[0]?.due_date,
              end: groupItems[groupItems.length - 1]?.due_date
            },
            nextDueDate: nextUnpaid?.due_date,
            status: nextUnpaid ? nextUnpaid.status : 'tamamlandi'
          });
        }
      } else {
        processedIds.add(t.id);
        groups.push({
          id: t.id,
          title: t.title,
          isGroup: false,
          totalAmount: t.amount,
          paidAmount: t.status === 'odendi' ? t.amount : 0,
          remainingAmount: t.status === 'odendi' ? 0 : t.amount,
          items: [t],
          category: t.category,
          nextDueDate: t.due_date,
          status: t.status
        });
      }
    });

    return groups.sort((a, b) => {
      const dateA = a.nextDueDate || '9999-12-31';
      const dateB = b.nextDueDate || '9999-12-31';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  }, [transactions, searchTerm, filterStatus]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount)) throw new Error('Geçerli bir tutar girin.');

      if (paymentType === 'single') {
        const { error } = await supabase.from('transactions').insert({
          user_id: user.id,
          title: formData.title,
          amount: amount,
          due_date: formData.date,
          category: formData.category,
          status: 'bekliyor',
          document_no: formData.document_no || null,
          is_installment: false
        });
        if (error) throw error;
      } else {
        const count = parseInt(formData.installments);
        if (isNaN(count) || count < 1) throw new Error('Geçerli bir taksit sayısı girin.');
        const amountPerInstallment = Number((amount / count).toFixed(2));
        const startDate = parseISO(formData.date);
        const records = [];
        for (let i = 0; i < count; i++) {
          records.push({
            user_id: user.id,
            title: formData.title,
            amount: amountPerInstallment,
            due_date: format(addMonths(startDate, i), 'yyyy-MM-dd'),
            category: formData.category,
            status: 'bekliyor',
            is_installment: true,
            installment_number: i + 1,
            total_installments: count,
            document_no: formData.document_no || null
          });
        }
        const { error } = await supabase.from('transactions').insert(records);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setFormData({ title: '', amount: '', category: 'Diğer', date: format(new Date(), 'yyyy-MM-dd'), installments: '1', document_no: '' });
      refresh();
    } catch (error: any) {
      alert('Hata: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    setSubmitting(true);
    try {
      await updateTransaction(editingTransaction.id, {
        title: editingTransaction.title,
        amount: editingTransaction.amount,
        category: editingTransaction.category,
        due_date: editingTransaction.due_date,
        document_no: editingTransaction.document_no
      });
      setIsEditModalOpen(false);
      setEditingTransaction(null);
    } catch (error: any) {
      alert('Güncelleme hatası: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) newExpanded.delete(groupId);
    else newExpanded.add(groupId);
    setExpandedGroups(newExpanded);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Bu ödemeyi silmek istediğinize emin misiniz?')) {
      await deleteTransaction(id);
    }
  };

  const handleEditClick = (t: Transaction) => {
    setEditingTransaction({ ...t });
    setIsEditModalOpen(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Diğer Ödemeler</h1>
          <p className="text-slate-400">Manuel eklenen tek seferlik veya taksitli ödemeler.</p>
        </div>
        <button
          onClick={() => { setIsModalOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" /> Yeni Ödeme
        </button>
      </div>

      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text" placeholder="Ödeme ara..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-500" />
          <select
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none"
          >
            <option value="all">Tümü</option>
            <option value="bekliyor">Bekleyenler</option>
            <option value="odendi">Ödenenler</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">Başlık</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Sonraki Ödeme</th>
                <th className="px-6 py-4">Tutar / Durum</th>
                <th className="px-6 py-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {groupedItems.length > 0 ? groupedItems.map(group => (
                <React.Fragment key={group.id}>
                  <tr
                    className={clsx("transition-colors cursor-pointer", group.isGroup ? "hover:bg-slate-800/50" : "hover:bg-slate-800/30")}
                    onClick={() => group.isGroup && toggleGroup(group.id)}
                  >
                    <td className="px-6 py-4 text-slate-500">
                      {group.isGroup ? (expandedGroups.has(group.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />) : <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mx-auto" />}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-white flex items-center gap-2">
                          {group.title}
                          {group.isGroup && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full">{group.paidInstallments}/{group.totalInstallments}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">{group.category}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {group.nextDueDate ? format(parseISO(group.nextDueDate), 'd MMMM yyyy', { locale: tr }) : 'Tamamlandı'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-white font-bold">{group.totalAmount.toLocaleString('tr-TR')} ₺</span>
                        {group.isGroup && <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${(group.paidInstallments! / group.totalInstallments!) * 100}%` }} /></div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!group.isGroup ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleEditClick(group.items[0]); }} className="p-2 hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(group.id); }} className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 px-2">
                          <button onClick={(e) => { e.stopPropagation(); if (confirm('Bu grubun (tüm taksitlerin) silinmesini istiyor musunuz?')) { group.items.forEach(it => deleteTransaction(it.id)); } }} className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg">
                            Grup Sil
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {group.isGroup && expandedGroups.has(group.id) && group.items.map((item, idx) => (
                    <tr key={item.id} className="bg-slate-950/50 border-t border-slate-800/30">
                      <td className="px-6 py-3"></td>
                      <td className="px-6 py-3 pl-12 text-xs text-slate-400">{idx + 1}. Taksit</td>
                      <td className="px-6 py-3"></td>
                      <td className="px-6 py-3 text-xs text-slate-400">{format(parseISO(item.due_date), 'd MMMM yyyy', { locale: tr })}</td>
                      <td className="px-6 py-3 text-xs text-white uppercase font-medium">{item.amount.toLocaleString('tr-TR')} ₺ <span className={clsx("ml-2 px-1.5 py-0.5 rounded text-[10px]", item.status === 'odendi' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>{item.status}</span></td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditClick(item)} className="p-1.5 hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteClick(item.id)} className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              )) : (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Ödeme bulunamadı.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni Manuel Ödeme">
        <form onSubmit={handleAddPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Başlık</label>
            <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Tutar</label>
              <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Kategori</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-white">
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Tarih</label>
              <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Tür</label>
              <select value={paymentType} onChange={e => setPaymentType(e.target.value as any)} className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-white">
                <option value="single">Tek Seferlik</option>
                <option value="installment">Taksitli</option>
              </select>
            </div>
          </div>
          {paymentType === 'installment' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Taksit Sayısı</label>
              <input type="number" min="1" value={formData.installments} onChange={e => setFormData({ ...formData, installments: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-white" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Belge No (Opsiyonel)</label>
            <input type="text" value={formData.document_no} onChange={e => setFormData({ ...formData, document_no: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-white" />
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-indigo-600 py-2.5 rounded-lg text-white font-medium hover:bg-indigo-700 transition-colors">
            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      </Modal>

      {/* DÜZENLEME MODALI */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingTransaction(null); }} title="Ödemeyi Düzenle">
        {editingTransaction && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Başlık</label>
              <input type="text" required value={editingTransaction.title} onChange={e => setEditingTransaction({ ...editingTransaction, title: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-white font-medium" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Tutar</label>
                <input type="number" step="0.01" required value={editingTransaction.amount} onChange={e => setEditingTransaction({ ...editingTransaction, amount: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Kategori</label>
                <select value={editingTransaction.category} onChange={e => setEditingTransaction({ ...editingTransaction, category: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-white">
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Tarih</label>
                <input type="date" value={editingTransaction.due_date} onChange={e => setEditingTransaction({ ...editingTransaction, due_date: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Belge No</label>
                <input type="text" value={editingTransaction.document_no || ''} onChange={e => setEditingTransaction({ ...editingTransaction, document_no: e.target.value })} className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-white" />
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" disabled={submitting} className="w-full bg-indigo-600 py-3 rounded-xl text-white font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                {submitting ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
