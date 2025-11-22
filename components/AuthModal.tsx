import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { LocalAuthService } from '../services/LocalAuthService';
import { useTheme } from '../components/ThemeContext';

import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (accessToken: string, user: any) => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'signin' }: AuthModalProps) {
  const { t } = useTheme();
  if (!isOpen) return null;

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  const router = useRouter(); // Add this hook

  // ...

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Try Supabase login first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Fallback to local auth for prototype users
        const { user, error: localError } = await LocalAuthService.signIn(email, password);
        if (localError) throw new Error(error.message); // Throw Supabase error if local also fails

        if (user) {
          onSuccess('local-token', user);
          onClose();
          return;
        }
      }

      if (data.user) {
        router.push('/dashboard');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Try Supabase signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Check if email confirmation is required
        if (data.user.identities?.length === 0) {
          setError('This email is already registered. Try logging in.');
          return;
        }
        router.push('/dashboard');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F172A] rounded-2xl max-w-md w-full p-8 relative border border-slate-800 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-8 text-center text-white">
          {mode === 'signin' ? t('welcomeBack') : t('createFreeAccount')}
        </h2>

        {/* Google Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full py-3 px-4 bg-[#1E293B] hover:bg-[#334155] border border-slate-700 rounded-lg text-white font-medium flex items-center justify-center gap-3 transition-colors mb-8 group"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {t('google')}
        </button>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-[#0F172A] text-slate-500">{t('or')}</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('fullNamePlaceholder')}
                className="w-full px-4 py-3.5 bg-[#1E293B] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-500"
                required
              />
            </div>
          )}

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              className="w-full px-4 py-3.5 bg-[#1E293B] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-500"
              required
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              className="w-full px-4 py-3.5 bg-[#1E293B] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-500"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3.5 bg-[#818CF8] hover:bg-[#6366F1] text-slate-900 font-bold rounded-lg transition-colors disabled:opacity-50 uppercase tracking-wide mt-4"
          >
            {loading ? t('processing') : mode === 'signin' ? t('logIn') : t('createAccountBtn')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm">
            {mode === 'signin' ? t('noAccountQuestion') : t('hasAccountQuestion')}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
              }}
              className="text-[#818CF8] hover:text-[#A5B4FC] font-medium"
            >
              {mode === 'signin' ? t('signUpLink') : t('logInLink')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
