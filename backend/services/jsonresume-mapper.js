'use strict';

/**
 * jsonresume-mapper.js
 *
 * Adapter: converts the JobPilot internal data shape { personalInfo, cvData }
 * into a valid JSON Resume schema object.
 *
 * Expected Quill HTML patterns per section:
 *
 *  technicalSkills  → plain text (inside <p>) in "Category: item, item" format
 *  education        → <p><strong>Degree Field, Institution</strong> (date range)</p>
 *                     <p>GPA: XX</p>  <p>Coursework: ...</p>
 *  projects         → repeated: <p><strong>Title</strong> (tech stack)</p>
 *                               <p>GitHub: <a href="...">...</a></p>
 *                               <ul><li>highlight</li>...</ul>
 *  experience       → repeated: <p><strong>Role – Company/Unit</strong> (MM/YYYY – MM/YYYY)</p>
 *                               <ul><li>highlight</li>...</ul>
 *  additionalInfo   → <p><strong>Category:</strong> value, value</p>
 */

// ─────────────────────────────────────────────────────────────────────────────
// Generic HTML helpers
// ─────────────────────────────────────────────────────────────────────────────

function stripHtml(html) {
    if (!html) return '';
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/** Extract text from every <li>...</li> */
function parseListItems(html) {
    if (!html) return [];
    const items = [];
    const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        const text = stripHtml(m[1]).trim();
        if (text) items.push(text);
    }
    return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_MAP = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
};

/**
 * Convert a single date token (various formats) to "YYYY-MM" or "YYYY".
 *   "October 2021"  → "2021-10"
 *   "07/2017"       → "2017-07"
 *   "2025"          → "2025"
 *   "Present"       → ""  (empty = present)
 */
function normaliseDate(s) {
    s = s.trim();
    if (!s || /^(present|current|now)$/i.test(s)) return '';
    // MM/YYYY
    const numMatch = s.match(/^(\d{1,2})\/(\d{4})$/);
    if (numMatch) return `${numMatch[2]}-${numMatch[1].padStart(2, '0')}`;
    // Month YYYY
    const wordMatch = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (wordMatch) {
        const mm = MONTH_MAP[wordMatch[1].toLowerCase()] || '01';
        return `${wordMatch[2]}-${mm}`;
    }
    // YYYY only
    const yearMatch = s.match(/^(\d{4})$/);
    if (yearMatch) return yearMatch[1];
    return s; // fallback: return as-is
}

/**
 * Parse a date range string into { start, end }.
 *   "October 2021 – September 2025"  → { start: "2021-10", end: "2025-09" }
 *   "07/2017 – 03/2020"              → { start: "2017-07", end: "2020-03" }
 */
function parseDateRange(dateStr) {
    // Split on en-dash, em-dash, or plain hyphen (with optional spaces)
    const parts = dateStr.split(/\s*[–—\-]\s*/);
    return {
        start: parts[0] ? normaliseDate(parts[0]) : '',
        end:   parts[1] ? normaliseDate(parts[1]) : '',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section parsers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * STEP 1 — Skills
 *
 * Input text (stripped from HTML):
 *   "Programming Languages: Java, Python, ... Backend & Systems: ..."
 *
 * Split on recognisable "CategoryName:" anchors and produce one skills entry
 * per category.
 */
function parseSkills(html) {
    if (!html) return [];

    // ── Tier 1: Quill paragraph-based format ─────────────────────────────────
    // When the user presses Enter between skill categories in Quill, each line
    // becomes a separate <p> block: <p>Category: item, item</p>
    // Split on </p> boundaries first.
    const paragraphs = html
        .split(/<\/p>|<br\s*\/?>/gi)
        .map(p => stripHtml(p).trim())
        .filter(Boolean);

    // If any paragraph contains a "Word(s): items" pattern, use paragraph split
    const catLineRe = /^([A-Z][A-Za-z\s&\/+\-]+?)\s*:\s*(.+)$/;
    const fromParagraphs = [];
    for (const line of paragraphs) {
        const m = line.match(catLineRe);
        if (!m) continue;
        if (/^(GPA|GitHub|https?|www)/i.test(m[1])) continue;
        const name     = m[1].trim();
        const keywords = m[2].split(',').map(k => k.trim()).filter(Boolean);
        if (keywords.length) fromParagraphs.push({ name, level: '', keywords });
    }
    if (fromParagraphs.length > 0) return fromParagraphs;

    // ── Tier 2: Single-blob fallback (all in one <p>, no line breaks) ────────
    // The blob looks like: "Programming Languages: Java, Python, SQL Backend & Systems: ..."
    // We find category anchors by scanning backwards from each ":" to find the
    // comma that separates the previous category's last keyword from this category name.
    const text = stripHtml(html);

    const colonIdxs = [];
    for (let i = 1; i < text.length; i++) {
        // Skip "://" in URLs
        if (text[i] === ':' && text[i + 1] !== '/' && text[i - 1] !== '/') {
            colonIdxs.push(i);
        }
    }

    const anchors = [];
    for (const ci of colonIdxs) {
        // Walk backwards from colon to find the nearest comma before this category name
        let pos = ci - 1;
        while (pos >= 0 && text[pos] === ' ') pos--; // skip spaces before ":"
        const nameEnd   = pos + 1;
        let   nameStart = 0;
        while (pos >= 0 && text[pos] !== ',') pos--;
        nameStart = pos + 1; // char after the comma (or 0 if no comma found)

        const name = text.slice(nameStart, nameEnd).trim();
        if (!name || name.length > 60) continue;
        if (/^(GPA|GitHub|https?|www)/i.test(name)) continue;
        if (!/^[A-Z]/.test(name)) continue;

        anchors.push({ name, nameStart, colonIdx: ci, valueStart: ci + 1 });
    }

    if (anchors.length === 0) {
        const kws = text.split(',').map(k => k.trim()).filter(Boolean);
        return kws.length ? [{ name: 'Technical Skills', level: '', keywords: kws }] : [];
    }

    // Deduplicate anchors at the same colon position (keep longest name)
    const deduped = anchors.reduce((acc, a) => {
        const last = acc[acc.length - 1];
        if (last && last.colonIdx === a.colonIdx) {
            if (a.name.length > last.name.length) acc[acc.length - 1] = a;
        } else {
            acc.push(a);
        }
        return acc;
    }, []);

    const skills = [];
    for (let i = 0; i < deduped.length; i++) {
        const { name, nameStart, valueStart } = deduped[i];
        const valueEnd = i + 1 < deduped.length ? deduped[i + 1].nameStart : text.length;
        const raw      = text.slice(valueStart, valueEnd).trim().replace(/,?\s*$/, '');
        const keywords = raw.split(',').map(k => k.trim()).filter(Boolean);
        if (keywords.length) {
            skills.push({ name, level: '', keywords });
        }
    }
    return skills;
}








/**
 * STEP 2 — Education
 *
 * Splits on <p><strong> boundaries (each = one institution).
 * Extracts: studyType, area, institution, date range, GPA, and a clean summary.
 */
function parseEducation(html) {
    if (!html) return [];

    // Split on each new entry (starts with <p> containing <strong>)
    const parts = html.split(/(?=<p[^>]*>\s*<strong)/i).filter(p => p.trim());
    const entries = [];

    for (const part of parts) {
        // Extract the <strong> title
        const strongMatch = part.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
        if (!strongMatch) continue;

        const titleRaw = stripHtml(strongMatch[1]).trim();

        // Text immediately after </strong> in the same <p> — often "(date range)"
        const firstPMatch = part.match(/<p[^>]*>[\s\S]*?<\/strong>([\s\S]*?)<\/p>/i);
        const afterStrong = firstPMatch ? stripHtml(firstPMatch[1]).trim() : '';

        // Parse date range from parentheses
        let startDate = '', endDate = '';
        const dateParens = afterStrong.match(/\(([^)]+)\)/);
        if (dateParens) {
            const dr = parseDateRange(dateParens[1]);
            startDate = dr.start;
            endDate   = dr.end;
        }

        // Parse degree title: "B.Sc. Software Engineering, Ben-Gurion University"
        const { studyType, area, institution } = parseDegreeTitle(titleRaw);

        // Collect remaining <p> blocks as summary lines (skip the first <p>)
        const allParas = [...part.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
        let score = '';
        const summaryLines = [];

        for (let i = 1; i < allParas.length; i++) {   // i=0 is the title paragraph
            const line = stripHtml(allParas[i][1]).trim();
            if (!line) continue;
            const gpaMatch = line.match(/^GPA\s*:\s*(.+)$/i);
            if (gpaMatch) {
                score = gpaMatch[1].trim();
            } else {
                summaryLines.push(line);
            }
        }

        entries.push({
            institution,
            studyType,
            area,
            startDate,
            endDate,
            score,
            courses: [],
            summary: summaryLines.join('\n'),
        });
    }

    return entries;
}

/**
 * Helper: parse "B.Sc. Software Engineering, Ben-Gurion University"
 * → { studyType: "B.Sc.", area: "Software Engineering", institution: "Ben-Gurion University" }
 */
function parseDegreeTitle(title) {
    const degreeRe = /^(B\.Sc\.|M\.Sc\.|Ph\.D\.|B\.A\.|M\.A\.|Bachelor(?:\s+of)?|Master(?:\s+of)?|Doctor(?:\s+of)?)\s*/i;
    let studyType = '';
    let rest = title;

    const dm = title.match(degreeRe);
    if (dm) {
        studyType = dm[1].trim();
        rest = title.slice(dm[0].length).trim();
    }

    // Last comma separates field from institution
    const lastComma = rest.lastIndexOf(',');
    let area = rest, institution = '';
    if (lastComma !== -1) {
        area        = rest.slice(0, lastComma).trim();
        institution = rest.slice(lastComma + 1).trim();
    }

    return { studyType, area, institution };
}

/**
 * STEP 3 — Projects
 *
 * Each project starts with: <p><strong>Title</strong> (tech stack)</p>
 * Optionally followed by:   <p>GitHub: <a href="...">...</a></p>
 * Then:                     <ul><li>highlight</li>...</ul>
 */
function parseProjects(html) {
    if (!html) return [];
    return parseBlockEntries(html, 'project');
}

/**
 * STEP 4 — Work / Experience
 *
 * Each entry starts with: <p><strong>Role – Company</strong> (MM/YYYY – MM/YYYY)</p>
 * Then:                   <ul><li>highlight</li>...</ul>
 */
function parseWork(html) {
    if (!html) return [];
    return parseBlockEntries(html, 'work');
}

/**
 * Shared parser for the project / work block pattern.
 * Both sections use the same Quill HTML structure.
 */
function parseBlockEntries(html, kind) {
    // Split on each new strong-title block
    const parts = html.split(/(?=<p[^>]*>\s*<strong)/i).filter(p => p.trim());
    const results = [];

    for (const part of parts) {
        const strongMatch = part.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
        if (!strongMatch) continue;

        const fullTitle  = stripHtml(strongMatch[1]).trim();

        // Text after </strong> in first <p> → often "(tech stack)" or "(date range)"
        const firstPMatch = part.match(/<p[^>]*>[\s\S]*?<\/strong>([\s\S]*?)<\/p>/i);
        const afterStrong = firstPMatch ? firstPMatch[1].trim() : '';
        const parenText   = stripHtml(afterStrong).replace(/^\s*\(|\)\s*$/g, '').trim();

        // GitHub / website URL from the following <p> containing an <a>
        let url = '';
        const githubPMatch = part.match(/<p[^>]*>[^<]*(?:GitHub|website|link|http)[^<]*<a[^>]+href="([^"]+)"/i);
        if (githubPMatch) url = githubPMatch[1];

        // highlights from <ul>
        const highlights = parseListItems(part);

        // Extra <p> lines after the title (excluding github line)
        const allParas   = [...part.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
        const summaryLines = [];
        for (let i = 1; i < allParas.length; i++) {
            const line = stripHtml(allParas[i][1]).trim();
            if (!line) continue;
            if (/^(GitHub|https?:|website|link)/i.test(line)) continue; // skip url lines
            summaryLines.push(line);
        }

        if (kind === 'project') {
            results.push({
                name:        fullTitle,
                description: parenText,   // tech stack
                url,
                highlights,
                summary:     summaryLines.join('\n'),
            });
        } else {
            // Work entry: parse "Role – Company" and date range
            const { position, name: company } = splitRoleCompany(fullTitle);
            let startDate = '', endDate = '';

            // Date range is in parenText when it's a work entry
            if (parenText && /[\d\/–\-]/.test(parenText)) {
                const dr = parseDateRange(parenText);
                startDate = dr.start;
                endDate   = dr.end;
            } else {
                // Try finding date in afterStrong directly
                const dateParens = afterStrong.match(/\(([^)]+)\)/);
                if (dateParens) {
                    const dr = parseDateRange(dateParens[1]);
                    startDate = dr.start;
                    endDate   = dr.end;
                }
            }

            results.push({
                name:      company,
                position,
                startDate,
                endDate,
                summary:   summaryLines.join('\n'),
                highlights,
            });
        }
    }

    return results;
}

/**
 * Helper: split "Military Service – Artillery Corps Combat Soldier"
 * → { position: "Military Service", name: "Artillery Corps Combat Soldier" }
 *
 * If no dash separator, the whole string becomes `position`, `name` stays empty.
 */
function splitRoleCompany(fullTitle) {
    // Match en-dash, em-dash, or " - " with word boundaries
    const dashIdx = fullTitle.search(/\s[–—]\s/);
    if (dashIdx !== -1) {
        return {
            position: fullTitle.slice(0, dashIdx).trim(),
            name:     fullTitle.slice(dashIdx + 2).trim(),
        };
    }
    // Fallback: plain hyphen with spaces
    const hyphenIdx = fullTitle.search(/\s-\s/);
    if (hyphenIdx !== -1) {
        return {
            position: fullTitle.slice(0, hyphenIdx).trim(),
            name:     fullTitle.slice(hyphenIdx + 2).trim(),
        };
    }
    return { position: fullTitle, name: '' };
}

/**
 * STEP 5 — Additional Information / Interests
 *
 * Input HTML: <p><strong>Languages:</strong> Hebrew (Native), English (Highly proficient)</p>
 *
 * Same "Category: value, value" split as skills, producing interests[].
 */
function parseInterests(html) {
    if (!html) return [];

    const text = stripHtml(html);

    // Use same anchor regex as skills
    const anchorRe = /([A-Z][A-Za-z &\/+]+?)\s*:/g;
    const anchors = [];
    let m;
    while ((m = anchorRe.exec(text)) !== null) {
        if (m[1].length > 40) continue;
        anchors.push({ name: m[1].trim(), end: m.index + m[0].length });
    }

    if (anchors.length === 0) {
        // No category headers — return plain text as one entry
        return text ? [{ name: 'Additional Information', keywords: [text] }] : [];
    }

    const interests = [];
    for (let i = 0; i < anchors.length; i++) {
        const valueStart = anchors[i].end;
        const valueEnd   = i + 1 < anchors.length
            ? anchors[i + 1].end - anchors[i + 1].name.length - 1
            : text.length;
        const value    = text.slice(valueStart, valueEnd).trim();
        const keywords = value.split(',').map(k => k.trim()).filter(Boolean);
        if (keywords.length) {
            interests.push({ name: anchors[i].name, keywords });
        }
    }
    return interests;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main mapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} personalInfo  – { name, email, phone, linkedin, github, ... }
 * @param {Object} cvData        – { summary, technicalSkills, education,
 *                                   projects, experience, additionalInformation }
 * @returns {Object} JSON Resume–schema–compliant object
 */
function mapToJsonResume(personalInfo, cvData) {
    // ── basics ────────────────────────────────────────────────────────────────
    const profiles = [];

    if (personalInfo.linkedin) {
        const url = personalInfo.linkedin.startsWith('http')
            ? personalInfo.linkedin
            : `https://linkedin.com/in/${personalInfo.linkedin}`;
        profiles.push({ network: 'LinkedIn', username: personalInfo.linkedin, url });
    }
    if (personalInfo.github) {
        const url = personalInfo.github.startsWith('http')
            ? personalInfo.github
            : `https://github.com/${personalInfo.github}`;
        profiles.push({ network: 'GitHub', username: personalInfo.github, url });
    }

    const basics = {
        name:     personalInfo.name  || '',
        email:    personalInfo.email || '',
        phone:    personalInfo.phone || '',
        url:      personalInfo.linkedin || personalInfo.github || '',
        summary:  stripHtml(cvData.summary || ''),
        location: {},
        profiles,
    };

    // ── skills ────────────────────────────────────────────────────────────────
    const skills = parseSkills(cvData.technicalSkills || '');

    // ── education ─────────────────────────────────────────────────────────────
    const education = parseEducation(cvData.education || '');

    // ── projects ──────────────────────────────────────────────────────────────
    const projects = parseProjects(cvData.projects || '');

    // ── work (experience) ─────────────────────────────────────────────────────
    const work = parseWork(cvData.experience || '');

    // ── interests (additional information) ────────────────────────────────────
    const interests = parseInterests(cvData.additionalInformation || '');

    // ── meta (section order hint — stackoverflow theme uses this natively) ────
    const meta = {
        theme: {
            sectionOrder: ['basics', 'summary', 'skills', 'education', 'projects', 'work', 'interests'],
        },
    };

    return { basics, work, education, skills, projects, interests, meta };
}

module.exports = { mapToJsonResume };
