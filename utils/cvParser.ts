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

    // Try to guess job title (usually second line)
    let title = '';
    let location = '';

    // Look for common location patterns in first few lines
    const locationRegex = /(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2,}(?:\s+\d{5})?)/;
    for (let i = 1; i < Math.min(lines.length, 5); i++) {
        const locMatch = lines[i].match(locationRegex);
        if (locMatch) {
            location = locMatch[1];
            break;
        }
    }

    // Identify Sections
    const sections = {
        experience: [] as string[],
        education: [] as string[],
        skills: [] as string[],
        summary: [] as string[],
        header: [] as string[] // For lines before first section
    };

    let currentSection: keyof typeof sections | null = null; // Don't assume summary

    const sectionKeywords = {
        experience: ['experience', 'work history', 'employment', 'work experience', 'professional experience', 'career history'],
        education: ['education', 'academic', 'qualifications', 'academic background'],
        skills: ['skills', 'technologies', 'technical skills', 'competencies', 'languages', 'core competencies', 'technical proficiencies'],
        summary: ['summary', 'profile', 'about me', 'objective', 'professional summary', 'professional profile', 'personal profile']
    };

    for (let i = 1; i < lines.length; i++) { // Skip name
        const line = lines[i];
        const lowerLine = line.toLowerCase();

        // Skip if it's email, phone, or URL (already extracted)
        if (emailRegex.test(line) || phoneRegex.test(line) || urlRegex.test(line)) {
            continue;
        }

        // Skip if it matches location
        if (location && line.includes(location)) {
            continue;
        }

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

        if (!isHeader) {
            if (currentSection) {
                sections[currentSection].push(line);
            } else {
                // Before first section - likely part of header/title
                sections.header.push(line);
            }
        }
    }

    // Extract title from header if not in a dedicated section
    if (!title && sections.header.length > 0) {
        // First non-contact line in header is likely the title
        title = sections.header[0] || '';
    }

    // Parse Experience with better structure
    const experiences = [];
    if (sections.experience.length > 0) {
        // Try to parse individual experience entries
        // Look for patterns: Job Title, Company | Date
        // Or: Job Title - Company (Date)

        let currentJob: any = null;
        const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}(?:\s*-\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|Present)?/;

        for (const line of sections.experience) {
            // Check if this line looks like a job title/company line
            const hasDate = datePattern.test(line);
            const hasPipe = line.includes('|');
            const hasDash = line.includes('—') || line.includes(' - ');

            // If line contains a date or separator, it's likely a new job entry
            if (hasDate || (hasPipe && !currentJob) || (line.includes(':') && !currentJob)) {
                // Save previous job if exists
                if (currentJob && currentJob.bullets.length > 0) {
                    experiences.push(currentJob);
                }

                // Parse new job
                const dateMatch = line.match(datePattern);
                let position = '';
                let company = '';
                let location = '';
                let dates = dateMatch ? dateMatch[0] : '';

                if (hasPipe) {
                    // Format: Position | Company | Date
                    const parts = line.split('|').map(p => p.trim());
                    position = parts[0] || '';
                    company = parts[1] || '';
                    if (parts.length > 2 && !dates) {
                        dates = parts[2] || '';
                    }
                } else if (hasDash || line.includes('—')) {
                    // Format: Position — Company or Position - Company
                    const separator = line.includes('—') ? '—' : ' - ';
                    const parts = line.split(separator).map(p => p.trim());
                    position = parts[0] || '';
                    const rest = parts.slice(1).join(separator);
                    company = rest.replace(datePattern, '').trim();
                } else {
                    // Fallback: treat entire line as position
                    position = line.replace(datePattern, '').trim();
                }

                // Parse dates
                let startDate = '';
                let endDate = '';
                let current = false;

                if (dates) {
                    const dateParts = dates.split(/[-–—]/);
                    if (dateParts.length > 0) {
                        startDate = dateParts[0].trim();
                    }
                    if (dateParts.length > 1) {
                        const end = dateParts[1].trim();
                        if (end.toLowerCase() === 'present') {
                            endDate = 'Present';
                            current = true;
                        } else {
                            endDate = end;
                        }
                    }
                }

                currentJob = {
                    id: crypto.randomUUID(),
                    company: company || 'Company',
                    position: position || 'Position',
                    location,
                    startDate,
                    endDate,
                    current,
                    bullets: []
                };
            } else if (currentJob && line.startsWith('•')) {
                // Bullet point
                currentJob.bullets.push(line.replace(/^•\s*/, '').trim());
            } else if (currentJob && line.trim()) {
                // Could be a bullet without marker, or location, or company info
                // If it's short and no current company, might be company
                if (!currentJob.company || currentJob.company === 'Company') {
                    currentJob.company = line.trim();
                } else if (!currentJob.location && line.includes(',')) {
                    currentJob.location = line.trim();
                } else if (line.length > 20) {
                    // Likely a bullet point
                    currentJob.bullets.push(line.trim());
                }
            }
        }

        // Don't forget the last job
        if (currentJob && currentJob.bullets.length > 0) {
            experiences.push(currentJob);
        }

        // If no structured jobs found, create one generic entry
        if (experiences.length === 0) {
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
    }

    // Parse Education with better structure
    const education = [];
    if (sections.education.length > 0) {
        let currentEdu: any = null;
        const datePattern = /\d{4}\s*-\s*\d{4}|\d{4}/;

        for (const line of sections.education) {
            const hasDate = datePattern.test(line);

            // Lines with dates or that look like degree names are likely new education entries
            const looksLikeDegree = line.includes('Master') || line.includes('Bachelor') ||
                line.includes('Degree') || line.includes('University') ||
                line.includes('College') || line.includes('Internship');

            if (looksLikeDegree || (!currentEdu && line.length > 10)) {
                // Save previous education if exists
                if (currentEdu) {
                    education.push(currentEdu);
                }

                // Create new education entry
                const dateMatch = line.match(datePattern);
                let institution = '';
                let degree = '';
                let field = '';
                let dates = dateMatch ? dateMatch[0] : '';

                // Try to extract institution and degree
                if (line.includes('University') || line.includes('College')) {
                    institution = line.replace(datePattern, '').trim();
                } else {
                    degree = line.replace(datePattern, '').trim();
                }

                currentEdu = {
                    id: crypto.randomUUID(),
                    institution: institution || 'Institution',
                    degree: degree || '',
                    field: field,
                    startDate: '',
                    endDate: '',
                    gpa: ''
                };

                // Parse dates
                if (dates.includes('-')) {
                    const parts = dates.split('-').map(p => p.trim());
                    currentEdu.startDate = parts[0];
                    currentEdu.endDate = parts[1];
                } else if (dates) {
                    currentEdu.endDate = dates;
                }
            } else if (currentEdu) {
                // Additional info for current education
                if (!currentEdu.degree && line.includes('Degree')) {
                    currentEdu.degree = line.replace(datePattern, '').trim();
                } else if (!currentEdu.institution && line.length > 10) {
                    currentEdu.institution = line.replace(datePattern, '').trim();
                } else if (!currentEdu.field && line.length > 5 && !hasDate) {
                    currentEdu.field = line.trim();
                }
            }
        }

        // Don't forget the last education entry
        if (currentEdu) {
            education.push(currentEdu);
        }

        // Fallback if no structured entries found
        if (education.length === 0) {
            education.push({
                id: crypto.randomUUID(),
                institution: 'Imported Education',
                degree: sections.education.join(', '),
                field: '',
                startDate: '',
                endDate: '',
                gpa: ''
            });
        }
    }

    // Parse Skills
    const skills = sections.skills.flatMap(line => line.split(/[,|•]/).map(s => s.trim()).filter(s => s));

    return {
        personalInfo: {
            name,
            email: emailMatch ? emailMatch[0] : '',
            phone: phoneMatch ? phoneMatch[0] : '',
            location,
            title,
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
