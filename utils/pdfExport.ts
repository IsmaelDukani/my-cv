export async function exportToPDF(elementId: string, filename: string = 'CV.pdf'): Promise<void> {
    console.log('[PDF Export] Starting server-side export process...');

    try {
        // Get the CV element
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Element with ID "${elementId}" not found`);
        }

        // Select ONLY the main CV root element, not the preview wrapper
        const root = element.querySelector('#cv-root') ||
            element.querySelector('.resume-template-wrapper') ||
            element.querySelector('[class*="bg-"]') ||
            element.querySelector('div');

        if (!root) {
            throw new Error('CV root element not found');
        }

        // Use outerHTML to include the container + children
        const html = root.outerHTML;

        console.log('[PDF Export] Captured HTML length:', html.length);
        console.log('[PDF Export] HTML preview:', html.substring(0, 200));

        // Collect CSS from style tags
        let css = '';
        const styleTags = document.querySelectorAll('style');
        styleTags.forEach(tag => {
            css += tag.innerHTML + '\n';
        });

        // Collect external stylesheets
        const links: string[] = [];
        const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
        linkTags.forEach(tag => {
            links.push((tag as HTMLLinkElement).href);
        });

        // Get base URL for relative assets
        const baseUrl = window.location.origin;

        // Send to API
        const response = await fetch('/api/export-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ html, css, links, baseUrl }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate PDF');
        }

        // Get the blob
        const blob = await response.blob();

        // Download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log('[PDF Export] PDF downloaded successfully');

    } catch (error) {
        console.error('[PDF Export] Error:', error);
        throw error;
    }
}
