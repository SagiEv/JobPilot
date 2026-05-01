import React, { useState, useRef } from 'react';

const TailorPage = () => {
    const [jobUrl, setJobUrl] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [cvFile, setCvFile] = useState(null);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [output, setOutput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) setCvFile(file);
    };

    const sendToN8n = async () => {
        if (!webhookUrl) return alert("Please configure a webhook URL first.");

        setIsProcessing(true);
        // Logic for sending data to your n8n workflow
        try {
            // Mocking the automation trigger
            console.log("Sending to n8n:", { jobUrl, jobDescription, cvFile: cvFile?.name, webhookUrl });
            setOutput("Processing your CV... suggestions will appear here shortly.");
        } catch (err) {
            setOutput("Error connecting to n8n. Please check your webhook configuration.");
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
                        <div className="field-label">Upload CV (PDF / DOCX)</div>
                        <div className="cv-drop" onClick={() => fileInputRef.current.click()}>
                            {cvFile ? cvFile.name : "Drop or click to upload"}
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".pdf,.docx"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                        </div>
                        {cvFile && <div className="file-label-hint">File ready for tailoring</div>}
                    </div>

                    <div className="field-group" style={{ marginTop: '12px' }}>
                        <div className="field-label">Or use active profile CV</div>
                        <div className="cv-badge">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                <rect x="3" y="1" width="10" height="14" rx="1.5" opacity=".25" />
                                <rect x="3" y="1" width="10" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3" />
                            </svg>
                            Alex_Johnson_CV_2026.pdf
                        </div>
                    </div>

                    <div className="field-group" style={{ marginTop: '14px' }}>
                        <div className="field-label">Tailoring Focus</div>
                        <select className="field-input">
                            <option>Highlight matching skills</option>
                            <option>Reorder experience by relevance</option>
                            <option>Adjust summary / objective</option>
                            <option>Full rewrite for role</option>
                        </select>
                    </div>
                </div>

                {/* Card 3: n8n Automation (Full Width) */}
                <div className="card tailor-span">
                    <div className="card-title">n8n Automation</div>
                    <div className="n8n-bar">
                        <div className={`n8n-dot ${webhookUrl ? 'active' : ''}`}></div>
                        <span>Webhook — connect your n8n workflow to process CV + job description</span>
                        <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => document.getElementById('n8n-hook').focus()}>
                            Configure
                        </button>
                    </div>
                    <div className="automation-controls">
                        <input
                            className="field-input"
                            id="n8n-hook"
                            type="url"
                            placeholder="https://your-n8n.io/webhook/cv-tailor"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button className="btn btn-primary" onClick={sendToN8n} disabled={isProcessing}>
                            {isProcessing ? "Processing..." : "Send to n8n ↗"}
                        </button>
                    </div>
                    <div className="field-label" style={{ marginBottom: '7px' }}>Tailored Output</div>
                    <div className="output-area">
                        {output || "Tailored CV suggestions will appear here once n8n processes the job description and your CV…"}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TailorPage;