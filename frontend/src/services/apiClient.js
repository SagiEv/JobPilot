// This replaces your root api.js. It handles the token memory and the interceptor for the entire app
import axios from 'axios';
import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// One single instance for the whole app
const apiClient = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Memory storage for the JWT
let accessToken = null;

export const setAccessToken = (token) => {
    accessToken = token;
    window.accessToken = token; // For console debugging
};

export const getAccessToken = () => accessToken;

// REQUEST INTERCEPTOR
apiClient.interceptors.request.use(async (config) => {
    // console.log("Request interceptor: ", config);
    // If memory is empty (page refresh), pull from Supabase session
    if (!accessToken) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
            accessToken = data.session.access_token;
        }
    }

    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    // console.log("Request config: ", config);
    return config;
}, (error) => Promise.reject(error));

// RESPONSE INTERCEPTOR (Handling Token Expired/401)
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const { data } = await supabase.auth.refreshSession();
            if (data?.session) {
                accessToken = data.session.access_token;
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return apiClient(originalRequest);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;