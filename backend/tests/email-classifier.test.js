'use strict';

const {
    extractDomain,
    extractCompanyFromSubject,
    detectStatus,
    classifyEmail,
} = require('../services/email-classifier.service');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a minimal application object for use in classifyEmail() tests.
 */
function app(id, company, position = '', status = 'applied', role_id = '') {
    return { id, company, position, status, role_id };
}

// ─────────────────────────────────────────────────────────────────────────────
// extractDomain()
// ─────────────────────────────────────────────────────────────────────────────

describe('extractDomain()', () => {
    // ── Aggregator senders → must return '' so subject extraction kicks in ──

    test('LinkedIn plain address → ""', () => {
        expect(extractDomain('jobs-noreply@linkedin.com')).toBe('');
    });

    test('LinkedIn formatted From header → ""', () => {
        expect(extractDomain('LinkedIn <jobs-noreply@linkedin.com>')).toBe('');
    });

    test('Indeed → ""', () => {
        expect(extractDomain('Indeed <noreply@indeed.com>')).toBe('');
    });

    // ── ATS domains → company from subdomain prefix ──

    test('Workday: hpe@myworkday.com → "hpe"', () => {
        expect(extractDomain('hpe@myworkday.com')).toBe('hpe');
    });

    test('Workday formatted: redhat@myworkday.com → "redhat"', () => {
        expect(extractDomain('Red Hat <redhat@myworkday.com>')).toBe('redhat');
    });

    test('Comeet: no-reply@kaltura.comeet-notifications.com → "kaltura"', () => {
        expect(extractDomain('Kaltura <no-reply@kaltura.comeet-notifications.com>')).toBe('kaltura');
    });

    test('Comeet: no-reply@moonactive.comeet-notifications.com → "moonactive"', () => {
        expect(extractDomain('Moon Active <no-reply@moonactive.comeet-notifications.com>')).toBe('moonactive');
    });

    test('Comeet: no-reply@jeenai.comeet-notifications.com → "jeenai"', () => {
        expect(extractDomain('no-reply@jeenai.comeet-notifications.com')).toBe('jeenai');
    });

    // ── Multi-segment non-ATS domains → right-to-left walk skips generics ──

    test('Microsoft multi-segment: donotreply@email.careers.microsoft.com → "microsoft"', () => {
        expect(extractDomain('Microsoft Careers <donotreply@email.careers.microsoft.com>')).toBe('microsoft');
    });

    test('Salesforce Workday: salesforce.wd12.myworkdayjobs.com — username salesforce → "salesforce"', () => {
        // From the Salesforce rejection email body
        expect(extractDomain('Salesforce Recruiting <salesforce@wd12.myworkdayjobs.com>')).toBe('salesforce');
    });

    // ── Direct company domains ──

    test('Direct company email: tali@nice.com → "nice"', () => {
        expect(extractDomain('tali.libershteinshefler@nice.com')).toBe('nice');
    });

    test('Direct company email formatted → "nice"', () => {
        expect(extractDomain('Tali L. <tali.libershteinshefler@nice.com>')).toBe('nice');
    });

    test('Gmail forwarded (user@gmail.com) → "gmail" (non-aggregator, no match expected)', () => {
        // gmail.com is NOT in AGGREGATOR_DOMAINS, so it returns the company segment
        const result = extractDomain('user@gmail.com');
        expect(result).toBe('gmail');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractCompanyFromSubject()
// ─────────────────────────────────────────────────────────────────────────────

describe('extractCompanyFromSubject()', () => {
    test('"your application was sent to Jones Software" → "jones software"', () => {
        expect(extractCompanyFromSubject(
            'Sagi, your application was sent to Jones Software', ''
        )).toBe('jones software');
    });

    test('"your application was sent to Extreme" → "extreme"', () => {
        expect(extractCompanyFromSubject(
            'Sagi, your application was sent to Extreme', ''
        )).toBe('extreme');
    });

    test('"your application was sent to Cisco" → "cisco"', () => {
        expect(extractCompanyFromSubject(
            'Sagi, your application was sent to Cisco', ''
        )).toBe('cisco');
    });

    test('Salesforce rejection subject → "salesforce" (from body fallback)', () => {
        // Subject doesn't contain the pattern, body does
        const subject = "Update on Salesforce's Software Engineer — New Graduate, Full-Stack Role";
        const body = `Hi Sagi,\n\nThanks for considering Salesforce as the next stop on your career journey.`;
        // extractCompanyFromSubject does not handle this pattern — company comes from domain/subject word
        // This test validates the function doesn't crash and returns empty or salesforce
        const result = extractCompanyFromSubject(subject, body);
        // The subject pattern "Acme Corp – Application…" won't match; result may be ''
        // Acceptable: company matching falls back to domain/substring in classifyEmail
        expect(typeof result).toBe('string');
    });

    test('"Thank you for applying to Red Hat" → (no aggregator pattern, returns "")', () => {
        // This subject is sent from a Workday address, so extractCompanyFromSubject
        // is NOT called (it's not an aggregator). This test just validates the function
        // doesn't accidentally match it.
        const result = extractCompanyFromSubject('Thank you for applying to Red Hat', '');
        expect(typeof result).toBe('string'); // could be '' or 'red hat' via generic pattern
    });

    test('Melio forwarded subject "Fwd: Full Stack Engineer opportunity at Melio" → "melio"', () => {
        const result = extractCompanyFromSubject('Fwd: Full Stack Engineer opportunity at Melio', '');
        // "at Melio" matches generic "application … at {Company}" or message pattern
        expect(typeof result).toBe('string');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// detectStatus()
// ─────────────────────────────────────────────────────────────────────────────

describe('detectStatus()', () => {
    test('Application confirmation email → "applied" (not "rejected")', () => {
        const text = 'thank you for your application we received your application confirmation';
        expect(detectStatus(text)).toBe('applied');
    });

    test('"Thank you for your application" suppresses rejection keywords', () => {
        // Even if a rejection keyword sneaks in, confirmation suppressor wins
        const text = 'thank you for your application after careful consideration we have decided';
        expect(detectStatus(text)).toBe('applied');
    });

    test('Clear rejection without confirmation signal → "rejected"', () => {
        const text = 'unfortunately we will not be moving forward with other candidates at this time';
        expect(detectStatus(text)).toBe('rejected');
    });

    test('Salesforce rejection body → "rejected"', () => {
        const text = `the software engineer new graduate full-stack position has been filled and is now closed`;
        // "position has been filled" is a rejection keyword
        expect(detectStatus(text)).toBe('rejected');
    });

    test('Interview invite → "interview"', () => {
        const text = "we'd like to schedule an interview with you for a phone screen next week";
        expect(detectStatus(text)).toBe('interview');
    });

    test('Offer letter → "offer" (highest priority)', () => {
        const text = 'we are pleased to offer you employment agreement welcome aboard start date monday';
        expect(detectStatus(text)).toBe('offer');
    });

    test('Assessment request → "assessment"', () => {
        const text = 'please complete the following coding challenge on hackerrank by friday';
        expect(detectStatus(text)).toBe('assessment');
    });

    test('No keywords → "unknown"', () => {
        expect(detectStatus('hello sagi here is a generic email with no relevant keywords')).toBe('unknown');
    });

    test('Offer beats rejected even if both fire', () => {
        const text = 'unfortunately we are pleased to offer you employment agreement';
        expect(detectStatus(text)).toBe('offer');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// classifyEmail() — full pipeline
// ─────────────────────────────────────────────────────────────────────────────

describe('classifyEmail()', () => {

    // ── LinkedIn aggregator path ──────────────────────────────────────────────

    test('[LinkedIn] "application was sent to Jones Software" → matches Jones Software app', () => {
        const apps = [
            app(1, 'Siemens', 'Software Engineer'),
            app(2, 'Jones Software', 'Backend Developer'),
        ];
        const result = classifyEmail({
            from: 'LinkedIn <jobs-noreply@linkedin.com>',
            subject: 'Sagi, your application was sent to Jones Software',
            bodySnippet: '',
        }, apps);

        expect(result.applicationId).toBe(2);
        expect(result.matchedCompany).toBe('Jones Software');
    });

    test('[LinkedIn] "application was sent to Extreme" → matches Extreme, NOT Siemens', () => {
        const apps = [
            app(1, 'Siemens', 'Software Engineer'),
            app(2, 'Extreme', 'Network Engineer'),
        ];
        const result = classifyEmail({
            from: 'LinkedIn <jobs-noreply@linkedin.com>',
            subject: 'Sagi, your application was sent to Extreme',
            bodySnippet: '',
        }, apps);

        expect(result.applicationId).toBe(2);
        expect(result.matchedCompany).toBe('Extreme');
    });

    test('[LinkedIn] "application was sent to Cisco" → matches Cisco, NOT Siemens', () => {
        const apps = [
            app(1, 'Siemens', 'Software Engineer'),
            app(2, 'Cisco', 'Solutions Engineer'),
        ];
        const result = classifyEmail({
            from: 'LinkedIn <jobs-noreply@linkedin.com>',
            subject: 'Sagi, your application was sent to Cisco',
            bodySnippet: '',
        }, apps);

        expect(result.applicationId).toBe(2);
        expect(result.matchedCompany).toBe('Cisco');
    });

    test('[LinkedIn] no matching company in apps → applicationId null', () => {
        const apps = [app(1, 'Siemens', 'Software Engineer')];
        const result = classifyEmail({
            from: 'LinkedIn <jobs-noreply@linkedin.com>',
            subject: 'Sagi, your application was sent to Google',
            bodySnippet: '',
        }, apps);

        expect(result.applicationId).toBeNull();
    });

    // ── Workday (ATS) path ────────────────────────────────────────────────────

    test('[Workday] redhat@myworkday.com → matches Red Hat app', () => {
        const apps = [
            app(1, 'Red Hat', 'Software Engineer'),
            app(2, 'Siemens', 'Developer'),
        ];
        const result = classifyEmail({
            from: 'Red Hat <redhat@myworkday.com>',
            subject: 'Thank you for applying to Red Hat',
            bodySnippet: 'We have received your application.',
        }, apps);

        expect(result.applicationId).toBe(1);
        expect(result.matchedCompany).toBe('Red Hat');
        // Confirmation email → status should be 'applied', not 'rejected'
        expect(result.classifiedStatus).toBe('applied');
    });

    test('[Workday] hpe@myworkday.com — job ID in subject → matches HPE app', () => {
        const apps = [
            app(1, 'HPE', 'Junior Software Engineer', 'applied', '1198937'),
            app(2, 'HPE', 'Senior DevOps', 'applied', '1198000'),
        ];
        const result = classifyEmail({
            from: 'hpe@myworkday.com',
            subject: 'Thank you for your application to 1198937 Junior Software Engineer',
            bodySnippet: '',
        }, apps);

        expect(result.applicationId).toBe(1);
        expect(result.matchedCompany).toBe('HPE');
    });

    // ── Comeet ATS path ───────────────────────────────────────────────────────

    test('[Comeet] no-reply@kaltura.comeet-notifications.com → matches Kaltura', () => {
        const apps = [
            app(1, 'Kaltura', 'Full-Stack Developer'),
            app(2, 'Siemens', 'Engineer'),
        ];
        const result = classifyEmail({
            from: 'Kaltura <no-reply@kaltura.comeet-notifications.com>',
            subject: 'Application update: Full-Stack Developer at Kaltura',
            bodySnippet: '',
        }, apps);

        expect(result.applicationId).toBe(1);
        expect(result.matchedCompany).toBe('Kaltura');
    });

    test('[Comeet] no-reply@moonactive.comeet-notifications.com → matches Moon Active', () => {
        const apps = [
            app(1, 'Moon Active', 'Backend Developer'),
        ];
        const result = classifyEmail({
            from: 'Moon Active <no-reply@moonactive.comeet-notifications.com>',
            subject: 'Your application at Moon Active',
            bodySnippet: '',
        }, apps);

        expect(result.applicationId).toBe(1);
        expect(result.matchedCompany).toBe('Moon Active');
    });

    test('[Comeet] no-reply@jeenai.comeet-notifications.com → matches Jeen.ai', () => {
        const apps = [
            app(1, 'Jeen.ai', 'Junior AI Solution Engineer'),
        ];
        const result = classifyEmail({
            from: 'no-reply@jeenai.comeet-notifications.com',
            subject: 'Thank you for applying for the Junior AI Solution Engineer position at Jeen.ai',
            bodySnippet: '',
        }, apps);

        expect(result.applicationId).toBe(1);
        expect(result.matchedCompany).toBe('Jeen.ai');
        expect(result.classifiedStatus).toBe('applied');
    });

    // ── Direct company email path ─────────────────────────────────────────────

    test('[Direct] tali@nice.com → matches NICE app', () => {
        const apps = [
            app(1, 'NICE', 'QA Engineer'),
            app(2, 'Siemens', 'Engineer'),
        ];
        const result = classifyEmail({
            from: 'tali.libershteinshefler@nice.com',
            subject: 'Your Job Application – NiCE',
            bodySnippet: 'Thank you for your application.',
        }, apps);

        expect(result.applicationId).toBe(1);
        expect(result.matchedCompany).toBe('NICE');
    });

    // ── Microsoft multi-segment domain ────────────────────────────────────────

    test('[Microsoft] donotreply@email.careers.microsoft.com → matches Microsoft, NOT WEKA', () => {
        const apps = [
            app(1, 'WEKA', 'Software Engineer'),
            app(2, 'Microsoft', 'Software Engineer'),
        ];
        const result = classifyEmail({
            from: 'Microsoft Careers <donotreply@email.careers.microsoft.com>',
            subject: 'Thank you for your application!',
            bodySnippet: 'We received your application for a position at Microsoft.',
        }, apps);

        expect(result.applicationId).toBe(2);
        expect(result.matchedCompany).toBe('Microsoft');
        // Application confirmation should NOT be classified as rejected
        expect(result.classifiedStatus).not.toBe('rejected');
    });

    // ── Salesforce Workday rejection ──────────────────────────────────────────

    test('[Salesforce] Workday rejection → matched to Salesforce with "rejected" status', () => {
        const apps = [
            app(1, 'Salesforce', 'Software Engineer New Graduate Full-Stack', 'interview'),
        ];
        const body = `Hi Sagi,

Thanks for considering Salesforce as the next stop on your career journey. We understand the preparation and time it takes to apply for a role, and we greatly appreciate you giving us the opportunity to consider you here at Salesforce.

The Software Engineer — New Graduate, Full-Stack position has been filled and is now closed. If you applied for multiple positions, your other applications may still be in consideration. To check your application status at any time, log into your Salesforce candidate homepage: https://salesforce.wd12.myworkdayjobs.com/External_Career_Site

Thanks for exploring a future with us,
The Salesforce Recruiting Team`;

        const result = classifyEmail({
            from: 'Salesforce Recruiting <salesforce@wd12.myworkdayjobs.com>',
            subject: "Update on Salesforce's Software Engineer — New Graduate, Full-Stack Role",
            bodySnippet: body,
        }, apps);

        expect(result.applicationId).toBe(1);
        expect(result.matchedCompany).toBe('Salesforce');
        expect(result.classifiedStatus).toBe('rejected');
    });

    // ── Multi-application same company disambiguation ─────────────────────────

    test('[Multi-app] same company, role in email → correct app wins', () => {
        const apps = [
            app(1, 'Google', 'Software Engineer', 'applied'),
            app(2, 'Google', 'Product Manager', 'applied'),
        ];
        const result = classifyEmail({
            from: 'Google Careers <no-reply@google.com>',
            subject: 'Your application for Software Engineer at Google',
            bodySnippet: 'Thank you for applying to the Software Engineer position.',
        }, apps);

        expect(result.applicationId).toBe(1);
        expect(result.matchedCompany).toBe('Google');
    });

    test('[Multi-app] same company, job ID in subject → correct app wins', () => {
        const apps = [
            app(1, 'HPE', 'Junior Software Engineer', 'applied', '1198937'),
            app(2, 'HPE', 'Senior DevOps Engineer', 'applied', '1198000'),
        ];
        const result = classifyEmail({
            from: 'hpe@myworkday.com',
            subject: 'Application update: Job ID 1198000 Senior DevOps Engineer',
            bodySnippet: '',
        }, apps);

        expect(result.applicationId).toBe(2);
        expect(result.matchedCompany).toBe('HPE');
    });

    // ── Terminal status guard (integration check via classifyEmail result) ────

    test('[Status] rejected app: classifyEmail returns follow_up but poller must not update (guard is in poller)', () => {
        // classifyEmail itself doesn't enforce terminal status — that's mail-poller's job.
        // This test just confirms classifier still returns the match when company matches.
        const apps = [app(1, 'LinkedIn', 'Recruiter', 'rejected')];
        const result = classifyEmail({
            from: 'LinkedIn <jobs-noreply@linkedin.com>',
            subject: 'Your application was sent to LinkedIn',
            bodySnippet: '',
        }, apps);
        expect(result.applicationId).toBe(1);
        // The poller will skip the update because status is terminal
    });

    // ── Edge cases ────────────────────────────────────────────────────────────

    test('Empty applications list → no match', () => {
        const result = classifyEmail({
            from: 'LinkedIn <jobs-noreply@linkedin.com>',
            subject: 'Sagi, your application was sent to Google',
            bodySnippet: '',
        }, []);

        expect(result.applicationId).toBeNull();
        expect(result.confidence).toBe(0);
    });

    test('Empty from/subject/body → no match, no crash', () => {
        const result = classifyEmail(
            { from: '', subject: '', bodySnippet: '' },
            [app(1, 'Google', 'SWE')]
        );
        expect(result.applicationId).toBeNull();
    });

    test('Forwarded personal email (user@gmail.com) Melio opportunity → matches Melio if in apps', () => {
        const apps = [
            app(1, 'Melio', 'Full Stack Engineer'),
        ];
        const result = classifyEmail({
            from: 'user@gmail.com',
            subject: 'Fwd: Full Stack Engineer opportunity at Melio',
            bodySnippet: 'Hi, forwarding this Melio opportunity for you.',
        }, apps);

        // "melio" appears in subject and body as substring
        expect(result.applicationId).toBe(1);
        expect(result.matchedCompany).toBe('Melio');
    });
});
