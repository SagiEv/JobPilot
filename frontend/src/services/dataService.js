// all data-fetching logic here
import apiClient from './apiClient';

export const uploadCSV = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/csv/upload', formData);
    return response.data;
};

export const saveApplications = (applications) =>
    apiClient.post('/api/applications/save', { applications }).then(r => r.data);

export const checkHealth = () =>
    apiClient.get('/api/health').then(r => r.data);

export const runTailor = async (jobDescription, mode = 'full', cvFile = null, useProfileCv = true, pipelineMode = 'standard') => {
    const cleanJobDescription = jobDescription ? jobDescription.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim() : '';
    const formData = new FormData();
    formData.append('job_description', cleanJobDescription);
    formData.append('mode', mode);
    formData.append('use_profile_cv', useProfileCv);
    formData.append('pipeline_mode', pipelineMode);
    if (cvFile && !useProfileCv) formData.append('cv_file', cvFile);

    const response = await apiClient.post('/api/tailor', formData);
    return response.data;
};