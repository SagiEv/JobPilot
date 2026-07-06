'use strict';

const fs        = require('fs');
const puppeteer = require('puppeteer');
const { mapToJsonResume }    = require('./jsonresume-mapper');
const { reorderSections }    = require('./jsonresume-section-order');

// ---------------------------------------------------------------------------
// Theme registry
// ---------------------------------------------------------------------------
// Theme module type / render-function signatures (confirmed from dist inspection):
//   claude               → ESM, index.js, exports { render }       (pure HTML/CSS)
//   stackoverflow        → CJS, dist/index.js, exports { render }  (Svelte SSR, self-contained)
//   architects-portfolio → ESM, dist/index.js, exports { render }  (React SSR bundled, /dist subpath)
//   data-driven          → ESM, dist/index.js, exports { render }  (React SSR + styled-components, /dist)
//   developer-mono       → ESM, dist/index.js, exports { render }  (React SSR bundled, /dist subpath)
//   sales-hunter         → ESM, dist/index.js, exports { render }  (React SSR bundled, /dist subpath)
//
// The React-based themes are loaded via their `./dist` export subpath, which
// contains a pre-bundled ESM file that already inlines renderToStaticMarkup —
// no separate react / react-dom peer dependency is required at runtime.
// ---------------------------------------------------------------------------

const THEME_PACKAGES = {
    'claude':                'jsonresume-theme-claude',
    'stackoverflow':         'jsonresume-theme-stackoverflow',
    // Force the pre-bundled dist entry to avoid Node trying to execute .jsx source files
    'architects-portfolio':  'jsonresume-theme-architects-portfolio/dist',
    'data-driven':           'jsonresume-theme-data-driven/dist',
    'developer-mono':        'jsonresume-theme-developer-mono/dist',
    'sales-hunter':          'jsonresume-theme-sales-hunter/dist',
};

const DEFAULT_THEME = 'claude';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Dynamically load a theme package.
 *
 * - `stackoverflow` ships a CJS bundle → use require() directly.
 * - All other themes are ESM → use a Function-wrapped dynamic import()
 *   so that Node's static CJS analyser doesn't trip on the import keyword.
 */
async function loadTheme(pkgName) {
    if (pkgName === 'jsonresume-theme-stackoverflow') {
        return require(pkgName);
    }
    const dynamicImport = new Function('pkg', 'return import(pkg)');
    return dynamicImport(pkgName);
}

/**
 * Resolve the `render(resume)` function from whatever shape the theme exports.
 * Handles: { render }, { default: { render } }, { default: renderFn }.
 */
function resolveRender(themeModule) {
    if (typeof themeModule.render === 'function') return themeModule.render;
    if (themeModule.default) {
        if (typeof themeModule.default.render === 'function') return themeModule.default.render;
        if (typeof themeModule.default === 'function') return themeModule.default;
    }
    throw new Error('Could not find a render() function in the loaded theme module.');
}

// ---------------------------------------------------------------------------
// Preview (HTML) — replaces the old Handlebars approach
// ---------------------------------------------------------------------------

const previewCvJsonResume = async (personalInfo, cvData, themeId) => {
    if (!themeId || !THEME_PACKAGES[themeId]) {
        console.warn(`[cv.jsonresume] Unknown themeId "${themeId}", falling back to "${DEFAULT_THEME}"`);
        themeId = DEFAULT_THEME;
    }

    // Map internal JobPilot data shape → official JSON Resume schema
    const resumeJson  = mapToJsonResume(personalInfo, cvData);

    const pkgName     = THEME_PACKAGES[themeId];
    const themeModule = await loadTheme(pkgName);
    const renderFn    = resolveRender(themeModule);

    const rawHtml    = await renderFn(resumeJson);
    const orderedHtml = reorderSections(rawHtml, themeId);
    return orderedHtml;
};

// ---------------------------------------------------------------------------
// PDF generation — Puppeteer pipeline unchanged from the previous version
// ---------------------------------------------------------------------------

const generateCvJsonResumePdf = async (personalInfo, cvData, themeId) => {
    const html = await previewCvJsonResume(personalInfo, cvData, themeId);

    // Launch puppeteer with args for Oracle Cloud server + local Windows dev
    const puppeteerOptions = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'],
    };

    // On Windows local development, fall back to Edge if bundled Chromium is broken
    if (process.platform === 'win32' && fs.existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')) {
        puppeteerOptions.executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    }

    const browser = await puppeteer.launch(puppeteerOptions);
    const page    = await browser.newPage();

    // Wide+tall viewport (A4 width) so content renders at full width before measuring.
    // Without this, the 800-px default causes extra line-wrapping that inflates
    // scrollHeight and produces an over-shrunk scale factor.
    await page.setViewport({ width: 794, height: 10000 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Measure the full natural height of the rendered content
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    // A4 at 96 DPI = 1122 px.  Subtract top+bottom margins (15 mm each ≈ 57 px → 114 px total).
    const A4_USABLE_PX = 1122 - 114;

    // Scale down only if needed; never scale up (would leave dead space).
    // Floor at 0.65 matches the legacy cv.service.js minimum.
    let scale = 1;
    if (scrollHeight > A4_USABLE_PX) {
        scale = Math.max(0.65, A4_USABLE_PX / scrollHeight);
    }

    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        scale,
        margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
        pageRanges: '1',
    });

    await browser.close();
    return pdfBuffer;
};

module.exports = { previewCvJsonResume, generateCvJsonResumePdf };
