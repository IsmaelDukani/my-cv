"use client";

import { exportPreviewToPdf } from "./exportPreviewToPdf";

export default function ExportPDFButton() {
    async function handleExport() {
        await exportPreviewToPdf();
    }

    return (
        <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md"
        >
            Download PDF
        </button>
    );
}
