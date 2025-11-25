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
    listCVs: async (userId: string): Promise<{ cvs: SavedCV[]; error: string | null }> => {
        try {
            const response = await fetch('/api/cvs', {
                headers: { 'Content-Type': 'application/json' },
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
        data: CVData
    ): Promise<{ id: string; error: string | null }> => {
        try {
            const isUpdate = !!cvId;
            const url = isUpdate ? `/api/cvs/${cvId}` : '/api/cvs';
            const method = isUpdate ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
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
    getCV: async (cvId: string): Promise<{ cv: SavedCV | null; error: string | null }> => {
        try {
            const response = await fetch(`/api/cvs/${cvId}`, {
                headers: { 'Content-Type': 'application/json' },
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
    deleteCV: async (cvId: string): Promise<{ error: string | null }> => {
        try {
            const response = await fetch(`/api/cvs/${cvId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
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

    // Sync user placeholder (no server action needed currently)
    syncUser: async (): Promise<{ error: string | null }> => {
        return { error: null };
    },
};
