'use client';

import { CV, Education, Experience } from "@/types/cv";

/**
 * CV Parser with AI Integration
 * 
 * Features:
 * - Multi-format support (PDF, DOCX, TXT)
 * - AI-powered parsing using Google Gemini API with manual fallback
 * - Proper PDF.js worker initialization and verification
 * - Robust error handling at every level
 * - Data normalization and validation
 */

let pdfWorkerInitialized = false;

/**
 * Initialize PDF.js worker with verification
 */
async function initializePdfWorker(): Promise<void> {
    if (pdfWorkerInitialized || typeof window === 'undefined') {
        return;
    }

    try {
        const { GlobalWorkerOptions } = await import('pdfjs-dist');
        GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

        // Verify worker is accessible
        const workerResponse = await fetch('/pdf.worker.min.js', { method: 'HEAD' });
        if (!workerResponse.ok) {
            console.warn('PDF worker file not found at /pdf.worker.min.js');
        }

        pdfWorkerInitialized = true;
        console.log('PDF worker initialized successfully');
    } catch (error) {
        console.error('Failed to initialize PDF worker:', error);
        throw new Error('PDF worker initialization failed');
    }
}

/**
 * Extract text from PDF file
 */
async function extractTextFromPdf(file: File): Promise<string> {
    // Initialize worker first
    await initializePdfWorker();

    // Dynamically import pdfjs-dist
    const { getDocument } = await import('pdfjs-dist');

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument(arrayBuffer).promise;
    let fullText = '';

    // Extract text from each page with error handling
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            const pageText = textContent.items
                .map((item: any) => item.str || '')
                .join(' ');

            fullText += pageText + '\n';
        } catch (pageError) {
            console.warn(`Error extracting text from page ${pageNum}:`, pageError);
        }
    }

    if (!fullText || fullText.trim().length === 0) {
        throw new Error('No text content extracted from PDF');
    }

    return fullText;
}

/**
 * Extract text from DOCX file
 */
async function extractTextFromDocx(file: File): Promise<string> {
    try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });

        if (!result.value || result.value.trim().length === 0) {
            throw new Error('No text content extracted from DOCX');
        }

        return result.value;
    } catch (error) {
        console.error('Error extracting text from DOCX:', error);
        throw new Error('Failed to extract text from DOCX file');
    }
}

/**
 * Extract text from TXT file
 */
async function extractTextFromTxt(file: File): Promise<string> {
    try {
        const text = await file.text();

        if (!text || text.trim().length === 0) {
            throw new Error('No text content in TXT file');
        }

        return text;
    } catch (error) {
        console.error('Error extracting text from TXT:', error);
        throw new Error('Failed to extract text from TXT file');
    }
}

/**
 * Parse CV using Google Gemini API with fallback to manual parsing
 */
async function parseWithAI(text: string): Promise<CV> {
    // Check for API key in multiple environment variable names
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY ||
        process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
        console.warn('Google AI API key not found, falling back to manual parsing');
        return parseManually(text);
    }

    try {
        const prompt = `Extract CV information from the following text and return ONLY a valid JSON object with this exact structure:
{
  "personalInfo": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "title": "string",
    "summary": "string",
    "linkedin": "string (full URL or empty)",
    "github": "string (full URL or empty)"
  },
  "experiences": [
    {
      "company": "string",
      "position": "string",
      "location": "string",
      "startDate": "string (MMM YYYY or YYYY format)",
      "endDate": "string (MMM YYYY, YYYY, or 'Present')",
      "current": boolean,
      "bullets": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "startDate": "string (YYYY format)",
      "endDate": "string (YYYY format)",
      "gpa": "string"
    }
  ],
  "skills": ["string"],
  "languages": ["string"]
}

Extract all information accurately. For URLs, include the full https:// URL. For dates, use MMM YYYY format (e.g., "Jan 2024"). Set "current": true only if the position is ongoing.

CV Text:
${text}

Return ONLY the JSON object, no additional text or formatting.`;

        const urlWithKey = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const aiResponse = await fetch(urlWithKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 4096
                }
            })
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.warn('AI parsing failed:', errorText);
            return parseManually(text);
        }

        const aiData = await aiResponse.json();
        const generatedText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            console.warn('No AI response received, falling back to manual parsing');
            return parseManually(text);
        }

        // Extract JSON from response (may be wrapped in markdown code blocks)
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.warn('Could not extract JSON from AI response, falling back to manual parsing');
            return parseManually(text);
        }

        const parsedData = JSON.parse(jsonMatch[0]);

        console.log('AI parsing successful');
        return normalizeCV(parsedData);
    } catch (error) {
        console.error('Error in AI parsing:', error);
        console.warn('Falling back to manual parsing');
        return parseManually(text);
    }
}

/**
 * Manual parsing as fallback (same logic as before)
 */
function parseManually(text: string): CV {
    try {
        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line && line.length > 0);

        if (lines.length === 0) {
            return getDefaultCV();
        }

        // Section splitting
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
            summary: ['professional summary', 'summary', 'profile', 'objective', 'about', 'overview'],
            experience: ['work experience', 'experience', 'employment', 'history', 'career', 'professional experience'],
            education: ['education', 'academic', 'degree', 'university', 'college', 'qualification'],
            skills: ['skills', 'abilities', 'competencies', 'technical skills', 'expertise'],
            languages: ['languages', 'language proficiency', 'language skills']
        };

        for (const line of lines) {
            let isSectionHeader = false;
            const lowerLine = line.toLowerCase();

            for (const section in sectionKeywords) {
                if (sectionKeywords[section].some(keyword => {
                    return lowerLine.includes(keyword) &&
                        (line === line.toUpperCase() || line.split(' ').length <= 5);
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

        // Personal Info Parsing
        const fullText = lines.join(' ');
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const phoneRegex = /\+?[0-9\s\-()]{7,}|[0-9]{3}[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}/;
        const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9\-]+/i;
        const githubRegex = /github\.com\/[a-zA-Z0-9\-]+/i;

        const emailMatch = fullText.match(emailRegex);
        const phoneMatch = fullText.match(phoneRegex);
        const linkedinMatch = fullText.match(linkedinRegex);
        const githubMatch = fullText.match(githubRegex);

        let name = 'Your Name';
        let title = 'Your Title';
        let location = 'Your Location';

        if (sections.personalInfo.length > 0) {
            name = sections.personalInfo[0];
        } else if (lines.length > 0) {
            name = lines[0];
        }

        if (sections.personalInfo.length > 1) {
            title = sections.personalInfo[1];
        } else if (lines.length > 1 && !lines[1].includes('@') && !lines[1].match(/\d{3}/)) {
            title = lines[1];
        }

        const locationMatch = fullText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)/);
        if (locationMatch) {
            location = locationMatch[0];
        }

        const linkedin = linkedinMatch ? `https://${linkedinMatch[0]}` : '';
        const github = githubMatch ? `https://${githubMatch[0]}` : '';
        const summary = sections.summary.join('\n');

        // Experience Parsing
        const experiences: Experience[] = [];
        const dateRangeRegex = /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*[-–]\s*(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})|\d{4}\s*[-–]\s*(?:Present|\d{4}))/i;
        let currentJob: Experience | null = null;
        const experienceLines = [...sections.experience, ...sections.other];

        for (const line of experienceLines) {
            const dateMatch = line.match(dateRangeRegex);

            if (dateMatch) {
                if (currentJob) experiences.push(currentJob);

                const dateRange = dateMatch[0];
                const [start, end] = dateRange.split(/[-–]/).map(s => s.trim());
                const isCurrent = end.toLowerCase().includes('present');

                let company = '';
                let position = '';
                let jobLocation = '';
                const parts = line.split(dateRange);
                const preDate = parts[0].trim();

                if (preDate.includes('|')) {
                    const preParts = preDate.split('|').map(s => s.trim());
                    position = preParts[0];
                    company = preParts[1];
                } else if (preDate.includes('—')) {
                    const preParts = preDate.split('—').map(s => s.trim());
                    position = preParts[0];
                    company = preParts[1];
                } else {
                    const words = preDate.split(/\s{2,}/).map(s => s.trim()).filter(s => s);
                    if (words.length >= 2) {
                        position = words[0];
                        company = words.slice(1).join(' ');
                    } else if (words.length === 1) {
                        position = words[0];
                    }
                }

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
                currentJob.bullets.push(line);
            }
        }

        if (currentJob) experiences.push(currentJob);

        // Education Parsing
        const education: Education[] = [];
        const eduDateRegex = /(\d{4}\s*[-–]\s*\d{4}|\d{4})/i;
        let currentEdu: Education | null = null;

        for (const line of sections.education) {
            const dateMatch = line.match(eduDateRegex);

            if (dateMatch) {
                if (currentEdu) education.push(currentEdu);

                const dateRange = dateMatch[0];
                const [start, end] = dateRange.includes('-') || dateRange.includes('–')
                    ? dateRange.split(/[-–]/).map(s => s.trim())
                    : ['', dateRange.trim()];

                let degree = '';
                let institution = '';
                const parts = line.split(dateRange);
                const preDate = parts[0].trim();

                if (preDate.toLowerCase().includes('master') ||
                    preDate.toLowerCase().includes('bachelor') ||
                    preDate.toLowerCase().includes('degree') ||
                    preDate.toLowerCase().includes('phd') ||
                    preDate.toLowerCase().includes('diploma') ||
                    preDate.toLowerCase().includes('associate') ||
                    preDate.toLowerCase().includes('certification')) {
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
                if (!currentEdu.institution || currentEdu.institution === 'Institution') {
                    currentEdu.institution = line;
                } else if (!currentEdu.field) {
                    currentEdu.field = line;
                }
            }
        }

        if (currentEdu) education.push(currentEdu);

        // Skills Parsing
        const skillsText = sections.skills.join(', ');
        const skills = skillsText
            .split(/[,|•\n]/)
            .map(s => s.trim())
            .filter(s => s.length > 1 && s.length < 100);

        // Languages Parsing
        const languages = sections.languages
            .map(line => line.trim())
            .filter(line => line.length > 1);

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

        return cvData;
    } catch (error) {
        console.error('Error in manual parsing:', error);
        return getDefaultCV();
    }
}

/**
 * Normalize AI-parsed data to ensure it matches CV structure
 */
function normalizeCV(data: any): CV {
    try {
        const normalized: CV = {
            personalInfo: {
                name: data.personalInfo?.name || 'Your Name',
                email: data.personalInfo?.email || '',
                phone: data.personalInfo?.phone || '',
                location: data.personalInfo?.location || '',
                title: data.personalInfo?.title || 'Your Title',
                summary: data.personalInfo?.summary || '',
                linkedin: data.personalInfo?.linkedin || '',
                github: data.personalInfo?.github || ''
            },
            experiences: [],
            education: [],
            skills: [],
            languages: []
        };

        // Normalize experiences
        if (Array.isArray(data.experiences)) {
            normalized.experiences = data.experiences
                .filter((exp: any) => exp && (exp.company || exp.position))
                .map((exp: any) => ({
                    id: crypto.randomUUID(),
                    company: exp.company || 'Company',
                    position: exp.position || 'Position',
                    location: exp.location || '',
                    startDate: exp.startDate || '',
                    endDate: exp.endDate || '',
                    current: exp.current === true,
                    bullets: Array.isArray(exp.bullets) ? exp.bullets : []
                }));
        }

        // Normalize education
        if (Array.isArray(data.education)) {
            normalized.education = data.education
                .filter((edu: any) => edu && (edu.institution || edu.degree))
                .map((edu: any) => ({
                    id: crypto.randomUUID(),
                    institution: edu.institution || 'Institution',
                    degree: edu.degree || 'Degree',
                    field: edu.field || '',
                    startDate: edu.startDate || '',
                    endDate: edu.endDate || '',
                    gpa: edu.gpa || ''
                }));
        }

        // Normalize skills
        if (Array.isArray(data.skills)) {
            normalized.skills = data.skills
                .filter((skill: any) => skill && typeof skill === 'string')
                .map((skill: string) => skill.trim())
                .filter((skill: string) => skill.length > 0);
        }

        // Normalize languages
        if (Array.isArray(data.languages)) {
            normalized.languages = data.languages
                .filter((lang: any) => lang && typeof lang === 'string')
                .map((lang: string) => lang.trim())
                .filter((lang: string) => lang.length > 0);
        }

        return normalized;
    } catch (error) {
        console.error('Error normalizing CV data:', error);
        return getDefaultCV();
    }
}

/**
 * Get default CV structure for error cases
 */
function getDefaultCV(): CV {
    return {
        personalInfo: {
            name: 'Unable to parse CV',
            email: '',
            phone: '',
            location: '',
            title: 'Please try uploading a different file',
            summary: 'The file could not be parsed. Please ensure it is a valid CV file.',
            linkedin: '',
            github: ''
        },
        experiences: [],
        education: [],
        skills: [],
        languages: []
    };
}

/**
 * Main export: Parse CV from PDF, DOCX, or TXT file
 * Uses AI parsing with automatic fallback to manual parsing
 */
export async function parsePdf(file: File): Promise<CV> {
    try {
        console.log(`Parsing file: ${file.name} (${file.type})`);

        let extractedText: string;

        // Extract text based on file type
        if (file.type === 'application/pdf') {
            extractedText = await extractTextFromPdf(file);
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword'
        ) {
            extractedText = await extractTextFromDocx(file);
        } else if (file.type === 'text/plain') {
            extractedText = await extractTextFromTxt(file);
        } else {
            throw new Error(`Unsupported file type: ${file.type}`);
        }

        console.log(`Extracted ${extractedText.length} characters from file`);

        // Try AI parsing first, with automatic fallback to manual parsing
        const cvData = await parseWithAI(extractedText);

        console.log('CV parsing completed successfully');
        return cvData;
    } catch (error) {
        console.error('Error in parsePdf:', error);
        return getDefaultCV();
    }
}
