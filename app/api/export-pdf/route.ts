import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export async function POST(req: Request) {
    try {
        const { html, css = '', links = [], baseUrl = '' } = await req.json();
        if (!html) return NextResponse.json({ error: 'HTML required' }, { status: 400 });

        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });

        const page = await browser.newPage();

        const linkTags = links.map((h: string) => `<link rel="stylesheet" href="${h}" />`).join('\n');

        const finalHtml = `
      <!doctype html>
      <html>
      <head>
        <base href="${baseUrl}/" />
        ${linkTags}
        <style>
          ${css}

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

        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        await page.evaluateHandle('document.fonts.ready');

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });

        await browser.close();

        return new NextResponse(Buffer.from(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="CV.pdf"'
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
