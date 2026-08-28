const profileRepository = require('../repositories/profile.repository');
const skillsRepository = require('../repositories/skills.repository');
const experienceRepository = require('../repositories/experience.repository');
const settingsService = require('./settings.service');
const pdfParse = require('pdf-parse');

const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

const runTailoring = async (userId, jobDescription, mode = 'full', useProfile = true, cvFile = null, token = null) => {

    // 1. Get AI configs
    const aiConfigs = await settingsService.getAllAiConfigs(userId, token);
    const routing = aiConfigs?.ai_routing?.cvTailoring || { provider: 'groq', model: null };
    
    // Validate provider token
    const tokenKey = `${routing.provider}_token`;
    if (!aiConfigs || !aiConfigs[tokenKey]) {
        throw new Error(`API key for ${routing.provider} is not configured. Please add it in Settings.`);
    }

    // 2. Fetch context based on user choice
    let profile = null;
    let baseCvText = "";
    let cvData = {};

    if (useProfile) {
        const result = await profileRepository.findFirstProfile(userId);
        profile = result?.data;
        baseCvText = profile?.cv || "";
        if (baseCvText.toLowerCase().endsWith('.pdf') || baseCvText.toLowerCase().endsWith('.docx')) {
            baseCvText = "";
        }
        cvData = profile?.cv_data || {};
    } else if (cvFile) {
        try {
            const pdfData = await pdfParse(cvFile.buffer);
            baseCvText = pdfData.text;
        } catch (err) {
            console.error("Failed to parse PDF:", err);
            throw new Error("Failed to parse uploaded PDF file. Please ensure it is a valid PDF.");
        }
    } else {
        throw new Error("No CV provided. Please use profile CV or upload a PDF.");
    }

    const { getEmbedding } = require('./embedding.service');
    const supabase = require('../supabaseClient');

    const cleanText = (txt) => txt ? txt.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim() : "";
    const safeJobDesc = cleanText(jobDescription).substring(0, 15000);
    const safeBaseCv = cleanText(baseCvText).substring(0, 20000);
    const { data: experienceText } = await experienceRepository.findExperienceText(userId);
    const safeExpText = cleanText(experienceText?.text).substring(0, 10000);

    // ── Vector Search (RAG) ──
    const jobEmbedding = await getEmbedding(safeJobDesc);
    let projects = [];
    let skills = [];

    if (jobEmbedding) {
        // Run vector search via Supabase RPC
        const { data: matchedProjects } = await supabase.rpc('match_projects', {
            query_embedding: jobEmbedding,
            match_threshold: 0.1,
            match_count: 5,
            p_user_id: userId
        });
        const { data: matchedSkills } = await supabase.rpc('match_skills', {
            query_embedding: jobEmbedding,
            match_threshold: 0.1,
            match_count: 20,
            p_user_id: userId
        });
        projects = matchedProjects || [];
        skills = matchedSkills || [];
    } else {
        // Fallback to all if embedding failed
        const { data: allProjects } = await experienceRepository.findAllProjects(userId);
        const { data: allSkills } = await skillsRepository.findAll(userId);
        projects = allProjects || [];
        skills = allSkills || [];
    }

    // 3. Assemble payload
    const cleanSkills = skills.map(s => ({
        name: s.name,
        level: s.level,
        category: s.category
    }));

    const cleanProjects = projects.map(p => ({
        title: p.title,
        description: p.description,
        tech_stack: p.tech_stack
    }));

    const payload = {
        job_description: safeJobDesc,
        api_keys: {
            groq_token: aiConfigs.groq_token,
            openai_token: aiConfigs.openai_token,
            claude_token: aiConfigs.claude_token,
            gemini_token: aiConfigs.gemini_token
        },
        provider: routing.provider,
        pipeline_mode: routing.pipeline_mode || 'standard',
        model: routing.model,
        base_cv: safeBaseCv,
        cv_data: cvData,
        skills_pool: cleanSkills,
        projects_pool: cleanProjects,
        experience_text: safeExpText,
        mode: mode
    };

    // 4. Send to Python Microservice
    try {
        const response = await axios.post(`${AI_SERVICE_URL}/tailor`, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000 // Pipeline might take up to 2 minutes
        });
        return response.data;
    } catch (error) {
        console.error('AI Service Error:', error.response?.data || error.message);
        const errDetail = error.response?.data?.detail;
        
        if (errDetail && typeof errDetail === 'object') {
            const err = new Error(errDetail.error || 'AI Service Error');
            err.detail = errDetail; // Preserve the object!
            throw err;
        } else {
            throw new Error(errDetail || 'Failed to connect to AI tailoring service. Is it running?');
        }
    }
};

const jobService = require('./job.service');

const runTailoringAsync = async (userId, jobId, jobDescription, mode = 'full', useProfile = true, cvFile = null, token = null) => {
    try {
        const result = await runTailoring(userId, jobDescription, mode, useProfile, cvFile, token);
        await jobService.completeJob(jobId, result);
    } catch (error) {
        // Pass the detail object directly if it exists, otherwise pass the string message
        const errorData = error.detail || error.message;
        await jobService.failJob(jobId, errorData);
    }
};

module.exports = { runTailoring, runTailoringAsync };
