import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

export function useEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = async () => {
        try {
            const { data } = await apiClient.get('/api/events');
            setEvents(data || []);
        } catch (error) {
            console.error("Failed to fetch events:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const addEvent = async (newEvent) => {
        try {
            const { data } = await apiClient.post('/api/events', newEvent);
            setEvents(prev => [...prev, data]);
        } catch (error) {
            console.error("Failed to add event:", error);
        }
    };

    const updateEvent = async (id, updatedEvent) => {
        try {
            const { data } = await apiClient.put(`/api/events/${id}`, updatedEvent);
            setEvents(prev => prev.map(ev => (ev.id === id ? data : ev)));
        } catch (error) {
            console.error("Failed to update event:", error);
        }
    };

    const deleteEvent = async (id) => {
        try {
            await apiClient.delete(`/api/events/${id}`);
            setEvents(prev => prev.filter(ev => ev.id !== id));
        } catch (error) {
            console.error("Failed to delete event:", error);
        }
    };

    return { events, loading, addEvent, updateEvent, deleteEvent, refetch: fetchEvents };
}
