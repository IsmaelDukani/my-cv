import { supabase } from '../lib/supabase';
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

            const { data, error } = await supabase
                .from('cvs')
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            return { cvs: data as SavedCV[], error: null };
        } catch (err: any) {
            console.warn('Supabase list failed, falling back to local storage:', err);
            try {
                const localCVs = JSON.parse(localStorage.getItem('cv_maker_local_cvs') || '[]');
                const userCVs = localCVs.filter((cv: SavedCV) => cv.user_id === userId);
                return { cvs: userCVs, error: null };
            } catch (localErr) {
                return { cvs: [], error: err.message };
            }
        }
    },

    saveCV: async (userId: string, cvId: string | null, title: string, template: string, data: CVData): Promise<{ id: string; error: string | null }> => {
        try {
            if (!userId) throw new Error('User not authenticated');

            const cvData = {
                user_id: userId,
                title,
                template,
                data,
                updated_at: new Date().toISOString(),
            };

            let result;
            if (cvId) {
                result = await supabase
                    .from('cvs')
                    .update(cvData)
                    .eq('id', cvId)
                    .select()
                    .single();
            } else {
                result = await supabase
                    .from('cvs')
                    .insert({ ...cvData, created_at: new Date().toISOString() })
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            return { id: result.data.id, error: null };
        } catch (err: any) {
            console.warn('Supabase save failed, falling back to local storage:', err);
            try {
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
            } catch (localErr: any) {
                return { id: '', error: err.message + ' (Local save also failed: ' + localErr.message + ')' };
            }
        }
    },

    getCV: async (cvId: string): Promise<{ cv: SavedCV | null; error: string | null }> => {
        try {
            const { data, error } = await supabase
                .from('cvs')
                .select('*')
                .eq('id', cvId)
                .single();

            if (error) throw error;

            return { cv: data as SavedCV, error: null };
        } catch (err: any) {
            console.warn('Supabase get failed, falling back to local storage:', err);
            try {
                const localCVs = JSON.parse(localStorage.getItem('cv_maker_local_cvs') || '[]');
                const cv = localCVs.find((c: any) => c.id === cvId);
                if (cv) {
                    return { cv: cv as SavedCV, error: null };
                }
                return { cv: null, error: err.message };
            } catch (localErr) {
                return { cv: null, error: err.message };
            }
        }
    },

    deleteCV: async (cvId: string): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase
                .from('cvs')
                .delete()
                .eq('id', cvId);

            if (error) throw error;

            return { error: null };
        } catch (err: any) {
            console.warn('Supabase delete failed, falling back to local storage:', err);
            try {
                const localCVs = JSON.parse(localStorage.getItem('cv_maker_local_cvs') || '[]');
                const newCVs = localCVs.filter((c: any) => c.id !== cvId);
                localStorage.setItem('cv_maker_local_cvs', JSON.stringify(newCVs));
                return { error: null };
            } catch (localErr) {
                return { error: err.message };
            }
        }
    }
};
