import { NextRequest, NextResponse } from "next/server";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// Force Node.js runtime for Vercel (required for pdfjs-dist and Buffer)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * IMPORTANT:
 * - Install: npm install pdfjs-dist
 * - This file is compatible with Next.js App Router running locally (Node) and on Vercel (serverless)
 */

// Tell pdfjs where worker is (works in serverless environment with legacy build)
pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";

/**
 * Layout-aware text extraction using pdfjs-dist
 *
 * Strategy:
 * 1. For each page, get textContent.items which contains .str and .transform (x,y)
 * 2. Convert coordinates to consistent top-down Y using viewport height
 * 3. Group items into rows by Y (tolerance)
 * 4. Within rows, sort by X ascending
 * 5. Detect column clusters by collecting X positions across page and clustering them
 * 6. If multi-column detected, combine text by columns left->right; otherwise produce single-column flow
 *
 * Returns: string with reconstructed readable text, preserving paragraphs and column separations (when detected)
 */
async function extractTextLayoutAware(buffer: Buffer): Promise<string> {
    const uint8Array = new Uint8Array(buffer);
    const pdf = await pdfjs.getDocument({
        data: uint8Array,
        // Use CDN for standard fonts to ensure they work in serverless environments (Vercel)
        // where node_modules might not be at the expected path.
        standardFontDataUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/standard_fonts/"
    }).promise;

    const pagesTextBlocks: Array<{ page: number; columns?: number; text: string }> = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;

        const content = await page.getTextContent();

        type Item = {
            str: string;
            x: number;
            y: number;
            width?: number;
            height?: number;
        };

        const items: Item[] = [];

        // Convert text items to x,y positions in top-down coordinates
        for (const it of content.items as any[]) {
            // transform is [a, b, c, d, e, f]
            // e = x coordinate, f = y coordinate (pdf bottom-left origin)
            const transform = it.transform;
            let x = transform[4];
            let y = transform[5];

            // Some items have a 'height' or 'fontSize' in transform; preserve rough height
            const height = Math.abs(transform[3]) || (it.height ? it.height : 0);

            // Convert to top-down coordinate to make sorting intuitive
            const topY = pageHeight - y;

            // Cleanup string
            const str = String(it.str || "").replace(/\s+/g, " ").trim();
            if (!str) continue;

            items.push({ str, x, y: topY, width: it.width || 0, height });
        }

        if (items.length === 0) {
            pagesTextBlocks.push({ page: pageNum, text: "" });
            continue;
        }

        // Determine clustering threshold for Y (line grouping)
        // Use median height to estimate line height
        const heights = items.map((i) => i.height || 0).filter(Boolean);
        const medianHeight =
            heights.length > 0
                ? heights.sort((a, b) => a - b)[Math.floor(heights.length / 2)]
                : 12;
        const yTolerance = Math.max(4, Math.round(medianHeight * 0.6));

        // Group items into rows by Y coordinate
        const rows: Array<{ y: number; items: Item[] }> = [];

        const sortedByY = items.slice().sort((a, b) => a.y - b.y);

        for (const it of sortedByY) {
            // find existing row within tolerance
            const foundRow = rows.find((r) => Math.abs(r.y - it.y) <= yTolerance);
            if (foundRow) {
                foundRow.items.push(it);
                // update row y to average (helps when items vary)
                foundRow.y = (foundRow.y * (foundRow.items.length - 1) + it.y) / foundRow.items.length;
            } else {
                rows.push({ y: it.y, items: [it] });
            }
        }

        // Sort rows top -> bottom
        rows.sort((a, b) => a.y - b.y);

        // Within rows, sort items by X ascending
        for (const r of rows) {
            r.items.sort((a, b) => a.x - b.x);
        }

        // Column detection:
        // Collect ALL X positions (not just first item of each row) to find alignment lines
        const allXs = items.map((i) => i.x);

        // Robust clustering using Histogram Valley Detection
        function detectColumns(xs: number[]) {
            if (xs.length < 20) return 1; // too few items -> single column

            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const spread = maxX - minX;

            // If spread is small relative to pageWidth -> single column
            if (spread < pageWidth * 0.3) return 1;

            // Build histogram
            const buckets = 40; // High resolution
            const counts = new Array(buckets).fill(0);
            for (const x of xs) {
                const idx = Math.min(buckets - 1, Math.floor(((x - minX) / spread) * buckets));
                counts[idx]++;
            }

            // Analyze density
            // We look for two dense regions separated by a sparse region (valley)
            // Left region: 0% to 45%
            // Right region: 55% to 100%
            // Middle (potential valley): 40% to 60%

            const leftLimit = Math.floor(buckets * 0.45);
            const rightStart = Math.ceil(buckets * 0.55);

            // Find max density in Left and Right
            let maxLeft = 0;
            for (let i = 0; i < leftLimit; i++) maxLeft = Math.max(maxLeft, counts[i]);

            let maxRight = 0;
            for (let i = rightStart; i < buckets; i++) maxRight = Math.max(maxRight, counts[i]);

            // If either side is empty, it's single column
            if (maxLeft === 0 || maxRight === 0) return 1;

            // Check for Valley in the middle
            // A valley is a region where count is significantly lower than the smaller of the two peaks
            const peakThreshold = Math.min(maxLeft, maxRight) * 0.3; // Valley must be < 30% of peak

            let valleyFound = false;
            let valleyMin = Infinity;
            let valleyIdx = -1;

            // Scan middle buckets for the deepest valley
            const midStart = Math.floor(buckets * 0.35);
            const midEnd = Math.ceil(buckets * 0.65);

            for (let i = midStart; i < midEnd; i++) {
                if (counts[i] < valleyMin) {
                    valleyMin = counts[i];
                    valleyIdx = i;
                }
                if (counts[i] < peakThreshold) {
                    valleyFound = true;
                }
            }

            // If we found a low-density valley, we have 2 columns
            if (valleyFound && valleyIdx !== -1) {
                return 2;
            }

            return 1;
        }

        const columns = detectColumns(allXs);

        // If single column: merge rows into paragraph flow with spacing heuristics
        let pageText = "";
        if (columns === 1) {
            // Merge rows: join each row items with space, two newlines between paragraph breaks
            let prevY = -Infinity;
            for (const r of rows) {
                const line = r.items.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
                if (!line) continue;

                // If there is a big vertical gap between previous and current row → paragraph break
                const gap = prevY === -Infinity ? 0 : r.y - prevY;
                const isParagraphBreak = gap > medianHeight * 1.8;

                if (pageText && isParagraphBreak) {
                    pageText += "\n\n" + line;
                } else if (pageText) {
                    pageText += " " + line;
                } else {
                    pageText = line;
                }
                prevY = r.y;
            }
        } else {
            // Multi-column reconstruction:
            // We'll split each row's items into column buckets using median X split
            // Find approximate column divider by clustering allXs into two clusters

            // 1. Sort all Xs
            const sortedXs = allXs.slice().sort((a, b) => a - b);

            // 2. Find the biggest gap between consecutive Xs in the middle 50% of the page
            // This is a robust way to find the column gutter
            let maxGap = 0;
            let splitPoint = 0;

            // Optimization: Only check gaps in the middle 60% of the sorted array to avoid outliers
            const startIdx = Math.floor(sortedXs.length * 0.2);
            const endIdx = Math.floor(sortedXs.length * 0.8);

            for (let i = startIdx; i < endIdx - 1; i++) {
                const x1 = sortedXs[i];
                const x2 = sortedXs[i + 1];

                // Only consider gaps that are somewhat central (e.g., between 30% and 70% of the spread)
                const minX = sortedXs[0];
                const maxX = sortedXs[sortedXs.length - 1];
                const relativePos = (x1 - minX) / (maxX - minX);

                if (relativePos > 0.3 && relativePos < 0.7) {
                    const gap = x2 - x1;
                    if (gap > maxGap) {
                        maxGap = gap;
                        splitPoint = (x1 + x2) / 2;
                    }
                }
            }

            const divider = splitPoint || (sortedXs[0] + sortedXs[sortedXs.length - 1]) / 2;

            // Build left and right column lines separately
            const leftLines: string[] = [];
            const rightLines: string[] = [];

            for (const r of rows) {
                const leftItems = r.items.filter((it) => it.x <= divider);
                const rightItems = r.items.filter((it) => it.x > divider);

                const leftText = leftItems.map((it) => it.str).join(" ").trim();
                const rightText = rightItems.map((it) => it.str).join(" ").trim();

                if (leftText) leftLines.push(leftText);
                if (rightText) rightLines.push(rightText);
            }

            // Compose multi-column: put left column then two newlines then right column
            pageText = leftLines.join("\n") + "\n\n" + rightLines.join("\n");
        }

        pagesTextBlocks.push({ page: pageNum, columns, text: pageText.trim() });
    }

    // Combine pages with page breaks (two newlines)
    const finalText = pagesTextBlocks.map((p) => p.text).join("\n\n---PAGE_BREAK---\n\n");
    return finalText;
}

/**
 * CV Parsing: takes reconstructed readable text and extracts structured data
 */
function parseCvText(readableText: string) {
    // Preprocess: split into pages/lines and normalize
    const pages = readableText.split("\n\n---PAGE_BREAK---\n\n");
    const allLines = pages
        .map((p) => p.split(/\r?\n/))
        .flat()
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    // Helper regexes
    const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/;
    // Phone regex: require at least 8 digits to avoid matching years like "2024"
    const phoneRe = /(\+?\d{1,3}[-\s]?)?(\(?\d{2,4}\)?[-\s]?)?[\d\s-]{8,}/;
    const linkedinRe = /(linkedin\.com\/[^\s]+)/i;
    const githubRe = /(github\.com\/[^\s]+)/i;

    // Assume header is within the first ~10 lines
    const topLines = allLines.slice(0, 12);

    // Extract email / phone / links by searching all text (first priority)
    const fullText = allLines.join(" ");

    const emailMatch = fullText.match(emailRe);
    const phoneMatch = fullText.match(phoneRe);
    const linkedinMatch = fullText.match(linkedinRe);
    const githubMatch = fullText.match(githubRe);

    // Section splitting: find section headers by keywords (case-insensitive)
    const sectionKeywords: { [key: string]: string[] } = {
        summary: ["professional summary", "summary", "profile", "objective", "about me", "career profile"],
        experience: [
            "work experience",
            "experience",
            "employment",
            "professional experience",
            "work history",
            "roles & responsibilities",
            "career history",
        ],
        education: ["education", "academic", "degree", "university", "college", "education & training", "qualifications"],
        skills: ["skills", "technical skills", "skillset", "competencies", "core competencies"],
        languages: ["languages", "language"],
        additional: ["additional information", "additional", "certifications", "certificates", "projects", "interests"],
    };

    // Name heuristics: choose the first line from topLines which:
    // - is mostly letters (no @, no digits), and length between 2 and 40
    // - often appears in ALL CAPS or Title Case in CVs
    // - is NOT a section header
    function guessName(lines: string[]) {
        for (const l of lines) {
            if (emailRe.test(l) || phoneRe.test(l)) continue;
            const digits = (l.match(/\d/g) || []).length;
            if (digits > 2) continue;

            const lower = l.toLowerCase();
            // Check if line is a section header
            let isSectionHeader = false;
            for (const sec in sectionKeywords) {
                if (sectionKeywords[sec].some(kw => lower === kw || (lower.startsWith(kw) && lower.length < kw.length + 5))) {
                    isSectionHeader = true;
                    break;
                }
            }
            if (isSectionHeader) continue;

            const cleaned = l.replace(/[^A-Za-z\s\.\-']/g, "").trim();
            if (cleaned.length >= 2 && cleaned.length <= 60) {
                // Prefer lines with two words (first + last)
                const wordCount = cleaned.split(/\s+/).length;
                if (wordCount >= 2) return cleaned;
            }
        }
        // fallback: first non-empty line
        return lines[0] || "Unknown Name";
    }

    const name = guessName(topLines);

    // Build mapping lineIndex -> section
    const sectionAtLine: { [idx: number]: string } = {};
    for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i];
        // Optimization: Section headers are usually short
        if (line.length > 50) continue;

        const ll = line.toLowerCase();
        for (const sec in sectionKeywords) {
            for (const kw of sectionKeywords[sec]) {
                // Strict match: must start with keyword and be short, or be exactly the keyword
                // This prevents "I have experience in..." from triggering 'experience' section
                if (ll === kw || (ll.startsWith(kw) && (ll.length === kw.length || ll[kw.length] === ':' || ll[kw.length] === ' '))) {
                    sectionAtLine[i] = sec;
                    // Prioritize the longest match (e.g. "Professional Summary" over "Summary")
                    // But since we iterate, we might overwrite. Ideally we break?
                    // Actually, if we match "work experience", we don't need to check "experience".
                    // Let's break after finding a match for this line.
                    break;
                }
            }
            if (sectionAtLine[i]) break;
        }
    }

    // Sweep through lines to collect lines per section. If unknown, assign to 'other' or personal header
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

    // First, assign top header lines (up to the first detected section or first experience/education)
    let firstSectionIndex = allLines.findIndex((_, idx) => sectionAtLine[idx] !== undefined);
    if (firstSectionIndex === -1) firstSectionIndex = Math.min(allLines.length, 8);

    for (let i = 0; i < firstSectionIndex; i++) {
        sections.header.push(allLines[i]);
    }

    // Then walk remaining lines and populate based on last seen section header; default to 'other'
    let currentSection = "other";
    for (let i = firstSectionIndex; i < allLines.length; i++) {
        if (sectionAtLine[i]) {
            currentSection = sectionAtLine[i];
            // Skip header line itself (it's a title), but optionally capture following lines
            continue;
        }
        sections[currentSection] = sections[currentSection] || [];
        sections[currentSection].push(allLines[i]);
    }

    // Extract structured personal info (email, phone, location, linkedin, github)
    const email = emailMatch ? emailMatch[0] : "";
    const phone = phoneMatch ? phoneMatch[0].trim() : "";
    const linkedin = linkedinMatch ? (linkedinMatch[0].startsWith("http") ? linkedinMatch[0] : "https://" + linkedinMatch[0]) : "";
    const github = githubMatch ? (githubMatch[0].startsWith("http") ? githubMatch[0] : "https://" + githubMatch[0]) : "";

    // Title detection: look for short line in header after name that is not email/phone
    let title = "";
    if (sections.header.length >= 2) {
        const afterName = sections.header.slice(1, 4).find((l) => {
            if (emailRe.test(l) || phoneRe.test(l) || l.length > 60) return false;
            // Also ensure it's not a section header
            const lower = l.toLowerCase();
            for (const sec in sectionKeywords) {
                if (sectionKeywords[sec].some(kw => lower.includes(kw))) return false;
            }
            return true;
        });
        if (afterName) title = afterName;
    }

    // Summary: join summary section, fallback to first big paragraph in other
    const summary = sections.summary.length > 0 ? sections.summary.join(" ") : sections.other.slice(0, 3).join(" ");

    // Skills parsing: split common delimiters
    const skillsText = sections.skills.join(", ");
    const skills = skillsText
        .split(/[,•|\n;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1);

    // Languages
    const languages = sections.languages
        .map((l) => l.replace(/^languages[:\-]?\s*/i, "").trim())
        .join(", ")
        .split(/[,;•]/)
        .map((s) => s.trim())
        .filter((s) => s.length);

    // Experience parsing: attempt to parse positions, companies, date ranges and bullets
    function parseExperiences(lines: string[]) {
        // Heuristic: date patterns -> new job
        const dateRangeRegex =
            /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}\s*[-–]\s*(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s*\d{4})|\d{4}\s*[-–]\s*(?:Present|\d{4}))/i;

        const experiences: any[] = [];
        let current: any = null;

        for (let i = 0; i < lines.length; i++) {
            const l = lines[i];

            const dateMatch = l.match(dateRangeRegex);
            if (dateMatch) {
                // Start new job
                if (current) experiences.push(current);

                const dateRange = dateMatch[0];
                const [start, end] = dateRange.split(/[-–]/).map((s) => s.trim());
                const leftPart = l.replace(dateRange, "").trim();

                let position = "";
                let company = "";

                // Check previous line for Title if it exists and isn't a bullet
                const prevLine = i > 0 ? lines[i - 1] : "";
                // If previous line is non-empty, not a bullet, and reasonable length, treat it as Title
                if (prevLine && !/^[\-\u2022\*]/.test(prevLine) && prevLine.length < 80 && prevLine.length > 3) {
                    position = prevLine.trim();
                    // Then leftPart is likely Company (+ Location)
                    // Clean up trailing pipes or dashes from company
                    company = leftPart.replace(/^[|\-–—]\s*/, "").replace(/\s*[|\-–—]$/, "").trim();
                    // If company is empty (date was on its own line?), look at leftPart
                    if (!company && leftPart.length > 2) company = leftPart;
                } else {
                    // Fallback: Title and Company are on the same line
                    if (leftPart.includes("|")) {
                        const parts = leftPart.split("|").map((s) => s.trim());
                        position = parts[0] || "";
                        company = parts[1] || "";
                    } else if (leftPart.includes("—") || leftPart.includes("–")) {
                        const parts = leftPart.split(/—|–/).map((s) => s.trim());
                        position = parts[0] || "";
                        company = parts[1] || "";
                    } else {
                        const parts = leftPart.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
                        if (parts.length >= 2) {
                            position = parts[0];
                            company = parts.slice(1).join(" ");
                        } else {
                            position = leftPart;
                        }
                    }
                }

                current = {
                    id: Math.random().toString(36).slice(2, 9),
                    position: position || "Position",
                    company: company || "Company",
                    startDate: start || "",
                    endDate: end || "",
                    current: /present/i.test(end || ""),
                    bullets: [],
                };
            } else if (current) {
                // If line starts with dash/• or has verb-like phrase, treat as bullet
                if (/^[\-\u2022\*]/.test(l) || l.length < 120) {
                    // Avoid adding the Title line as a bullet if we just used it
                    // But we handle 'i' iteration, so we won't see it again unless we look back.
                    // Wait, if we used prevLine, we effectively "consumed" it.
                    // But we are iterating forward. If we used lines[i-1], it was already processed in previous step.
                    // If lines[i-1] was treated as a bullet or text in previous step, it's fine.
                    // Ideally we should remove it from the previous experience's bullets if we "stole" it.
                    // But simpler: just add current line as bullet.

                    // Check if this line was actually the title of the *next* job? No, we are at 'l'.
                    // If 'l' is a title for the *next* job, we'll catch it in the next iteration's lookbehind?
                    // Yes. But we shouldn't add it as a bullet here if it's going to be a title.
                    // We can't know for sure until we see the date in the next line.
                    // So we might add it as a bullet, then next iteration starts new job.
                    // That's acceptable for now, or we could peek ahead.

                    // Peek ahead: if next line has date, this might be a title.
                    const nextLine = lines[i + 1];
                    if (nextLine && dateRangeRegex.test(nextLine)) {
                        // Don't add this as bullet, it's likely the title for the next entry
                        continue;
                    }

                    current.bullets.push(l.replace(/^[\-\u2022\*]\s?/, ""));
                } else {
                    current.bullets.push(l);
                }
            }
        }
        if (current) experiences.push(current);
        return experiences;
    }

    const experiences = parseExperiences(sections.experience);

    // Education parsing
    function parseEducation(lines: string[]) {
        const edu: any[] = [];
        const yearRe = /(\d{4})/;

        for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            const isUni = /(university|college|school|institute|academy)/i.test(l);
            const isDegree = /(degree|bachelor|master|phd|diploma|b\.?sc|m\.?sc|mba)/i.test(l);
            const hasYear = yearRe.test(l);

            if (isUni || isDegree) {
                // Found a potential start of education block
                let institution = "";
                let degree = "";
                let date = "";

                if (isUni) {
                    institution = l;
                    // Check next line for degree/date
                    const nextL = lines[i + 1];
                    if (nextL && (/(degree|bachelor|master|phd|diploma)/i.test(nextL) || yearRe.test(nextL))) {
                        degree = nextL;
                        i++; // consume next line
                    }
                } else {
                    // Starts with degree?
                    degree = l;
                    // Check previous line for uni? (Maybe handled by previous iteration)
                    // Check next line for date?
                    const nextL = lines[i + 1];
                    if (nextL && yearRe.test(nextL)) {
                        date = nextL;
                        i++;
                    }
                }

                // Extract date from degree string if present
                if (!date && yearRe.test(degree)) {
                    const dMatch = degree.match(/(\d{4}.*\d{4}|\d{4})/);
                    if (dMatch) {
                        date = dMatch[0];
                        degree = degree.replace(dMatch[0], "").trim();
                    }
                }

                edu.push({
                    id: Math.random().toString(36).slice(2, 9),
                    institution: institution || "Institution",
                    degree: degree || "Degree",
                    startDate: date.split(/[-–]/)[0]?.trim() || "",
                    endDate: date.split(/[-–]/)[1]?.trim() || "",
                });
            }
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
        languages,
        additional: sections.additional,
        rawLines: allLines.slice(0, 200), // include truncated raw lines for debugging
    };
}

/**
 * API Route Handler
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

        // Extract layout-aware text
        const reconstructedText = await extractTextLayoutAware(buffer);

        // Parse CV
        const parsed = parseCvText(reconstructedText);

        // Return results
        return NextResponse.json({ success: true, data: parsed }, { status: 200 });
    } catch (err: any) {
        console.error("CV parse error:", err);
        return NextResponse.json({ success: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}
