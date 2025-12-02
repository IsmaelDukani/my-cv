import { NextRequest, NextResponse } from 'next/server';

// Configure runtime for Vercel serverless functions
export const runtime = 'nodejs';
export const maxDuration = 30; // Allow up to 30 seconds for PDF processing

// Dynamic import for pdfjs-dist to ensure it's loaded correctly in the serverless environment
let pdfjsLib: any = null;

async function getPdfjsLib() {
    if (!pdfjsLib) {
        try {
            // Import the Node.js compatible version of pdfjs-dist
            pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

            // Set the worker source to null for server-side processing
            pdfjsLib.GlobalWorkerOptions.workerSrc = null;
        } catch (error) {
            console.error('Failed to load pdfjs-dist:', error);
            throw new Error('PDF.js library not available. Please ensure it is installed: npm install pdfjs-dist');
        }
    }
    return pdfjsLib;
}

/**
 * Extract text from PDF buffer using pdfjs-dist
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
        const { getDocument } = await getPdfjsLib();

        // The buffer needs to be converted to a Uint8Array for pdfjs-dist
        const uint8Array = new Uint8Array(buffer);

        const pdf = await getDocument({
            data: uint8Array,
            useWorkerFetch: false, // Important for server-side
        }).promise;

        let fullText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Join text items with a space
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
        }

        if (!fullText || fullText.trim().length === 0) {
            throw new Error('No text content extracted from PDF');
        }

        console.log(`Successfully extracted ${fullText.length} characters from PDF`);
        return fullText;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw error;
    }
}

/**
 * Parse CV text and extract structured data
 */
function parseCvText(text: string): any {
    try {
        const lines = text
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && line.length > 0);

        if (lines.length === 0) {
            throw new Error('No text lines extracted');
        }

        // Section splitting logic
        const sections: { [key: string]: string[] } = {
            personalInfo: [],
            summary: [],
            experience: [],
            education: [],
            skills: [],
            languages: [],
            other: [],
        };

        let currentSection = 'personalInfo';

        const sectionKeywords: { [key: string]: string[] } = {
            summary: ['professional summary', 'summary', 'profile', 'objective', 'about', 'overview', 'executive summary'],
            experience: ['work experience', 'experience', 'employment', 'history', 'career', 'professional experience', 'work history'],
            education: ['education', 'academic', 'degree', 'university', 'college', 'qualification', 'certifications'],
            skills: ['skills', 'abilities', 'competencies', 'technical skills', 'expertise', 'core competencies'],
            languages: ['languages', 'language proficiency', 'language skills', 'linguistic'],
        };

        for (const line of lines) {
            let isSectionHeader = false;
            const lowerLine = line.toLowerCase();
            for (const section in sectionKeywords) {
                if (sectionKeywords[section].some((keyword) => lowerLine.includes(keyword) && (line === line.toUpperCase() || line.split(' ').length <= 5))) {
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

        let name = sections.personalInfo[0] || lines[0] || 'Your Name';
        let title = sections.personalInfo[1] || 'Your Title';
        let location = 'Your Location';

        // Simplified return for demonstration:
        return {
            personalInfo: {
                name: name || 'Your Name',
                email: emailMatch ? emailMatch[0] : '',
                phone: phoneMatch ? phoneMatch[0] : '',
                location: location || 'Your Location',
                title: title || 'Your Title',
                summary: sections.summary.join('\n') || '',
                linkedin: linkedinMatch ? `https://${linkedinMatch[0]}` : '',
                github: githubMatch ? `https://${githubMatch[0]}` : '',
            },
            experiences: [], // Placeholder for full parsed experiences
            education: [], // Placeholder for full parsed education
            skills: sections.skills.join(', ').split(/[,|•\n]/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 100),
            languages: sections.languages.map((line) => line.trim()).filter((line) => line.length > 1),
        };
    } catch (error) {
        console.error('Error parsing CV text:', error);
        throw error;
    }
}

/**
 * POST handler for CV parsing
 */
export async function POST(request: NextRequest) {
    try {
        console.log('Received CV parsing request');

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        console.log(`Processing file: ${file.name}, size: ${file.size} bytes`);

        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.pdf')) {
            return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log('Extracting text from PDF...');
        const extractedText = await extractTextFromPdf(buffer);

        console.log('Parsing CV data...');
        const cvData = parseCvText(extractedText);

        console.log('CV parsing completed successfully');

        return NextResponse.json({ success: true, data: cvData }, { status: 200 });
    } catch (error) {
        console.error('Error in CV parsing endpoint:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                message: 'Failed to parse CV. Please ensure the file is a valid PDF and that "pdfjs-dist" is installed.',
            },
            { status: 500 }
        );
    }
}
