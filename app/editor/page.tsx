'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import { CVService } from '../../services/CVService';
import { EditorPage as EditorComponent } from '../../components/EditorPage';
import { OnboardingFlow, CVData } from '../../components/OnboardingFlow';
import { Loader2 } from 'lucide-react';

function EditorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const cvId = searchParams.get('id');
    const { user, isLoaded, isSignedIn } = useUser();
    const { signOut } = useClerk();
    const [loading, setLoading] = useState(true);
    const [initialData, setInitialData] = useState<CVData | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);

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
            // No ID means new CV - show onboarding
            setShowOnboarding(true);
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

    const handleOnboardingComplete = (data: CVData) => {
        setInitialData(data);
        setShowOnboarding(false);
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (showOnboarding) {
        return (
            <OnboardingFlow
                onComplete={handleOnboardingComplete}
                onBack={() => router.push('/dashboard')}
            />
        );
    }

    if (!initialData) return null;

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
