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

// Refresh lock & queue to prevent concurrent refresh token rotation
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        error ? reject(error) : resolve(token);
    });
    failedQueue = [];
};

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

            // If a refresh is already in-flight, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest);
                });
            }

            isRefreshing = true;
            try {
                const { data } = await supabase.auth.refreshSession();
                if (data?.session) {
                    accessToken = data.session.access_token;
                    localStorage.setItem('refresh_token', data.session.refresh_token);
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    processQueue(null, accessToken);
                    return apiClient(originalRequest);
                } else {
                    processQueue(new Error('Refresh failed'));
                }
            } catch (refreshError) {
                processQueue(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        
        // Format Zod validation errors for easier consumption by hooks
        if (error.response?.data) {
            const data = error.response.data;
            if (data.status === 'error' && Array.isArray(data.details) && data.details.length > 0) {
                const issues = data.details.map(d => `${d.field}: ${d.issue}`).join(', ');
                data.error = `${data.message} - ${issues}`;
            } else if (!data.error && data.message) {
                data.error = data.message;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;