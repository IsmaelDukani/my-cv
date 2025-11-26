import { NextResponse } from 'next/server';

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY?.trim();
const MODEL_NAME = 'gemini-1.5-flash-latest';

export async function POST(req: Request) {
    if (!GOOGLE_AI_API_KEY) {
        return NextResponse.json(
            { error: 'Google AI API key not configured' },
            { status: 500 }
        );
    }

    try {
        const { text, type, bullets } = await req.json();

        const systemPrompt = "You are a professional CV writer. Your goal is to rewrite text to be more impactful, concise, and result-oriented using active voice.";
        let userPrompt = "";

        if (type === 'summary') {
            userPrompt = `${systemPrompt}\n\nRewrite the following professional summary. Return ONLY the rewritten text, no explanations or quotes.\n\nOriginal: "${text}"`;
        } else if (bullets) {
            userPrompt = `${systemPrompt}\n\nRewrite the following resume bullet points. Return the result as a JSON array of strings, e.g. ["bullet 1", "bullet 2"]. Do not include markdown formatting like \`\`\`json.\n\nOriginal bullets:\n${JSON.stringify(bullets)}`;
        } else {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        console.log('Calling Google Gemini API...');

        const API_URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL_NAME}:generateContent?key=${GOOGLE_AI_API_KEY}`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: userPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google AI API Error:', errorData);
            throw new Error(errorData.error?.message || 'Google AI API request failed');
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
