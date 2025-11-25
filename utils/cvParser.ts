import { GlobalWorkerOptions, getDocument, version } from 'pdfjs-dist';
import mammoth from 'mammoth';
import { CVData } from '../components/OnboardingFlow';

// Initialize PDF.js worker
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

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
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();
        const height = viewport.height;
        const width = viewport.width;

        // PDF coordinates: (0,0) is usually bottom-left. Y increases upwards.
        // We define a "Header" area as the top 15% of the page.
        const headerThreshold = height * 0.85;
        const colSplit = width * 0.5;

        const items = textContent.items as any[];

        // Categorize items
        const headerItems: any[] = [];
        const leftColItems: any[] = [];
        const rightColItems: any[] = [];

        items.forEach(item => {
            const y = item.transform[5];
            const x = item.transform[4];

            if (y > headerThreshold) {
                headerItems.push(item);
            } else if (x < colSplit) {
                leftColItems.push(item);
            } else {
                rightColItems.push(item);
            }
        });

        // Sort function: Top to Bottom (descending Y), then Left to Right (ascending X)
        const sortFn = (a: any, b: any) => {
            if (Math.abs(a.transform[5] - b.transform[5]) > 5) { // 5 unit tolerance for same line
                return b.transform[5] - a.transform[5]; // Descending Y
            }
            return a.transform[4] - b.transform[4]; // Ascending X
        };

        headerItems.sort(sortFn);
        leftColItems.sort(sortFn);
        rightColItems.sort(sortFn);

        // Helper to join items with spaces/newlines
        const joinItems = (sortedItems: any[]) => {
            let text = '';
            let lastY = -1;
            let lastX = -1;

            sortedItems.forEach(item => {
                const x = item.transform[4];
                const y = item.transform[5];
                const str = item.str;

                if (lastY !== -1 && Math.abs(y - lastY) > 5) {
                    text += '\n';
                } else if (lastX !== -1 && x - lastX > 10) { // Add space if gap
                    text += ' ';
                }

                text += str;
                lastY = y;
                lastX = x + item.width; // Approximation if width available, else just x
            });
            return text + '\n';
        };

        fullText += joinItems(headerItems);
        fullText += joinItems(leftColItems);
        fullText += joinItems(rightColItems);
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
    // Phone regex: Look for 10-15 digits. Allow 3-4 digits in last group.
    // Matches: +48 575 196 650, 123-456-7890, (123) 456-7890
    const phoneRegex = /(?<!\d)(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{3,4}(?!\d)/g;
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
        experience: ['experience', 'work history', 'employment', 'work experience', 'professional experience', 'career history'],
        education: ['education', 'academic', 'qualifications', 'academic background'],
        skills: ['skills', 'technologies', 'technical skills', 'competencies', 'languages', 'core competencies', 'technical proficiencies'],
        summary: ['summary', 'profile', 'about me', 'objective', 'professional summary', 'professional profile', 'personal profile']
    };

    for (let i = 1; i < lines.length; i++) { // Skip name
        const line = lines[i];
        const lowerLine = line.toLowerCase();

        // Check if line is a section header
        let isHeader = false;
        for (const [section, keywords] of Object.entries(sectionKeywords)) {
            // Check for exact match or match with colon
            if (keywords.some(k => lowerLine === k || lowerLine === k + ':' || lowerLine.startsWith(k + ' '))) {
                currentSection = section as keyof typeof sections;
                isHeader = true;
                break;
            }
            // Also check if the line is just the keyword (case insensitive) but maybe uppercase in original
            if (keywords.some(k => line.toUpperCase() === k.toUpperCase())) {
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
