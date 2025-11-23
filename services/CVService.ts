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
            return { cvs: [], error: err.message };
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
            return { id: '', error: err.message };
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
            return { cv: null, error: err.message };
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
            return { error: err.message };
        }
    }
};
