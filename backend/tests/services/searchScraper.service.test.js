'use strict';

jest.mock('axios');
jest.mock('../../repositories/scrapedJobs.repository');
jest.mock('../../repositories/searchSettings.repository');

const axios = require('axios');
const scrapedJobsRepo = require('../../repositories/scrapedJobs.repository');
const { scrapeCareerLinks } = require('../../utils/scraper.util');
const {
    filterByKeywords,
    matchesKeyword,
    scrapeAndSaveForUser,
} = require('../../services/searchScraper.service');

const JFROG_CAREERS_URL = 'https://join.jfrog.com/positions/';

const JFROG_MARKDOWN_FIXTURE = `
# Join JFrog

![JFrog Logo](https://join.jfrog.com/assets/jfrog-logo.png)
[Home](https://join.jfrog.com/)
[About Us](https://join.jfrog.com/about-us)
[LinkedIn](https://www.linkedin.com/company/jfrog/)

### Open Positions in Israel

[**Junior Full-Stack Developer** Apply Now](https://join.jfrog.com/positions/junior-full-stack-developer-tel-aviv)
[**Junior Full-Stack Developer** View Details](https://join.jfrog.com/positions/junior-full-stack-developer-tel-aviv?utm_source=careers)
[Senior Java Backend Engineer](https://join.jfrog.com/positions/senior-java-backend-engineer-netanya)
[Backend Software Engineer (Go / Node.js)](https://join.jfrog.com/positions/backend-software-engineer-go-nodejs)
[Software Engineer Intern](https://join.jfrog.com/positions/software-engineer-intern-netanya)
[Internal Platform Engineer](https://join.jfrog.com/positions/internal-platform-engineer-tel-aviv)
[JavaScript Frontend Developer](https://join.jfrog.com/positions/javascript-frontend-developer)
[AI Research Engineer](https://join.jfrog.com/positions/ai-research-engineer-tel-aviv)
[Cloud Maintenance Specialist](https://join.jfrog.com/positions/cloud-maintenance-specialist)
[Product Manager - Artifactory](https://join.jfrog.com/positions/product-manager-artifactory)
`;

describe('JFrog Career Scraping & Keyword Filtering', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('scrapeCareerLinks (JFrog fixture)', () => {
        it('extracts clean JFrog job links, ignores images/nav noise, and deduplicates tracking URLs', async () => {
            axios.get.mockResolvedValueOnce({ status: 200, data: JFROG_MARKDOWN_FIXTURE });

            const result = await scrapeCareerLinks(JFROG_CAREERS_URL);

            expect(result.source).toBe('jina');
            const titles = result.links.map(l => l.title);

            // Cleaned markdown formatting and stripped "Apply Now"
            expect(titles).toContain('Junior Full-Stack Developer');
            expect(titles).toContain('Backend Software Engineer (Go / Node.js)');
            expect(titles).toContain('Senior Java Backend Engineer');

            // Deduplicated ?utm_source=careers duplicate
            expect(titles.filter(t => t === 'Junior Full-Stack Developer')).toHaveLength(1);

            // Excluded image embed and navigation/social links
            expect(titles).not.toContain('JFrog Logo');
            expect(titles).not.toContain('Home');
            expect(titles).not.toContain('About Us');
            expect(titles).not.toContain('LinkedIn');
        });
    });

    describe('filterByKeywords & matchesKeyword (JFrog roles)', () => {
        const jfrogJobs = [
            { title: 'Junior Full-Stack Developer', url: 'https://join.jfrog.com/positions/junior-full-stack-developer-tel-aviv' },
            { title: 'Senior Java Backend Engineer', url: 'https://join.jfrog.com/positions/senior-java-backend-engineer-netanya' },
            { title: 'Backend Software Engineer (Go / Node.js)', url: 'https://join.jfrog.com/positions/backend-software-engineer-go-nodejs' },
            { title: 'Software Engineer Intern', url: 'https://join.jfrog.com/positions/software-engineer-intern-netanya' },
            { title: 'Internal Platform Engineer', url: 'https://join.jfrog.com/positions/internal-platform-engineer-tel-aviv' },
            { title: 'JavaScript Frontend Developer', url: 'https://join.jfrog.com/positions/javascript-frontend-developer' },
            { title: 'AI Research Engineer', url: 'https://join.jfrog.com/positions/ai-research-engineer-tel-aviv' },
            { title: 'Cloud Maintenance Specialist', url: 'https://join.jfrog.com/positions/cloud-maintenance-specialist' },
            { title: 'Product Manager - Artifactory', url: 'https://join.jfrog.com/positions/product-manager-artifactory' },
        ];

        it('matches hyphenated and compact tech variants (Full Stack <-> Full-Stack <-> Fullstack, NodeJS <-> Node.js)', () => {
            expect(matchesKeyword('Junior Full-Stack Developer', 'Full Stack')).toBe(true);
            expect(matchesKeyword('Junior Full-Stack Developer', 'Fullstack')).toBe(true);
            expect(matchesKeyword('Junior Fullstack Developer', 'Full Stack')).toBe(true);
            expect(matchesKeyword('Backend Software Engineer (Go / Node.js)', 'NodeJS')).toBe(true);
        });

        it('avoids substring false positives (Java vs JavaScript, AI vs Maintenance, Intern vs Internal)', () => {
            expect(matchesKeyword('JavaScript Frontend Developer', 'Java')).toBe(false);
            expect(matchesKeyword('Senior Java Backend Engineer', 'Java')).toBe(true);
            expect(matchesKeyword('Cloud Maintenance Specialist', 'AI')).toBe(false);
            expect(matchesKeyword('AI Research Engineer', 'AI')).toBe(true);
            expect(matchesKeyword('Internal Platform Engineer', 'Intern')).toBe(false);
            expect(matchesKeyword('Software Engineer Intern', 'Intern')).toBe(true);
        });

        it('filters JFrog jobs using both search keywords and exclude keywords accurately', () => {
            const keywords = ['Full Stack', 'Backend', 'AI', 'Platform Engineer'];
            const excludeKeywords = ['Senior', 'Intern', 'Manager'];

            const matched = filterByKeywords(jfrogJobs, keywords, excludeKeywords);
            const titles = matched.map(j => j.title);

            expect(titles).toEqual([
                'Junior Full-Stack Developer',
                'Backend Software Engineer (Go / Node.js)',
                'Internal Platform Engineer',
                'AI Research Engineer',
            ]);
        });

        it('returns all non-excluded jobs when search keywords are empty', () => {
            const matched = filterByKeywords(jfrogJobs, [], ['Senior', 'Manager', 'Intern']);
            const titles = matched.map(j => j.title);

            expect(titles).not.toContain('Senior Java Backend Engineer');
            expect(titles).not.toContain('Product Manager - Artifactory');
            expect(titles).not.toContain('Software Engineer Intern');
            expect(titles).toContain('Internal Platform Engineer');
            expect(titles).toContain('Junior Full-Stack Developer');
        });
    });

    describe('scrapeAndSaveForUser (JFrog end-to-end)', () => {
        it('scrapes JFrog, applies user keywords & exclude_keywords, and saves only matching jobs', async () => {
            axios.get.mockResolvedValueOnce({ status: 200, data: JFROG_MARKDOWN_FIXTURE });
            scrapedJobsRepo.createJobsBatch.mockResolvedValueOnce({ data: [], error: null });
            scrapedJobsRepo.markSiteScraped.mockResolvedValueOnce({ error: null });

            const site = { id: 42, name: 'JFrog', url: JFROG_CAREERS_URL, enabled: true };
            const settings = {
                keywords: ['Full Stack', 'Backend'],
                exclude_keywords: ['Senior', 'Intern'],
            };

            const count = await scrapeAndSaveForUser('user-1', site, settings);

            expect(count).toBe(2);
            expect(scrapedJobsRepo.createJobsBatch).toHaveBeenCalledWith([
                {
                    user_id: 'user-1',
                    site_id: 42,
                    title: 'Junior Full-Stack Developer',
                    url: 'https://join.jfrog.com/positions/junior-full-stack-developer-tel-aviv',
                    company: 'JFrog',
                },
                {
                    user_id: 'user-1',
                    site_id: 42,
                    title: 'Backend Software Engineer (Go / Node.js)',
                    url: 'https://join.jfrog.com/positions/backend-software-engineer-go-nodejs',
                    company: 'JFrog',
                },
            ]);
            expect(scrapedJobsRepo.markSiteScraped).toHaveBeenCalledWith(42);
        });
    });
});
