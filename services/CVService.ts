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
    listCVs: async (userId: string): Promise<{ cvs: SavedCV[]; error: string | null }> => {
        try {
            if (!userId) throw new Error('User not authenticated');

            const localCVs = JSON.parse(localStorage.getItem('cv_maker_local_cvs') || '[]');
            const userCVs = localCVs
                .filter((cv: SavedCV) => cv.user_id === userId)
                .sort((a: SavedCV, b: SavedCV) =>
                    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                );
            return { cvs: userCVs, error: null };
        } catch (err: any) {
            return { cvs: [], error: err.message };
        }
    },

    saveCV: async (userId: string, cvId: string | null, title: string, template: string, data: CVData): Promise<{ id: string; error: string | null }> => {
        try {
            if (!userId) throw new Error('User not authenticated');

            const localCVs = JSON.parse(localStorage.getItem('cv_maker_local_cvs') || '[]');
            const newId = cvId || crypto.randomUUID();
            const now = new Date().toISOString();

            const newCV = {
                id: newId,
                user_id: userId,
                title,
                template,
                data,
                created_at: cvId ? (localCVs.find((c: any) => c.id === cvId)?.created_at || now) : now,
                updated_at: now
            };

            const existingIndex = localCVs.findIndex((c: any) => c.id === newId);
            if (existingIndex >= 0) {
                localCVs[existingIndex] = newCV;
            } else {
                localCVs.push(newCV);
            }

            localStorage.setItem('cv_maker_local_cvs', JSON.stringify(localCVs));
            return { id: newId, error: null };
        } catch (err: any) {
            return { id: '', error: err.message };
        }
    },

    getCV: async (cvId: string): Promise<{ cv: SavedCV | null; error: string | null }> => {
        try {
            const localCVs = JSON.parse(localStorage.getItem('cv_maker_local_cvs') || '[]');
            const cv = localCVs.find((c: any) => c.id === cvId);
            if (cv) {
                return { cv: cv as SavedCV, error: null };
            }
            return { cv: null, error: 'CV not found' };
        } catch (err: any) {
            return { cv: null, error: err.message };
        }
    },

    deleteCV: async (cvId: string): Promise<{ error: string | null }> => {
        try {
            const localCVs = JSON.parse(localStorage.getItem('cv_maker_local_cvs') || '[]');
            const newCVs = localCVs.filter((c: any) => c.id !== cvId);
            localStorage.setItem('cv_maker_local_cvs', JSON.stringify(newCVs));
            return { error: null };
        } catch (err: any) {
            return { error: err.message };
        }
    }
};
