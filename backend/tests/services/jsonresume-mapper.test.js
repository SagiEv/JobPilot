'use strict';

const { mapToJsonResume } = require('../../services/jsonresume-mapper');

describe('jsonresume-mapper', () => {
    describe('mapToJsonResume', () => {
        it('should produce valid JSON Resume structure', () => {
            // Arrange
            const personalInfo = { name: 'Sagi', email: 'sagi@test.com', phone: '050-1234' };
            const cvData = { summary: '<p>Experienced engineer</p>' };

            // Act
            const result = mapToJsonResume(personalInfo, cvData);

            // Assert
            expect(result).toHaveProperty('basics');
            expect(result).toHaveProperty('work');
            expect(result).toHaveProperty('education');
            expect(result).toHaveProperty('skills');
            expect(result).toHaveProperty('projects');
            expect(result).toHaveProperty('interests');
            expect(result.basics.name).toBe('Sagi');
            expect(result.basics.email).toBe('sagi@test.com');
            expect(result.basics.summary).toBe('Experienced engineer');
        });

        it('should construct LinkedIn profile', () => {
            // Arrange
            const personalInfo = { name: 'Test', linkedin: 'johndoe' };
            const cvData = {};

            // Act
            const result = mapToJsonResume(personalInfo, cvData);

            // Assert
            expect(result.basics.profiles).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ network: 'LinkedIn', url: 'https://linkedin.com/in/johndoe' }),
                ])
            );
        });

        it('should construct GitHub profile with full URL', () => {
            // Arrange
            const personalInfo = { name: 'Test', github: 'https://github.com/user' };
            const cvData = {};

            // Act
            const result = mapToJsonResume(personalInfo, cvData);

            // Assert
            expect(result.basics.profiles).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ network: 'GitHub', url: 'https://github.com/user' }),
                ])
            );
        });

        it('should return empty arrays for null/empty sections', () => {
            // Arrange
            const personalInfo = {};
            const cvData = {};

            // Act
            const result = mapToJsonResume(personalInfo, cvData);

            // Assert
            expect(result.skills).toEqual([]);
            expect(result.education).toEqual([]);
            expect(result.projects).toEqual([]);
            expect(result.work).toEqual([]);
            expect(result.interests).toEqual([]);
        });
    });

    describe('skills parsing', () => {
        it('should parse paragraph-based "Category: item, item" format', () => {
            // Arrange
            const cvData = {
                technicalSkills: '<p>Programming Languages: Java, Python, SQL</p><p>Frameworks: React, Node.js</p>',
            };

            // Act
            const result = mapToJsonResume({}, cvData);

            // Assert
            expect(result.skills).toHaveLength(2);
            expect(result.skills[0].name).toBe('Programming Languages');
            expect(result.skills[0].keywords).toContain('Java');
            expect(result.skills[1].name).toBe('Frameworks');
        });

        it('should parse single-blob fallback format', () => {
            // Arrange
            const cvData = {
                technicalSkills: '<p>Programming Languages: Java, Python Backend Systems: Express, FastAPI</p>',
            };

            // Act
            const result = mapToJsonResume({}, cvData);

            // Assert
            expect(result.skills.length).toBeGreaterThanOrEqual(1);
        });

        it('should return flat list when no category headers', () => {
            // Arrange
            const cvData = {
                technicalSkills: '<p>Java, Python, React, Node.js</p>',
            };

            // Act
            const result = mapToJsonResume({}, cvData);

            // Assert
            expect(result.skills).toHaveLength(1);
            expect(result.skills[0].name).toBe('Technical Skills');
            expect(result.skills[0].keywords).toContain('Java');
        });
    });

    describe('education parsing', () => {
        it('should extract degree, area, institution, dates, GPA', () => {
            // Arrange
            const cvData = {
                education: '<p><strong>B.Sc. Software Engineering, Ben-Gurion University</strong> (October 2021 – September 2025)</p><p>GPA: 85</p>',
            };

            // Act
            const result = mapToJsonResume({}, cvData);

            // Assert
            expect(result.education).toHaveLength(1);
            expect(result.education[0].studyType).toBe('B.Sc.');
            expect(result.education[0].area).toBe('Software Engineering');
            expect(result.education[0].institution).toBe('Ben-Gurion University');
            expect(result.education[0].startDate).toBe('2021-10');
            expect(result.education[0].endDate).toBe('2025-09');
            expect(result.education[0].score).toBe('85');
        });
    });

    describe('projects parsing', () => {
        it('should extract name, tech stack, GitHub URL, highlights', () => {
            // Arrange
            const cvData = {
                projects: '<p><strong>JobPilot</strong> (React, Node.js)</p><p>GitHub: <a href="https://github.com/test">link</a></p><ul><li>Built a job tracker</li></ul>',
            };

            // Act
            const result = mapToJsonResume({}, cvData);

            // Assert
            expect(result.projects).toHaveLength(1);
            expect(result.projects[0].name).toBe('JobPilot');
            expect(result.projects[0].description).toBe('React, Node.js');
            expect(result.projects[0].url).toBe('https://github.com/test');
            expect(result.projects[0].highlights).toContain('Built a job tracker');
        });
    });

    describe('work parsing', () => {
        it('should extract position, company, dates, highlights', () => {
            // Arrange
            const cvData = {
                experience: '<p><strong>Software Engineer – TechCorp</strong> (07/2017 – 03/2020)</p><ul><li>Led backend team</li></ul>',
            };

            // Act
            const result = mapToJsonResume({}, cvData);

            // Assert
            expect(result.work).toHaveLength(1);
            expect(result.work[0].position).toBe('Software Engineer');
            expect(result.work[0].name).toBe('TechCorp');
            expect(result.work[0].startDate).toBe('2017-07');
            expect(result.work[0].endDate).toBe('2020-03');
            expect(result.work[0].highlights).toContain('Led backend team');
        });

        it('should handle en-dash separator', () => {
            // Arrange
            const cvData = {
                experience: '<p><strong>Role – Company</strong> (2020 – Present)</p>',
            };

            // Act
            const result = mapToJsonResume({}, cvData);

            // Assert
            expect(result.work[0].position).toBe('Role');
            expect(result.work[0].name).toBe('Company');
            expect(result.work[0].endDate).toBe('');
        });
    });

    describe('interests parsing', () => {
        it('should parse "Category: value, value" format', () => {
            // Arrange
            const cvData = {
                additionalInformation: '<p><strong>Languages:</strong> Hebrew (Native), English (Fluent)</p>',
            };

            // Act
            const result = mapToJsonResume({}, cvData);

            // Assert
            expect(result.interests.length).toBeGreaterThanOrEqual(1);
            expect(result.interests[0].name).toBe('Languages');
        });
    });
});
