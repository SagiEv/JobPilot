const puppeteer = require('puppeteer');

const generateCvPdf = async (personalInfo, cvData) => {
  // Your exact HTML template
  const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.3; margin: 0; padding: 0; }
          h1 { text-align: center; margin-bottom: 2px; color: #111; font-size: 2.4em; }
          .contact-info { text-align: center; margin-bottom: 10px; font-size: 0.9em; color: #555; }
          h2 { color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 2px; margin-top: 10px; margin-bottom: 5px; font-size: 1.3em; }
          .section { margin-bottom: 8px; }
          .content p { margin: 2px 0; font-size: 0.95em; }
        </style>
      </head>
      <body>
        <h1>${personalInfo?.name || 'Curriculum Vitae'}</h1>
        <div class="contact-info">
          ${personalInfo?.phone ? `<span>${personalInfo.phone}</span>` : ''}
          ${personalInfo?.email ? ` | <span>${personalInfo.email}</span>` : ''}
          ${personalInfo?.linkedin ? ` | <span><a href="${personalInfo.linkedin}" style="color: #555; text-decoration: none;">LinkedIn: ${personalInfo.linkedin}</a></span>` : ''}
          ${personalInfo?.github ? `   | <span><a href="${personalInfo.github}" style="color: #555; text-decoration: none;">GitHub: ${personalInfo.github}</a></span>` : ''}
        </div>
        ${cvData?.summary ? `<h2>Summary</h2><div class="content">${cvData.summary}</div>` : ''}
        ${cvData?.technicalSkills ? `<h2>Technical Skills</h2><div class="content">${cvData.technicalSkills}</div>` : ''}
        ${cvData?.education ? `<h2>Education</h2><div class="content">${cvData.education}</div>` : ''}
        ${cvData?.projects ? `<h2>Projects</h2><div class="content">${cvData.projects}</div>` : ''}
        ${cvData?.experience ? `<h2>Experience</h2><div class="content">${cvData.experience}</div>` : ''}
        ${cvData?.additionalInformation ? `<h2>Additional Information</h2><div class="content">${cvData.additionalInformation}</div>` : ''}
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setViewport({ width: 794, height: 1122 });
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const contentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const maxPrintableHeight = 1046;
  let scale = 1;

  if (contentHeight > maxPrintableHeight) {
    scale = (maxPrintableHeight / contentHeight) * 0.98;
    scale = Math.max(0.1, scale);
  }

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    scale: scale,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
  });

  await browser.close();
  return pdfBuffer; // Returning raw buffer
};

module.exports = { generateCvPdf };