import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

type PdfPageFormat = 'a4' | 'letter';

interface ExportHtmlToPdfOptions {
    fileName: string;
    format?: PdfPageFormat;
    margin?: number | [number, number, number, number];
}

interface PreparedExportTarget {
    target: HTMLElement;
    cleanup: () => void;
}

interface PreparedPdfDocument {
    pdf: jsPDF;
    safeFileName: string;
}

function sanitizeFileName(fileName: string) {
    return fileName
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, ' ')
        .slice(0, 120);
}

function prepareElementForPdf(element: HTMLElement): PreparedExportTarget {
    const host = document.createElement('div');
    const clonedElement = element.cloneNode(true) as HTMLElement;
    const rect = element.getBoundingClientRect();

    host.style.position = 'fixed';
    host.style.left = '-100000px';
    host.style.top = '0';
    host.style.pointerEvents = 'none';
    host.style.opacity = '0';
    host.style.background = '#ffffff';
    host.style.padding = '0';
    host.style.margin = '0';
    host.style.zIndex = '-1';

    clonedElement.style.width = `${Math.ceil(rect.width)}px`;
    clonedElement.style.maxWidth = 'none';
    clonedElement.style.background = '#ffffff';
    clonedElement.style.color = '#000000';
    clonedElement.style.boxShadow = 'none';

    host.appendChild(clonedElement);
    document.body.appendChild(host);

    return {
        target: clonedElement,
        cleanup: () => {
            host.remove();
        },
    };
}

function normalizeMargin(margin: ExportHtmlToPdfOptions['margin']) {
    if (Array.isArray(margin)) {
        return margin;
    }

    const value = margin ?? 10;
    return [value, value, value, value] as [number, number, number, number];
}

async function renderElementToCanvas(element: HTMLElement) {
    return html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
    });
}

async function buildPdfDocument(element: HTMLElement, options: ExportHtmlToPdfOptions): Promise<PreparedPdfDocument> {
    const safeFileName = sanitizeFileName(options.fileName) || 'documento';
    const prepared = prepareElementForPdf(element);
    const margin = normalizeMargin(options.margin);

    try {
        const canvas = await renderElementToCanvas(prepared.target);
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: options.format ?? 'a4',
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const usableWidth = pageWidth - margin[1] - margin[3];
        const usableHeight = pageHeight - margin[0] - margin[2];
        const pagePixelHeight = Math.max(1, Math.floor((canvas.width * usableHeight) / usableWidth));
        const totalPages = Math.max(1, Math.ceil(canvas.height / pagePixelHeight));

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
            if (pageIndex > 0) {
                pdf.addPage();
            }

            const sourceY = pageIndex * pagePixelHeight;
            const sliceHeight = Math.min(pagePixelHeight, canvas.height - sourceY);
            const pageCanvas = document.createElement('canvas');
            const pageContext = pageCanvas.getContext('2d');

            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeight;

            if (!pageContext) {
                throw new Error('No se pudo crear el contexto del canvas para PDF');
            }

            pageContext.fillStyle = '#ffffff';
            pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            pageContext.drawImage(
                canvas,
                0,
                sourceY,
                canvas.width,
                sliceHeight,
                0,
                0,
                canvas.width,
                sliceHeight
            );

            const imageData = pageCanvas.toDataURL('image/png');
            const renderedHeight = (sliceHeight * usableWidth) / canvas.width;

            pdf.addImage(imageData, 'PNG', margin[3], margin[0], usableWidth, renderedHeight);
        }

        return { pdf, safeFileName };
    } finally {
        prepared.cleanup();
    }
}

export async function exportHtmlToPdf(element: HTMLElement, options: ExportHtmlToPdfOptions) {
    const { pdf, safeFileName } = await buildPdfDocument(element, options);
    pdf.save(`${safeFileName}.pdf`);
}

export async function createHtmlPdfBlob(element: HTMLElement, options: ExportHtmlToPdfOptions): Promise<Blob> {
    const { pdf } = await buildPdfDocument(element, options);
    return pdf.output('blob');
}

export async function printHtmlAsPdf(element: HTMLElement, options: ExportHtmlToPdfOptions) {
    const pdfBlob = await createHtmlPdfBlob(element, options);
    const blobUrl = URL.createObjectURL(pdfBlob);

    await new Promise<void>((resolve, reject) => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = blobUrl;

        const cleanup = () => {
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
                iframe.remove();
            }, 1500);
        };

        iframe.onload = () => {
            setTimeout(() => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    resolve();
                } catch (error) {
                    console.error('Error al imprimir el PDF:', error);
                    reject(error);
                } finally {
                    cleanup();
                }
            }, 350);
        };

        iframe.onerror = () => {
            cleanup();
            reject(new Error('No se pudo cargar el PDF para impresión'));
        };

        document.body.appendChild(iframe);
    });
}
