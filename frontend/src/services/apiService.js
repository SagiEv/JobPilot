import { uploadCSV as apiUpload, checkHealth as apiHealth } from '../api';

export const uploadData = async (file, type) => {
    return await apiUpload(file, type);
};

export const checkBackendHealth = async () => {
    return await apiHealth();
};