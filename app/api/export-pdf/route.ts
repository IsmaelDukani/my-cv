import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

/**
 * PDF EXPORT API ENDPOINT
 * 
 * This endpoint handles:
 * - Converting HTML CV content to PDF
 * - Applying CSS styles correctly
 * - Ensuring text is selectable in the PDF
 * - Proper font loading and rendering
 * 
 * POST /api/export-pdf
 * Body: { html: string, filename?: string }
 * Returns: PDF file as binary
 */

export async function POST(req: Request) {
    try {
        const { html, filename = "CV.pdf", baseUrl = "" } = await req.json();

        if (!html) {
            return NextResponse.json(
                { error: "HTML content is required" },
                { status: 400 }
            );
        }

        console.log("Starting PDF export...");

        const isVercel = !!process.env.VERCEL;

        const browser = await puppeteer.launch(
            isVercel
                ? {
                    args: chromium.args,
                    executablePath: await chromium.executablePath(),
                    headless: true,
                }
                : {
                    args: ["--no-sandbox", "--disable-setuid-sandbox"],
                    executablePath:
                        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                    headless: true,
                }
        );

        const page = await browser.newPage();

        // Set viewport for consistent rendering
        await page.setViewport({
            width: 1200,
            height: 1600,
            deviceScaleFactor: 1,
        });

        await page.setContent(html, {
            waitUntil: "networkidle0",
        });

        // Set the page to use 'screen' media type for better CSS rendering
        // This is crucial for Tailwind CSS and other screen-based styles
        await page.emulateMediaType('screen');

        // Wait for all fonts to be ready
        try {
            await page.evaluateHandle("document.fonts.ready");
        } catch (fontError) {
            console.warn("Font loading error (non-critical):", fontError);
        }

        // Additional wait for rendering stability
        await new Promise((r) => setTimeout(r, 500));

        const pdf = await page.pdf({
            printBackground: true,
            format: "A4",
            margin: { top: 0, left: 0, right: 0, bottom: 0 },
            preferCSSPageSize: true,
        });

        await browser.close();

        console.log("PDF export completed successfully");

        return new NextResponse(Buffer.from(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        });
    } catch (err: any) {
        console.error("PDF ERROR:", err);
        return NextResponse.json(
            { error: "Failed to export PDF", message: err.message },
            { status: 500 }
        );
    }
}
