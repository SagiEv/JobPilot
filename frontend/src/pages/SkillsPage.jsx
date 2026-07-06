import React, { useState } from 'react';
import { useSkills } from '../hooks/useSkills';
import PageLoader from '../components/PageLoader';

const SkillsPage = () => {
    const { skills, loading, addSkill, deleteSkill } = useSkills();
    const [newSkillName, setNewSkillName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Languages');

    // Categories for the Matrix
    const categories = ['Languages', 'Frameworks', 'Tools', 'Soft Skills', 'Other'];

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            addSkill(newSkillName, selectedCategory);
            setNewSkillName('');
        }
    };

    // Group skills by category for the Matrix view
    const groupedSkills = skills.reduce((acc, skill) => {
        if (!acc[skill.category]) acc[skill.category] = [];
        acc[skill.category].push(skill);
        return acc;
    }, {});

    if (loading) return <PageLoader label="Loading skills…" />;

    return (
        <div className="section" id="sec-skills">
            <div className="page-header desktop-only">
                <div className="page-header__left">
                    <h2 className="section-title">Skills Matrix</h2>
                </div>
            </div>
            {/* Quick Add Tag Bar */}
            <div className="card skills-add-card">
                <div className="card-title">Quick Add Skill</div>
                <div className="skills-input-wrapper">
                    <select
                        className="category-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <input
                        type="text"
                        className="field-input skill-tag-input"
                        placeholder="Type skill and press Enter..."
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={() => { addSkill(newSkillName, selectedCategory); setNewSkillName(''); }}
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* The Matrix View */}
            <div className="skills-matrix-grid">
                {categories.map(cat => (
                    <div key={cat} className="card matrix-card">
                        <div className="matrix-category-header">
                            <h3>{cat}</h3>
                            <span className="count-badge">{groupedSkills[cat]?.length || 0}</span>
                        </div>
                        <div className="skills-tag-container">
                            {groupedSkills[cat]?.map(skill => (
                                <div key={skill.id} className="skill-tag-pill">
                                    <span>{skill.name}</span>
                                    <button
                                        className="tag-delete-btn"
                                        onClick={() => deleteSkill(skill.id)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            {!groupedSkills[cat] && <p className="empty-hint">No {cat.toLowerCase()} added yet.</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SkillsPage;