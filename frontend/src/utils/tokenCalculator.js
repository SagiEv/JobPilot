// Rough estimate constants based on the backend pipeline
// Total base prompt size for the 8 agents in LangGraph
const PIPELINE_BASE_TOKENS = 2500;
// Rough cost of the DB Vector retrieved items (Top 5 projects, Top 20 skills)
const VECTOR_DB_ESTIMATE_TOKENS = 800;
// Placeholder cost for processing a job URL before scraping happens
const JOB_URL_ESTIMATE_TOKENS = 1200;

export const calculateTokenEstimate = ({ jobDescription, jobUrl, cvText }) => {
    let tokens = PIPELINE_BASE_TOKENS + VECTOR_DB_ESTIMATE_TOKENS;

    if (jobDescription && jobDescription.trim()) {
        tokens += Math.ceil(jobDescription.length / 4);
    } else if (jobUrl && jobUrl.trim()) {
        tokens += JOB_URL_ESTIMATE_TOKENS;
    }

    if (cvText && typeof cvText === 'string') {
        tokens += Math.ceil(cvText.length / 4);
    }

    return tokens;
};
