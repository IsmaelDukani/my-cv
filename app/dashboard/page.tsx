'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Trash2, Loader2, LogOut, User, FolderOpen } from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';
import { CVService, SavedCV } from '../../services/CVService';
import { useTheme } from '../../components/ThemeContext';
import { ThemeLanguageControls } from '../../components/ThemeLanguageControls';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

export default function Dashboard() {
    const router = useRouter();
    const { t } = useTheme();
    const { user, isLoaded, isSignedIn } = useUser();
    const { signOut } = useClerk();
    const [loading, setLoading] = useState(true);
    const [cvs, setCvs] = useState<SavedCV[]>([]);

    useEffect(() => {
        if (isLoaded) {
            if (!isSignedIn) {
                router.push('/');
            } else {
                fetchCVs();
            }
        }
    }, [isLoaded, isSignedIn]);

    const fetchCVs = async () => {
        if (!user) return;
        setLoading(true);
        const { cvs, error } = await CVService.listCVs(user.id);
        if (error) {
            console.error('Error fetching CVs:', error);
        } else {
            setCvs(cvs);
        }
        setLoading(false);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this CV?')) {
            await CVService.deleteCV(id);
            fetchCVs();
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('appTitle')}</span>
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <ThemeLanguageControls />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                                <User className="w-5 h-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('myAccount') || 'My Account'}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                                <FolderOpen className="w-4 h-4 mr-2" />
                                {t('dashboard') || 'Dashboard'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { /* TODO: Account modal */ }}>
                                <User className="w-4 h-4 mr-2" />
                                {t('account') || 'Account'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400">
                                <LogOut className="w-4 h-4 mr-2" />
                                {t('signOut')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('myCVs')}</h2>
                    <button
                        onClick={() => router.push('/editor')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        {t('createNewCV')}
                    </button>
                </div>

                {cvs.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">No CVs yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                            Create your first professional CV in minutes. Choose from our beautiful templates.
                        </p>
                        <button
                            onClick={() => router.push('/editor')}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium inline-flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            <Plus className="w-5 h-5" />
                            Create New CV
                        </button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Create New Card */}
                        <button
                            onClick={() => router.push('/editor')}
                            className="group flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all h-64"
                        >
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                                <Plus className="w-6 h-6 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Create New CV</span>
                        </button>

                        {/* CV Cards */}
                        {cvs.map((cv) => (
                            <div
                                key={cv.id}
                                onClick={() => router.push(`/editor?id=${cv.id}`)}
                                className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer h-64 flex flex-col"
                            >
                                <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 transition-colors">
                                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                                    <span className="text-xs font-medium px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full uppercase tracking-wider">
                                        {cv.template}
                                    </span>
                                </div>

                                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold text-slate-800 dark:text-white truncate pr-4" title={cv.title}>
                                                {cv.title || 'Untitled CV'}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                Edited {new Date(cv.updated_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(e, cv.id)}
                                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                            title="Delete CV"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
