const PDFDocument = require('pdfkit');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strip HTML tags and decode common entities */
function stripHtml(html) {
    if (!html) return '';
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li>/gi, '  • ')
        .replace(/<\/?(ul|ol)>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// ── Colors & layout ─────────────────────────────────────────────────────────

const COLORS = {
    heading: '#2c3e50',
    body: '#333333',
    contactLabel: '#555555',
    line: '#cccccc',
};

const MARGIN = { top: 50, bottom: 50, left: 55, right: 55 };

// Base font sizes (before scaling)
const BASE_FONTS = { name: 22, sectionTitle: 13, body: 10.5, contact: 9.5 };

// ── Build section list ──────────────────────────────────────────────────────

function buildSections(cvData) {
    return [
        { title: 'Summary', content: cvData?.summary },
        { title: 'Technical Skills', content: cvData?.technicalSkills },
        { title: 'Education', content: cvData?.education },
        { title: 'Projects', content: cvData?.projects },
        { title: 'Experience', content: cvData?.experience },
        { title: 'Additional Information', content: cvData?.additionalInformation },
    ]
        .map(s => ({ ...s, text: stripHtml(s.content) }))
        .filter(s => s.text);
}

// ── Render content into a doc (used for both measure & final pass) ──────────

function renderContent(doc, personalInfo, sections, scale) {
    const fs = {
        name: BASE_FONTS.name * scale,
        sectionTitle: BASE_FONTS.sectionTitle * scale,
        body: BASE_FONTS.body * scale,
        contact: BASE_FONTS.contact * scale,
    };

    const sectionGap = 0.6 * scale;
    const lineGapBody = 2 * scale;

    // ── Name
    doc
        .font('Helvetica-Bold')
        .fontSize(fs.name)
        .fillColor(COLORS.heading)
        .text(personalInfo?.name || 'Curriculum Vitae', { align: 'center' });

    doc.moveDown(0.3 * scale);

    // ── Contact row
    const contactParts = [
        personalInfo?.phone,
        personalInfo?.email,
        personalInfo?.linkedin,
        personalInfo?.github,
    ].filter(Boolean);

    if (contactParts.length) {
        doc
            .font('Helvetica')
            .fontSize(fs.contact)
            .fillColor(COLORS.contactLabel)
            .text(contactParts.join('  |  '), { align: 'center' });
    }

    doc.moveDown(sectionGap);

    // ── Sections
    for (const { title, text } of sections) {
        // Section heading
        doc
            .font('Helvetica-Bold')
            .fontSize(fs.sectionTitle)
            .fillColor(COLORS.heading)
            .text(title);

        // Divider line
        const lineY = doc.y + 2;
        doc
            .strokeColor(COLORS.line)
            .lineWidth(0.5)
            .moveTo(MARGIN.left, lineY)
            .lineTo(doc.page.width - MARGIN.right, lineY)
            .stroke();

        doc.moveDown(0.35 * scale);

        // Body text
        doc
            .font('Helvetica')
            .fontSize(fs.body)
            .fillColor(COLORS.body)
            .text(text, { lineGap: lineGapBody });

        doc.moveDown(sectionGap);
    }
}

// ── Main generator ──────────────────────────────────────────────────────────

const generateCvPdf = (personalInfo, cvData) => {
    return new Promise((resolve, reject) => {
        try {
            const sections = buildSections(cvData);

            // ── Pass 1: measure total content height ────────────────────
            const measureDoc = new PDFDocument({
                size: 'A4',
                margins: MARGIN,
                bufferPages: true,
            });

            // Suppress output – we only care about page count / y position
            measureDoc.on('data', () => {});

            renderContent(measureDoc, personalInfo, sections, 1);

            const pageCount = measureDoc.bufferedPageRange().count;
            const lastPageY = measureDoc.y;
            const usableHeight = measureDoc.page.height - MARGIN.top - MARGIN.bottom;

            measureDoc.end();

            // ── Calculate scale ─────────────────────────────────────────
            let scale = 1;
            if (pageCount > 1) {
                // Total content height across all pages
                const totalContent =
                    (pageCount - 1) * usableHeight + (lastPageY - MARGIN.top);
                scale = (usableHeight / totalContent) * 0.97; // 3 % safety margin
                scale = Math.max(0.55, scale); // never go below 55 %
            }

            // ── Pass 2: render the real PDF ─────────────────────────────
            const doc = new PDFDocument({
                size: 'A4',
                margins: MARGIN,
                bufferPages: true,
                info: {
                    Title: `${personalInfo?.name || 'CV'} — Curriculum Vitae`,
                    Author: personalInfo?.name || 'JobPilot',
                },
            });

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            renderContent(doc, personalInfo, sections, scale);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = { generateCvPdf };