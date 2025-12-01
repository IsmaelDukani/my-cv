// app/api/parse-cv/route.ts (Next.js App Router API - Node runtime)
import { NextRequest, NextResponse } from "next/server";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// configure pdfjs worker (works with legacy serverless build)
pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";

/**
 * Utilities and improved heuristics for robust CV parsing
 */

/** Normalize text: collapse whitespace, remove repeated spaces */
function normalizeLine(s: string) {
    return s.replace(/\s+/g, " ").trim();
}

/** Heuristic: is string likely a personal name? */
function looksLikeName(s: string) {
    if (!s) return false;
    const t = s.trim();

    // avoid lines containing email, phone, long numeric strings, or section keywords
    if (/[.@\d\/:]/.test(t)) return false;
    const lower = t.toLowerCase();
    const forbidden = [
        "curriculum vitae",
        "cv",
        "resume",
        "professional summary",
        "summary",
        "skills",
        "experience",
        "education",
        "work experience",
        "languages",
        "contact",
    ];
    for (const kw of forbidden) if (lower.includes(kw)) return false;

    // Prefer 2-4 words, each word with at least 2 letters
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 4) return false;
    if (!words.every((w) => /^[A-Za-zÀ-ÖØ-öø-ÿ'-]{2,}$/.test(w))) return false;

    // Good candidate
    return true;
}

/** Heuristic: short title/company detection */
function isShortTitleOrCompany(s: string) {
    if (!s) return false;
    const t = s.trim();
    // not an email/phone and length reasonable
    if (/[.@\d]/.test(t)) return false;
    return t.length > 3 && t.length < 60;
}

/**
 * Layout-aware text extraction
 * - convert PDF items into x/y
 * - group into rows by Y with tolerance based on median font height
 * - sort items in rows by X
 * - detect columns with more robust rules (require minimum rows, avoid false positives on page 1)
 *
 * Returns: pagesTextBlocks: Array<{page, columns, text, rows}>
 */
async function extractTextLayoutAware(buffer: Buffer) {
    const uint8Array = new Uint8Array(buffer);
    const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;

    const pagesTextBlocks: Array<{ page: number; columns?: number; text: string; rows?: any[] }> = [];

    // gather page processing promises to run concurrently
    const pagePromises = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        pagePromises.push((async () => {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1 });
            const pageWidth = viewport.width;
            const pageHeight = viewport.height;

            const content = await page.getTextContent({
                disableCombineTextItems: false,
            });

            type Item = { str: string; x: number; y: number; width?: number; height?: number };

            const items: Item[] = [];

            for (const it of content.items as any[]) {
                const transform = it.transform || [1, 0, 0, 1, 0, 0];
                let x = transform[4];
                let y = transform[5];
                const height = Math.abs(transform[3]) || (it.height ? it.height : 12);
                const topY = pageHeight - y;

                const raw = String(it.str || "");
                // attempt to repair hyphenated line fragments by keeping them (we'll join later)
                const str = raw.replace(/\s+/g, " ").trim();
                if (!str) continue;
                items.push({ str, x, y: topY, width: it.width || 0, height });
            }

            if (items.length === 0) {
                pagesTextBlocks.push({ page: pageNum, columns: 1, text: "" });
                return;
            }

            // estimate median height for tolerance
            const heights = items.map((i) => i.height || 0).filter(Boolean).sort((a, b) => a - b);
            const medianHeight = heights.length ? heights[Math.floor(heights.length / 2)] : 12;
            const yTolerance = Math.max(3, Math.round(medianHeight * 0.6));

            // group by y
            const rows: Array<{ y: number; items: Item[] }> = [];
            const sortedByY = items.slice().sort((a, b) => a.y - b.y);
            for (const it of sortedByY) {
                const found = rows.find((r) => Math.abs(r.y - it.y) <= yTolerance);
                if (found) {
                    found.items.push(it);
                    found.y = (found.y * (found.items.length - 1) + it.y) / found.items.length;
                } else {
                    rows.push({ y: it.y, items: [it] });
                }
            }
            // sort rows top->bottom
            rows.sort((a, b) => a.y - b.y);
            // within each row sort by x
            rows.forEach((r) => r.items.sort((a, b) => a.x - b.x));

            // Use first item X positions to attempt column detection
            const firstXs = rows.map((r) => (r.items[0] ? r.items[0].x : 0));

            function detectColumns(xs: number[]) {
                // require a reasonable number of rows to trust multi-column detection
                if (rows.length < 12) return 1;

                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const spread = maxX - minX;

                // If spread too small -> single column
                if (spread < pageWidth * 0.35) return 1;

                // If first page and not many rows -> avoid splitting (many headers can trigger false positive)
                if (pageNum === 1 && rows.length < 30) return 1;

                // Build buckets to find peaks
                const buckets = 12;
                const counts = new Array(buckets).fill(0);
                for (const x of xs) {
                    const idx = Math.min(buckets - 1, Math.floor(((x - minX) / (spread || 1)) * buckets));
                    counts[idx]++;
                }

                // find continuous high-density segments
                const peaks: number[] = [];
                for (let i = 0; i < counts.length; i++) {
                    if (counts[i] >= 2) peaks.push(i);
                }

                // require at least two spatially separated peaks
                if (peaks.length >= 2) {
                    const left = peaks.some((p) => p < buckets * 0.45);
                    const right = peaks.some((p) => p > buckets * 0.55);
                    if (left && right) return 2;
                }

                return 1;
            }

            const columns = detectColumns(firstXs);

            let pageText = "";

            if (columns === 1) {
                // Merge rows into paragraph flow, but keep strong paragraph breaks on large vertical gaps
                let prevY = -Infinity;
                for (const r of rows) {
                    const line = r.items.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
                    if (!line) continue;
                    const gap = prevY === -Infinity ? 0 : r.y - prevY;
                    const isParagraphBreak = gap > medianHeight * 2.0;
                    if (pageText && isParagraphBreak) pageText += "\n\n" + line;
                    else if (pageText) pageText += " " + line;
                    else pageText = line;
                    prevY = r.y;
                }
            } else {
                // 2-column path: find divider using median of firstXs
                const sortedXs = firstXs.slice().sort((a, b) => a - b);
                const midIndex = Math.floor(sortedXs.length / 2);
                const divider = (sortedXs[Math.max(0, midIndex - 1)] + sortedXs[midIndex]) / 2;

                const leftLines: string[] = [];
                const rightLines: string[] = [];

                for (const r of rows) {
                    const leftItems = r.items.filter((it) => it.x <= divider + 4);
                    const rightItems = r.items.filter((it) => it.x > divider - 4);

                    const leftText = leftItems.map((it) => it.str).join(" ").trim();
                    const rightText = rightItems.map((it) => it.str).join(" ").trim();

                    if (leftText) leftLines.push(leftText);
                    if (rightText) rightLines.push(rightText);
                }

                pageText = leftLines.join("\n") + "\n\n" + rightLines.join("\n");
            }

            pagesTextBlocks.push({ page: pageNum, columns, text: pageText.trim(), rows });
        })());
    }

    // Wait for all pages
    await Promise.all(pagePromises);

    // ensure pages are in order
    pagesTextBlocks.sort((a, b) => a.page - b.page);

    // combine pages with explicit separator
    const finalText = pagesTextBlocks.map((p) => p.text).join("\n\n---PAGE_BREAK---\n\n");
    return { finalText, pagesTextBlocks };
}

/**
 * Parsing readable text into structured CV fields (improved heuristics)
 */
function parseCvText(readableText: string) {
    const pages = readableText.split("\n\n---PAGE_BREAK---\n\n");
    const allLines = pages
        .map((p) => p.split(/\r?\n/))
        .flat()
        .map((l) => normalizeLine(l))
        .filter((l) => l.length > 0);

    // Helpful regexes
    const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/;
    const phoneRe = /(\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3}[-.\s]?\d{2,4}([-.\s]?\d{2,4})?/; // flexible
    const linkedinRe = /(https?:\/\/)?(www\.)?linkedin\.com\/[^\s,;]*/i;
    const githubRe = /(https?:\/\/)?(www\.)?github\.com\/[^\s,;]*/i;

    const fullText = allLines.join(" ");

    const emailMatch = fullText.match(emailRe);
    const phoneMatch = fullText.match(phoneRe);
    const linkedinMatch = fullText.match(linkedinRe);
    const githubMatch = fullText.match(githubRe);

    // top header heuristics: take first 10 lines, but skip lines that look like contact
    const topLines = allLines.slice(0, 12);

    // find name by scanning topLines for best candidate
    let name = "";
    for (const l of topLines) {
        if (looksLikeName(l)) {
            name = l;
            break;
        }
    }

    // fallback: if no nice name found, try all-caps short line
    if (!name) {
        const caps = topLines.find((l) => /^[A-Z\s\.\-']{3,40}$/.test(l) && l.split(/\s+/).length <= 4);
        if (caps) name = caps;
    }

    // last fallback: first non-contact line
    if (!name) {
        const firstNonContact = topLines.find((l) => !emailRe.test(l) && !phoneRe.test(l));
        name = firstNonContact || "Your Name";
    }

    // Build section map using normalized matching (case-insensitive)
    const sectionKeywords: { [key: string]: string[] } = {
        summary: ["professional summary", "summary", "profile", "objective", "about"],
        experience: ["work experience", "experience", "employment", "professional experience", "work history", "roles & responsibilities"],
        education: ["education", "academic", "degree", "university", "college", "education & training"],
        skills: ["skills", "technical skills", "skillset", "competencies"],
        languages: ["languages", "language"],
        additional: ["additional information", "certifications", "certificates", "awards"],
    };

    // identify section start lines
    const sectionAtLine: { [idx: number]: string } = {};
    for (let i = 0; i < allLines.length; i++) {
        const ll = allLines[i].toLowerCase().replace(/\s+/g, " ").trim();
        for (const sec in sectionKeywords) {
            for (const kw of sectionKeywords[sec]) {
                if (ll === kw || ll.includes(kw + ":") || ll.includes(kw + " -") || ll.includes(" " + kw + " ")) {
                    sectionAtLine[i] = sec;
                }
            }
        }
    }

    // collect header lines (everything until first real section)
    let firstSectionIndex = allLines.findIndex((_, idx) => sectionAtLine[idx] !== undefined);
    if (firstSectionIndex === -1) firstSectionIndex = Math.min(allLines.length, 8);

    const sections: { [key: string]: string[] } = {
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

    let currentSection = "other";
    for (let i = firstSectionIndex; i < allLines.length; i++) {
        if (sectionAtLine[i]) {
            currentSection = sectionAtLine[i];
            continue;
        }
        sections[currentSection] = sections[currentSection] || [];
        sections[currentSection].push(allLines[i]);
    }

    // personal info extraction
    const email = emailMatch ? emailMatch[0] : "";
    let phone = phoneMatch ? phoneMatch[0].trim() : "";
    // normalize phone (remove multiple spaces)
    phone = phone.replace(/\s{2,}/g, " ").trim();

    const linkedin = linkedinMatch ? (linkedinMatch[0].startsWith("http") ? linkedinMatch[0] : "https://" + linkedinMatch[0]) : "";
    const github = githubMatch ? (githubMatch[0].startsWith("http") ? githubMatch[0] : "https://" + githubMatch[0]) : "";

    // title heuristics: check headerlines after name
    let title = "";
    const headerAfterName = sections.header.slice(1, 5).find((l) => isShortTitleOrCompany(l) && !emailRe.test(l) && !phoneRe.test(l));
    if (headerAfterName) title = headerAfterName;

    // summary extraction
    const summary = sections.summary.length ? sections.summary.join(" ") : sections.other.slice(0, 3).join(" ");

    // skills extraction - split by common delimiters and bullets
    const skillsText = sections.skills.join(", ") || sections.other.filter(l => /skill|excel|power bi|python|tms|logistics|transport/i.test(l)).join(", ");
    const skills = skillsText
        .split(/[,•|\n;•]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1);

    // languages extraction
    const languages = sections.languages.length ? sections.languages.join(", ") : [];
    const languagesList = typeof languages === "string"
        ? languages.split(/[,;•]/).map((s) => s.trim()).filter(Boolean)
        : Array.isArray(sections.languages) ? sections.languages : [];

    // Improved experience parsing
    function parseExperiences(lines: string[]) {
        const dateRangeRegex = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4})\s*[-–—]\s*(Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4})/i;
        const experiences: any[] = [];
        let current: any = null;

        for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            const dateMatch = l.match(dateRangeRegex);

            if (dateMatch) {
                if (current) experiences.push(current);

                const dateRange = dateMatch[0];
                const [startRaw, endRaw] = dateRange.split(/[-–—]/).map(s => s.trim());
                const start = startRaw || "";
                const end = endRaw || "";

                // left part likely contains position and company
                const leftPart = l.replace(dateRange, "").trim().replace(/\|/g, " - ");

                // Attempt to split leftPart into position and company
                let position = "";
                let company = "";

                // common separators in CVs
                if (leftPart.includes(" - ") || leftPart.includes(" — ") || leftPart.includes(" – ")) {
                    const parts = leftPart.split(/ - | — | – /).map(s => s.trim()).filter(Boolean);
                    position = parts[0] || "";
                    company = parts.slice(1).join(" ") || "";
                } else {
                    // try two large chunks separated by two spaces
                    const parts = leftPart.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
                    if (parts.length >= 2) {
                        position = parts[0];
                        company = parts.slice(1).join(" ");
                    } else {
                        // fallback: sometimes "Company — Position" style
                        const altParts = leftPart.split(/,| at /i).map(s => s.trim()).filter(Boolean);
                        position = altParts[0] || "";
                        company = altParts[1] || "";
                    }
                }

                current = {
                    id: Math.random().toString(36).slice(2, 9),
                    position: position || "Position",
                    company: company || "Company",
                    startDate: start,
                    endDate: end,
                    current: /present/i.test(end),
                    bullets: [],
                };
            } else if (current) {
                // treat lines starting with bullet markers or short lines as bullets
                if (/^[\-\u2022\*]/.test(l) || l.length < 140) {
                    current.bullets.push(l.replace(/^[\-\u2022\*]\s?/, ""));
                } else {
                    // long descriptive line - append as a bullet
                    current.bullets.push(l);
                }
            } else {
                // If we haven't started a job yet, skip
            }
        }

        if (current) experiences.push(current);

        // If nothing was found, attempt to form experiences by grouping lines heuristically
        if (experiences.length === 0 && lines.length > 0) {
            for (let i = 0; i < lines.length; i += 3) {
                const slice = lines.slice(i, i + 3);
                experiences.push({
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

        return experiences;
    }

    const experiences = parseExperiences(sections.experience);

    // Education parsing (improved)
    function parseEducation(lines: string[]) {
        const edu: any[] = [];
        const yearRe = /(\d{4})/;
        for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            if (/(university|college|degree|master|bachelor|msc|m\.sc|b\.sc|phd|diploma|faculty)/i.test(l) || yearRe.test(l)) {
                edu.push({
                    id: Math.random().toString(36).slice(2, 9),
                    institution: l,
                    degree: "",
                    startDate: "",
                    endDate: "",
                });
            }
        }
        if (edu.length === 0 && lines.length > 0) {
            edu.push({
                id: Math.random().toString(36).slice(2, 9),
                institution: lines.slice(0, 2).join(" "),
                degree: "",
                startDate: "",
                endDate: "",
            });
        }
        return edu;
    }

    const education = parseEducation(sections.education);

    return {
        personalInfo: {
            name,
            title,
            email,
            phone,
            linkedin,
            github,
            summary,
            headerLines: sections.header,
        },
        experiences,
        education,
        skills,
        languages: languagesList,
        additional: sections.additional,
        rawLines: allLines.slice(0, 400),
    };
}

/**
 * API route handler
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
        }
        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json({ success: false, error: "Only PDF files supported" }, { status: 400 });
        }

        // Convert to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract layout-aware text (concurrent page processing)
        const { finalText, pagesTextBlocks } = await extractTextLayoutAware(buffer);

        // Parse CV text into structured object
        const parsed = parseCvText(finalText);

        // Attach debug info to help tune heuristics (rows/columns preview for first pages)
        const debug = {
            pagesSummary: pagesTextBlocks.slice(0, 4).map(p => ({ page: p.page, columns: p.columns, rowCount: p.rows?.length || 0 })),
        };

        return NextResponse.json({ success: true, data: parsed, debug }, { status: 200 });
    } catch (err: any) {
        console.error("CV parse error:", err);
        return NextResponse.json({ success: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}

/**
 * Notes:
 * 1. Concurrency: We use Promise.all to process pages concurrently; this works well in serverless
 *    environments and improves throughput without requiring worker threads.
 *
 * 2. Worker Threads (optional): If running on a dedicated Node server (not serverless), you can
 *    implement `worker_threads` to process pages in parallel OS threads. That requires bundling a
 *    separate worker file and ensuring your hosting allows worker threads.
 *
 * 3. Tuning: The thresholds (rows length, pageWidth spread, yTolerance multipliers) are conservative;
 *    if you have more CVs with dense multi-column layouts, consider lowering thresholds for rows
 *    required to consider a page multi-column.
 *
 * 4. Debugging: The `debug.pagesSummary` object returns columns and row counts for the first pages;
 *    if a particular PDF mis-parses, share that debug output and we can tune the thresholds for that style.
 */
