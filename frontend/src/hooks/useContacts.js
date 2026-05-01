import { useState, useEffect } from 'react';
import api from '../api';
import { uploadData } from '../services/apiService';

export function useContacts() {
    const [contacts, setContacts] = useState([]);
    const [uploadStatus, setUploadStatus] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchContacts = async () => {
        try {
            const { data } = await api.get('/api/contacts');
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
            const result = await uploadData(file, 'network');
            
            const normalizedContacts = result.data.map((row) => ({
                name: row.Contact || row.contact || row['Contact'] || row['contact'] || '',
                company: row['COMPANY'] || row['Company'] || row['company'] || row.Company || row.company || '',
                phone: row['Phone Number'] || row['phone number'] || row.Phone || row.phone || '',
                relation: row.relation || row.Relation || 'Contact'
            }));

            setUploadStatus('Saving to database...');
            await api.post('/api/contacts/bulk', { contacts: normalizedContacts });
            
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
            const { data } = await api.post('/api/contacts', newContact);
            setContacts(prev => [...prev, data]);
        } catch (error) {
            console.error("Failed to add contact:", error);
        }
    };

    return {
        contacts,
        loading,
        uploadStatus,
        handleCSVUpload,
        addContact
    };
}