import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

export function useInterviews() {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchInterviews = async () => {
        try {
            const { data } = await apiClient.get('/api/interviews');
            setInterviews(data || []);
        } catch (error) {
            console.error("Failed to fetch interviews:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterviews();
    }, []);

    const addInterview = async (newInt) => {
        const interview = {
            ...newInt, // Spread first so it provides the company and date
            // Then define the arrays so they override the strings in newInt
            keep: typeof newInt.keep === 'string'
                ? newInt.keep.split('\n').filter(line => line.trim())
                : [],
            improve: typeof newInt.improve === 'string'
                ? newInt.improve.split('\n').filter(line => line.trim())
                : []
        };

        try {
            const { data } = await apiClient.post('/api/interviews', interview);
            setInterviews(prev => [data, ...prev]);
        } catch (error) {
            console.error("Failed to add interview:", error);
        }
    };

    return { interviews, loading, addInterview };
}