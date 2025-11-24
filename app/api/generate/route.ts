import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export async function POST(req: Request) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json(
            { error: 'Gemini API key not configured' },
            { status: 500 }
        );
    }

    try {
        const { text, type, bullets } = await req.json();

        let prompt = '';
        if (type === 'summary') {
            prompt = `Rewrite the following professional summary to be more impactful, concise, and professional. Use active voice and strong action verbs. Return ONLY the rewritten text, no explanations or quotes.\n\nOriginal: "${text}"`;
        } else if (bullets) {
            prompt = `Rewrite the following resume bullet points to be more impactful, result-oriented, and professional. Use active voice and strong action verbs. Return the result as a JSON array of strings, e.g. ["bullet 1", "bullet 2"]. Do not include markdown formatting like \`\`\`json.\n\nOriginal bullets:\n${JSON.stringify(bullets)}`;
        } else {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Gemini API request failed');
        }

        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            throw new Error('No content generated');
        }

        if (type === 'summary') {
            return NextResponse.json({ rewritten: generatedText.trim() });
        } else {
            // Parse the JSON array from the response
            try {
                // Clean up potential markdown code blocks
                const cleanText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
                const rewrittenBullets = JSON.parse(cleanText);
                return NextResponse.json({ rewritten: rewrittenBullets });
            } catch (e) {
                console.error('Failed to parse bullets:', generatedText);
                // Fallback: split by newlines if JSON parse fails
                const fallbackBullets = generatedText.split('\n').map((line: string) => line.replace(/^[•-]\s*/, '').trim()).filter((line: string) => line.length > 0);
                return NextResponse.json({ rewritten: fallbackBullets });
            }
        }

    } catch (error: any) {
        console.error('AI Generation Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate content' },
            { status: 500 }
        );
    }
}
