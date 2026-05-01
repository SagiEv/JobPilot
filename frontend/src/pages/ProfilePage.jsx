import React, { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../api';
import PageLoader from '../components/PageLoader';

const EditableCVField = ({ title, value, onChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value || '');

    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'clean']
        ]
    };

    const handleSave = () => {
        onChange(tempValue);
        setIsEditing(false);
    };

    const handleClear = () => {
        if (window.confirm("Are you sure you want to clear this section?")) {
            setTempValue('');
            onChange('');
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <div className="card profile-span">
                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {title}
                    <div className="btn-group">
                        <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
                        <button className="btn btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                </div>
                <div style={{ borderRadius: 'var(--r)', overflow: 'hidden' }}>
                    <ReactQuill theme="snow" value={tempValue} onChange={setTempValue} modules={modules} style={{ minHeight: '150px', backgroundColor: 'var(--bg)', color: 'var(--t1)' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="card profile-span view-mode">
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {title}
                <div className="tile-actions" style={{ position: 'static', opacity: 1, display: 'flex', gap: '8px' }}>
                    <button className="action-btn edit" onClick={() => { setTempValue(value); setIsEditing(true); }}>✎</button>
                    <button className="action-btn delete" onClick={handleClear}>✕</button>
                </div>
            </div>
            <div className="experience-display-text" dangerouslySetInnerHTML={{ __html: value || '<p style="color:#aaa">Empty</p>' }} />
        </div>
    );
};

const ProfilePage = () => {
    const { profile, loading, error, handleProfileChange } = useProfile();
    const [isGenerating, setIsGenerating] = useState(false);

    const handleMakeCV = async () => {
        setIsGenerating(true);
        try {
            const response = await api.post('/api/cv/generate', {
                cvData: profile.cvData,
                personalInfo: {
                    name: profile.name,
                    email: profile.email,
                    roles: profile.roles,
                    phone: profile.phone,
                    linkedin: profile.linkedin,
                    github: profile.github || profile.website
                }
            }, { responseType: 'arraybuffer' });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${(profile.name || 'CV').replace(/\s+/g, '_')}_CV.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error("Failed to generate CV", error);
            alert("Failed to generate CV");
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) return <PageLoader label="Loading profile…" />;

    if (error) {
        return (
            <div className="section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <div style={{ textAlign: 'center', color: '#ff6b6b' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="section profile-grid">
            <div className="toolbar profile-span" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="section-title" style={{ margin: 0 }}>My Profile</h2>
                <button className="btn btn-primary" onClick={handleMakeCV} disabled={isGenerating}>
                    {isGenerating ? 'Generating PDF...' : 'Make CV'}
                </button>
            </div>

            <div className="card">
                <div className="card-title">Personal Info</div>
                <div className="field-group">
                    <div className="field-label">Full Name</div>
                    <input className="field-input" value={profile.name || ''} onChange={(e) => handleProfileChange('name', e.target.value)} />
                </div>
                <div className="field-group">
                    <div className="field-label">Email Address</div>
                    <input className="field-input" type="email" value={profile.email || ''} onChange={(e) => handleProfileChange('email', e.target.value)} />
                </div>
                <div className="field-group">
                    <div className="field-label">Phone</div>
                    <input className="field-input" value={profile.phone || ''} onChange={(e) => handleProfileChange('phone', e.target.value)} />
                </div>
                <div className="field-group">
                    <div className="field-label">LinkedIn URL</div>
                    <input className="field-input" value={profile.linkedin || ''} onChange={(e) => handleProfileChange('linkedin', e.target.value)} />
                </div>
                <div className="field-group">
                    <div className="field-label">GitHub URL</div>
                    <input className="field-input" value={profile.github || profile.website || ''} onChange={(e) => handleProfileChange('github', e.target.value)} />
                </div>
            </div>

            <div className="card">
                <div className="card-title">CV & Preferences</div>
                <div className="field-group">
                    <div className="field-label">Active CV</div>
                    <div className="cv-badge">{profile.cv || 'None'}</div>
                </div>
                <div className="field-group">
                    <div className="field-label">Target Roles</div>
                    <input className="field-input" value={profile.roles || ''} onChange={(e) => handleProfileChange('roles', e.target.value)} />
                </div>
            </div>

            <EditableCVField title="Summary" value={profile.cvData?.summary} onChange={(val) => handleProfileChange('cvData.summary', val)} />
            <EditableCVField title="Technical Skills" value={profile.cvData?.technicalSkills} onChange={(val) => handleProfileChange('cvData.technicalSkills', val)} />
            <EditableCVField title="Education" value={profile.cvData?.education} onChange={(val) => handleProfileChange('cvData.education', val)} />
            <EditableCVField title="Projects" value={profile.cvData?.projects} onChange={(val) => handleProfileChange('cvData.projects', val)} />
            <EditableCVField title="Experience" value={profile.cvData?.experience} onChange={(val) => handleProfileChange('cvData.experience', val)} />
            <EditableCVField title="Additional Information" value={profile.cvData?.additionalInformation} onChange={(val) => handleProfileChange('cvData.additionalInformation', val)} />
        </div>
    );
};

export default ProfilePage;