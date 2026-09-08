'use strict';

const { reorderSections } = require('../../services/jsonresume-section-order');

describe('jsonresume-section-order', () => {
    describe('reorderSections', () => {
        it('should return HTML unchanged for stackoverflow theme', () => {
            // Arrange
            const html = '<html><body><header></header><section>Work</section></body></html>';

            // Act
            const result = reorderSections(html, 'stackoverflow');

            // Assert
            expect(result).toBe(html);
        });

        it('should return HTML unchanged for unknown theme', () => {
            // Arrange
            const html = '<html><body><header></header><section>A</section></body></html>';

            // Act
            const result = reorderSections(html, 'unknown-theme');

            // Assert
            expect(result).toBe(html);
        });

        it('should return HTML unchanged when no </header> found', () => {
            // Arrange
            const html = '<html><body><div>No header</div></body></html>';

            // Act
            const result = reorderSections(html, 'claude');

            // Assert
            expect(result).toBe(html);
        });

        it('should return HTML unchanged when less than 2 sections', () => {
            // Arrange
            const html = '<html><body><header></header><section class="section"><h2>Skills</h2></section></body></html>';

            // Act
            const result = reorderSections(html, 'architects-portfolio');

            // Assert
            expect(result).toBe(html);
        });

        it('should reorder architects-portfolio sections into canonical order', () => {
            // Arrange — put Work before Skills (wrong order)
            const html = [
                '<html><body><header></header>',
                '<section class="resume-section"><h2>Work</h2><p>content</p></section>',
                '<section class="resume-section"><h2>Skills</h2><p>content</p></section>',
                '</body></html>',
            ].join('');

            // Act
            const result = reorderSections(html, 'architects-portfolio');

            // Assert — Skills should come before Work
            const skillsIdx = result.indexOf('Skills');
            const workIdx = result.indexOf('Work');
            expect(skillsIdx).toBeLessThan(workIdx);
        });

        it('should reorder claude theme sections', () => {
            // Arrange — put interests before summary
            const html = [
                '<html><body><header></header>',
                '<section class="section"><div class="section-title">Interests</div><p>c</p></section>',
                '<div class="summary"><p>My summary</p></div>',
                '</body></html>',
            ].join('');

            // Act
            const result = reorderSections(html, 'claude');

            // Assert — summary should come before interests
            const summaryIdx = result.indexOf('summary');
            const interestsIdx = result.indexOf('Interests');
            expect(summaryIdx).toBeLessThan(interestsIdx);
        });
    });
});
