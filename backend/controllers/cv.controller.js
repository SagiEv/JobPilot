const cvService = require('../services/cv.service');

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

module.exports = { generateCv };