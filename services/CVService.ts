import { CVData } from '../components/OnboardingFlow';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface SavedCV {
    id: string;
    user_id: string;
    title: string;
    template: string;
    data: CVData;
    created_at: string;
    updated_at: string;
}

async function getAuthToken(): Promise<string | null> {
    // This will be called from components that have access to Clerk's useAuth
    // For now, we'll get it from the session
    if (typeof window === 'undefined') return null;

    try {
        const response = await fetch('/api/auth/token');
        const { token } = await response.json();
        return token;
    } catch {
        return null;
    }
}

export const CVService = {
    listCVs: async (userId: string, token?: string): Promise<{ cvs: SavedCV[]; error: string | null }> => {
        try {
            if (!token) {
                throw new Error('Authentication token required');
            }

            const response = await fetch(`${API_URL}/api/cvs`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch CVs');
            }

            const { cvs } = await response.json();
            return { cvs, error: null };
        } catch (err: any) {
            console.error('List CVs error:', err);
            return { cvs: [], error: err.message };
        }
    },

    saveCV: async (userId: string, cvId: string | null, title: string, template: string, data: CVData, token?: string): Promise<{ id: string; error: string | null }> => {
        try {
            if (!token) {
                throw new Error('Authentication token required');
            }

            const isUpdate = !!cvId;
            const url = isUpdate ? `${API_URL}/api/cvs/${cvId}` : `${API_URL}/api/cvs`;
            const method = isUpdate ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, template, data }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save CV');
            }

            const { cv } = await response.json();
            return { id: cv.id, error: null };
        } catch (err: any) {
            console.error('Save CV error:', err);
            return { id: '', error: err.message };
        }
    },

    getCV: async (cvId: string, token?: string): Promise<{ cv: SavedCV | null; error: string | null }> => {
        try {
            if (!token) {
                throw new Error('Authentication token required');
            }

            const response = await fetch(`${API_URL}/api/cvs/${cvId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch CV');
            }

            const { cv } = await response.json();
            return { cv, error: null };
        } catch (err: any) {
            console.error('Get CV error:', err);
            return { cv: null, error: err.message };
        }
    },

    deleteCV: async (cvId: string, token?: string): Promise<{ error: string | null }> => {
        try {
            if (!token) {
                throw new Error('Authentication token required');
            }

            const response = await fetch(`${API_URL}/api/cvs/${cvId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete CV');
            }

            return { error: null };
        } catch (err: any) {
            console.error('Delete CV error:', err);
            return { error: err.message };
        }
    },

    // Sync user with backend (call this after login)
    syncUser: async (token: string): Promise<{ error: string | null }> => {
        try {
            const response = await fetch(`${API_URL}/api/user/sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to sync user');
            }

            return { error: null };
        } catch (err: any) {
            console.error('Sync user error:', err);
            return { error: err.message };
        }
    },
};
