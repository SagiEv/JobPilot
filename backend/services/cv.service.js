const PDFDocument = require('pdfkit');

// ── Margins matching original Puppeteer (10mm ≈ 28pt) ───────────────────────
const MARGIN = { top: 28, bottom: 28, left: 28, right: 28 };

const COLORS = { heading: '#2c3e50', body: '#333333', contact: '#555555', line: '#eeeeee' };

// Base font sizes matching the Puppeteer CSS (browser 16px base)
const BASE = { name: 24, section: 14, body: 10, contact: 9 };

// ── HTML → structured blocks ────────────────────────────────────────────────

function getFont(bold, italic) {
    if (bold && italic) return 'Helvetica-BoldOblique';
    if (bold) return 'Helvetica-Bold';
    if (italic) return 'Helvetica-Oblique';
    return 'Helvetica';
}

function decode(s) {
    return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

/** Parse inline HTML into runs: [{ text, bold, italic, underline }] */
function parseRuns(html) {
    const runs = [];
    let bold = false, italic = false, underline = false;
    for (const tok of html.split(/(<[^>]+>)/)) {
        if (/^<(strong|b)>$/i.test(tok)) { bold = true; continue; }
        if (/^<\/(strong|b)>$/i.test(tok)) { bold = false; continue; }
        if (/^<(em|i)>$/i.test(tok)) { italic = true; continue; }
        if (/^<\/(em|i)>$/i.test(tok)) { italic = false; continue; }
        if (/^<u>$/i.test(tok)) { underline = true; continue; }
        if (/^<\/u>$/i.test(tok)) { underline = false; continue; }
        if (/^<[^>]+>$/.test(tok)) continue;
        const t = decode(tok);
        if (t) runs.push({ text: t, bold, italic, underline });
    }
    return runs;
}

/** Parse full HTML into blocks: [{ type:'p'|'li', bullet, runs }] */
function parseHtml(html) {
    if (!html) return [];
    const blocks = [];
    let listType = null, idx = 0;

    // Normalise: split on block boundaries
    const raw = html.replace(/<br\s*\/?>/gi, '\n');
    const parts = raw.split(/(<\/?(?:p|ul|ol|li)[^>]*>)/i);

    let collecting = false;
    let buf = '';

    const flush = (type, bullet) => {
        if (!buf.trim()) { buf = ''; return; }
        blocks.push({ type, bullet: bullet || '', runs: parseRuns(buf.trim()) });
        buf = '';
    };

    for (const p of parts) {
        const lower = p.toLowerCase().trim();
        if (lower === '<ul>') { listType = 'ul'; idx = 0; continue; }
        if (lower === '<ol>') { listType = 'ol'; idx = 0; continue; }
        if (lower === '</ul>' || lower === '</ol>') { listType = null; continue; }
        if (/<p[^>]*>/i.test(lower)) { collecting = true; buf = ''; continue; }
        if (lower === '</p>') { flush('p'); collecting = false; continue; }
        if (lower === '<li>') { collecting = true; idx++; buf = ''; continue; }
        if (lower === '</li>') {
            flush('li', listType === 'ol' ? `${idx}. ` : '• ');
            collecting = false; continue;
        }
        if (collecting || !/</.test(p)) buf += p;
    }
    if (buf.trim()) flush('p');
    return blocks;
}

// ── Render helpers ──────────────────────────────────────────────────────────

function renderRuns(doc, runs, fontSize, startX, width) {
    if (!runs.length) { doc.text(''); return; }
    for (let i = 0; i < runs.length; i++) {
        const r = runs[i];
        const last = i === runs.length - 1;
        doc.font(getFont(r.bold, r.italic)).fontSize(fontSize);
        const opts = { continued: !last, underline: !!r.underline };
        if (i === 0 && startX !== undefined) {
            doc.text(r.text, startX, doc.y, { ...opts, width });
        } else {
            doc.text(r.text, opts);
        }
    }
}

function renderBlocks(doc, blocks, fontSize) {
    for (const b of blocks) {
        if (b.type === 'li') {
            const indent = 12;
            const bulletX = MARGIN.left + indent;
            const savedY = doc.y;

            // Measure bullet width to know where text starts
            doc.font('Helvetica').fontSize(fontSize);
            const bulletW = doc.widthOfString(b.bullet);

            // Render bullet (no line break, stays on same line)
            doc.text(b.bullet, bulletX, savedY, { lineBreak: false });

            // Render content in a column that starts after the bullet
            const textX = bulletX + bulletW;
            const textW = doc.page.width - MARGIN.right - textX;
            doc.y = savedY;
            renderRuns(doc, b.runs, fontSize, textX, textW);
            doc.x = MARGIN.left; // reset X so next block isn't indented
        } else {
            renderRuns(doc, b.runs, fontSize);
        }
    }
}

// ── Build section list ──────────────────────────────────────────────────────

function buildSections(cvData) {
    return [
        { title: 'Summary', html: cvData?.summary },
        { title: 'Technical Skills', html: cvData?.technicalSkills },
        { title: 'Education', html: cvData?.education },
        { title: 'Projects', html: cvData?.projects },
        { title: 'Experience', html: cvData?.experience },
        { title: 'Additional Information', html: cvData?.additionalInformation },
    ].map(s => ({ ...s, blocks: parseHtml(s.html) })).filter(s => s.blocks.length);
}

// ── Render full CV into a PDFDocument ───────────────────────────────────────

function renderCV(doc, personalInfo, sections, scale) {
    const fs = {
        name: BASE.name * scale,
        section: BASE.section * scale,
        body: BASE.body * scale,
        contact: BASE.contact * scale,
    };

    // ── Name
    doc.font('Helvetica-Bold').fontSize(fs.name).fillColor('#111111')
        .text(personalInfo?.name || 'Curriculum Vitae', { align: 'center' });
    doc.moveDown(0.15);

    // ── Contact
    const parts = [personalInfo?.phone, personalInfo?.email,
        personalInfo?.linkedin, personalInfo?.github].filter(Boolean);
    if (parts.length) {
        doc.font('Helvetica').fontSize(fs.contact).fillColor(COLORS.contact)
            .text(parts.join('  |  '), { align: 'center' });
    }
    doc.moveDown(0.4);

    // ── Sections
    for (const sec of sections) {
        doc.font('Helvetica-Bold').fontSize(fs.section).fillColor(COLORS.heading)
            .text(sec.title);

        const ly = doc.y + 1;
        doc.strokeColor(COLORS.line).lineWidth(0.5)
            .moveTo(MARGIN.left, ly).lineTo(doc.page.width - MARGIN.right, ly).stroke();
        doc.moveDown(0.2);

        doc.fillColor(COLORS.body);
        renderBlocks(doc, sec.blocks, fs.body);
        doc.moveDown(0.35);
    }
}

// ── Main entry (two-pass: measure → scale → render) ─────────────────────────

const generateCvPdf = (personalInfo, cvData) => {
    return new Promise((resolve, reject) => {
        try {
            const sections = buildSections(cvData);

            // Pass 1: measure
            const m = new PDFDocument({ size: 'A4', margins: MARGIN, bufferPages: true });
            m.on('data', () => {});
            renderCV(m, personalInfo, sections, 1);
            const pages = m.bufferedPageRange().count;
            const usable = m.page.height - MARGIN.top - MARGIN.bottom;
            const total = (pages - 1) * usable + (m.y - MARGIN.top);
            m.end();

            let scale = 1;
            if (pages > 1) {
                scale = (usable / total) * 0.98;
                scale = Math.max(0.65, scale);
            }

            // Pass 2: render final PDF
            const doc = new PDFDocument({
                size: 'A4', margins: MARGIN, bufferPages: true,
                info: { Title: `${personalInfo?.name || 'CV'} — CV`, Author: personalInfo?.name || 'JobPilot' },
            });
            const chunks = [];
            doc.on('data', c => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            renderCV(doc, personalInfo, sections, scale);
            doc.end();
        } catch (err) { reject(err); }
    });
};

module.exports = { generateCvPdf };