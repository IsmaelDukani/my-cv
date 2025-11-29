import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export async function POST(req: Request) {
    try {
        const { html, filename = "CV.pdf", baseUrl = "" } = await req.json();

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

        await page.setContent(html, {
            waitUntil: "networkidle0",
        });

        // Set the page to use 'screen' media type for better CSS rendering
        await page.emulateMediaType('screen');

        // Wait for all fonts to be ready
        await page.evaluateHandle("document.fonts.ready");
        // Additional wait for rendering stability
        await new Promise((r) => setTimeout(r, 500));

        const pdf = await page.pdf({
            printBackground: true,
            format: "A4",
            margin: { top: 0, left: 0, right: 0, bottom: 0 },
        });

        await browser.close();

        return new NextResponse(Buffer.from(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (err: any) {
        console.error("PDF ERROR:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
