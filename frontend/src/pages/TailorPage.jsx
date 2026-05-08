import React from 'react';
import { useSettings } from '../hooks/useSettings';
import { useTailor } from '../hooks/useTailor';

const TailorPage = () => {
    const { settings, loading: settingsLoading } = useSettings();
    const groqReady = settings.groq_token_set;

    const { state, actions, refs } = useTailor(groqReady);
    const { jobUrl, jobDescription, cvFile, useProfileCv, tailorFocus, output, report, scores, isProcessing } = state;

    return (
        <div className="section" id="sec-tailor">
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
                                ref={refs.fileInputRef}
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
                </div>

                {/* Card 3: AI Engine & Output */}
                <div className="card tailor-span">
                    <div className="card-title">AI Engine</div>

                    <div className="ai-engine-bar">
                        {/* Status indicator */}
                        <div className={`ai-engine-status ${groqReady ? 'ai-status-ready' : 'ai-status-missing'}`}>
                            <span className={`ai-dot ${groqReady ? 'ai-dot-active' : 'ai-dot-off'}`} />
                            {settingsLoading ? (
                                <span>Checking Groq connection…</span>
                            ) : groqReady ? (
                                <span>Groq API connected — 8-agent CV pipeline ready</span>
                            ) : (
                                <span>
                                    Groq API key not configured —{' '}
                                    <span
                                        className="ai-settings-link"
                                        role="button"
                                        onClick={() => window.dispatchEvent(new CustomEvent('jobpilot:navigate', { detail: 'settings' }))}
                                    >
                                        go to Settings to add your key
                                    </span>
                                </span>
                            )}
                        </div>

                        {/* RE-ADDED: Agents preview chips */}
                        {groqReady && (
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
                            disabled={isProcessing || !groqReady || settingsLoading}
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

                    <div className="output-area" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                        {output || 'Ready to tailor your CV...'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TailorPage;