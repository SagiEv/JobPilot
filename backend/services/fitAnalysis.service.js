const rules = require('../config/fitRules.json');
const profileRepository = require('../repositories/profile.repository');
const skillsRepository = require('../repositories/skills.repository');
const settingsRepository = require('../repositories/settings.repository');

// Helper to safely check regex match
function extractExplicitYears(jdText) {
    for (const pattern of rules.experienceRegexes) {
        const regex = new RegExp(pattern, 'i');
        const match = jdText.match(regex);
        if (match) {
            // Depending on regex, groups might be min/max or just min
            if (match[2]) { // Range e.g. "2-5 years"
                return [parseInt(match[1], 10), parseInt(match[2], 10)];
            } else { // Single number e.g. "2+ years" or "up to 2 years"
                const val = parseInt(match[1], 10);
                if (pattern.includes('up to')) {
                    return [0, val];
                }
                return [val, 99]; // 2+ years
            }
        }
    }
    return null;
}

function inferSeniority(jdText) {
    const text = jdText.toLowerCase();
    
    // Sort keys by priority (longer/more specific first, e.g., 'team lead' before 'lead')
    const sortedKeys = Object.keys(rules.seniorityMap).sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
        // Use word boundaries for accurate matching
        const regex = new RegExp(`\\b${key}\\b`, 'i');
        if (regex.test(text)) {
            return rules.seniorityMap[key];
        }
    }
    return rules.defaultSeniorityRange; // [0, 2] Junior fallback
}

function normalizeSkill(skillName) {
    const lower = skillName.toLowerCase().trim();
    for (const [canonical, synonyms] of Object.entries(rules.skillSynonyms)) {
        if (lower === canonical || synonyms.includes(lower)) {
            return canonical;
        }
    }
    return lower;
}

function calculateTotalExperience(candidate) {
    if (!candidate.experiences || candidate.experiences.length === 0) {
        return 0;
    }
    
    // Sum up years from user_experiences table
    return candidate.experiences.reduce((sum, exp) => sum + (exp.years || 0), 0);
}

exports.calculateDeterministicFit = (candidate, jdText) => {
    const reasons = [];
    let score = 0;

    const jdTextLower = jdText.toLowerCase();

    // 1. Resolve Experience Target
    let targetRange = extractExplicitYears(jdText);
    if (targetRange) {
        reasons.push(`Explicit experience requirement found: ${targetRange[0]}${targetRange[1] === 99 ? '+' : '-' + targetRange[1]} years.`);
    } else {
        targetRange = inferSeniority(jdText);
        reasons.push(`Inferred experience requirement from seniority keywords: ${targetRange[0]}${targetRange[1] === 99 ? '+' : '-' + targetRange[1]} years.`);
    }

    // 2. Evaluate Candidate Experience
    const totalExp = calculateTotalExperience(candidate);
    let expScore = 0;
    
    if (totalExp >= targetRange[0] && totalExp <= targetRange[1]) {
        expScore = 100;
        reasons.push(`✅ Candidate experience (${totalExp} years) fits the target range.`);
    } else if (totalExp > targetRange[1]) {
        expScore = 80;
        reasons.push(`⚠️ Candidate experience (${totalExp} years) is above the target range (potentially overqualified).`);
    } else {
        const gap = targetRange[0] - totalExp;
        if (gap <= 1) {
            expScore = 50;
            reasons.push(`⚠️ Candidate experience (${totalExp} years) is slightly below the target of ${targetRange[0]} years.`);
        } else if (gap <= 2) {
            expScore = 20;
            reasons.push(`❌ Candidate experience (${totalExp} years) is notably below the target of ${targetRange[0]} years.`);
        } else {
            expScore = 0;
            reasons.push(`❌ Candidate experience (${totalExp} years) is significantly below the minimum requirement of ${targetRange[0]} years.`);
        }
    }

    // 3. Evaluate Skills
    let skillScore = 0;
    const candidateSkills = candidate.skills ? candidate.skills.map(s => normalizeSkill(s.name || s)) : [];
    
    if (candidateSkills.length === 0) {
        reasons.push(`❌ No candidate skills provided to match.`);
    } else {
        let matchedCount = 0;
        const matchedSkills = [];
        
        for (const skill of candidateSkills) {
            // Find skill in JD text (using boundaries for basic safety, except for some symbols)
            const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // If skill has no letters/numbers (e.g. C++), word boundary might fail, but for simple tech it works
            const skillRegex = new RegExp(`(?:\\b|\\s)${escapedSkill}(?:\\b|\\s|[,.])`, 'i');
            if (skillRegex.test(jdTextLower)) {
                matchedCount++;
                matchedSkills.push(skill);
            }
        }

        // Deterministic baseline: assume a good JD requires around 3-5 core skills. 
        // We cap the denominator to avoid penalizing short JDs too heavily.
        // If candidate matches up to 4 skills, they get good skill score.
        const targetSkillsToMatch = 4;
        skillScore = Math.min((matchedCount / targetSkillsToMatch) * 100, 100);

        if (matchedCount > 0) {
            reasons.push(`✅ Matched skills: ${matchedSkills.slice(0, 3).join(', ')}${matchedCount > 3 ? ` + ${matchedCount - 3} more` : ''}.`);
        } else {
            reasons.push(`❌ No known candidate skills found in JD.`);
        }
    }

    // 4. Final Scoring (Weighted)
    // Experience: 40%, Skills: 60%
    score = Math.round((expScore * 0.4) + (skillScore * 0.6));

    // Hard Cap: If candidate experience is strictly less than target minimum, do not allow score > 65
    if (totalExp < targetRange[0] && score > 65) {
        score = 65;
        reasons.push(`⚠️ Final score capped at 65% because candidate lacks the minimum required experience.`);
    }

    // Map to Classification
    let classification = 'Red';
    if (score >= 80) classification = 'Green';
    else if (score >= 50) classification = 'Yellow';

    return {
        score,
        classification,
        reasons
    };
};

exports.getFitContext = async (userId, supabaseClient) => {
    try {
        const [profileRes, skillsRes, experiencesRes, settingsRes] = await Promise.all([
            profileRepository.findFirstProfile(userId, supabaseClient),
            skillsRepository.findAll(userId, supabaseClient),
            profileRepository.findUserExperiences(userId, supabaseClient),
            settingsRepository.findSettings(userId, supabaseClient)
        ]);

        const candidateData = {
            profile: profileRes.data || null,
            skills: skillsRes.data || [],
            experiences: experiencesRes.data || []
        };

        const settings = settingsRes.data || {};
        const aiRouting = settings.ai_routing || {};
        const fitConfig = aiRouting.jobFitAnalysis || { enabled: true, provider: settings.ai_model };

        return { candidateData, fitConfig };
    } catch (err) {
        console.error("Error fetching fit context:", err);
        return { 
            candidateData: { profile: null, skills: [], experiences: [] }, 
            fitConfig: { enabled: false } 
        };
    }
};
