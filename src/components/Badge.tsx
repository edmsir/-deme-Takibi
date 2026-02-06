import React from 'react';
import clsx from 'clsx';
import type { Transaction } from '../hooks/useTransactions';

interface BadgeProps {
    status: Transaction['status'];
    size?: 'sm' | 'md';
}

const statusStyles = {
    odendi: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    ertelendi: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    iptal: 'bg-red-500/10 text-red-400 border-red-500/20',
    bekliyor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
};

const statusLabels = {
    odendi: 'Ödendi',
    ertelendi: 'Ertelendi',
    iptal: 'İptal',
    bekliyor: 'Bekliyor',
};

export default function Badge({ status, size = 'sm' }: BadgeProps) {
    return (
        <span className={clsx(
            "rounded-md border font-bold uppercase tracking-wider",
            statusStyles[status],
            size === 'sm' ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2.5 py-1"
        )}>
            {statusLabels[status]}
        </span>
    );
}
