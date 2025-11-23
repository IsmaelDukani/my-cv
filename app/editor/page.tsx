'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import { CVService } from '../../services/CVService';
import { EditorPage as EditorComponent } from '../../components/EditorPage';
import { CVData } from '../../components/OnboardingFlow';
import { Loader2 } from 'lucide-react';

function EditorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const cvId = searchParams.get('id');
    const { user, isLoaded, isSignedIn } = useUser();
    const { signOut } = useClerk();
    const [loading, setLoading] = useState(true);
    const [initialData, setInitialData] = useState<CVData | null>(null);

    useEffect(() => {
        if (isLoaded) {
            if (!isSignedIn) {
                router.push('/');
            } else {
                checkUser();
            }
        }
    }, [isLoaded, isSignedIn]);

    const checkUser = async () => {
        if (!user) return;

        if (cvId) {
            loadCV(cvId, user.id);
        } else {
            // Initialize with empty data
            setInitialData({
                personalInfo: {
                    name: user.fullName || '',
                    email: user.primaryEmailAddress?.emailAddress || '',
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

    const loadCV = async (id: string, userId: string) => {
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
        await signOut();
        router.push('/');
    };

    if (loading || !initialData || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <EditorComponent
            initialData={initialData}
            accessToken="clerk-token" // Placeholder
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
