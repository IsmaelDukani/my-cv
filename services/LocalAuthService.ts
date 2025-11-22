import { CVData } from '../components/OnboardingFlow';

export interface User {
    id: string;
    email: string;
    name: string;
}

export interface SavedCV {
    id: string;
    userId: string;
    title: string;
    template: string;
    data: CVData;
    createdAt: string;
    updatedAt: string;
}

const USERS_KEY = 'cv-maker-users';
const CVS_KEY = 'cv-maker-cvs';
const SESSION_KEY = 'cv-maker-session';

export const LocalAuthService = {
    // Auth Methods
    signUp: async (email: string, password: string, name: string): Promise<{ user: User | null; error: string | null }> => {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');

        if (users.find((u: any) => u.email === email)) {
            return { user: null, error: 'User already exists' };
        }

        const newUser = {
            id: crypto.randomUUID(),
            email,
            password, // In a real app, never store plain passwords! But this is local-only prototype.
            name
        };

        users.push(newUser);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));

        // Auto sign in
        const sessionUser = { id: newUser.id, email: newUser.email, name: newUser.name };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

        return { user: sessionUser, error: null };
    },

    signIn: async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
        await new Promise(resolve => setTimeout(resolve, 500));

        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const user = users.find((u: any) => u.email === email && u.password === password);

        if (!user) {
            return { user: null, error: 'Invalid email or password' };
        }

        const sessionUser = { id: user.id, email: user.email, name: user.name };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

        return { user: sessionUser, error: null };
    },

    signOut: async () => {
        localStorage.removeItem(SESSION_KEY);
    },

    getSession: async (): Promise<User | null> => {
        const session = localStorage.getItem(SESSION_KEY);
        return session ? JSON.parse(session) : null;
    },

    // CV Methods
    saveCV: async (userId: string, cvId: string | null, title: string, template: string, data: CVData): Promise<{ id: string; error: string | null }> => {
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const cvs: SavedCV[] = JSON.parse(localStorage.getItem(CVS_KEY) || '[]');
            const now = new Date().toISOString();
            let id = cvId;

            if (id) {
                const index = cvs.findIndex(c => c.id === id && c.userId === userId);
                if (index !== -1) {
                    cvs[index] = { ...cvs[index], title, template, data, updatedAt: now };
                } else {
                    // If ID provided but not found (shouldn't happen), create new
                    id = crypto.randomUUID();
                    cvs.push({ id, userId, title, template, data, createdAt: now, updatedAt: now });
                }
            } else {
                id = crypto.randomUUID();
                cvs.push({ id, userId, title, template, data, createdAt: now, updatedAt: now });
            }

            localStorage.setItem(CVS_KEY, JSON.stringify(cvs));
            return { id, error: null };
        } catch (err: any) {
            return { id: '', error: err.message };
        }
    },

    listCVs: async (userId: string): Promise<{ cvs: SavedCV[]; error: string | null }> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
            const cvs: SavedCV[] = JSON.parse(localStorage.getItem(CVS_KEY) || '[]');
            const userCvs = cvs.filter(c => c.userId === userId).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            return { cvs: userCvs, error: null };
        } catch (err: any) {
            return { cvs: [], error: err.message };
        }
    },

    getCV: async (cvId: string): Promise<{ cv: SavedCV | null; error: string | null }> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
            const cvs: SavedCV[] = JSON.parse(localStorage.getItem(CVS_KEY) || '[]');
            const cv = cvs.find(c => c.id === cvId) || null;
            return { cv, error: cv ? null : 'CV not found' };
        } catch (err: any) {
            return { cv: null, error: err.message };
        }
    },

    deleteCV: async (cvId: string): Promise<{ error: string | null }> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
            const cvs: SavedCV[] = JSON.parse(localStorage.getItem(CVS_KEY) || '[]');
            const newCvs = cvs.filter(c => c.id !== cvId);
            localStorage.setItem(CVS_KEY, JSON.stringify(newCvs));
            return { error: null };
        } catch (err: any) {
            return { error: err.message };
        }
    }
};
