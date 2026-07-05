const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');

const previewCvJsonResume = async (personalInfo, cvData, themeId) => {
    // Basic validation
    if (!themeId) themeId = 'elegant'; // fallback
    
    // Resolve the path to the template
    // The plan states: /backend/templates/<theme-name>/template.hbs
    const templatePath = path.join(__dirname, '..', 'templates', themeId, 'template.hbs');
    
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template for theme ${themeId} not found.`);
    }

    const templateString = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateString);

    // Provide the combined data to Handlebars
    const data = {
        basics: personalInfo,
        cvData: cvData
    };

    const html = template(data);
    return html;
};

const generateCvJsonResumePdf = async (personalInfo, cvData, themeId) => {
    const html = await previewCvJsonResume(personalInfo, cvData, themeId);

    // Launch puppeteer
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Calculate scale to fit on 1 A4 page
    // An A4 page at 96 DPI is roughly 1122 pixels high. Let's use 1122 as a target.
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const A4_HEIGHT_PX = 1122;
    
    let scale = 1;
    if (scrollHeight > A4_HEIGHT_PX) {
        scale = A4_HEIGHT_PX / scrollHeight;
    }

    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        scale: scale,
        pageRanges: '1'
    });

    await browser.close();

    return pdfBuffer;
};

module.exports = {
    previewCvJsonResume,
    generateCvJsonResumePdf
};
