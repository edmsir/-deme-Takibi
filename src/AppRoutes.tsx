import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Definitions from './pages/Definitions';
import Payments from './pages/Payments';
import CalendarView from './pages/Calendar';
import Categories from './pages/Categories';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Users from './pages/Users';
import DailyPayments from './pages/DailyPayments';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-500">Yükleniyor...</div>;
    if (!user) return <Navigate to="/login" replace />;

    return <>{children}</>;
};

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            import DailyPayments from './pages/DailyPayments';
            // ...
            <Route path="/" element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            }>
                <Route index element={<Dashboard />} />
                <Route path="daily-payments" element={<DailyPayments />} />
                <Route path="payments" element={<Payments />} />
                <Route path="definitions" element={<Definitions />} />
                <Route path="categories" element={<Categories />} />
                <Route path="calendar" element={<CalendarView />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
                <Route path="users" element={<Users />} />
            </Route>
        </Routes>
    );
}
