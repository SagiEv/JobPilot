import React from 'react';
import { useSettings } from '../hooks/useSettings';
import { useTailor } from '../hooks/useTailor';
import { useProfile } from '../hooks/useProfile';
import { useTokenEstimate } from '../hooks/useTokenEstimate';
import ProviderBadge from '../components/ProviderBadge';

const TailorPage = () => {
    const { settings, saveAiRouting, loading: settingsLoading } = useSettings();
    const activeProvider = settings?.ai_routing?.cvTailoring?.provider || 'groq';
    const aiReady = settings?.[`${activeProvider}_token_set`];
    const initialPipelineMode = settings?.ai_routing?.cvTailoring?.pipeline_mode || 'standard';

    const { state, actions, refs } = useTailor(aiReady, activeProvider, initialPipelineMode);
    const { fileInputRef } = refs;
    const { jobUrl, jobDescription, cvFile, useProfileCv, tailorFocus, pipelineMode, output, report, scores, isProcessing } = state;
    
    const { profile } = useProfile();
    const estimatedTokens = useTokenEstimate(jobDescription, jobUrl, cvFile, useProfileCv, profile);


    return (
        <div className="section" id="sec-tailor">
            <div className="page-header desktop-only">
                <div className="page-header__left">
                    <h2 className="section-title">Tailor Your CV</h2>
                </div>
            </div>
            <div className="tailor-grid">
                {/* Card 1: Job Source */}
                <div className="card">
                    <div className="card-title">Job Source</div>
                    <div className="field-group">
                        <div className="field-label">Job Posting URL</div>
                        <div className="url-row">
                            <input
                                className="field-input"
                                type="url"
                                placeholder="https://jobs..."
                                value={jobUrl}
                                onChange={(e) => actions.setJobUrl(e.target.value)}
                            />
                            <button className="btn">Fetch</button>
                        </div>
                    </div>
                    <div className="manual-divider">— or paste manually —</div>
                    <div className="field-group">
                        <div className="field-label">Job Requirements</div>
                        <textarea
                            className="textarea"
                            style={{ minHeight: '150px' }}
                            value={jobDescription}
                            onChange={(e) => actions.setJobDescription(e.target.value)}
                        />
                    </div>
                </div>

                {/* Card 2: CV Management */}
                <div className="card">
                    <div className="card-title">Your CV</div>

                    {/* Option 1: File Upload */}
                    <div className="field-group">
                        <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="cvSource"
                                checked={!useProfileCv}
                                onChange={() => actions.setUseProfileCv(false)}
                            />
                            Upload CV (PDF)
                        </label>
                        <div
                            className={`cv-drop ${useProfileCv ? 'disabled' : ''}`}
                            onClick={() => !useProfileCv && refs.fileInputRef.current.click()}
                            style={{ opacity: useProfileCv ? 0.5 : 1 }}
                        >
                            {cvFile ? cvFile.name : "Drop or click to upload"}
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".pdf"
                                style={{ display: 'none' }}
                                onChange={actions.handleFileUpload}
                            />
                        </div>
                    </div>

                    {/* Option 2: Profile CV */}
                    <div className="field-group" style={{ marginTop: '12px' }}>
                        <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="cvSource"
                                checked={useProfileCv}
                                onChange={() => actions.setUseProfileCv(true)}
                            />
                            Or use active profile CV
                        </label>
                        <div className="cv-badge" style={{ opacity: !useProfileCv ? 0.5 : 1 }}>
                            Profile CV (from Profile page)
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: '1px', background: '#eee', margin: '18px 0' }}></div>

                    {/* Option 3: Agent Mode Selection */}
                    <div className="field-group">
                        <div className="field-label">Tailoring Focus</div>
                        <select
                            className="field-input"
                            value={tailorFocus}
                            onChange={(e) => actions.setTailorFocus(e.target.value)}
                        >
                            <option value="full">Full AI pipeline (recommended)</option>
                            <option value="skills">Highlight matching skills</option>
                            <option value="reorder">Reorder experience by relevance</option>
                            <option value="summary">Adjust summary / objective</option>
                        </select>
                    </div>

                    {/* Option 4: Pipeline Mode Selection */}
                    <div className="field-group" style={{ marginTop: '16px' }}>
                        <div className="field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            Pipeline Mode
                            {pipelineMode !== initialPipelineMode ? (
                                <span 
                                    onClick={async () => {
                                        try {
                                            const newRouting = { ...settings.ai_routing, cvTailoring: { ...settings.ai_routing?.cvTailoring, pipeline_mode: pipelineMode } };
                                            await saveAiRouting(newRouting);
                                        } catch (e) {
                                            console.error("Failed to save default mode", e);
                                        }
                                    }}
                                    style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    Set as Default
                                </span>
                            ) : (
                                <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>
                                    ✓ Default
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px', gap: '4px', border: '1px solid #e2e8f0' }}>
                            <div 
                                onClick={() => actions.setPipelineMode('standard')}
                                style={{ 
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                                    padding: '10px 12px', borderRadius: '6px', cursor: 'pointer', 
                                    background: pipelineMode === 'standard' ? 'white' : 'transparent', 
                                    boxShadow: pipelineMode === 'standard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', 
                                    color: pipelineMode === 'standard' ? '#0f172a' : '#64748b', 
                                    fontWeight: pipelineMode === 'standard' ? '600' : '500', 
                                    transition: 'all 0.2s',
                                    userSelect: 'none'
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={pipelineMode === 'standard' ? '#8b5cf6' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                                </svg>
                                Full Pipeline
                            </div>
                            <div 
                                onClick={() => actions.setPipelineMode('fast')}
                                style={{ 
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                                    padding: '10px 12px', borderRadius: '6px', cursor: 'pointer', 
                                    background: pipelineMode === 'fast' ? 'white' : 'transparent', 
                                    boxShadow: pipelineMode === 'fast' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', 
                                    color: pipelineMode === 'fast' ? '#0f172a' : '#64748b', 
                                    fontWeight: pipelineMode === 'fast' ? '600' : '500', 
                                    transition: 'all 0.2s',
                                    userSelect: 'none'
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={pipelineMode === 'fast' ? '#eab308' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                                </svg>
                                Fast
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 3: AI Engine & Output */}
                <div className="card tailor-span">
                    <div className="card-title">AI Engine</div>

                    <div className="ai-engine-bar">
                        {/* Status indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ProviderBadge feature="cvTailoring" />
                            {aiReady && (
                                <span style={{ fontSize: '12px', color: '#888', background: '#f0f0f0', padding: '2px 8px', borderRadius: '12px' }}>
                                    ~{estimatedTokens.toLocaleString()} ctx tokens
                                </span>
                            )}
                            {!aiReady && !settingsLoading && (
                                <span style={{ fontSize: '13px', color: '#666' }}>
                                    API key not configured —{' '}
                                    <span
                                        className="ai-settings-link"
                                        role="button"
                                        style={{ color: '#0f6e56', cursor: 'pointer', textDecoration: 'underline' }}
                                        onClick={() => window.dispatchEvent(new CustomEvent('jobpilot:navigate', { detail: 'settings' }))}
                                    >
                                        go to Settings
                                    </span>
                                </span>
                            )}
                        </div>

                        {/* RE-ADDED: Agents preview chips */}
                        {aiReady && (
                            <div className="ai-agents-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '0 15px' }}>
                                {[
                                    'Job Analyst',
                                    'CV Scorer',
                                    'Profile Selector',
                                    'Keyword Injector',
                                    'CV Restructurer',
                                    'ATS Validator',
                                    'Summary Rewriter',
                                    'Final Polish',
                                ].map(name => (
                                    <span key={name} className="ai-agent-chip">{name}</span>
                                ))}
                            </div>
                        )}

                        <button
                            id="run-ai-tailor-btn"
                            className="btn btn-primary"
                            onClick={actions.runAITailor}
                            disabled={isProcessing || !aiReady || settingsLoading}
                            style={{ marginLeft: 'auto', flexShrink: 0 }}
                        >
                            {isProcessing ? 'Running pipeline…' : '✦ Run AI Tailor'}
                        </button>
                    </div>

                    {/* Report & Scores Display */}
                    {(scores || report) && (
                        <div style={{ marginTop: '14px', padding: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
                            {scores && <span><strong>Score:</strong> {scores.overall} → {scores.projected}</span>}
                            {report && <p style={{ fontSize: '0.9em', marginTop: '5px' }}>Target: {report.job_title}</p>}
                        </div>
                    )}

                    <div className="field-label" style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tailored Output</span>
                        {report && !isProcessing && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-sm" onClick={actions.handleCopy}>Copy</button>
                                <button className="btn btn-sm btn-primary" onClick={actions.handleDownload}>Download</button>
                            </div>
                        )}
                    </div>

                    {state.errorMsg && (
                        <div style={{ padding: '12px 16px', background: '#fffbeb', borderLeft: '4px solid #f59e0b', color: '#b45309', borderRadius: '4px', marginBottom: '14px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            <span style={{ fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{state.errorMsg}</span>
                        </div>
                    )}

                    <div className="output-area" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                        {output || 'Ready to tailor your CV...'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TailorPage;