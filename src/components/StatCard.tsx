import React from 'react';
import clsx from 'clsx';
import { formatCurrency } from '../lib/utils';

interface StatCardProps {
    label: string;
    value: number | string;
    icon: React.ComponentType<{ className?: string }>;
    color: 'indigo' | 'emerald' | 'amber' | 'red';
    isCount?: boolean;
}

export default function StatCard({ label, value, icon: Icon, color, isCount }: StatCardProps) {
    const colorClasses = {
        indigo: 'bg-indigo-500/10 text-indigo-400 hover:border-indigo-500/50',
        emerald: 'bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/50',
        amber: 'bg-amber-500/10 text-amber-400 hover:border-amber-500/50',
        red: 'bg-red-500/10 text-red-400 hover:border-red-500/50',
    };

    const config = colorClasses[color] || colorClasses.indigo;
    const [bgClass, , borderClass] = config.split(' ');

    return (
        <div className={clsx(
            "bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group transition-all",
            borderClass
        )}>
            <div className="flex items-center justify-between mb-4">
                <div className={clsx("p-3 rounded-xl", bgClass)}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <p className="text-slate-400 text-sm font-medium">{label}</p>
            <h3 className="text-2xl font-bold text-white mt-1">
                {isCount ? `${value} Adet` : formatCurrency(value as number)}
            </h3>
        </div>
    );
}
