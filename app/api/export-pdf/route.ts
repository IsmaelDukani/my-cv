import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function POST(req: Request) {
    try {
        const { html, css, links = [], baseUrl } = await req.json();

        if (!html) {
            return NextResponse.json(
                { error: 'HTML content is required' },
                { status: 400 }
            );
        }

        // Detect if we're in production (Vercel) or development (local)
        const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

        // Launch the browser with appropriate configuration
        const browser = await puppeteer.launch(
            isProduction
                ? {
                    // Production (Vercel): Use serverless Chrome
                    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
                    executablePath: await chromium.executablePath(),
                    headless: true,
                }
                : {
                    // Development (Local): Use local Chrome/Chromium
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

        // Fetch and inline external stylesheets for PDF generation
        let inlinedCss = css; // Start with inline styles

        // Fetch each external stylesheet and add to inlined CSS
        for (const href of links) {
            try {
                console.log(`Fetching stylesheet: ${href}`);
                const response = await fetch(href);
                if (response.ok) {
                    const stylesheetContent = await response.text();
                    inlinedCss += `\n/* Inlined from: ${href} */\n${stylesheetContent}\n`;
                    console.log(`Successfully inlined stylesheet: ${href}`);
                } else {
                    console.warn(`Failed to fetch stylesheet: ${href} (${response.status})`);
                }
            } catch (error) {
                console.error(`Error fetching stylesheet ${href}:`, error);
            }
        }

        // Set the content with all CSS inlined
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <base href="${baseUrl || ''}/" />
                <style>
                    ${inlinedCss}
                    
                    /* Global styles */
                    html, body {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        background: white !important;
                    }
                    
                    /* CV Wrapper with A4 dimensions */
                    #cv-wrapper {
                        width: 210mm !important;
                        min-height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-sizing: border-box !important;
                        display: block !important;
                    }
                    
                    /* Fix blue text-chips wrapping issue */
                    .chip, .tag, [class*="rounded"], span[class*="px-"] {
                        white-space: nowrap !important;
                    }

                    /* Ensure print styles are applied */
                    @media print {
                        @page {
                            size: A4;
                            margin: 0;
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `;

        await page.setContent(fullHtml, {
            waitUntil: ['networkidle0', 'load'],
        });

        // Small delay to ensure styles are applied
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0px',
                right: '0px',
                bottom: '0px',
                left: '0px',
            },
            preferCSSPageSize: true,
        });

        await browser.close();

        // Return the PDF
        return new NextResponse(Buffer.from(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="CV.pdf"',
            },
        });

    } catch (error: any) {
        console.error('PDF Generation Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate PDF' },
            { status: 500 }
        );
    }
}
