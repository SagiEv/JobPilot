import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';
import { uploadCSV } from '../services/dataService';

export function useContacts() {
    const queryClient = useQueryClient();
    const [uploadStatus, setUploadStatus] = useState('');

    const { data: contacts = [], isLoading: loading } = useQuery({
        enabled: !!getAccessToken(),
        queryKey: ['contacts'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/contacts');
            return data || [];
        }
    });

    const addContactMutation = useMutation({
        mutationFn: async (newContact) => {
            const { data } = await apiClient.post('/api/contacts', newContact);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
        }
    });

    const updateContactMutation = useMutation({
        mutationFn: async ({ id, updatedData }) => {
            const { data } = await apiClient.put(`/api/contacts/${id}`, updatedData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
        }
    });

    const deleteContactMutation = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/contacts/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
        }
    });

    const bulkAddMutation = useMutation({
        mutationFn: async (dbData) => {
            await apiClient.post('/api/contacts/bulk', { contacts: dbData });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
        }
    });

    const handleCSVUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadStatus('Uploading and processing...');
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
            await bulkAddMutation.mutateAsync(normalizedContacts);

            setUploadStatus(`✓ Loaded successfully`);
        } catch (error) {
            const msg = error.response?.data?.error || error.response?.data?.message || error.message;
            setUploadStatus(`✗ Error: ${msg}`);
        } finally {
            e.target.value = null;
        }
    };

    const addContact = async (newContact) => {
        if (!newContact.name.trim()) return;
        return addContactMutation.mutateAsync(newContact);
    };

    const updateContact = async (id, updatedData) => {
        return updateContactMutation.mutateAsync({ id, updatedData });
    };

    const deleteContact = async (id) => {
        queryClient.setQueryData(['contacts'], (old) => old ? old.filter(c => c.id !== id) : []);
        return deleteContactMutation.mutateAsync(id);
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
