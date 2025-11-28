import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

type RequestBody = {
    html: string;
    css?: string;
    links?: string[]; // absolute or relative to baseUrl
    baseUrl?: string;
    filename?: string;
};

const DEFAULT_TIMEOUT = 30_000; // ms

async function fetchWithTimeout(url: string, timeout = DEFAULT_TIMEOUT) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
        return await res.text();
    } finally {
        clearTimeout(id);
    }
}

async function inlineStyles(links: string[], baseUrl: string) {
    let inlined = '';
    if (!links || links.length === 0) return inlined;

    const promises = links.map(async (href) => {
        try {
            const absolute = href.startsWith('http') ? href : `${baseUrl.replace(/\/$/, '')}/${href.replace(/^\//, '')}`;
            const text = await fetchWithTimeout(absolute);
            return `/* Inlined from: ${absolute} */\n${text}\n`;
        } catch (err: any) {
            console.warn('[PDF Export] Warning: could not inline', href, err?.message || err);
            return `/* SKIPPED: ${href} - ${err?.message || 'error'} */\n`;
        }
    });

    const results = await Promise.all(promises);
    return results.join('\n');
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as RequestBody;
        const { html, css = '', links = [], baseUrl = '', filename = 'document.pdf' } = body || {};

        console.log('[PDF Export] Request received — html length:', html?.length ?? 0);
        if (!html) return NextResponse.json({ error: 'HTML required' }, { status: 400 });

        // Inline external styles (gracefully skip failures)
        const inlinedFromLinks = await inlineStyles(links, baseUrl || '');
        const inlinedCss = `${css || ''}\n${inlinedFromLinks}`;

        const finalHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<base href="${(baseUrl || '').replace(/\/$/, '') + (baseUrl ? '/' : '')}" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
${inlinedCss}

html, body { margin: 0; padding: 0; background: #fff; }
#cv-wrapper { box-sizing: border-box; }
@media print { @page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div id="cv-wrapper">${html}</div>
</body>
</html>`;

        // Detect environment (Vercel serverless recommended flow)
        const isVercel = !!process.env.VERCEL;

        const launchOptions: any = isVercel
            ? {
                args: chromium.args,
                executablePath: await chromium.executablePath(),
                headless: true,
                ignoreHTTPSErrors: true,
            }
            : {
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-gpu",
                ],
                executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                headless: true,
                ignoreHTTPSErrors: true,
            };

        const browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        // Set a reasonable viewport for A4
        await page.setViewport({ width: 1200, height: 1600 });

        // Use setContent to avoid filesystem usage in serverless environments
        await page.setContent(finalHtml, { waitUntil: ['domcontentloaded', 'networkidle0'] });

        // Wait for fonts to be loaded
        try {
            await page.evaluateHandle('document.fonts.ready');
        } catch (e: any) {
            console.warn('[PDF Export] document.fonts.ready failed:', e?.message || e);
        }

        // Small additional wait to ensure styles and webfonts are applied
        await new Promise(resolve => setTimeout(resolve, 500));

        // Debugging helper: print content length to logs (helpful when blank PDF occurs)
        try {
            const rendered = await page.content();
            console.log('[PDF Export] Rendered page content length:', rendered.length);
        } catch (e: any) {
            console.warn('[PDF Export] Could not read page.content()', e?.message || e);
        }

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
        });

        await browser.close();

        return new NextResponse(Buffer.from(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename.replace(/[^a-zA-Z0-9_.-]/g, '_')}"`,
            },
        });
    } catch (err: any) {
        console.error('[PDF Export] Error:', err?.stack || err?.message || err);
        return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
    }
}
