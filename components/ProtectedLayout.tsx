import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../store';
import { Layout as MainLayout } from './Layout';

export const ProtectedLayout = () => {
    const { currentUser, isLoading } = useApp();

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading...</p>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // Wrap the Outlet with the Main Layout structure (Sidebar, Header, etc.)
    return <MainLayout />;
};
