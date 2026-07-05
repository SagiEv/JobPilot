const supabase = require('../supabaseClient');

const findAll = async (userId) => {
    return await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', userId);
};

const create = async (userId, interviewData) => {
    return await supabase
        .from('interviews')
        .insert({ ...interviewData, user_id: userId })
        .select()
        .single();
};

const update = async (userId, id, updateData) => {
    return await supabase
        .from('interviews')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
};

const remove = async (userId, id) => {
    return await supabase
        .from('interviews')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
};

const getAnalysisReports = async (userId) => {
    return await supabase
        .from('ai_analysis_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
};

const saveAnalysisReport = async (userId, reportData) => {
    return await supabase
        .from('ai_analysis_reports')
        .insert({
            user_id: userId,
            keep_report: reportData.keep_report,
            improve_report: reportData.improve_report,
            overall_trends: reportData.overall_trends
        })
        .select()
        .single();
};

module.exports = {
    findAll,
    create,
    update,
    remove,
    getAnalysisReports,
    saveAnalysisReport
};