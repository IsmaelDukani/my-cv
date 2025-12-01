
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function createSamplePdf() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('John Doe', { x: 50, y: height - 50, size: 24, font });
    page.drawText('john.doe@example.com | 123-456-7890', { x: 50, y: height - 80, size: 12, font });

    page.drawText('Professional Summary', { x: 50, y: height - 150, size: 16, font });
    page.drawText('Experienced software engineer with a passion for AI.', { x: 50, y: height - 180, size: 12, font });

    page.drawText('Experience', { x: 50, y: height - 250, size: 16, font });
    page.drawText('Software Engineer - Tech Corp', { x: 50, y: height - 280, size: 14, font });
    page.drawText('Jan 2020 - Present', { x: 50, y: height - 300, size: 12, font });
    page.drawText('• Developed web applications.', { x: 50, y: height - 320, size: 12, font });

    page.drawText('Education', { x: 50, y: height - 400, size: 16, font });
    page.drawText('University of Technology', { x: 50, y: height - 430, size: 14, font });
    page.drawText('Bachelor of Science in Computer Science', { x: 50, y: height - 450, size: 12, font });
    page.drawText('2016 - 2020', { x: 50, y: height - 470, size: 12, font });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

async function runTest() {
    try {
        console.log('Creating sample PDF...');
        const pdfBytes = await createSamplePdf();
        const pdfPath = path.join(__dirname, 'sample.pdf');
        fs.writeFileSync(pdfPath, pdfBytes);
        console.log('Sample PDF created at:', pdfPath);

        const formData = new FormData();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        formData.append('file', blob, 'sample.pdf');

        console.log('Sending request to /api/parse-cv...');
        const response = await fetch('http://localhost:3000/api/parse-cv', {
            method: 'POST',
            body: formData,
        });

        const text = await response.text();
        console.log('Response status:', response.status);

        try {
            const result = JSON.parse(text);
            const outputPath = path.join(__dirname, '..', 'parse-cv-test.json');
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
            console.log('Test output saved to:', outputPath);
        } catch (e) {
            console.error('Failed to parse JSON. Raw response:', text);
        }

        // Clean up sample PDF
        fs.unlinkSync(pdfPath);

    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTest();
