export interface CVData {
    personalInfo: {
        name: string;
        title: string;
        email: string;
        phone: string;
        location: string;
        linkedin?: string;
        github?: string;
        summary?: string;
    };
    experiences: Array<{
        id: string;
        company: string;
        position: string;
        location?: string;
        startDate: string;
        endDate: string;
        current: boolean;
        bullets: string[];
    }>;
    education: Array<{
        id: string;
        institution: string;
        degree: string;
        field: string;
        startDate: string;
        endDate: string;
        gpa?: string;
    }>;
    skills: string[];
}

export interface CV {
    id: string;
    user_id: string;
    title: string;
    template: string;
    data: CVData;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: string;
    clerk_user_id: string;
    email: string;
    created_at: string;
    updated_at: string;
}

export interface CreateCVRequest {
    title: string;
    template: string;
    data: CVData;
}

export interface UpdateCVRequest {
    title?: string;
    template?: string;
    data?: CVData;
}
