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

        // Launch the browser with serverless Chrome for Vercel
        const browser = await puppeteer.launch({
            args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: await chromium.executablePath(),
            headless: true,
        });

        const page = await browser.newPage();

        // Construct stylesheet links
        const linkTags = links.map((href: string) => `<link rel="stylesheet" href="${href}" />`).join('\n');

        // Set the content
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <base href="${baseUrl || ''}/" />
                ${linkTags}
                <style>
                    ${css}
                    
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
                        
                        /* Remove all shadows and backgrounds from parent containers */
                        box-shadow: none !important;
                        background: white !important;
                    }
                    
                    /* Remove shadows from all child elements to prevent artifacts */
                    #cv-wrapper * {
                        box-shadow: none !important;
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
            waitUntil: 'networkidle0', // Wait for resources to load
        });

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
            preferCSSPageSize: true, // Respect @page size
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
