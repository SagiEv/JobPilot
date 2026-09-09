import React from 'react';
import { useRolesBank } from '../hooks/useRolesBank';

const ExperienceEditor = ({ experiences = [], onChange, status }) => {
    const { data: rolesBank = [], isLoading } = useRolesBank();
    const localExperiences = experiences.filter(exp => exp.status === status);

    const handleAdd = () => {
        const newExp = {
            role_id: rolesBank.length > 0 ? rolesBank[0].id : '',
            status,
            years: 0,
            start_date: '',
            end_date: ''
        };
        const updated = [...experiences, newExp];
        onChange(updated);
    };

    const handleUpdate = (index, field, value) => {
        const filtered = experiences.filter(exp => exp.status === status);
        const itemToUpdate = filtered[index];
        const globalIndex = experiences.indexOf(itemToUpdate);
        
        if (globalIndex > -1) {
            const updated = [...experiences];
            updated[globalIndex] = { ...updated[globalIndex], [field]: value };
            onChange(updated);
        }
    };

    const handleRemove = (index) => {
        const filtered = experiences.filter(exp => exp.status === status);
        const itemToRemove = filtered[index];
        const globalIndex = experiences.indexOf(itemToRemove);
        
        if (globalIndex > -1) {
            const updated = experiences.filter((_, i) => i !== globalIndex);
            onChange(updated);
        }
    };

    const calculateDuration = (start) => {
        if (!start) return '';
        const startDate = new Date(start);
        const now = new Date();
        if (startDate > now) return 'Start date in future';
        let months = (now.getFullYear() - startDate.getFullYear()) * 12;
        months -= startDate.getMonth();
        months += now.getMonth();
        if (months <= 0) return 'Just started';
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        
        const yearStr = years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '';
        const monthStr = remainingMonths > 0 ? `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : '';
        
        if (yearStr && monthStr) return `${yearStr}, ${monthStr}`;
        if (yearStr) return yearStr;
        return monthStr;
    };

    if (isLoading) return <div>Loading roles...</div>;

    return (
        <div className="card">
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {status === 'current' ? 'Current Experience' : 'Previous Experience'}
                <button className="btn btn-sm btn-primary" onClick={handleAdd}>+ Add Role</button>
            </div>
            
            {localExperiences.length === 0 && (
                <div style={{ color: 'var(--t2)', padding: '10px 0' }}>No {status} experience added.</div>
            )}
            
            {localExperiences.map((exp, index) => (
                <div key={index} className="field-group" style={{ padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ flex: 1, marginRight: '10px' }}>
                            <div className="field-label">Role</div>
                            <select 
                                className="field-input" 
                                value={exp.role_id || ''}
                                onChange={(e) => handleUpdate(index, 'role_id', parseInt(e.target.value, 10))}
                            >
                                <option value="" disabled>Select a role...</option>
                                {rolesBank.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                        <button className="action-btn delete" onClick={() => handleRemove(index)} style={{ alignSelf: 'flex-end', marginBottom: '4px' }}>✕</button>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        {status === 'current' ? (
                            <>
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <div className="field-label">Years of Experience (Manual)</div>
                                    <input 
                                        type="number" 
                                        className="field-input" 
                                        min="0"
                                        value={exp.years !== null && exp.years !== undefined ? exp.years : ''}
                                        onChange={(e) => handleUpdate(index, 'years', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                                        placeholder="e.g. 0"
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <div className="field-label">Start Date (Optional)</div>
                                    <input 
                                        type="date" 
                                        className="field-input" 
                                        value={exp.start_date ? exp.start_date.split('T')[0] : ''}
                                        onChange={(e) => handleUpdate(index, 'start_date', e.target.value || null)}
                                    />
                                </div>
                                {exp.start_date && (
                                    <div style={{ flex: '1 1 100%', fontSize: '0.9em', color: 'var(--t2)' }}>
                                        Dynamic duration: <strong>{calculateDuration(exp.start_date)}</strong>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <div className="field-label">Start Date</div>
                                    <input 
                                        type="date" 
                                        className="field-input" 
                                        value={exp.start_date ? exp.start_date.split('T')[0] : ''}
                                        onChange={(e) => handleUpdate(index, 'start_date', e.target.value || null)}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <div className="field-label">End Date</div>
                                    <input 
                                        type="date" 
                                        className="field-input" 
                                        value={exp.end_date ? exp.end_date.split('T')[0] : ''}
                                        onChange={(e) => handleUpdate(index, 'end_date', e.target.value || null)}
                                    />
                                </div>
                                {exp.start_date && exp.end_date && exp.end_date < exp.start_date && (
                                    <div style={{ flex: '1 1 100%', color: 'red', fontSize: '0.85em' }}>
                                        End date cannot be before start date.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ExperienceEditor;
