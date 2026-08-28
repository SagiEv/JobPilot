const { supabase } = require('../supabaseClient');

/**
 * Creates a new async job record
 * @param {string} userId - UUID of the user
 * @param {string} type - Job type (e.g. 'tailor_cv')
 * @returns {Promise<string>} jobId
 */
async function createJob(userId, type) {
    const { data, error } = await supabase
        .from('ai_jobs')
        .insert([{ user_id: userId, type: type, status: 'pending' }])
        .select('id')
        .single();
        
    if (error) {
        console.error('Error creating job:', error);
        throw new Error('Failed to create background job');
    }
    
    return data.id;
}

/**
 * Updates a job's status to completed with the result
 * @param {string} jobId - UUID of the job
 * @param {object} resultData - JSON data to save
 */
async function completeJob(jobId, resultData) {
    const { error } = await supabase
        .from('ai_jobs')
        .update({ 
            status: 'completed', 
            result_data: resultData,
            updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
        
    if (error) {
        console.error(`Error completing job ${jobId}:`, error);
    }
}

/**
 * Updates a job's status to failed with an error message and optional extra data
 * @param {string} jobId - UUID of the job
 * @param {string|object} errorMessage - Error details
 */
async function failJob(jobId, errorData) {
    let message = "Unknown error";
    let result_data = null;
    
    if (typeof errorData === 'string') {
        message = errorData;
    } else if (errorData && errorData.error) {
        message = errorData.error;
        if (errorData.suggested_model) {
            result_data = { suggested_model: errorData.suggested_model };
        }
    } else if (errorData && errorData.message) {
        message = errorData.message;
    }
    
    const { error } = await supabase
        .from('ai_jobs')
        .update({ 
            status: 'failed', 
            error_message: message,
            result_data: result_data,
            updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
        
    if (error) {
        console.error(`Error failing job ${jobId}:`, error);
    }
}

/**
 * Retrieves a job by ID
 * @param {string} jobId - UUID of the job
 */
async function getJob(jobId) {
    const { data, error } = await supabase
        .from('ai_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
        
    if (error) {
        throw new Error('Job not found');
    }
    
    return data;
}

module.exports = {
    createJob,
    completeJob,
    failJob,
    getJob
};
