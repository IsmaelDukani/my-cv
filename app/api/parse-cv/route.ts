
// app/api/parse-cv/route.ts
// Next.js App Router API route (Node runtime) — pdfjs-dist/legacy + optional Gemini (Antigravity) fallback
import { NextRequest, NextResponse } from "next/server";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Disable worker in Node.js runtime (Vercel-safe)
if (typeof window === "undefined") {
    // @ts-ignore
    // pdfjs.GlobalWorkerOptions.workerSrc = undefined;
} else {
    pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.349/pdf.worker.min.js";
}

/**
 * Helper utilities
 */
function normalizeLine(s: string) {
    return (s || "").replace(/\s+/g, " ").trim();
}

// Normalize header strings for fuzzy matching (strip non-letters, lowercase)
function normalizeHeaderToken(s: string) {
    return normalizeLine(s).toLowerCase().replace(/[^a-z]/g, "");
}

function looksLikeNameCandidate(s: string) {
    if (!s) return false;
    const t = s.trim();
    if (/@|\+?\d{4,}|www\.|http:|https:|gmail|yahoo|linkedin|github/i.test(t)) return false;
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 4) return false;
    // prefer capitalized words or all-caps short name
    const capitalized = words.every(w => /^[A-ZÁÀÂÄÇÉÈÍÎÓÖØÙÛÝ][a-zA-ZÀ-ÖØ-öø-ÿ'’-]+$/.test(w));
    const allCaps = /^[A-Z\s.'’-]{3,40}$/.test(t);
    return capitalized || allCaps;
}

function extractNameFromHeader(lines: string[]) {
    // lines: array of normalized lines (header area)
    // Try combine consecutive single-word fragments if necessary
    for (const l of lines) {
        if (looksLikeNameCandidate(l)) return l;
    }

    // Try to stitch small fragments: e.g. "Ismael" "M." "Ismael"
    const header = lines.slice(0, 8).map(l => l.trim()).filter(Boolean);
    const fragments: string[] = [];
    for (const h of header) {
        // consider short alpha fragments (no digits, not contact)
        if (/^[A-Za-z'’-]{2,}$/.test(h) && !/@|\+?\d{3,}|gmail|@/.test(h)) {
            fragments.push(h);
            if (fragments.length >= 2 && fragments.length <= 4) {
                // return joined fragments if likely a name
                const candidate = fragments.join(" ");
                if (looksLikeNameCandidate(candidate)) return candidate;
            }
        } else {
            // reset fragments once a non-fragment appears
            if (fragments.length >= 2) break;
            fragments.length = 0;
        }
    }

    // fallback: first non-contact header line
    const firstNonContact = header.find(h => !/@|\+?\d{3,}|gmail|http|linkedin|github/i.test(h));
    return firstNonContact || "";
}

/**
 * Layout-aware extraction using pdfjs-dist/legacy
 * - Groups text items into rows using a y-tolerance estimated from font heights
 * - Sorts items left->right inside rows
 * - Attempts simple column detection with conservative thresholds
 */
async function extractLayoutText(buffer: Buffer) {
    const uint8Array = new Uint8Array(buffer);
    const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;

    const pages: Array<{ page: number; columns: number; text: string; rows: any[] }> = [];

    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 1 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;

        const content = await page.getTextContent({
            disableCombineTextItems: false,
        } as any);

        type Item = { str: string; x: number; y: number; width?: number; height?: number };

        const items: Item[] = [];

        for (const it of content.items as any[]) {
            const transform = it.transform || [1, 0, 0, 1, 0, 0];
            const raw = String(it.str || "");
            const str = raw.replace(/\s+/g, " ").trim();
            if (!str) continue;

            const x = transform[4];
            const y = transform[5];
            const height = Math.abs(transform[3]) || (it.height || 12);
            const topY = pageHeight - y;

            items.push({ str, x, y: topY, width: it.width || 0, height });
        }

        if (items.length === 0) {
            pages.push({ page: p, columns: 1, text: "", rows: [] });
            continue;
        }

        // group into rows by Y coordinate using median height tolerance
        const heights = items.map(i => i.height || 0).filter(Boolean).sort((a, b) => a - b);
        const median = heights.length ? heights[Math.floor(heights.length / 2)] : 12;
        const yTolerance = Math.max(3, Math.round(median * 0.6));

        const rows: Array<{ y: number; items: Item[] }> = [];
        const sortedByY = items.slice().sort((a, b) => a.y - b.y);
        for (const it of sortedByY) {
            const found = rows.find(r => Math.abs(r.y - it.y) <= yTolerance);
            if (found) {
                found.items.push(it);
                found.y = (found.y * (found.items.length - 1) + it.y) / found.items.length;
            } else {
                rows.push({ y: it.y, items: [it] });
            }
        }

        rows.sort((a, b) => a.y - b.y);
        rows.forEach(r => r.items.sort((a, b) => a.x - b.x));

        // conservative multi-column detection
        const firstXs = rows.map(r => r.items[0]?.x || 0);
        let columns = 1;
        if (rows.length >= 18) {
            const minX = Math.min(...firstXs);
            const maxX = Math.max(...firstXs);
            const spread = maxX - minX;
            if (spread > pageWidth * 0.38 && rows.length >= 25) {
                // basic bucketing
                const buckets = 10;
                const counts = new Array(buckets).fill(0);
                for (const x of firstXs) {
                    const idx = Math.min(buckets - 1, Math.floor(((x - minX) / (spread || 1)) * buckets));
                    counts[idx]++;
                }
                const peaks = counts.reduce((acc: number[], v, i) => { if (v >= 2) acc.push(i); return acc; }, []);
                const left = peaks.some(i => i < buckets * 0.45);
                const right = peaks.some(i => i > buckets * 0.55);
                if (left && right) columns = 2;
            }
        }

        let pageText = "";
        if (columns === 1) {
            // join lines with paragraph detection
            let prevY = -Infinity;
            for (const r of rows) {
                const line = r.items.map(it => it.str).join(" ").replace(/\s+/g, " ").trim();
                if (!line) continue;
                const gap = prevY === -Infinity ? 0 : r.y - prevY;
                const isParagraph = gap > median * 1.8;
                if (pageText && isParagraph) pageText += "\n\n" + line;
                else if (pageText) pageText += " " + line;
                else pageText = line;
                prevY = r.y;
            }
        } else {
            // simple two-column: collect left and right lines separately
            const sortedXs = firstXs.slice().sort((a, b) => a - b);
            const midIndex = Math.floor(sortedXs.length / 2);
            const divider = (sortedXs[Math.max(0, midIndex - 1)] + sortedXs[midIndex]) / 2;
            const leftLines: string[] = [];
            const rightLines: string[] = [];
            for (const r of rows) {
                const leftItems = r.items.filter(it => it.x <= divider + 4);
                const rightItems = r.items.filter(it => it.x > divider - 4);
                const leftText = leftItems.map(it => it.str).join(" ").trim();
                const rightText = rightItems.map(it => it.str).join(" ").trim();
                if (leftText) leftLines.push(leftText);
                if (rightText) rightLines.push(rightText);
            }
            pageText = leftLines.join("\n") + "\n\n" + rightLines.join("\n");
        }

        pages.push({ page: p, columns, text: pageText.trim(), rows });
    }

    // combine pages with separator
    const finalText = pages.map(pg => pg.text).join("\n\n---PAGE_BREAK---\n\n");
    await pdf.destroy();
    return { finalText, pages };
}

/**
 * Parse readable text into structured CV fields
 * - robust header/name extraction
 * - fuzzy section detection with normalized tokens
 * - improved experience and education heuristics
 */
function parseCvText(readableText: string) {
    const pages = readableText.split("\n\n---PAGE_BREAK---\n\n");
    const allLines = pages
        .map(p => p.split(/\r?\n/))
        .flat()
        .map(l => normalizeLine(l))
        .filter(Boolean);

    // common patterns
    const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/;
    const phoneRe = /(\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3}[-.\s]?\d{2,4}([-.\s]?\d{2,4})?/;
    const linkedinRe = /(https?:\/\/)?(www\.)?linkedin\.com\/[^\s,;]*/i;
    const githubRe = /(https?:\/\/)?(www\.)?github\.com\/[^\s,;]*/i;

    // top header zone
    const headerZone = allLines.slice(0, 10);
    let name = extractNameFromHeader(headerZone) || "";

    // find email/phone/link anywhere
    const fullText = allLines.join(" ");
    const emailMatch = fullText.match(emailRe);
    const phoneMatch = fullText.match(phoneRe);
    const linkedinMatch = fullText.match(linkedinRe);
    const githubMatch = fullText.match(githubRe);

    // Section detection using normalized tokens
    const sectionKeywords: { [key: string]: string[] } = {
        summary: ["professionalsummary", "summary", "profile", "objective", "about"],
        experience: ["workexperience", "experience", "employment", "professionalexperience", "workhistory"],
        education: ["education", "academic", "university", "college", "degree"],
        skills: ["skills", "technicalskills", "skillset", "competencies"],
        languages: ["languages", "language"],
        additional: ["additionalinformation", "certifications", "certificates", "awards"],
    };

    const sectionAtLine: { [idx: number]: string } = {};
    for (let i = 0; i < allLines.length; i++) {
        const token = normalizeHeaderToken(allLines[i]);
        for (const sec in sectionKeywords) {
            for (const kw of sectionKeywords[sec]) {
                if (token === kw || token.indexOf(kw) !== -1) {
                    sectionAtLine[i] = sec;
                }
            }
        }
    }

    // collect into sections (header until first section becomes header)
    let firstSectionIndex = allLines.findIndex((_, idx) => sectionAtLine[idx] !== undefined);
    if (firstSectionIndex === -1) firstSectionIndex = Math.min(allLines.length, 8);

    const sections: { [k: string]: string[] } = {
        header: [],
        summary: [],
        experience: [],
        education: [],
        skills: [],
        languages: [],
        additional: [],
        other: [],
    };

    for (let i = 0; i < firstSectionIndex; i++) sections.header.push(allLines[i]);

    let current = "other";
    for (let i = firstSectionIndex; i < allLines.length; i++) {
        if (sectionAtLine[i]) {
            current = sectionAtLine[i];
            continue;
        }
        sections[current] = sections[current] || [];
        sections[current].push(allLines[i]);
    }

    // Try refine name using header lines: prefer the earliest looksLikeNameCandidate
    if (!name) {
        const candidate = headerZone.find(l => looksLikeNameCandidate(l));
        if (candidate) name = candidate;
    }

    // Extract structured fields
    const email = emailMatch ? emailMatch[0] : "";
    const phone = phoneMatch ? phoneMatch[0].trim() : "";
    const linkedin = linkedinMatch ? (linkedinMatch[0].startsWith("http") ? linkedinMatch[0] : "https://" + linkedinMatch[0]) : "";
    const github = githubMatch ? (githubMatch[0].startsWith("http") ? githubMatch[0] : "https://" + githubMatch[0]) : "";

    // Skills parse: split heuristically
    const skillsText = sections.skills.join(", ") || sections.other.filter(l => /excel|power bi|python|tms|logistics|transport|kpi/i.test(l)).join(", ");
    const skills = skillsText.split(/[,;•|\n]/).map(s => normalizeLine(s)).filter(Boolean);

    // Languages parse
    const languages = (sections.languages.length ? sections.languages.join(", ") : "").split(/[,;•]/).map(s => normalizeLine(s)).filter(Boolean);

    // Experiences: improved date detection & grouping
    function parseExperiences(lines: string[]) {
        const dateRangeRegex = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4})\s*[-–—]\s*(Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4})/i;
        const exps: any[] = [];
        let current: any = null;
        for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            const dateMatch = l.match(dateRangeRegex);
            if (dateMatch) {
                if (current) exps.push(current);
                const dateRange = dateMatch[0];
                const [startRaw, endRaw] = dateRange.split(/[-–—]/).map(s => s.trim());
                const left = l.replace(dateRange, "").trim().replace(/\|/g, " - ");
                // try split left into position and company
                let position = "";
                let company = "";
                if (/ - | — | – /.test(left)) {
                    const parts = left.split(/ - | — | – /).map(s => s.trim()).filter(Boolean);
                    position = parts[0] || "";
                    company = parts.slice(1).join(" ") || "";
                } else {
                    const parts = left.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
                    if (parts.length >= 2) { position = parts[0]; company = parts.slice(1).join(" "); }
                    else {
                        const alt = left.split(/,| at /i).map(s => s.trim()).filter(Boolean);
                        position = alt[0] || "";
                        company = alt[1] || "";
                    }
                }
                current = {
                    id: Math.random().toString(36).slice(2, 9),
                    position: position || "Position",
                    company: company || "Company",
                    startDate: startRaw || "",
                    endDate: endRaw || "",
                    current: /present/i.test(endRaw || ""),
                    bullets: [],
                };
            } else if (current) {
                // treat short lines and bullet lines as bullets
                if (/^[\-\u2022\*]/.test(l) || l.length < 140) {
                    current.bullets.push(l.replace(/^[\-\u2022\*]\s?/, ""));
                } else {
                    current.bullets.push(l);
                }
            } else {
                // before first dated experience — ignore or store elsewhere
            }
        }
        if (current) exps.push(current);

        // fallback grouping if none found
        if (exps.length === 0 && lines.length) {
            for (let i = 0; i < lines.length; i += 3) {
                const slice = lines.slice(i, i + 3);
                exps.push({
                    id: Math.random().toString(36).slice(2, 9),
                    position: slice[0] || "Position",
                    company: slice[1] || "Company",
                    startDate: "",
                    endDate: "",
                    current: false,
                    bullets: slice.slice(2),
                });
            }
        }
        return exps;
    }

    const experiences = parseExperiences(sections.experience);

    function parseEducation(lines: string[]) {
        const out: any[] = [];
        const yearRe = /(\d{4})/;
        for (const l of lines) {
            if (/(university|college|degree|master|bachelor|msc|m\.sc|b\.sc|phd|diploma|faculty)/i.test(l) || yearRe.test(l)) {
                out.push({ id: Math.random().toString(36).slice(2, 9), institution: l, degree: "", startDate: "", endDate: "" });
            }
        }
        if (out.length === 0 && lines.length) {
            out.push({ id: Math.random().toString(36).slice(2, 9), institution: lines.slice(0, 2).join(" "), degree: "", startDate: "", endDate: "" });
        }
        return out;
    }

    const education = parseEducation(sections.education);

    return {
        personalInfo: {
            name,
            title: sections.header.slice(1, 3).find(l => l.length < 80 && !email && !phone) || "",
            email: emailMatch ? emailMatch[0] : "",
            phone: phoneMatch ? phoneMatch[0] : "",
            linkedin: linkedinMatch ? (linkedinMatch[0].startsWith("http") ? linkedinMatch[0] : "https://" + linkedinMatch[0]) : "",
            github: githubMatch ? (githubMatch[0].startsWith("http") ? githubMatch[0] : "https://" + githubMatch[0]) : "",
            summary: sections.summary.join(" "),
            headerLines: sections.header,
        },
        experiences,
        education,
        skills,
        languages,
        additional: sections.additional,
        rawLines: allLines.slice(0, 500),
    };
}

/**
 * Gemini (Antigravity) Vision fallback helper (OPTIONAL)
 * - This function demonstrates how to send a request to a Gemini/Antigravity endpoint.
 * - The exact endpoint and auth method depend on your Antigravity setup — replace the URL and headers below.
 *
 * IMPORTANT:
 * - To enable the fallback set environment variable: ENABLE_GEMINI_FALLBACK=1
 * - Set GEMINI_ENDPOINT and GEMINI_API_KEY in your environment.
 *
 * Behavior:
 * - If a crucial section (name or education or experience) is missing or suspicious, we call Gemini
 * - We send either page images (recommended) or the raw PDF base64 (if images not available)
 * - Gemini should return structured JSON or plain text that we parse into structured fields
 */
async function callGeminiFallback(pdfBuffer: Buffer, debugNote = ""): Promise<any> {
    if (!process.env.ENABLE_GEMINI_FALLBACK) {
        return { error: "Gemini fallback disabled" };
    }
    const GEMINI_ENDPOINT = process.env.GEMINI_ENDPOINT || ""; // e.g., Antigravity agent url
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

    if (!GEMINI_ENDPOINT || !GEMINI_API_KEY) {
        return { error: "Gemini endpoint/key not configured" };
    }

    // send minimal request: base64 pdf and instruction prompt
    const pdfBase64 = pdfBuffer.toString("base64");

    const prompt = `You are Antigravity (Gemini) CV extractor. Input: base64 PDF.
Task:
1) Extract full structured fields: name, title, email, phone, linkedin, github, summary, experiences (position, company, startDate, endDate, bullets), education (institution, degree, dates), skills, languages.
2) Return a single valid JSON object only (no extra commentary). If a field is unknown, return empty string or empty array.

Return format:
{
  "personalInfo": { "name":"", "title":"", "email":"", "phone":"", "linkedin":"", "github":"", "summary":"" },
  "experiences": [ { "position":"", "company":"", "startDate":"", "endDate":"", "bullets":[...] } ],
  "education": [ { "institution":"", "degree":"", "startDate":"", "endDate":"" } ],
  "skills": [ "skill1", "skill2" ],
  "languages": [ "English", "Arabic" ]
}

Debug note: ${debugNote}
`;

    // POST to Antigravity agent
    try {
        const res = await fetch(GEMINI_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GEMINI_API_KEY}`,
            },
            body: JSON.stringify({ prompt, pdf_base64: pdfBase64 }),
            // adjust timeout or keep default
        });

        if (!res.ok) {
            const text = await res.text();
            return { error: `Gemini returned ${res.status}: ${text}` };
        }

        const json = await res.json();
        // Expect json to be a structured object per prompt
        return json;
    } catch (err: any) {
        return { error: String(err) };
    }
}

/**
 * Main API handler
 */
export async function POST(req: NextRequest) {
    try {
        const form = await req.formData();
        const file = form.get("file") as File | null;
        if (!file) {
            return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
        }
        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json({ success: false, error: "Only PDF files supported" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Step 1: extract layout-aware text using pdfjs-dist/legacy
        const { finalText, pages } = await extractLayoutText(buffer);

        // Step 2: parse extracted text
        const parsed = parseCvText(finalText);

        // Step 3: decide whether fallback is needed (e.g., missing name or no experiences/education)
        const needFallback =
            (!parsed.personalInfo.name || parsed.personalInfo.name.length < 3) ||
            parsed.experiences.length === 0 ||
            parsed.education.length === 0;

        let fallbackResult: any = null;
        if (needFallback && process.env.ENABLE_GEMINI_FALLBACK) {
            fallbackResult = await callGeminiFallback(buffer, "fallback due to missing fields");
            // If fallback returned structured result, merge selectively (fallback wins missing sections)
            if (fallbackResult && !fallbackResult.error) {
                // Merge name
                if ((!parsed.personalInfo.name || parsed.personalInfo.name.length < 3) && fallbackResult.personalInfo?.name) {
                    parsed.personalInfo.name = fallbackResult.personalInfo.name;
                }
                // Merge experiences if missing
                if ((parsed.experiences || []).length === 0 && Array.isArray(fallbackResult.experiences)) {
                    parsed.experiences = fallbackResult.experiences;
                }
                // Merge education
                if ((parsed.education || []).length === 0 && Array.isArray(fallbackResult.education)) {
                    parsed.education = fallbackResult.education;
                }
                // Merge skills/languages
                if ((!parsed.skills || parsed.skills.length === 0) && Array.isArray(fallbackResult.skills)) {
                    parsed.skills = fallbackResult.skills;
                }
                if ((!parsed.languages || parsed.languages.length === 0) && Array.isArray(fallbackResult.languages)) {
                    parsed.languages = fallbackResult.languages;
                }
            }
        }

        const debug = {
            pagesSummary: pages.slice(0, 4).map(p => ({ page: p.page, columns: p.columns, rows: p.rows?.length || 0 })),
            needFallback,
            fallbackResult: fallbackResult ? (fallbackResult.error ? fallbackResult : { ok: true }) : null,
        };

        return NextResponse.json({ success: true, data: parsed, debug }, { status: 200 });
    } catch (err: any) {
        console.error("parse error", err);
        return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    console.log(`GET handler called for ${req.url}`);
    return NextResponse.json(
        { success: false, error: "Method not allowed. Please use POST with a file upload." },
        { status: 405 }
    );
}
