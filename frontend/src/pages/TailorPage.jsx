import React, { useState, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { runTailor } from '../api';

const TailorPage = () => {
    const [jobUrl, setJobUrl] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [cvFile, setCvFile] = useState(null);
    const [useProfileCv, setUseProfileCv] = useState(true);
    const [output, setOutput] = useState('');
    const [report, setReport] = useState(null);
    const [scores, setScores] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);

    const { settings, loading: settingsLoading } = useSettings();
    const groqReady = settings.groq_token_set;

    const handleDownload = () => {
        if (!output || isProcessing) return;
        const blob = new Blob([output], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Tailored_CV.md');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    };

    const handleCopy = () => {
        if (!output || isProcessing) return;
        navigator.clipboard.writeText(output);
        alert('Tailored CV copied to clipboard!');
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCvFile(file);
            setUseProfileCv(false); // Auto-switch to uploaded file
        }
    };

    const runAITailor = async () => {
        if (!groqReady) return;
        if (!jobDescription.trim() && !jobUrl.trim()) {
            alert('Please paste a job description or enter a job URL first.');
            return;
        }
        setIsProcessing(true);
        setOutput('Starting the 8-agent CV tailoring pipeline...\nThis may take 1-2 minutes as the agents analyze, score, and rewrite your CV.');
        setReport(null);
        try {
            const result = await runTailor(jobDescription, 'full', cvFile, useProfileCv);
            if (result.success) {
                setOutput(result.tailored_cv || 'CV Tailored Successfully, but no markdown was returned.');
                setReport(result.tailoring_report);
                setScores({
                    overall: result.overall_score,
                    projected: result.projected_score
                });
            } else {
                setOutput('Failed to tailor CV: ' + (result.error || 'Unknown error'));
            }
        } catch (err) {
            setOutput('Error connecting to the AI service: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

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
                                placeholder="https://jobs.company.com/role/123"
                                value={jobUrl}
                                onChange={(e) => setJobUrl(e.target.value)}
                            />
                            <button className="btn">Fetch</button>
                        </div>
                    </div>
                    <div className="manual-divider">— or paste manually —</div>
                    <div className="field-group">
                        <div className="field-label">Job Requirements / Description</div>
                        <textarea
                            className="textarea"
                            style={{ minHeight: '150px' }}
                            placeholder="Paste the full job description here..."
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                        />
                    </div>
                </div>

                {/* Card 2: CV Management */}
                <div className="card">
                    <div className="card-title">Your CV</div>
                    <div className="field-group">
                        <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="cvSource"
                                checked={!useProfileCv}
                                onChange={() => setUseProfileCv(false)}
                            />
                            Upload CV (PDF)
                        </label>
                        <div className={`cv-drop ${useProfileCv ? 'disabled' : ''}`} onClick={() => !useProfileCv && fileInputRef.current.click()} style={{ opacity: useProfileCv ? 0.5 : 1 }}>
                            {cvFile ? cvFile.name : "Drop or click to upload"}
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".pdf"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                        </div>
                        {cvFile && !useProfileCv && <div className="file-label-hint">File ready for tailoring</div>}
                        {!cvFile && !useProfileCv && <div className="file-label-hint" style={{ color: '#ff6b6b' }}>Please select a file</div>}
                    </div>

                    <div className="field-group" style={{ marginTop: '16px' }}>
                        <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="cvSource"
                                checked={useProfileCv}
                                onChange={() => setUseProfileCv(true)}
                            />
                            Or use active profile CV
                        </label>
                        <div className="cv-badge" style={{ opacity: !useProfileCv ? 0.5 : 1 }}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                <rect x="3" y="1" width="10" height="14" rx="1.5" opacity=".25" />
                                <rect x="3" y="1" width="10" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                            </svg>
                            Profile CV (from Profile page)
                        </div>
                    </div>

                    <div className="field-group" style={{ marginTop: '14px' }}>
                        <div className="field-label">Tailoring Focus</div>
                        <select className="field-input">
                            <option>Full AI pipeline (recommended)</option>
                            <option>Highlight matching skills</option>
                            <option>Reorder experience by relevance</option>
                            <option>Adjust summary / objective</option>
                        </select>
                    </div>
                </div>

                {/* Card 3: AI Engine Status (Full Width) */}
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
                                        tabIndex={0}
                                        onClick={() => {
                                            // Trigger navigation to settings — bubble up via custom event
                                            window.dispatchEvent(new CustomEvent('jobpilot:navigate', { detail: 'settings' }));
                                        }}
                                        onKeyDown={e => e.key === 'Enter' && window.dispatchEvent(new CustomEvent('jobpilot:navigate', { detail: 'settings' }))}
                                    >
                                        go to Settings to add your key
                                    </span>
                                </span>
                            )}
                        </div>

                        {/* Agents preview chips */}
                        {groqReady && (
                            <div className="ai-agents-row">
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
                            onClick={runAITailor}
                            disabled={isProcessing || !groqReady || settingsLoading}
                            style={{ marginLeft: 'auto', flexShrink: 0 }}
                        >
                            {isProcessing ? 'Running pipeline…' : '✦ Run AI Tailor'}
                        </button>
                    </div>

                    <div className="field-label" style={{ marginBottom: '7px', marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {scores && (
                            <div style={{ marginTop: '10px' }}>
                                <strong>Scores:</strong>
                                <p>Overall: {scores.overall}</p>
                                <p>Projected: {scores.projected}</p>
                            </div>
                        )}
                        {report && (
                            <div style={{ marginTop: '10px' }}>
                                <strong>Report:</strong>
                                <p>Job Title: {report.job_title}</p>
                                <p>Original Score: {report.original_score}</p>
                                <p>Projected Score: {report.projected_score}</p>
                                <p>ATS Score: {report.ats_score}</p>
                            </div>
                        )}
                        <span>Tailored Output</span>
                        {report && !isProcessing && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-sm" onClick={handleCopy}>Copy Text</button>
                                <button className="btn btn-sm btn-primary" onClick={handleDownload}>Download MD</button>
                            </div>
                        )}
                    </div>
                    <div className="output-area" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', overflowY: 'auto', maxHeight: '500px' }}>
                        {output || (groqReady
                            ? 'Paste a job description above and click "Run AI Tailor" to start the 8-agent pipeline…'
                            : 'Add your Groq API key in Settings to enable the AI tailoring pipeline.'
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
};

export default TailorPage;