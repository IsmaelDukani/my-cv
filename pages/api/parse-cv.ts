import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Fields, Files, File } from 'formidable';
import fs from 'fs';

// Disable default body parser to handle file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper interface
interface TextItem {
    str: string;
    transform: number[];
    width: number;
    height: number;
    hasEOL: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Dynamic import to avoid webpack bundling issues
        // We use standard import() which Next.js handles better for server-side splitting
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';

        const form = new IncomingForm();

        const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve([fields, files]);
            });
        });

        const uploadedFile = files.file;
        let file: File | undefined;

        if (Array.isArray(uploadedFile)) {
            file = uploadedFile[0];
        } else {
            file = uploadedFile as File | undefined;
        }

        if (!file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const buffer = fs.readFileSync(file.filepath);
        const uint8Array = new Uint8Array(buffer);

        // Extract text logic (inline to access pdfjs)
        const loadingTask = pdfjs.getDocument({
            data: uint8Array,
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/standard_fonts/',
        });

        const doc = await loadingTask.promise;
        let fullText = "";

        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const items = textContent.items as TextItem[];

            if (items.length === 0) continue;

            // 1. Sort items
            items.sort((a, b) => {
                const yDiff = b.transform[5] - a.transform[5];
                if (Math.abs(yDiff) > 5) return yDiff;
                return a.transform[4] - b.transform[4];
            });

            // 2. Detect Columns (Valley Detection)
            const allXs = items.map(item => item.transform[4]);
            const minX = Math.min(...allXs);
            const maxX = Math.max(...allXs);
            const width = maxX - minX;

            const numBins = 20;
            const histogram = new Array(numBins).fill(0);
            allXs.forEach(x => {
                const binIndex = Math.floor(((x - minX) / width) * (numBins - 1));
                histogram[binIndex]++;
            });

            let leftPeak = -1;
            let rightPeak = -1;
            let valley = -1;
            let minDensity = Infinity;

            for (let j = 0; j < numBins * 0.4; j++) {
                if (histogram[j] > (leftPeak === -1 ? 0 : histogram[leftPeak])) leftPeak = j;
            }

            for (let j = Math.floor(numBins * 0.6); j < numBins; j++) {
                if (histogram[j] > (rightPeak === -1 ? 0 : histogram[rightPeak])) rightPeak = j;
            }

            if (leftPeak !== -1 && rightPeak !== -1) {
                for (let j = leftPeak + 1; j < rightPeak; j++) {
                    if (histogram[j] < minDensity) {
                        minDensity = histogram[j];
                        valley = j;
                    }
                }
            }

            let dividerX = -1;
            if (valley !== -1 && minDensity < (histogram[leftPeak] + histogram[rightPeak]) / 4) {
                dividerX = minX + (valley / (numBins - 1)) * width;
            }

            // 3. Group into lines
            const lines: { y: number; text: string; x: number }[] = [];
            let currentLine: { y: number; text: string; x: number } | null = null;

            const processItems = (subset: TextItem[]) => {
                for (const item of subset) {
                    const y = item.transform[5];
                    const x = item.transform[4];
                    const text = item.str;

                    if (!currentLine || Math.abs(currentLine.y - y) > 5) {
                        if (currentLine) lines.push(currentLine);
                        currentLine = { y, text, x };
                    } else {
                        const gap = x - (currentLine.x + (currentLine.text.length * 4));
                        if (gap > 10) currentLine.text += "   ";
                        currentLine.text += text;
                    }
                }
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = null;
                }
            };

            if (dividerX !== -1) {
                const leftCol = items.filter(item => item.transform[4] < dividerX);
                const rightCol = items.filter(item => item.transform[4] >= dividerX);
                processItems(leftCol);
                processItems(rightCol);
            } else {
                processItems(items);
            }

            fullText += lines.map(l => l.text).join("\n") + "\n\n";
        }

        return res.status(200).json({
            success: true,
            data: {
                personalInfo: {
                    name: "Parsed User",
                    summary: fullText.slice(0, 500),
                    email: "",
                    phone: ""
                },
                experiences: [],
                education: [],
                skills: [],
                languages: []
            }
        });

    } catch (err: any) {
        console.error('CV parse error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
