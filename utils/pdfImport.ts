import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import mammoth from 'mammoth';
import { CV, Education, Experience } from "@/types/cv";

/**
 * PDF.js Worker Setup for pdfjs-dist 5.4.394
 * 
 * BREAKING CHANGES in pdfjs-dist 5.4.394:
 * 1. Worker file is now .mjs (ES module) instead of .js
 * 2. GlobalWorkerOptions.workerSrc now expects the worker file to be served from /public
 * 3. The worker file must be accessible at the specified URL path
 * 
 * SECURITY FIX:
 * - Updated from pdfjs-dist <=4.1.392 (vulnerable to arbitrary JS execution)
 * - Now using pdfjs-dist 5.4.394 (CVE GHSA-wgrm-67xf-hhpq fixed)
 */

// Set up the PDF.js worker with proper error handling
if (typeof window !== 'undefined') {
    GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
}

export async function parseCV(file: File): Promise<CV> {
    if (file.type === 'application/pdf') {
        return parsePdf(file);
    } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
    ) {
        return parseDocx(file);
    } else {
        throw new Error('Unsupported file type');
    }
}

async function parseDocx(file: File): Promise<CV> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return parseCvText(result.value);
    } catch (error) {
        console.error('Error parsing DOCX:', error);
        return getDefaultCV();
    }
}

/**
 * Parse a PDF file and extract CV information
 * 
 * COMPATIBILITY NOTES for pdfjs-dist 5.4.394:
 * - getDocument() returns a PDFDocumentProxy with improved type safety
 * - TextContent items structure remains compatible with v4.x
 * - The .promise property is still available for async operations
 * - Text extraction via getTextContent() works identically
 * 
 * @param file - The PDF file to parse
 * @returns Promise<CV> - Parsed CV data structure
 */
export async function parsePdf(file: File): Promise<CV> {
    try {
        const arrayBuffer = await file.arrayBuffer();

        // In pdfjs-dist 5.4.394, getDocument() accepts ArrayBuffer directly
        const pdf = await getDocument(arrayBuffer).promise;
        let textContent = '';

        // Iterate through all pages and extract text
        for (let i = 1; i <= pdf.numPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const text = await page.getTextContent();

                // Extract text from items and join with spaces
                // In v5.4.394, items structure is: { str: string, dir: string, ... }
                const pageText = text.items
                    .map((item: any) => {
                        if (typeof item === 'object' && item.str) {
                            return item.str;
                        }
                        return '';
                    })
                    .join(' ');

                textContent += pageText + '\n';
            } catch (pageError) {
                console.warn(`Error extracting text from page ${i}:`, pageError);
                // Continue with next page even if one fails
            }
        }

        // If no text was extracted, return error
        if (!textContent || textContent.trim().length === 0) {
            console.error('No text content extracted from PDF');
            return getDefaultCV();
        }

        return parseCvText(textContent);
    } catch (error) {
        console.error('Error parsing PDF:', error);
        // Return a default CV structure if parsing fails
        return getDefaultCV();
    }
}

function parseCvText(text: string): CV {
    try {
        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line && line.length > 0);

        if (lines.length === 0) {
            return getDefaultCV();
        }

        // --- 1. Section Splitting ---
        const sections: { [key: string]: string[] } = {
            personalInfo: [],
            summary: [],
            experience: [],
            education: [],
            skills: [],
            languages: [],
            other: []
        };

        let currentSection = 'personalInfo';

        const sectionKeywords: { [key: string]: string[] } = {
            summary: ['professional summary', 'summary', 'profile', 'objective', 'about'],
            experience: ['work experience', 'experience', 'employment', 'history', 'career'],
            education: ['education', 'academic', 'degree', 'university', 'college'],
            skills: ['skills', 'abilities', 'competencies', 'technical skills'],
            languages: ['languages', 'language proficiency']
        };

        for (const line of lines) {
            let isSectionHeader = false;
            const lowerLine = line.toLowerCase();

            // Check if this line is a section header
            for (const section in sectionKeywords) {
                if (sectionKeywords[section].some(keyword => {
                    return lowerLine.includes(keyword) &&
                        (line === line.toUpperCase() ||
                            line.split(' ').length <= 5); // Likely a header
                })) {
                    currentSection = section;
                    isSectionHeader = true;
                    break;
                }
            }

            if (!isSectionHeader && line.length > 0) {
                sections[currentSection].push(line);
            }
        }

        // --- 2. Personal Info Parsing ---
        const fullText = lines.join(' ');
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const phoneRegex = /\+?[0-9\s\-()]{7,}|[0-9]{3}[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}/;
        const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9\-]+/i;
        const githubRegex = /github\.com\/[a-zA-Z0-9\-]+/i;

        const emailMatch = fullText.match(emailRegex);
        const phoneMatch = fullText.match(phoneRegex);
        const linkedinMatch = fullText.match(linkedinRegex);
        const githubMatch = fullText.match(githubRegex);

        // Extract personal info from the first few lines
        let name = 'Your Name';
        let title = 'Your Title';
        let location = 'Your Location';

        // Name is typically the first non-empty line
        if (sections.personalInfo.length > 0) {
            name = sections.personalInfo[0];
        } else if (lines.length > 0) {
            name = lines[0];
        }

        // Title is typically the second line or found in personalInfo
        if (sections.personalInfo.length > 1) {
            title = sections.personalInfo[1];
        } else if (lines.length > 1 && !lines[1].includes('@') && !lines[1].match(/\d{3}/)) {
            title = lines[1];
        }

        // Location - look for city/country patterns
        const locationMatch = fullText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)/);
        if (locationMatch) {
            location = locationMatch[0];
        }

        const linkedin = linkedinMatch ? `https://${linkedinMatch[0]}` : '';
        const github = githubMatch ? `https://${githubMatch[0]}` : '';

        // Summary is already captured in the sections.summary array
        const summary = sections.summary.join('\n');

        // --- 3. Experience Parsing (Improved) ---
        const experiences: Experience[] = [];
        // Regex to find date ranges like "Oct 2024 - Present" or "2022-2023" or "Oct 2024–Present"
        const dateRangeRegex = /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*[-–]\s*(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})|\d{4}\s*[-–]\s*(?:Present|\d{4}))/i;

        let currentJob: Experience | null = null;

        // Combine experience and other sections for a more robust search
        const experienceLines = [...sections.experience, ...sections.other];

        for (const line of experienceLines) {
            const dateMatch = line.match(dateRangeRegex);

            if (dateMatch) {
                // Found a date range, likely a new job entry
                if (currentJob) experiences.push(currentJob);

                const dateRange = dateMatch[0];
                const [start, end] = dateRange.split(/[-–]/).map(s => s.trim());
                const isCurrent = end.toLowerCase().includes('present');

                // Heuristic to find Company and Position
                let company = '';
                let position = '';
                let jobLocation = '';

                // Split the line by the date range to isolate other info
                const parts = line.split(dateRange);
                const preDate = parts[0].trim();

                // Try to find Company and Position in the pre-date part
                if (preDate.includes('|')) {
                    const preParts = preDate.split('|').map(s => s.trim());
                    position = preParts[0];
                    company = preParts[1];
                } else if (preDate.includes('—')) {
                    const preParts = preDate.split('—').map(s => s.trim());
                    position = preParts[0];
                    company = preParts[1];
                } else {
                    // Split by multiple spaces
                    const words = preDate.split(/\s{2,}/).map(s => s.trim()).filter(s => s);
                    if (words.length >= 2) {
                        position = words[0];
                        company = words.slice(1).join(' ');
                    } else if (words.length === 1) {
                        position = words[0];
                    }
                }

                // Try to find location in the line
                const locationRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)/;
                const jobLocationMatch = line.match(locationRegex);
                if (jobLocationMatch) {
                    jobLocation = jobLocationMatch[0];
                }

                currentJob = {
                    id: crypto.randomUUID(),
                    company: company || 'Company',
                    position: position || 'Position',
                    location: jobLocation || '',
                    startDate: start,
                    endDate: end,
                    current: isCurrent,
                    bullets: []
                };
            } else if (currentJob && line.length > 10 && !line.match(/^\d{4}/)) {
                // Likely a bullet point (not a date line)
                currentJob.bullets.push(line);
            }
        }

        if (currentJob) experiences.push(currentJob);

        // --- 4. Education Parsing (Improved) ---
        const education: Education[] = [];
        const eduDateRegex = /(\d{4}\s*[-–]\s*\d{4}|\d{4})/i;

        let currentEdu: Education | null = null;

        for (const line of sections.education) {
            const dateMatch = line.match(eduDateRegex);

            if (dateMatch) {
                // Found a date, likely a new education entry
                if (currentEdu) education.push(currentEdu);

                const dateRange = dateMatch[0];
                const [start, end] = dateRange.includes('-') || dateRange.includes('–')
                    ? dateRange.split(/[-–]/).map(s => s.trim())
                    : ['', dateRange.trim()];

                // Heuristic to find Degree and Institution
                let degree = '';
                let institution = '';

                // Split the line by the date range
                const parts = line.split(dateRange);
                const preDate = parts[0].trim();

                // Try to find Degree and Institution
                if (preDate.toLowerCase().includes('master') ||
                    preDate.toLowerCase().includes('bachelor') ||
                    preDate.toLowerCase().includes('degree') ||
                    preDate.toLowerCase().includes('phd') ||
                    preDate.toLowerCase().includes('diploma')) {
                    degree = preDate;
                } else {
                    institution = preDate;
                }

                currentEdu = {
                    id: crypto.randomUUID(),
                    institution: institution || 'Institution',
                    degree: degree || 'Degree',
                    field: '',
                    startDate: start,
                    endDate: end,
                    gpa: ''
                };
            } else if (currentEdu && line.length > 5) {
                // Likely the institution or field if not already set
                if (!currentEdu.institution || currentEdu.institution === 'Institution') {
                    currentEdu.institution = line;
                } else if (!currentEdu.field) {
                    currentEdu.field = line;
                }
            }
        }

        if (currentEdu) education.push(currentEdu);

        // --- 5. Skills Parsing ---
        // Join all lines in the skills section and split by common delimiters
        const skillsText = sections.skills.join(', ');
        const skills = skillsText
            .split(/[,|•\n]/)
            .map(s => s.trim())
            .filter(s => s.length > 1 && s.length < 100); // Filter out very long strings

        // --- 6. Languages Parsing ---
        const languages = sections.languages
            .map(line => line.trim())
            .filter(line => line.length > 1);

        // --- 7. Final CV Object Construction ---
        const cvData: CV = {
            personalInfo: {
                name: name || 'Your Name',
                email: emailMatch ? emailMatch[0] : '',
                phone: phoneMatch ? phoneMatch[0] : '',
                location: location || 'Your Location',
                title: title || 'Your Title',
                summary: summary || '',
                linkedin,
                github
            },
            experiences: experiences.length > 0 ? experiences : [],
            education: education.length > 0 ? education : [],
            skills: skills.length > 0 ? skills : [],
            languages: languages.length > 0 ? languages : []
        };

        // Validate that we have at least some data
        if (!cvData.personalInfo.name || cvData.personalInfo.name === 'Your Name') {
            console.warn('CV parsing resulted in minimal data, but returning what was extracted');
        }

        return cvData;
    } catch (error) {
        console.error('Error in parseCvText:', error);
        return getDefaultCV();
    }
}

/**
 * Get a default CV structure when parsing fails
 * This ensures the application doesn't crash if PDF parsing encounters an error
 */
function getDefaultCV(): CV {
    return {
        personalInfo: {
            name: 'Unable to parse CV',
            email: '',
            phone: '',
            location: '',
            title: 'Please try uploading a different PDF',
            summary: 'The PDF could not be parsed. Please ensure it is a valid PDF file.',
            linkedin: '',
            github: ''
        },
        experiences: [],
        education: [],
        skills: [],
        languages: []
    };
}
