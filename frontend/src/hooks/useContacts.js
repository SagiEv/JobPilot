import { useState, useEffect } from 'react';
// import api from '../api';
// import { uploadData } from '../services/apiService';
import apiClient from '../services/apiClient';
import { uploadCSV } from '../services/dataService';

export function useContacts() {
    const [contacts, setContacts] = useState([]);
    const [uploadStatus, setUploadStatus] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchContacts = async () => {
        try {
            const { data } = await apiClient.get('/api/contacts');
            setContacts(data || []);
        } catch (error) {
            console.error("Failed to fetch contacts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const handleCSVUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadStatus('Uploading and processing...');
            // const result = await uploadData(file, 'network');
            const result = await uploadCSV(file, 'network');

            const normalizedContacts = result.data.map((row) => ({
                name: row.Contact || row.contact || row['Contact'] || row['contact'] || '',
                company: row['COMPANY'] || row['Company'] || row['company'] || row.Company || row.company || '',
                phone: row['Phone Number'] || row['phone number'] || row.Phone || row.phone || '',
                email: row['Email'] || row['email'] || row.Email || row.email || '',
                linkedin: row['LinkedIn'] || row['linkedin'] || row.LinkedIn || row.linkedin || '',
                link: row['Link'] || row['link'] || row['Careers Link'] || row.Link || row.link || '',
                relation: row.relation || row.Relation || 'Contact'
            }));

            setUploadStatus('Saving to database...');
            await apiClient.post('/api/contacts/bulk', { contacts: normalizedContacts });

            await fetchContacts();
            setUploadStatus(`✓ Loaded successfully`);
        } catch (error) {
            const msg = error.response?.data?.error || error.response?.data?.message || error.message;
            setUploadStatus(`✗ Error: ${msg}`);
        }
    };

    const addContact = async (newContact) => {
        if (!newContact.name.trim()) return;

        try {
            const { data } = await apiClient.post('/api/contacts', newContact);
            setContacts(prev => [...prev, data]);
        } catch (error) {
            console.error("Failed to add contact:", error);
        }
    };

    const updateContact = async (id, updatedData) => {
        try {
            const { data } = await apiClient.put(`/api/contacts/${id}`, updatedData);
            setContacts(prev => prev.map(c => (c.id === id ? data : c)));
        } catch (error) {
            console.error("Failed to update contact:", error);
        }
    };

    const deleteContact = async (id) => {
        try {
            await apiClient.delete(`/api/contacts/${id}`);
            setContacts(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error("Failed to delete contact:", error);
        }
    };

    return {
        contacts,
        loading,
        uploadStatus,
        handleCSVUpload,
        addContact,
        updateContact,
        deleteContact
    };
}
