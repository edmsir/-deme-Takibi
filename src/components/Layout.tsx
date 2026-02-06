import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Receipt,
    Calendar as CalendarIcon,
    LogOut,
    Settings,
    Users as UsersIcon,
    Tag,
    BarChart3,
    CalendarRange,
    Repeat
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';

export default function Layout() {
    const { signOut, role } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Panel' },
        { to: '/daily-payments', icon: CalendarRange, label: 'Günlük Ödemeler' },
        { to: '/definitions', icon: Repeat, label: 'Sürekli Ödemeler' },
        { to: '/payments', icon: Receipt, label: 'Diğer Ödemeler' },
        { to: '/categories', icon: Tag, label: 'Kategoriler' },
        { to: '/calendar', icon: CalendarIcon, label: 'Takvim' },
        { to: '/reports', icon: BarChart3, label: 'Raporlar' },
        { to: '/settings', icon: Settings, label: 'Ayarlar' },
        ...(role === 'admin' ? [{ to: '/users', icon: UsersIcon, label: 'Kullanıcılar' }] : []),
    ];

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        Takip Sistemi
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">v1.0.0 Local</p>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                                    isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                )
                            }
                        >
                            <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                            <span className="font-medium text-sm">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium text-sm">Çıkış Yap</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Top Header - Mobile only usually, but good for structure */}
                {/* Content Area */}
                <main className="flex-1 overflow-auto p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
