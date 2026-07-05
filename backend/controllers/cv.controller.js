const cvService = require('../services/cv.service');
const jsonresumeService = require('../services/cv.jsonresume.service');

const generateCv = async (req, res) => {
    try {
        const { cvData, personalInfo } = req.body;

        const pdfBuffer = await cvService.generateCvPdf(personalInfo, cvData);

        // EXACT implementation of your working headers
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="cv.pdf"'
        });

        // Use res.end with Buffer.from just like your original version
        res.end(Buffer.from(pdfBuffer));

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
};

const previewCvJsonResume = async (req, res) => {
    try {
        const { cvData, personalInfo, themeId } = req.body;
        const html = await jsonresumeService.previewCvJsonResume(personalInfo, cvData, themeId);
        res.status(200).send(html);
    } catch (error) {
        console.error('Error generating JSONResume preview:', error);
        res.status(500).json({ error: 'Failed to generate JSONResume preview' });
    }
};

const generateCvJsonResume = async (req, res) => {
    try {
        const { cvData, personalInfo, themeId } = req.body;
        const pdfBuffer = await jsonresumeService.generateCvJsonResumePdf(personalInfo, cvData, themeId);
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="cv.pdf"'
        });
        res.end(Buffer.from(pdfBuffer));
    } catch (error) {
        console.error('Error generating JSONResume PDF:', error);
        res.status(500).json({ error: 'Failed to generate JSONResume PDF' });
    }
};

module.exports = { generateCv, previewCvJsonResume, generateCvJsonResume };