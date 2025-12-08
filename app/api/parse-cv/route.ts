import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function callAIExtractor(pdfBuffer: Buffer) {
    const endpoint = process.env.GEMINI_ENDPOINT;
    const key = process.env.GOOGLE_AI_API_KEY;

    if (!endpoint || !key) return { error: "Missing API credentials" };

    const base64Data = pdfBuffer.toString("base64");

    // UPDATED PROMPT
    const prompt = `
    You are an expert CV parser.
    Analyze the attached PDF resume and extract the data into JSON.
    
    CRITICAL INSTRUCTIONS:
    1. **Professional Title**: Look specifically at the top of the document (header), usually below or next to the Name, for a Professional Title (e.g., "Logistics Representative", "Full Stack Developer"). Map this to "jobTitle".
    2. **Education Formatting**: 
       - Merge lines to form the complete Degree name.
       - **REMOVE** isolated words like "in", "at", or "of" if they appear on their own line due to PDF formatting.
       - Example: "Master's Degree [newline] in [newline] Business" -> "Master's Degree in Business".
       - Do not leave "in" as a dangling part of the date or location.
    3. **Dates**: Normalize all dates to "YYYY-MM" or "Present".
    4. **Summary**: If the text is fragmented, reconstruct it into coherent sentences.

    Return ONLY valid JSON matching this schema:
    {
      "personalInfo": { 
        "name": "", 
        "jobTitle": "", 
        "email": "", 
        "phone": "", 
        "linkedin": "", 
        "github": "", 
        "summary": "" 
      },
      "experiences": [ 
        { 
          "company": "", 
          "position": "", 
          "startDate": "", 
          "endDate": "", 
          "location": "", 
          "bullets": [] 
        } 
      ],
      "education": [ 
        { 
          "institution": "", 
          "degree": "", 
          "startDate": "", 
          "endDate": "", 
          "location": "" 
        } 
      ],
      "skills": [],
      "languages": []
    }
    `;

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inline_data: {
                        mime_type: "application/pdf",
                        data: base64Data
                    }
                }
            ]
        }]
    };

    try {
        const res = await fetch(`${endpoint}?key=${key}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const text = await res.text();

        if (!res.ok) {
            console.error("Gemini API Error:", res.status, text);
            return { error: `Gemini Error: ${res.status}`, details: text };
        }

        const responseJson = JSON.parse(text);
        const candidate = responseJson.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!candidate) throw new Error("No content generated");

        const cleanJson = candidate.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson);

    } catch (e: any) {
        return { error: "Parsing failed", details: e.message };
    }
}

export async function POST(req: NextRequest) {
    try {
        const form = await req.formData();
        const file = form.get("file") as File | null;
        if (!file) return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const data = await callAIExtractor(buffer);

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}