import React, { useState } from 'react';
import { useExperience } from '../hooks/useExperience';
import PageLoader from '../components/PageLoader';

const ExperiencePage = () => {
    const { projects, loading, experienceText, setExperienceText, addProject, updateProject, deleteProject } = useExperience();

    // Modals/Forms State
    const [projectModal, setProjectModal] = useState({ show: false, mode: 'add', id: null });
    const [showExpForm, setShowExpForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', tech: '', summary: '', link: '' });
    const [tempExp, setTempExp] = useState(experienceText);

    const handleProjectSubmit = (e) => {
        e.preventDefault();
        if (projectModal.mode === 'add') addProject(formData);
        else updateProject(projectModal.id, formData);

        setFormData({ name: '', tech: '', summary: '', link: '' });
        setProjectModal({ show: false, mode: 'add', id: null });
    };

    const openEditProject = (p) => {
        setFormData({ name: p.name, tech: p.tech, summary: p.bullets.join('\n'), link: p.link || '' });
        setProjectModal({ show: true, mode: 'edit', id: p.id });
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this project?")) {
            deleteProject(id);
        }
    };

    if (loading) return <PageLoader label="Loading portfolio…" />;

    return (
        <div className="section" id="sec-experience">
            <div className="page-header">
                <div className="page-header__left desktop-only">
                    <h2 className="section-title">Portfolio</h2>
                </div>
                <div className="page-header__actions" style={{ marginLeft: 'auto' }}>
                    {!experienceText && !showExpForm && (
                        <button className="btn btn-sm" onClick={() => { setTempExp(''); setShowExpForm(true); }}>+ Add Experience</button>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={() => setProjectModal({ show: true, mode: 'add', id: null })}>+ Add Project</button>
                </div>
            </div>

            {/* 1. Experience Section: Conditional Rendering */}
            {showExpForm ? (
                <div className="card experience-summary-card">
                    <div className="card-title">Edit Professional Experience</div>
                    <textarea
                        className="textarea"
                        value={tempExp}
                        onChange={(e) => setTempExp(e.target.value)}
                        style={{ minHeight: '150px', marginBottom: '15px' }}
                    />
                    <div className="btn-group">
                        <button className="btn btn-primary btn-sm" onClick={() => { setExperienceText(tempExp); setShowExpForm(false); }}>Save</button>
                        <button className="btn btn-sm" onClick={() => setShowExpForm(false)}>Cancel</button>
                    </div>
                </div>
            ) : experienceText ? (
                <div className="card experience-summary-card view-mode">
                    <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        Professional Experience
                        <button className="btn-edit-text" onClick={() => { setTempExp(experienceText); setShowExpForm(true); }}>Edit</button>
                    </div>
                    <p className="experience-display-text">{experienceText}</p>
                </div>
            ) : null}

            {/* 2. Projects Grid with Hover Actions */}
            <div className="projects-section">
                <h3 className="subsection-title">Projects</h3>
                <div className="projects-grid">
                    {projects.map(project => (
                        <div key={project.id} className="project-tile">
                            <div className="tile-actions">
                                <button className="action-btn edit" onClick={() => openEditProject(project)}>✎</button>
                                <button className="action-btn delete" onClick={() => handleDelete(project.id)}>✕</button>
                            </div>

                            <div className="project-header">
                                <h4>{project.name}</h4>
                                <div className="tech-stack-row">
                                    {project.tech.split(',').map((t, i) => <span key={i} className="tech-pill">{t.trim()}</span>)}
                                </div>
                            </div>
                            <ul className="project-bullets">
                                {project.bullets.map((b, i) => <li key={i}>{b}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Shared Project Modal */}
            {projectModal.show && (
                <div className="modal-overlay" onClick={() => setProjectModal({ ...projectModal, show: false })}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{projectModal.mode === 'add' ? 'Add Project' : 'Edit Project'}</h2>
                            <button className="modal-close" onClick={() => setProjectModal({ ...projectModal, show: false })}>✕</button>
                        </div>
                        <form onSubmit={handleProjectSubmit}>
                            <div className="modal-body">
                                <div className="modal-section">
                                    <label>Project Name</label>
                                    <input className="field-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                                <div className="modal-section">
                                    <label>Tech Stack</label>
                                    <input className="field-input" value={formData.tech} onChange={e => setFormData({ ...formData, tech: e.target.value })} required />
                                </div>
                                <div className="modal-section">
                                    <label>Link</label>
                                    <input className="field-input" value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} />
                                </div>
                                <div className="modal-section">
                                    <label>Summary (Bullet per line)</label>
                                    <textarea className="textarea" value={formData.summary} onChange={e => setFormData({ ...formData, summary: e.target.value })} required />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="btn btn-primary">{projectModal.mode === 'add' ? 'Save Project' : 'Update Project'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExperiencePage;