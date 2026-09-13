const { calculateDeterministicFit } = require('../services/fitAnalysis.service');

describe('Fit Analysis Service - Deterministic Calculation', () => {
    
    const mockCandidateExp3 = {
        experiences: [{ years: 3 }],
        skills: [{ name: 'React' }, { name: 'Node.js' }, { name: 'AWS' }]
    };

    const mockCandidateExp0 = {
        experiences: [],
        skills: [{ name: 'Python' }]
    };

    const mockCandidateExp6 = {
        experiences: [{ years: 6 }],
        skills: [{ name: 'React' }, { name: 'C#' }, { name: 'SQL' }]
    };

    const mockCandidateExp1 = {
        experiences: [{ years: 1 }],
        skills: [{ name: 'React' }, { name: 'Node' }]
    };

    test('Skai - AI Engineer (Explicit Range 2-5 years)', () => {
        const jdText = "2–5 years of experience in software development. Experience with React, Node, AWS, and GenAI.";
        
        // Candidate with 3 years and 3 matched skills
        const result3 = calculateDeterministicFit(mockCandidateExp3, jdText);
        expect(result3.reasons.some(r => r.includes('Explicit experience requirement found: 2-5 years'))).toBe(true);
        expect(result3.reasons.some(r => r.includes('✅ Candidate experience (3 years) fits'))).toBe(true);
        expect(result3.score).toBeGreaterThan(70); // High score

        // Candidate with 0 years
        const result0 = calculateDeterministicFit(mockCandidateExp0, jdText);
        expect(result0.reasons.some(r => r.includes('does not fit the minimum requirement'))).toBe(true);
        expect(result0.score).toBeLessThan(50); // Red
    });

    test('Glassix - Junior Fullstack Developer (Implicit Seniority)', () => {
        const jdText = "We're looking for a Junior Fullstack Developer. React, .NET, MS SQL, Redis, MongoDB, AWS.";
        
        // Candidate with 1 year
        const result1 = calculateDeterministicFit(mockCandidateExp1, jdText);
        expect(result1.reasons.some(r => r.includes('Inferred experience requirement from seniority keywords: 0-2 years'))).toBe(true);
        expect(result1.reasons.some(r => r.includes('✅ Candidate experience (1 years) fits'))).toBe(true);
        
        // Candidate with 6 years (overqualified for Junior)
        const result6 = calculateDeterministicFit(mockCandidateExp6, jdText);
        expect(result6.reasons.some(r => r.includes('above the target range'))).toBe(true);
        // Overqualified gets a minor penalty, score should be ok but not perfect if skills match perfectly
        // Let's just check the reason string
    });

    test('Appdome - Software Engineer (Explicit Minimum 2+ years)', () => {
        const jdText = "2+ years of experience developing backend systems in Python or Java. Kubernetes, Docker, AWS.";
        
        // Candidate with 3 years
        const result3 = calculateDeterministicFit(mockCandidateExp3, jdText);
        expect(result3.reasons.some(r => r.includes('Explicit experience requirement found: 2+ years'))).toBe(true);
        expect(result3.reasons.some(r => r.includes('✅ Candidate experience (3 years) fits'))).toBe(true);
        
        // Candidate with 1 year (Almost fits)
        const result1 = calculateDeterministicFit(mockCandidateExp1, jdText);
        expect(result1.reasons.some(r => r.includes('almost fits, slightly below target'))).toBe(true);
    });

    test('Edge case: Up to 2 years', () => {
        const jdText = "Looking for someone with up to 2 years of experience.";
        
        const result = calculateDeterministicFit(mockCandidateExp1, jdText);
        expect(result.reasons.some(r => r.includes('Explicit experience requirement found: 0-2 years'))).toBe(true);
        expect(result.reasons.some(r => r.includes('✅ Candidate experience (1 years) fits'))).toBe(true);
    });
});
