"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { HomePage } from '../components/HomePage';
import { OnboardingFlow, CVData } from '../components/OnboardingFlow';
import { Loader2 } from 'lucide-react';

export default function Page() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Check if user has any CVs or needs onboarding
      // For now, we can just let them go to dashboard or stay on home
      // If they clicked "Create CV", they might want to go to onboarding
    }
  }, [isLoaded, isSignedIn]);

  const handleGetStarted = (mode: 'signin' | 'signup' = 'signup') => {
    // Clerk handles the modal via the buttons in HomePage
    // If we are here, it means the user is not signed in and clicked a button that wasn't a Clerk button
    // But we replaced those buttons.
    // However, if they are signed in, we might want to show onboarding.
    if (isSignedIn) {
      setShowOnboarding(true);
    } else {
      // Redirect to sign in page or open modal (handled by Clerk components usually)
      // But since we use mode="modal" in HomePage, this might not be needed.
      // Let's just redirect to dashboard if they are signed in.
      router.push('/dashboard');
    }
  };

  const handleOnboardingComplete = (data: CVData) => {
    // Save data to local storage or pass to editor?
    // Actually, usually we want to go to the editor with this data.
    // We can encode it in URL or save to a temporary draft.
    // For simplicity, let's just redirect to editor with a "new" flag or similar.
    // Or better, create the CV immediately.

    // Since we don't have the CVService here easily without async, 
    // let's just redirect to /editor which handles new CV creation.
    router.push('/editor');
  };

  if (!isLoaded) {
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
        onBack={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <HomePage onGetStarted={handleGetStarted} />
  );
}
