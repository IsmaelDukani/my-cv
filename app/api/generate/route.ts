import { NextResponse } from 'next/server';

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY?.trim();
const API_URL = 'https://api.moonshot.cn/v1/chat/completions';

export async function POST(req: Request) {
    if (!MOONSHOT_API_KEY) {
        return NextResponse.json(
            { error: 'Moonshot API key not configured' },
            { status: 500 }
        );
    }

    try {
        const { text, type, bullets } = await req.json();

        let systemPrompt = "You are a professional CV writer. Your goal is to rewrite text to be more impactful, concise, and result-oriented using active voice.";
        let userPrompt = "";

        if (type === 'summary') {
            userPrompt = `Rewrite the following professional summary. Return ONLY the rewritten text, no explanations or quotes.\n\nOriginal: "${text}"`;
        } else if (bullets) {
            userPrompt = `Rewrite the following resume bullet points. Return the result as a JSON array of strings, e.g. ["bullet 1", "bullet 2"]. Do not include markdown formatting like \`\`\`json.\n\nOriginal bullets:\n${JSON.stringify(bullets)}`;
        } else {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        console.log('Calling Moonshot API with key:', MOONSHOT_API_KEY.substring(0, 5) + '...');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MOONSHOT_API_KEY}`
            },
            body: JSON.stringify({
                model: "moonshot-v1-8k",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Moonshot API Error:', errorData);
            throw new Error(errorData.error?.message || 'Moonshot API request failed');
        }

        const data = await response.json();
        const generatedText = data.choices?.[0]?.message?.content;

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
