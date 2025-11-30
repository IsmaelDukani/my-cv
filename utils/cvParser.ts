'use client';

import { CV } from "@/types/cv";

/**
 * CLIENT-SIDE CV PARSER UTILITY
 * 
 * This module provides a client-side interface to the server-side CV parsing API.
 * It handles:
 * - File upload to the server
 * - API communication
 * - Error handling and user feedback
 * - Data validation
 */

/**
 * Parse a CV file by uploading it to the server
 * The server will extract text and parse the CV data
 * 
 * @param file - The CV file to parse (PDF, DOCX, or TXT)
 * @returns Promise<CV> - Parsed CV data
 */
export async function parsePdf(file: File): Promise<CV> {
    try {
        console.log(`Starting CV parsing for file: ${file.name}`);

        // Validate file
        if (!file) {
            throw new Error('No file provided');
        }

        if (file.size === 0) {
            throw new Error('File is empty');
        }

        const maxFileSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxFileSize) {
            throw new Error('File size exceeds 10MB limit');
        }

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        console.log(`Uploading file to server: ${file.name}`);

        // Send to server API
        const response = await fetch('/api/process-cv', {
            method: 'POST',
            body: formData,
        });

        console.log(`Server response status: ${response.status}`);

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.message || errorData.error || 'Failed to parse CV';
            throw new Error(errorMessage);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to parse CV');
        }

        console.log('CV parsing completed successfully');
        console.log('Parsed data:', result.data);

        // Validate and normalize the returned data
        return normalizeCV(result.data);
    } catch (error) {
        console.error('Error in parsePdf:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error details:', errorMessage);

        // Return default CV on error
        return getDefaultCV();
    }
}

/**
 * Normalize and validate CV data
 * @param data - Raw CV data from server
 * @returns CV - Normalized CV data
 */
function normalizeCV(data: any): CV {
    try {
        if (!data) {
            return getDefaultCV();
        }

        const personalInfo = data.personalInfo || {};
        const experiences = Array.isArray(data.experiences) ? data.experiences : [];
        const education = Array.isArray(data.education) ? data.education : [];
        const skills = Array.isArray(data.skills) ? data.skills : [];
        const languages = Array.isArray(data.languages) ? data.languages : [];

        // Normalize experiences
        const normalizedExperiences = experiences.map((exp: any) => ({
            id: exp.id || crypto.randomUUID(),
            company: exp.company || '',
            position: exp.position || '',
            location: exp.location || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            current: exp.current || false,
            bullets: Array.isArray(exp.bullets) ? exp.bullets : []
        }));

        // Normalize education
        const normalizedEducation = education.map((edu: any) => ({
            id: edu.id || crypto.randomUUID(),
            institution: edu.institution || '',
            degree: edu.degree || '',
            field: edu.field || '',
            startDate: edu.startDate || '',
            endDate: edu.endDate || '',
            gpa: edu.gpa || ''
        }));

        return {
            personalInfo: {
                name: personalInfo.name || 'Your Name',
                email: personalInfo.email || '',
                phone: personalInfo.phone || '',
                location: personalInfo.location || '',
                title: personalInfo.title || '',
                summary: personalInfo.summary || '',
                linkedin: personalInfo.linkedin || '',
                github: personalInfo.github || ''
            },
            experiences: normalizedExperiences,
            education: normalizedEducation,
            skills: skills.filter((s: any) => typeof s === 'string' && s.length > 0),
            languages: languages.filter((l: any) => typeof l === 'string' && l.length > 0)
        };
    } catch (error) {
        console.error('Error normalizing CV:', error);
        return getDefaultCV();
    }
}

/**
 * Get a default CV structure when parsing fails
 */
function getDefaultCV(): CV {
    return {
        personalInfo: {
            name: 'Unable to parse CV',
            email: '',
            phone: '',
            location: '',
            title: 'Please try uploading a different PDF',
            summary: 'The CV could not be parsed. Please ensure it is a valid PDF file.',
            linkedin: '',
            github: ''
        },
        experiences: [],
        education: [],
        skills: [],
        languages: []
    };
}
