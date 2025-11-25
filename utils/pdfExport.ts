import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportToPDF(elementId: string, filename: string = 'CV.pdf'): Promise<void> {
    try {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error('Element not found');
        }

        // Temporarily show the element if it's hidden
        const originalDisplay = element.style.display;
        const originalVisibility = element.style.visibility;
        const originalPosition = element.style.position;

        element.style.display = 'block';
        element.style.visibility = 'visible';
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        element.style.top = '0';

        // Wait a bit for rendering
        await new Promise(resolve => setTimeout(resolve, 100));

        // Capture the element as a canvas
        const canvas = await html2canvas(element, {
            scale: 2, // Higher quality
            useCORS: true, // Handle cross-origin images
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight,
        });

        // Restore original styles
        element.style.display = originalDisplay;
        element.style.visibility = originalVisibility;
        element.style.position = originalPosition;
        element.style.left = '';
        element.style.top = '';

        // Calculate PDF dimensions (A4 size)
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Create PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        // Download the PDF
        pdf.save(filename);
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}
