import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
});

// // MEMORY STORAGE FOR TOKEN
// let accessToken = null;

// // INTERCEPTOR: The "Guard" that attaches the token to EVERY request
// api.interceptors.request.use(async (config) => {
//   // If memory is empty (e.g., page refresh), try to get it from Supabase session
//   if (!accessToken) {
//     const { data } = await supabase.auth.getSession();
//     accessToken = data?.session?.access_token;

//     // Fix your ReferenceError: Make it available to the browser console
//     window.accessToken = accessToken;
//   }

//   if (accessToken) {
//     config.headers.Authorization = `Bearer ${accessToken}`;
//   }
//   return config;
// }, (error) => Promise.reject(error));

// /** 
//  * EXPORTING HELPERS 
//  */
// export const setAccessToken = (token) => {
//   accessToken = token;
//   window.accessToken = token;
// };

// export const fetchSession = async () => {
//   const { data } = await supabase.auth.getSession();
//   if (data?.session) {
//     accessToken = data.session.access_token;
//     return data.session.user;
//   }
//   return null;
// };

export const uploadCSV = async (file, type) => {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await api.post('/api/csv/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to upload CSV')
  }
}

export const saveApplications = async (applications) => {
  try {
    const response = await api.post('/api/applications/save', { applications })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to save applications')
  }
}

export const saveNetwork = async (contacts) => {
  try {
    const response = await api.post('/api/network/save', { contacts })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to save contacts')
  }
}

export const checkHealth = async () => {
  try {
    const response = await api.get('/api/health')
    return response.data
  } catch (error) {
    throw new Error('Backend is not available')
  }
}

export const runTailor = async (jobDescription, mode = 'full', cvFile = null, useProfileCv = true) => {
  try {
    const formData = new FormData()
    formData.append('job_description', jobDescription)
    formData.append('mode', mode)
    formData.append('use_profile_cv', useProfileCv)
    if (cvFile && !useProfileCv) {
      formData.append('cv_file', cvFile)
    }

    const response = await api.post('/api/tailor', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to run AI tailoring pipeline')
  }
}

export default api
