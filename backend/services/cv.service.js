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
const FONT_SIZES = { name: 22, sectionTitle: 13, body: 10.5, contact: 9.5 };

// ── Main generator ──────────────────────────────────────────────────────────

const generateCvPdf = (personalInfo, cvData) => {
    return new Promise((resolve, reject) => {
        try {
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

            // ── Name ────────────────────────────────────────────────────
            doc
                .font('Helvetica-Bold')
                .fontSize(FONT_SIZES.name)
                .fillColor(COLORS.heading)
                .text(personalInfo?.name || 'Curriculum Vitae', { align: 'center' });

            doc.moveDown(0.3);

            // ── Contact row ─────────────────────────────────────────────
            const contactParts = [
                personalInfo?.phone,
                personalInfo?.email,
                personalInfo?.linkedin,
                personalInfo?.github,
            ].filter(Boolean);

            if (contactParts.length) {
                doc
                    .font('Helvetica')
                    .fontSize(FONT_SIZES.contact)
                    .fillColor(COLORS.contactLabel)
                    .text(contactParts.join('  |  '), { align: 'center' });
            }

            doc.moveDown(0.6);

            // ── Sections ────────────────────────────────────────────────
            const sections = [
                { title: 'Summary', content: cvData?.summary },
                { title: 'Technical Skills', content: cvData?.technicalSkills },
                { title: 'Education', content: cvData?.education },
                { title: 'Projects', content: cvData?.projects },
                { title: 'Experience', content: cvData?.experience },
                { title: 'Additional Information', content: cvData?.additionalInformation },
            ];

            for (const { title, content } of sections) {
                const text = stripHtml(content);
                if (!text) continue;

                // Section heading
                doc
                    .font('Helvetica-Bold')
                    .fontSize(FONT_SIZES.sectionTitle)
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

                doc.moveDown(0.35);

                // Body text
                doc
                    .font('Helvetica')
                    .fontSize(FONT_SIZES.body)
                    .fillColor(COLORS.body)
                    .text(text, { lineGap: 2 });

                doc.moveDown(0.6);
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = { generateCvPdf };