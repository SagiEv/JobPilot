import React, { useState } from 'react';
import { useContacts } from '../hooks/useContacts';
import { getInitials } from '../utils/helpers';
import PageLoader from '../components/PageLoader';

const NetworkPage = () => {
    // 1. Deconstruct the correct function name 'addContact' from our hook
    const { contacts, loading, uploadStatus, handleCSVUpload, addContact } = useContacts();

    // 2. Local state for controlling the modal visibility
    const [showModal, setShowModal] = useState(false);

    // 3. Local state for the form inputs
    const [newContact, setNewContact] = useState({
        name: '',
        company: '',
        phone: '',
        relation: 'Colleague'
    });

    const handleSave = () => {
        addContact(newContact); // Call the hook function
        setNewContact({ name: '', company: '', phone: '', relation: 'Colleague' }); // Reset form
        setShowModal(false); // Close modal
    };

    if (loading) return <PageLoader label="Loading network…" />;

    return (
        <div className="section">
            <div className="import-bar">
                <button className="btn btn-primary btn-sm">
                    <label htmlFor="net-csv" style={{ cursor: 'pointer', margin: 0 }}>
                        Import CSV
                        <input id="net-csv" type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
                    </label>
                </button>
                {/* This button sets showModal to true */}
                <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} style={{ marginLeft: 'auto' }}>
                    + Add Contact
                </button>
            </div>

            {uploadStatus && <div className="status-msg">{uploadStatus}</div>}

            <div className="network-grid">
                {contacts.map(contact => (
                    <div key={contact.id} className="contact-card">
                        <div className="contact-avatar">{getInitials(contact.name)}</div>
                        <div className="contact-name">{contact.name}</div>
                        <div className="contact-co">{contact.company}</div>
                        <div className="contact-rel">{contact.relation}</div>
                    </div>
                ))}
            </div>

            {/* 4. THE MISSING MODAL: The button won't 'work' if this isn't rendered */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Contact</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-section">
                                <label>Name</label>
                                <input
                                    className="field-input"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                    placeholder="Full name"
                                />
                            </div>
                            <div className="modal-section">
                                <label>Company</label>
                                <input
                                    className="field-input"
                                    value={newContact.company}
                                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                                    placeholder="Company"
                                />
                            </div>
                            <div className="modal-section">
                                <label>Relation</label>
                                <select
                                    className="field-input"
                                    value={newContact.relation}
                                    onChange={(e) => setNewContact({ ...newContact, relation: e.target.value })}
                                >
                                    <option>Colleague</option>
                                    <option>Friend</option>
                                    <option>Recruiter</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>Add Contact</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NetworkPage;