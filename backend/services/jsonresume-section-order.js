'use strict';

/**
 * jsonresume-section-order.js
 *
 * Post-processing utility: reorders sections in the rendered HTML so they match
 * the canonical JobPilot section order:
 *
 *   1. Contact Info  (always in <header> — not moved)
 *   2. Summary
 *   3. Technical Skills
 *   4. Education
 *   5. Projects
 *   6. Experience / Work
 *   7. Additional Information / Interests
 *
 * Strategy: Each theme uses `<section>` or `<div class="summary">` elements as
 * direct siblings inside the body wrapper.  We extract those sibling blocks,
 * identify each by its heading text or element type, sort them, and stitch the
 * HTML back together.
 *
 * `stackoverflow` already honours `meta.theme.sectionOrder` natively, so it
 * is skipped here.
 */

// ---------------------------------------------------------------------------
// Canonical priority map  (lower number = appears first)
// "summary" is always 0 — handled as a special case per-theme
// ---------------------------------------------------------------------------
const SECTION_PRIORITY = {
    // summary / about
    summary:                 0,
    about:                   0,
    // skills
    skills:                  1,
    'technical skills':      1,
    'skill':                 1,
    // education
    education:               2,
    // projects
    projects:                3,
    'key projects':          3,
    // work / experience
    work:                    4,
    experience:              4,
    'work experience':       4,
    'professional experience': 4,
    // interests / additional
    interests:               5,
    'additional information': 5,
    'additional':            5,
    volunteering:            6,
    awards:                  7,
    publications:            8,
    references:              9,
};

function sectionPriority(headingText) {
    if (!headingText) return 50;
    const lower = headingText.toLowerCase().trim();
    for (const [key, val] of Object.entries(SECTION_PRIORITY)) {
        if (lower === key || lower.startsWith(key)) return val;
    }
    return 50; // unknown sections sink to the bottom
}

// ---------------------------------------------------------------------------
// Generic section splitter
//
// Works on themes where sections are direct siblings inside the body wrapper
// and each section starts with a consistent open-tag pattern.
//
// splitPattern : RegExp that matches the OPENING of each new section block.
//                Must NOT use global flag — we add it ourselves.
// getHeading   : function(sectionHtml) → heading string (or '' for summary)
// ---------------------------------------------------------------------------
function reorderBySplitting(html, splitPattern, getHeading) {
    // Find the position of </header> — everything before that is immutable
    const headerEnd = html.search(/<\/header>/i);
    if (headerEnd === -1) return html; // can't locate header; bail out

    const headerClose = html.indexOf('</header>', headerEnd) + '</header>'.length;
    const prefix  = html.slice(0, headerClose);         // <head>…</header>
    const rest    = html.slice(headerClose);            // sections + closing tags

    // Find where the body/wrapper closing tags begin (after last section)
    // We split `rest` into section blobs + the trailing suffix (</div></body>…)
    const globalPattern = new RegExp(splitPattern.source, 'gi');
    const positions = [];
    let m;
    while ((m = globalPattern.exec(rest)) !== null) {
        positions.push(m.index);
    }

    if (positions.length < 2) return html; // nothing to reorder

    // Suffix = everything after the last section's end
    // Find the end of the last section: next occurrence of a closing </div> or </body>
    // Strategy: the suffix starts at the closing tag after the last section blob
    // We'll define section blobs as [positions[i], positions[i+1]) and use the
    // tail after positions[last] as the "last blob + suffix".  We then find the
    // boundary of the last section by looking for the first top-level closing wrapper.

    const blobs = positions.map((pos, i) => {
        const end = i + 1 < positions.length ? positions[i + 1] : rest.length;
        return rest.slice(pos, end);
    });

    // Anything before the first section (e.g. whitespace / newlines)
    const intro  = rest.slice(0, positions[0]);

    // Suffix: capture trailing </div></body></html> by stripping from last blob
    // The last blob ends at rest.length; the actual closing tags are NOT part of
    // any section so they appear after the last section's closing tag.
    // We find the suffix by looking for `</body` in the last blob.
    let suffix = '';
    const lastBlob  = blobs[blobs.length - 1];
    const bodyClose = lastBlob.search(/<\/body/i);
    if (bodyClose !== -1) {
        suffix = lastBlob.slice(bodyClose);
        blobs[blobs.length - 1] = lastBlob.slice(0, bodyClose);
    }

    // Sort blobs by their heading priority
    blobs.sort((a, b) => {
        return sectionPriority(getHeading(a)) - sectionPriority(getHeading(b));
    });

    return prefix + intro + blobs.join('') + suffix;
}

// ---------------------------------------------------------------------------
// Extract heading text from a section blob
// ---------------------------------------------------------------------------

/**
 * For the React-based themes: sections contain <h2>...</h2> as the title.
 */
function getH2(blob) {
    const m = blob.match(/<h2[^>]*>([^<]+)/i);
    return m ? m[1].trim() : '';
}

/**
 * For the `claude` theme: sections use <div class="section-title">...</div>
 * or the special <div class="summary"> (no heading).
 */
function getClaudeHeading(blob) {
    // summary block has class "summary" — no inner heading
    if (/class="summary"/i.test(blob)) return 'summary';
    const m = blob.match(/class="section-title">([^<]+)/i);
    return m ? m[1].trim() : '';
}

// ---------------------------------------------------------------------------
// Theme-specific reorder functions
// ---------------------------------------------------------------------------

/**
 * claude theme:
 *   Sections are:  <div class="summary">  and  <section class="section">
 *   The split pattern is the start of either element.
 */
function reorderClaude(html) {
    return reorderBySplitting(
        html,
        /<div class="summary"|<section class="section"/i,
        getClaudeHeading,
    );
}

/**
 * architects-portfolio / sales-hunter:
 *   Sections are:  <section class="...resume-section...">
 */
function reorderResumeSections(html) {
    return reorderBySplitting(
        html,
        /<section[^>]+resume-section[^>]*>/i,
        getH2,
    );
}

/**
 * data-driven:
 *   Sections are generic <section class="sc-..."> without the resume-section class.
 *   Identified by the sc-cxBFFk class that is consistent across all section wrappers.
 *   We use the first <h2> inside each to identify the section type.
 */
function reorderDataDriven(html) {
    // data-driven sections start with <section class="sc-cxBFFk ...">
    return reorderBySplitting(
        html,
        /<section class="sc-[a-zA-Z]+\s/i,
        getH2,
    );
}

/**
 * developer-mono:
 *   Has an unlabelled summary section (first child, different class) + labelled sections.
 *   Summary block:  <section class="...resume-section sc-QIYgV...">
 *   Other sections: <section class="...resume-section sc-enXOiP...">
 *   Both contain `resume-section` so we can reuse reorderResumeSections.
 *   The summary block has no <h2> so getH2 returns '' → sectionPriority → 50.
 *   We override getHeading to return 'summary' for the no-h2 case.
 */
function reorderDeveloperMono(html) {
    return reorderBySplitting(
        html,
        /<section[^>]+resume-section[^>]*>/i,
        (blob) => {
            const h = getH2(blob);
            return h || 'summary'; // unnamed section = summary block
        },
    );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply section reordering for themes that don't natively support sectionOrder.
 *
 * @param {string} html     - Raw HTML string from theme.render()
 * @param {string} themeId  - One of the 6 theme IDs
 * @returns {string}        - HTML with sections in canonical order
 */
function reorderSections(html, themeId) {
    switch (themeId) {
        case 'stackoverflow':
            // Already ordered by meta.theme.sectionOrder — no post-processing needed
            return html;
        case 'claude':
            return reorderClaude(html);
        case 'architects-portfolio':
        case 'sales-hunter':
            return reorderResumeSections(html);
        case 'data-driven':
            return reorderDataDriven(html);
        case 'developer-mono':
            return reorderDeveloperMono(html);
        default:
            return html;
    }
}

module.exports = { reorderSections };
