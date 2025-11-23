'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { CVService } from '../../services/CVService';
import { EditorPage as EditorComponent } from '../../components/EditorPage';
import { CVData } from '../../components/OnboardingFlow';
import { Loader2 } from 'lucide-react';

function EditorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const cvId = searchParams.get('id');
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [initialData, setInitialData] = useState<CVData | null>(null);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/');
            return;
        }
        setUser(user);

        if (cvId) {
            loadCV(cvId);
        } else {
            // Initialize with empty data or redirect to onboarding
            // For now, let's initialize with empty data
            setInitialData({
                personalInfo: {
                    name: user.user_metadata?.full_name || '',
                    email: user.email || '',
                    phone: '',
                    location: '',
                    title: '',
                    summary: '',
                    linkedin: '',
                    github: ''
                },
                experiences: [],
                education: [],
                skills: []
            });
            setLoading(false);
        }
    };

    const loadCV = async (id: string) => {
        const { cv, error } = await CVService.getCV(id);
        if (error || !cv) {
            console.error('Error loading CV:', error);
            alert('Failed to load CV');
            router.push('/dashboard');
        } else {
            setInitialData(cv.data);
        }
        setLoading(false);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading || !initialData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <EditorComponent
            initialData={initialData}
            accessToken="supabase-token" // Placeholder, not used by CVService
            user={user}
            onSignOut={handleSignOut}
            onViewAccount={() => router.push('/dashboard')}
        />
    );
}

export default function EditorPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        }>
            <EditorContent />
        </Suspense>
    );
}
