const cvService = require('../services/cv.service');
const jsonresumeService = require('../services/cv.jsonresume.service');

const generateCv = async (req, res) => {
    const { cvData, personalInfo } = req.body;
    const pdfBuffer = await cvService.generateCvPdf(personalInfo, cvData, req.supabase);

    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="cv.pdf"'
    });
    res.end(Buffer.from(pdfBuffer));
};

const previewCvJsonResume = async (req, res) => {
    const { cvData, personalInfo, themeId } = req.body;
    const html = await jsonresumeService.previewCvJsonResume(personalInfo, cvData, themeId, req.supabase);
    res.status(200).send(html);
};

const generateCvJsonResume = async (req, res) => {
    const { cvData, personalInfo, themeId } = req.body;
    const pdfBuffer = await jsonresumeService.generateCvJsonResumePdf(personalInfo, cvData, themeId, req.supabase);
    
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="cv.pdf"'
    });
    res.end(Buffer.from(pdfBuffer));
};

module.exports = { generateCv, previewCvJsonResume, generateCvJsonResume };