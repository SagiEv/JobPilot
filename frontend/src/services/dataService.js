// all data-fetching logic here
import apiClient from './apiClient';

export const uploadCSV = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/csv/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const saveApplications = (applications) =>
    apiClient.post('/api/applications/save', { applications }).then(r => r.data);

export const checkHealth = () =>
    apiClient.get('/api/health').then(r => r.data);

export const runTailor = async (jobDescription, mode = 'full', cvFile = null, useProfileCv = true) => {
    const formData = new FormData();
    formData.append('job_description', jobDescription);
    formData.append('mode', mode);
    formData.append('use_profile_cv', useProfileCv);
    if (cvFile && !useProfileCv) formData.append('cv_file', cvFile);

    const response = await apiClient.post('/api/tailor', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};