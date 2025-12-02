// app/api/parse-cv/route.ts
// FULL FINAL VERSION — VERCEL SAFE — NODE RUNTIME — READY FOR PRODUCTION

import { NextRequest, NextResponse } from "next/server";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// =========================================
// RUNTIME CONFIG
// =========================================
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Disable pdf.js workers in Node runtime (fixes workerSrc error in Vercel)
if (typeof window === "undefined") {
    // @ts-ignore
    // pdfjs.GlobalWorkerOptions.workerSrc = undefined; // Antigravity: Commented out to prevent crash in pdfjs-dist v5
} else {
    pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.349/pdf.worker.min.js";
}

// =========================================
// SMALL UTILITIES
// =========================================
function normalizeLine(s: string) {
    return (s || "").replace(/\s+/g, " ").trim();
}
function normalizeHeaderToken(s: string) {
    return normalizeLine(s).toLowerCase().replace(/[^a-z]/g, "");
}
function looksLikeNameCandidate(s: string) {
    if (!s) return false;
    const t = s.trim();
    if (/@|\+?\d{4,}|www\.|http:|https:|gmail|yahoo|linkedin|github/i.test(t)) return false;

    const words = t.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 4) return false;

    const capitalized = words.every(w =>
        /^[A-ZÁÀÂÄÇÉÈÍÎÓÖØÙÛÝ][a-zA-ZÀ-ÖØ-öø-ÿ'’-]+$/.test(w)
    );
    const allCaps = /^[A-Z\s.'’-]{3,40}$/.test(t);

    return capitalized || allCaps;
}
function extractNameFromHeader(lines: string[]) {
    for (const l of lines) {
        if (looksLikeNameCandidate(l)) return l;
    }

    const header = lines.slice(0, 8).map(l => l.trim()).filter(Boolean);
    const fragments: string[] = [];

    for (const h of header) {
        if (/^[A-Za-z'’-]{2,}$/.test(h) && !/@|\+?\d{3,}/.test(h)) {
            fragments.push(h);
            if (fragments.length >= 2 && fragments.length <= 4) {
                const candidate = fragments.join(" ");
                if (looksLikeNameCandidate(candidate)) return candidate;
            }
        } else {
            if (fragments.length >= 2) break;
            fragments.length = 0;
        }
    }

    const fallback = header.find(h => !/@|\+?\d{3,}|gmail|http|linkedin|github/i.test(h));
    return fallback || "";
}

// =========================================
// PDF → TEXT (LAYOUT-AWARE)
// =========================================
async function extractLayoutText(buffer: Buffer) {
    const uint8 = new Uint8Array(buffer);
    const pdf = await pdfjs.getDocument({ data: uint8 }).promise;

    const pages: Array<any> = [];

    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 1 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;

        const content = await page.getTextContent({ disableCombineTextItems: false } as any);

        const items: any[] = [];
        for (const it of content.items as any[]) {
            const t = it.transform || [1, 0, 0, 1, 0, 0];
            const raw = String(it.str || "").replace(/\s+/g, " ").trim();
            if (!raw) continue;

            const x = t[4];
            const y = pageHeight - t[5];
            const height = Math.abs(t[3]) || it.height || 12;

            items.push({ str: raw, x, y, height });
        }

        if (items.length === 0) {
            pages.push({ page: p, columns: 1, text: "", rows: [] });
            continue;
        }

        const heights = items.map(i => i.height).sort((a, b) => a - b);
        const median = heights[Math.floor(heights.length / 2)] || 12;
        const tolerance = Math.max(3, Math.round(median * 0.6));

        const rows: any[] = [];
        const byY = items.slice().sort((a, b) => a.y - b.y);

        for (const it of byY) {
            const row = rows.find(r => Math.abs(r.y - it.y) <= tolerance);
            if (row) {
                row.items.push(it);
                row.y = (row.y * (row.items.length - 1) + it.y) / row.items.length;
            } else {
                rows.push({ y: it.y, items: [it] });
            }
        }

        rows.sort((a, b) => a.y - b.y);
        rows.forEach(r => r.items.sort((a, b) => a.x - b.x));

        const firstXs = rows.map(r => r.items[0]?.x || 0);
        let columns = 1;

        if (rows.length >= 18) {
            const minX = Math.min(...firstXs);
            const maxX = Math.max(...firstXs);
            const spread = maxX - minX;
            if (spread > pageWidth * 0.38 && rows.length >= 25) {
                columns = 2;
            }
        }

        let text = "";
        if (columns === 1) {
            let prevY = -Infinity;
            for (const r of rows) {
                const line = r.items.map(i => i.str).join(" ").trim();
                if (!line) continue;

                const gap = prevY === -Infinity ? 0 : r.y - prevY;
                const isParagraph = gap > median * 1.8;

                if (text && isParagraph) text += "\n\n" + line;
                else if (text) text += " " + line;
                else text = line;

                prevY = r.y;
            }
        } else {
            const sorted = firstXs.slice().sort((a, b) => a - b);
            const divider =
                (sorted[Math.floor(sorted.length / 2) - 1] +
                    sorted[Math.floor(sorted.length / 2)]) / 2;

            const left: string[] = [];
            const right: string[] = [];

            for (const r of rows) {
                const leftText = r.items.filter(i => i.x <= divider).map(i => i.str).join(" ");
                const rightText = r.items.filter(i => i.x > divider).map(i => i.str).join(" ");

                if (leftText.trim()) left.push(leftText.trim());
                if (rightText.trim()) right.push(rightText.trim());
            }

            text = left.join("\n") + "\n\n" + right.join("\n");
        }

        pages.push({ page: p, columns, text, rows });
    }

    const finalText = pages.map(p => p.text).join("\n\n---PAGE_BREAK---\n\n");
    await pdf.destroy();

    return { finalText, pages };
}

// =========================================
// PARSE CV TEXT → STRUCTURED DATA
// =========================================
function parseCvText(readable: string) {
    const pages = readable.split("\n\n---PAGE_BREAK---\n\n");
    const allLines = pages
        .map(p => p.split(/\r?\n/))
        .flat()
        .map(l => normalizeLine(l))
        .filter(Boolean);

    const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/;
    const phoneRe = /(\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3}[-.\s]?\d{2,4}/;
    const linkedinRe = /(https?:\/\/)?(www\.)?linkedin\.com\/[^\s]+/i;
    const githubRe = /(https?:\/\/)?(www\.)?github\.com\/[^\s]+/i;

    const headerZone = allLines.slice(0, 10);
    let name = extractNameFromHeader(headerZone);

    const fullText = allLines.join(" ");
    const email = emailRe.exec(fullText)?.[0] || "";
    const phone = phoneRe.exec(fullText)?.[0] || "";
    const linkedin = linkedinRe.exec(fullText)?.[0] || "";
    const github = githubRe.exec(fullText)?.[0] || "";

    // --- section classification ---
    const sectionKeywords: Record<string, string[]> = {
        summary: ["summary", "profile", "objective", "about"],
        experience: ["experience", "employment", "workhistory", "professionalexperience"],
        education: ["education", "academic", "university", "degree"],
        skills: ["skills", "technicalskills"],
        languages: ["languages"],
        additional: ["certifications", "awards", "additional"],
    };

    const sectionAtLine: Record<number, string> = {};
    for (let i = 0; i < allLines.length; i++) {
        const token = normalizeHeaderToken(allLines[i]);
        for (const sec in sectionKeywords) {
            for (const kw of sectionKeywords[sec]) {
                if (token === kw || token.includes(kw)) sectionAtLine[i] = sec;
            }
        }
    }

    let firstSection = allLines.findIndex((_, i) => sectionAtLine[i]);
    if (firstSection === -1) firstSection = Math.min(8, allLines.length);

    const sections: Record<string, string[]> = {
        header: [],
        summary: [],
        experience: [],
        education: [],
        skills: [],
        languages: [],
        additional: [],
        other: [],
    };

    for (let i = 0; i < firstSection; i++) sections.header.push(allLines[i]);

    let current = "other";
    for (let i = firstSection; i < allLines.length; i++) {
        if (sectionAtLine[i]) {
            current = sectionAtLine[i];
        } else {
            sections[current].push(allLines[i]);
        }
    }

    if (!name) {
        const candidate = headerZone.find(looksLikeNameCandidate);
        if (candidate) name = candidate;
    }

    // ------- skills parse -------
    const skills = (sections.skills.join(", ") || "")
        .split(/[,;•|]/)
        .map(normalizeLine)
        .filter(Boolean);

    const languages = (sections.languages.join(", ") || "")
        .split(/[,;•]/)
        .map(normalizeLine)
        .filter(Boolean);

    // ------- experiences -------
    function parseExperiences(lines: string[]) {
        const dateRangeRegex =
            /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4})\s*[-–—]\s*(Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4})/i;

        const exps: any[] = [];
        let currentExp: any = null;

        for (const l of lines) {
            const match = l.match(dateRangeRegex);
            if (match) {
                if (currentExp) exps.push(currentExp);

                const range = match[0];
                const [start, end] = range.split(/[-–—]/).map(s => s.trim());
                const left = l.replace(range, "").replace(/\|/g, "-").trim();

                let position = "";
                let company = "";

                if (/ - /.test(left)) {
                    const [pos, comp] = left.split(/ - /).map(s => s.trim());
                    position = pos;
                    company = comp;
                } else {
                    const parts = left.split(/,| at /i).map(s => s.trim());
                    position = parts[0] || "";
                    company = parts[1] || "";
                }

                currentExp = {
                    id: Math.random().toString(36).slice(2, 9),
                    position,
                    company,
                    startDate: start,
                    endDate: end,
                    current: /present/i.test(end),
                    bullets: [],
                };
            } else if (currentExp) {
                currentExp.bullets.push(l.replace(/^[•\-*]\s?/, ""));
            }
        }
        if (currentExp) exps.push(currentExp);

        return exps;
    }

    const experiences = parseExperiences(sections.experience);

    function parseEducation(lines: string[]) {
        const out: any[] = [];
        for (const l of lines) {
            if (/university|college|degree|bachelor|master|diploma|faculty/i.test(l)) {
                out.push({
                    id: Math.random().toString(36).slice(2, 9),
                    institution: l,
                    degree: "",
                    startDate: "",
                    endDate: "",
                });
            }
        }
        return out;
    }

    const education = parseEducation(sections.education);

    return {
        personalInfo: {
            name,
            title: sections.header[1] || "",
            email,
            phone,
            linkedin,
            github,
            summary: sections.summary.join(" "),
            headerLines: sections.header,
        },
        experiences,
        education,
        skills,
        languages,
        additional: sections.additional,
        rawLines: allLines,
    };
}

// =========================================
// OPTIONAL GEMINI (Antigravity) FALLBACK
// =========================================
async function callGeminiFallback(buffer: Buffer, debug = "") {
    if (!process.env.ENABLE_GEMINI_FALLBACK) return null;

    const endpoint = process.env.GEMINI_ENDPOINT || "";
    const key = process.env.GEMINI_API_KEY || "";
    if (!endpoint || !key) return null;

    const base64 = buffer.toString("base64");

    const prompt = `
Extract CV into structured JSON:
{ "personalInfo": {...}, "experiences":[...], "education":[...], "skills":[], "languages":[] }
Only return JSON.
Debug: ${debug}
`;

    try {
        const r = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({ prompt, pdf_base64: base64 }),
        });

        if (!r.ok) return null;
        return await r.json();
    } catch {
        return null;
    }
}

// =========================================
// MAIN ROUTE HANDLER
// =========================================
export async function POST(req: NextRequest) {
    try {
        const form = await req.formData();
        const file = form.get("file") as File;

        if (!file)
            return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });

        if (!file.name.toLowerCase().endsWith(".pdf"))
            return NextResponse.json({ success: false, error: "Only PDF files allowed" }, { status: 400 });

        const buf = Buffer.from(await file.arrayBuffer());

        // 1) extract PDF text
        const { finalText } = await extractLayoutText(buf);

        // 2) parse into structured data
        let parsed = parseCvText(finalText);

        // 3) If crucial fields missing → Gemini fallback
        const needsFallback =
            !parsed.personalInfo.name ||
            parsed.experiences.length === 0 ||
            parsed.education.length === 0;

        if (needsFallback) {
            const gem = await callGeminiFallback(buf, "missing sections");
            if (gem) parsed = gem;
        }

        return NextResponse.json({ success: true, data: parsed });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: String(err) },
            { status: 500 }
        );
    }
}

// Antigravity: Added GET handler to help debug 405 errors
export async function GET() {
    return NextResponse.json(
        { success: false, error: "Method not allowed. Please use POST with a file upload." },
        { status: 405 }
    );
}
