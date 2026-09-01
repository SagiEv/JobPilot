'use strict';

const { generateCvHtml } = require('../../utils/cvTemplate');

describe('cvTemplate', () => {
    it('should render full HTML with all personalInfo fields', () => {
        // Arrange
        const personalInfo = {
            name: 'John Doe',
            phone: '555-1234',
            email: 'john@example.com',
            linkedin: 'linkedin.com/in/johndoe',
            github: 'github.com/johndoe',
        };
        const cvData = {
            summary: '<p>Experienced engineer</p>',
            technicalSkills: '<p>JavaScript, Node.js</p>',
            education: '<p>B.Sc. CS</p>',
            projects: '<p>JobPilot</p>',
            experience: '<p>3 years at TechCorp</p>',
            additionalInformation: '<p>Hebrew, English</p>',
        };

        // Act
        const html = generateCvHtml(personalInfo, cvData);

        // Assert
        expect(html).toContain('John Doe');
        expect(html).toContain('555-1234');
        expect(html).toContain('john@example.com');
        expect(html).toContain('linkedin.com/in/johndoe');
        expect(html).toContain('github.com/johndoe');
        expect(html).toContain('Summary');
        expect(html).toContain('Technical Skills');
        expect(html).toContain('Education');
        expect(html).toContain('Projects');
        expect(html).toContain('Experience');
        expect(html).toContain('Additional Information');
    });

    it('should use fallback "Curriculum Vitae" when no name provided', () => {
        // Arrange
        const personalInfo = {};
        const cvData = {};

        // Act
        const html = generateCvHtml(personalInfo, cvData);

        // Assert
        expect(html).toContain('Curriculum Vitae');
    });

    it('should omit sections when cvData fields are falsy', () => {
        // Arrange
        const personalInfo = { name: 'Test' };
        const cvData = {
            summary: '',
            technicalSkills: null,
            education: undefined,
            projects: '',
            experience: null,
            additionalInformation: '',
        };

        // Act
        const html = generateCvHtml(personalInfo, cvData);

        // Assert
        expect(html).not.toContain('Summary');
        expect(html).not.toContain('Technical Skills');
        expect(html).not.toContain('Education');
        expect(html).not.toContain('Projects');
        expect(html).not.toContain('Experience');
        expect(html).not.toContain('Additional Information');
    });

    it('should omit contact fields when personalInfo fields are missing', () => {
        // Arrange
        const personalInfo = { name: 'Jane' };
        const cvData = {};

        // Act
        const html = generateCvHtml(personalInfo, cvData);

        // Assert
        expect(html).toContain('Jane');
        expect(html).not.toContain('LinkedIn');
        expect(html).not.toContain('GitHub');
    });
});
