"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HomePage } from '../components/HomePage';
import { AuthModal } from '../components/AuthModal';
import { OnboardingFlow, CVData } from '../components/OnboardingFlow';
import { EditorPage } from '../components/EditorPage';
import { AccountPage } from '../components/AccountPage';
import { LocalAuthService } from '../services/LocalAuthService';
import { projectId, publicAnonKey } from '../components/info';
import { ThemeProvider } from '../components/ThemeContext';
import { supabase } from '../lib/supabase';

type AppState = 'home' | 'onboarding' | 'editor' | 'account';

export default function Page() {
  const router = useRouter();
  const [state, setState] = useState<AppState>('home');
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [loadingCvId, setLoadingCvId] = useState<string | null>(null);


  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    // Check Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push('/dashboard');
      return;
    }

    // Fallback to local session (legacy)
    const user = await LocalAuthService.getSession();
    if (user) {
      setAccessToken('local-token');
      setUser(user);
    }
  };

  const handleGetStarted = (mode: 'signin' | 'signup' = 'signup') => {
    if (accessToken && user) {
      setState('onboarding');
    } else {
      setAuthMode(mode);
      setShowAuth(true);
    }
  };

  const handleAuthSuccess = (token: string, userData: any) => {
    setAccessToken(token);
    setUser(userData);
    setState('onboarding');
  };

  const handleOnboardingComplete = (data: CVData) => {
    setCvData(data);
    setState('editor');
  };

  const handleSignOut = async () => {
    await LocalAuthService.signOut();
    setAccessToken(null);
    setUser(null);
    setCvData(null);
    setState('home');
  };

  const handleViewAccount = () => {
    setState('account');
  };

  const handleBackToEditor = () => {
    setState('editor');
  };

  const handleCreateNewCV = () => {
    setCvData(null);
    setLoadingCvId(null);
    setState('onboarding');
  };

  const handleLoadCV = async (cvId: string) => {
    setLoadingCvId(cvId);

    try {
      const { cv, error } = await LocalAuthService.getCV(cvId);

      if (error) throw new Error(error);

      if (cv) {
        setCvData(cv.data);
        setState('editor');
      }
    } catch (err: any) {
      console.error('Load CV error:', err);
      alert('Failed to load CV: ' + (err.message || 'Unknown error'));
    } finally {
      setLoadingCvId(null);
    }
  };

  return (
    <>
      {state === 'home' && <HomePage onGetStarted={handleGetStarted} />}

      {state === 'onboarding' && (
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onBack={() => setState('home')}
        />
      )}

      {state === 'editor' && cvData && accessToken && user && (
        <EditorPage
          initialData={cvData}
          accessToken={accessToken}
          user={user}
          onSignOut={handleSignOut}
          onViewAccount={handleViewAccount}
        />
      )}

      {state === 'account' && accessToken && user && (
        <AccountPage
          accessToken={accessToken}
          user={user}
          onBack={handleBackToEditor}
          onLoadCV={handleLoadCV}
          onCreateNew={handleCreateNewCV}
        />
      )}

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authMode}
      />
    </>
  );
}
