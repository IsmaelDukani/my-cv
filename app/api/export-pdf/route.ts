import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export async function POST(req: Request) {
    try {
        const { html, css = '', links = [], baseUrl = '' } = await req.json();

        console.log('[PDF Export] Received request');
        console.log('[PDF Export] HTML length:', html?.length || 0);
        console.log('[PDF Export] HTML preview:', html?.substring(0, 200) || 'EMPTY');

        if (!html) return NextResponse.json({ error: 'HTML required' }, { status: 400 });

        // Detect if we're in production (Vercel) or development (local)
        const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

        console.log('[PDF Export] Environment:', isProduction ? 'Production (Vercel)' : 'Development (Local)');

        const browser = await puppeteer.launch(
            isProduction
                ? {
                    // Production (Vercel): Use serverless Chrome
                    args: chromium.args,
                    executablePath: await chromium.executablePath(),
                    headless: true,
                }
                : {
                    // Development (Local): Use local Chrome
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    executablePath: process.platform === 'win32'
                        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
                        : process.platform === 'darwin'
                            ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
                            : '/usr/bin/google-chrome',
                    headless: true,
                }
        );

        const page = await browser.newPage();

        // Fetch and inline external stylesheets (including Tailwind CSS)
        let inlinedCss = css;

        console.log('[PDF Export] Fetching', links.length, 'stylesheets...');

        for (const href of links) {
            try {
                const absoluteUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
                console.log('[PDF Export] Fetching:', absoluteUrl);

                const response = await fetch(absoluteUrl);
                if (response.ok) {
                    const stylesheetContent = await response.text();
                    inlinedCss += `\n/* Inlined from: ${absoluteUrl} */\n${stylesheetContent}\n`;
                    console.log('[PDF Export] ✓ Inlined:', absoluteUrl, `(${stylesheetContent.length} bytes)`);
                } else {
                    console.error('[PDF Export] ✗ Failed to fetch:', absoluteUrl, response.status);
                }
            } catch (error) {
                console.error('[PDF Export] ✗ Error fetching:', href, error);
            }
        }

        console.log('[PDF Export] Total CSS size:', inlinedCss.length, 'bytes');

        const finalHtml = `
      <!doctype html>
      <html>
      <head>
        <meta charset="UTF-8">
        <base href="${baseUrl}/" />
        <style>
          ${inlinedCss}

          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }

          /* A4 wrapper */
          #cv-wrapper {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          /* Remove preview UI */
          .preview-wrapper, .card, .live-preview, .container, .preview-card {
            all: unset !important;
            display: block !important;
          }

          /* Prevent chip/tag wrapping */
          .chip, .tag, .badge {
            white-space: nowrap !important;
            display: inline-block !important;
          }

          @media print {
            @page { size: A4; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div id="cv-wrapper">${html}</div>
      </body>
      </html>
    `;

        console.log('[PDF Export] Final HTML length:', finalHtml.length);

        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        await page.evaluateHandle('document.fonts.ready');

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });

        await browser.close();

        console.log('[PDF Export] PDF generated successfully');

        return new NextResponse(Buffer.from(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="CV.pdf"'
            }
        });

    } catch (error: any) {
        console.error('[PDF Export] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
