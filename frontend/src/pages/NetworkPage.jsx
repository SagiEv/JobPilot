import React, { useState, useMemo } from 'react';
import { useContacts } from '../hooks/useContacts';
import { getInitials } from '../utils/helpers';
import PageLoader from '../components/PageLoader';
import NetworkGraph from '../components/NetworkGraph';

const NetworkPage = () => {
    // 1. Deconstruct the correct function name 'addContact' from our hook
    const { contacts, loading, uploadStatus, handleCSVUpload, addContact, updateContact, deleteContact } = useContacts();

    // 2. Local state for controlling the modal visibility
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showMap, setShowMap] = useState(false);

    // 3. Local state for the form inputs
    const [newContact, setNewContact] = useState({
        name: '',
        company: '',
        phone: '',
        email: '',
        linkedin: '',
        link: '',
        relation: 'Colleague',
        connected_by: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [filterRelation, setFilterRelation] = useState('');

    const displayedContacts = useMemo(() => {
        let result = [...contacts];

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(c => 
                (c.name && c.name.toLowerCase().includes(lowerSearch)) || 
                (c.company && c.company.toLowerCase().includes(lowerSearch))
            );
        }

        if (filterRelation) {
            result = result.filter(c => c.relation === filterRelation);
        }

        if (sortBy) {
            result.sort((a, b) => {
                const valA = String(a[sortBy] || '').toLowerCase();
                const valB = String(b[sortBy] || '').toLowerCase();
                return valA.localeCompare(valB);
            });
        }

        return result;
    }, [contacts, searchTerm, sortBy, filterRelation]);

    const handleSave = () => {
        if (editingId) {
            updateContact(editingId, newContact);
        } else {
            addContact(newContact); // Call the hook function
        }
        setNewContact({ name: '', company: '', phone: '', email: '', linkedin: '', link: '', relation: 'Colleague', connected_by: '' }); // Reset form
        setShowModal(false); // Close modal
        setEditingId(null);
    };

    const handleEdit = (contact) => {
        setNewContact({
            name: contact.name || '',
            company: contact.company || '',
            phone: contact.phone || '',
            email: contact.email || '',
            linkedin: contact.linkedin || '',
            link: contact.link || '',
            relation: contact.relation || 'Colleague',
            connected_by: contact.connected_by || ''
        });
        setEditingId(contact.id);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this contact?")) {
            deleteContact(id);
        }
    };

    if (loading) return <PageLoader label="Loading network…" />;

    return (
        <div className="section">
            <div className="import-bar">
                <label className="btn btn-primary btn-sm" htmlFor="net-csv" style={{ cursor: 'pointer', margin: 0, display: 'inline-block', lineHeight: 'normal' }}>
                    Import CSV
                    <input id="net-csv" type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
                </label>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowMap(!showMap)} style={{ marginLeft: '10px' }}>
                    {showMap ? 'View Grid' : 'Display Map'}
                </button>
                {/* This button sets showModal to true */}
                <button className="btn btn-primary btn-sm" onClick={() => {
                    setEditingId(null);
                    setNewContact({ name: '', company: '', phone: '', email: '', linkedin: '', link: '', relation: 'Colleague', connected_by: '' });
                    setShowModal(true);
                }} style={{ marginLeft: 'auto' }}>
                    + Add Contact
                </button>
            </div>

            {uploadStatus && <div className="status-msg">{uploadStatus}</div>}

            <div className="filters-bar" style={{ 
                display: 'flex', 
                gap: '15px', 
                marginBottom: '30px', 
                alignItems: 'center', 
                flexWrap: 'wrap',
                background: 'var(--bg-elevated, #ffffff)',
                padding: '20px',
                borderRadius: '16px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                border: '1px solid var(--border, #eaeaea)'
            }}>
                <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search by name or company..."
                        className="field-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', margin: 0, paddingLeft: '40px', paddingRight: '15px', borderRadius: '10px', border: '1px solid var(--border, #eaeaea)', height: '44px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', fontSize: '0.95rem' }}
                        onFocus={(e) => { e.target.style.borderColor = '#007bff'; e.target.style.boxShadow = '0 0 0 3px rgba(0,123,255,0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border, #eaeaea)'; e.target.style.boxShadow = 'none'; }}
                    />
                </div>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <select
                        className="field-input"
                        value={filterRelation}
                        onChange={(e) => setFilterRelation(e.target.value)}
                        style={{ width: '160px', margin: 0, borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--border, #eaeaea)', height: '44px', backgroundColor: 'var(--bg, #f9f9f9)', outline: 'none' }}
                    >
                        <option value="">All Relations</option>
                        <option value="Colleague">Colleague</option>
                        <option value="Friend">Friend</option>
                        <option value="Recruiter">Recruiter</option>
                        <option value="Friend of a friend">Friend of a friend</option>
                        <option value="Friend of family">Friend of family</option>
                    </select>
                    
                    <select
                        className="field-input"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{ width: '160px', margin: 0, borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--border, #eaeaea)', height: '44px', backgroundColor: 'var(--bg, #f9f9f9)', outline: 'none' }}
                    >
                        <option value="">Sort by...</option>
                        <option value="relation">Relation (A-Z)</option>
                        <option value="name">Name (A-Z)</option>
                        <option value="company">Company (A-Z)</option>
                    </select>
                </div>
            </div>

            {showMap ? (
                <NetworkGraph contacts={contacts} />
            ) : (
                <div className="network-grid">
                    {displayedContacts.map(contact => (
                        <div key={contact.id} className="contact-card" style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <button className="btn" onClick={() => handleEdit(contact)} title="Edit" style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent', color: 'var(--t2)', border: '1px solid var(--border)', borderRadius: '6px' }}>Edit</button>
                                <button className="btn" onClick={() => handleDelete(contact.id)} title="Delete" style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent', color: '#ff4d4f', border: '1px solid rgba(255, 77, 79, 0.5)', borderRadius: '6px' }}>Delete</button>
                            </div>
                            <div className="contact-avatar" style={{ margin: '0 auto 10px' }}>{getInitials(contact.name)}</div>
                            <div style={{ textAlign: 'center' }}>
                                <div className="contact-name">{contact.name}</div>
                                <div className="contact-co">
                                    {contact.link ? (
                                        <a href={contact.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#007bff' }}>{contact.company}</a>
                                    ) : (
                                        contact.company
                                    )}
                                </div>
                                <div className="contact-rel">{contact.relation}</div>
                            </div>
                            {contact.email && (
                                <div className="contact-detail" style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                                    Email: <a href={`mailto:${contact.email}`} style={{ color: '#007bff', textDecoration: 'none' }}>{contact.email}</a>
                                </div>
                            )}
                            {contact.phone && <div className="contact-detail" style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>Phone: {contact.phone}</div>}
                            {contact.linkedin && (
                                <div className="contact-detail" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                                    <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#0a66c2' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                        </svg>
                                        LinkedIn
                                    </a>
                                </div>
                            )}
                            {contact.connected_by && <div className="contact-detail" style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px', fontStyle: 'italic' }}>Connected by: {contact.connected_by}</div>}
                        </div>
                    ))}
                </div>
            )}

            {/* 4. THE MISSING MODAL: The button won't 'work' if this isn't rendered */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Contact' : 'Add Contact'}</h2>
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
                                <label>Phone</label>
                                <input
                                    className="field-input"
                                    value={newContact.phone}
                                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                    placeholder="Phone number"
                                />
                            </div>
                            <div className="modal-section">
                                <label>Email</label>
                                <input
                                    className="field-input"
                                    value={newContact.email}
                                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                    placeholder="Email address"
                                />
                            </div>
                            <div className="modal-section">
                                <label>LinkedIn</label>
                                <input
                                    className="field-input"
                                    value={newContact.linkedin}
                                    onChange={(e) => setNewContact({ ...newContact, linkedin: e.target.value })}
                                    placeholder="LinkedIn Profile URL"
                                />
                            </div>
                            <div className="modal-section">
                                <label>Careers Link</label>
                                <input
                                    className="field-input"
                                    value={newContact.link}
                                    onChange={(e) => setNewContact({ ...newContact, link: e.target.value })}
                                    placeholder="Company Careers URL"
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
                                    <option>Friend of a friend</option>
                                    <option>Friend of family</option>
                                </select>
                            </div>
                            {(newContact.relation === 'Friend of a friend' || newContact.relation === 'Friend of family') && (
                                <div className="modal-section">
                                    <label>Connected By</label>
                                    <input
                                        className="field-input"
                                        value={newContact.connected_by || ''}
                                        onChange={(e) => setNewContact({ ...newContact, connected_by: e.target.value })}
                                        placeholder="Name of the person who connected you"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>{editingId ? 'Update Contact' : 'Add Contact'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NetworkPage;