"use client";

export async function exportPreviewToPdf() {
    // Target the preview
    const preview = document.getElementById("cv-preview-original");
    if (!preview) {
        alert("Preview not found");
        return;
    }

    // Create hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "210mm";
    iframe.style.height = "297mm";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow!.document;

    // COPY all CSS <link> & <style>
    document.querySelectorAll("link[rel='stylesheet']").forEach((link) => {
        const newLink = iframeDoc.createElement("link");
        newLink.rel = "stylesheet";
        newLink.href = (link as HTMLLinkElement).href;
        iframeDoc.head.appendChild(newLink);
    });

    document.querySelectorAll("style").forEach((style) => {
        const newStyle = iframeDoc.createElement("style");
        newStyle.innerHTML = style.innerHTML;
        iframeDoc.head.appendChild(newStyle);
    });

    // Insert preview HTML into iframe body
    iframeDoc.body.innerHTML = `
    <div id="cv-wrapper" style="width:210mm;min-height:297mm;"> 
        ${preview.innerHTML}
    </div>
  `;

    // Wait for Tailwind + fonts to load
    await new Promise((res) => setTimeout(res, 300));

    // Send final HTML document to server
    const html = iframeDoc.documentElement.outerHTML;
    const baseUrl = window.location.origin;

    const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, baseUrl, filename: "CV.pdf" }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "CV.pdf";
    a.click();

    URL.revokeObjectURL(url);
    document.body.removeChild(iframe);
}
