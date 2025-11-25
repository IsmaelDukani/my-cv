import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportToPDF(elementId: string, filename: string = 'CV.pdf'): Promise<void> {
    console.log('[PDF Export] Starting export process...');
    console.log('[PDF Export] Element ID:', elementId);
    console.log('[PDF Export] Filename:', filename);

    try {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error('[PDF Export] Element not found with ID:', elementId);
            throw new Error(`Element with ID "${elementId}" not found`);
        }

        console.log('[PDF Export] Element found:', element);

        // Temporarily show the element if it's hidden
        const originalDisplay = element.style.display;
        const originalVisibility = element.style.visibility;
        const originalPosition = element.style.position;

        element.style.display = 'block';
        element.style.visibility = 'visible';
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        element.style.top = '0';

        console.log('[PDF Export] Element temporarily shown for capture');

        // Wait a bit for rendering
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('[PDF Export] Starting html2canvas capture...');

        // Capture the element as a canvas
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: true,
            backgroundColor: '#ffffff',
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight,
        });

        console.log('[PDF Export] Canvas captured successfully');
        console.log('[PDF Export] Canvas dimensions:', canvas.width, 'x', canvas.height);

        // Restore original styles
        element.style.display = originalDisplay;
        element.style.visibility = originalVisibility;
        element.style.position = originalPosition;
        element.style.left = '';
        element.style.top = '';

        console.log('[PDF Export] Element styles restored');

        // Calculate PDF dimensions (A4 size)
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        console.log('[PDF Export] Creating PDF with dimensions:', imgWidth, 'x', imgHeight, 'mm');

        // Create PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        console.log('[PDF Export] Image data created, length:', imgData.length);

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        console.log('[PDF Export] Image added to PDF');

        // Download the PDF
        pdf.save(filename);
        console.log('[PDF Export] PDF saved successfully as:', filename);
    } catch (error) {
        console.error('[PDF Export] Error occurred:', error);
        throw error;
    }
}
