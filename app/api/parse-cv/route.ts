import { NextRequest, NextResponse } from "next/server";
const pdfParse = require("pdf-parse");

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
    try {
        console.log("Received CV parsing request");

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        console.log(`Processing file: ${file.name}, size: ${file.size}`);

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json(
                { error: "Only PDF files are supported" },
                { status: 400 }
            );
        }

        // Convert File → Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log("Extracting text...");
        const result = await pdfParse(buffer);

        const extractedText = result.text;
        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error("No text was extracted from the PDF");
        }

        console.log(
            `Successfully extracted ${extractedText.length} characters`
        );

        // ---- Your custom text parser still works ----
        const cvData = parseCvText(extractedText);

        return NextResponse.json(
            { success: true, data: cvData },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("CV parsing failed:", error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to parse CV",
            },
            { status: 500 }
        );
    }
}

// ----------------------------------------------------
// Keep your existing parser exactly as it is:
function parseCvText(text: string) {
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

