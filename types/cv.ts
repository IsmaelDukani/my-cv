export interface Experience {
    id: string;
    company: string;
    position: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
}

export interface Education {
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
}

export interface CV {
    personalInfo: {
        name: string;
        email: string;
        phone: string;
        location: string;
        title: string;
        summary: string;
        photoUrl?: string;
        linkedin?: string;
        github?: string;
    };
    experiences: Experience[];
    education: Education[];
    skills: string[];
    languages: string[];
}
