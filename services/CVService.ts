import { CVData } from '../components/OnboardingFlow';

export interface SavedCV {
    id: string;
    user_id: string;
    title: string;
    template: string;
    data: CVData;
    created_at: string;
    updated_at: string;
}

export const CVService = {
    // List CVs for the current user
    listCVs: async (userId: string, token?: string | null): Promise<{ cvs: SavedCV[]; error: string | null }> => {
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/cvs', {
                headers,
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to fetch CVs');
            }
            const { cvs } = await response.json();
            return { cvs, error: null };
        } catch (err: any) {
            console.error('List CVs error:', err);
            return { cvs: [], error: err.message };
        }
    },

    // Create or update a CV
    saveCV: async (
        userId: string,
        cvId: string | null,
        title: string,
        template: string,
        data: CVData,
        token?: string | null
    ): Promise<{ id: string; error: string | null }> => {
        try {
            const isUpdate = !!cvId;
            const url = isUpdate ? `/api/cvs/${cvId}` : '/api/cvs';
            const method = isUpdate ? 'PUT' : 'POST';

            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify({ title, template, data }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to save CV');
            }
            const { cv } = await response.json();
            return { id: cv.id, error: null };
        } catch (err: any) {
            console.error('Save CV error:', err);
            return { id: '', error: err.message };
        }
    },

    // Get a specific CV
    getCV: async (cvId: string, token?: string | null): Promise<{ cv: SavedCV | null; error: string | null }> => {
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`/api/cvs/${cvId}`, {
                headers,
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to fetch CV');
            }
            const { cv } = await response.json();
            return { cv, error: null };
        } catch (err: any) {
            console.error('Get CV error:', err);
            return { cv: null, error: err.message };
        }
    },

    // Delete a CV
    deleteCV: async (cvId: string, token?: string | null): Promise<{ error: string | null }> => {
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`/api/cvs/${cvId}`, {
                method: 'DELETE',
                headers,
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to delete CV');
            }
            return { error: null };
        } catch (err: any) {
            console.error('Delete CV error:', err);
            return { error: err.message };
        }
    },

    // Sync user with backend to ensure they exist in the database
    syncUser: async (token?: string | null): Promise<{ error: string | null }> => {
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/user-sync', {
                method: 'POST',
                headers,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to sync user');
            }
            return { error: null };
        } catch (err: any) {
            console.error('Sync user error:', err);
            return { error: err.message };
        }
    },
};
