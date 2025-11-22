import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { CVData } from '../components/OnboardingFlow';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export async function parseCV(file: File): Promise<CVData> {
    let text = '';

    if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
    } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
    ) {
        text = await extractTextFromDOCX(file);
    } else {
        throw new Error('Unsupported file type');
    }

    return parseCVText(text);
}

async function extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        fullText += pageText + '\n';
    }

    return fullText;
}

async function extractTextFromDOCX(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

function parseCVText(text: string): CVData {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Basic Heuristics
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const phoneRegex = /(\+?[\d\s-]{10,})/g;
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const emailMatch = text.match(emailRegex);
    const phoneMatch = text.match(phoneRegex);
    const urls = text.match(urlRegex) || [];

    const linkedin = urls.find(url => url.includes('linkedin.com')) || '';
    const github = urls.find(url => url.includes('github.com')) || '';

    // Guess Name (usually first line or first non-empty line)
    const name = lines[0] || '';

    // Identify Sections
    const sections = {
        experience: [] as string[],
        education: [] as string[],
        skills: [] as string[],
        summary: [] as string[]
    };

    let currentSection: keyof typeof sections | null = 'summary'; // Default to summary for initial text

    const sectionKeywords = {
        experience: ['experience', 'work history', 'employment', 'work experience'],
        education: ['education', 'academic', 'qualifications'],
        skills: ['skills', 'technologies', 'technical skills', 'competencies', 'languages'],
        summary: ['summary', 'profile', 'about me', 'objective']
    };

    for (let i = 1; i < lines.length; i++) { // Skip name
        const line = lines[i];
        const lowerLine = line.toLowerCase();

        // Check if line is a section header
        let isHeader = false;
        for (const [section, keywords] of Object.entries(sectionKeywords)) {
            if (keywords.some(k => lowerLine === k || lowerLine === k + ':')) {
                currentSection = section as keyof typeof sections;
                isHeader = true;
                break;
            }
        }

        if (!isHeader && currentSection) {
            sections[currentSection].push(line);
        }
    }

    // Parse Experience
    const experiences = [];
    if (sections.experience.length > 0) {
        // Very naive experience parsing: assume blocks of text are experiences
        // This is hard to do accurately without AI, so we'll dump the text into one block for now
        // or try to split by dates if possible.
        // For now, let's create one "Imported Experience" block with all bullets
        experiences.push({
            id: crypto.randomUUID(),
            company: 'Imported Experience',
            position: 'See details below',
            location: '',
            startDate: '',
            endDate: '',
            current: false,
            bullets: sections.experience
        });
    }

    // Parse Education
    const education = [];
    if (sections.education.length > 0) {
        education.push({
            id: crypto.randomUUID(),
            institution: 'Imported Education',
            degree: sections.education.join(', '),
            field: '',
            startDate: '',
            endDate: ''
        });
    }

    // Parse Skills
    const skills = sections.skills.flatMap(line => line.split(/[,|•]/).map(s => s.trim()).filter(s => s));

    return {
        personalInfo: {
            name,
            email: emailMatch ? emailMatch[0] : '',
            phone: phoneMatch ? phoneMatch[0] : '',
            location: '',
            title: '',
            summary: sections.summary.join('\n'),
            linkedin,
            github
        },
        experiences: experiences.length > 0 ? experiences : [{
            id: crypto.randomUUID(),
            company: '',
            position: '',
            location: '',
            startDate: '',
            endDate: '',
            current: false,
            bullets: ['']
        }],
        education: education.length > 0 ? education : [],
        skills: skills.length > 0 ? skills : []
    };
}
