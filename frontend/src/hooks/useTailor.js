import { useState, useRef, useEffect } from 'react';
import { runTailor } from '../services/dataService';
import { useJobs } from '../components/JobProvider';

export const useTailor = (groqReady, activeProvider = 'AI', initialPipelineMode = 'standard') => {
    const { addToast } = useToast();
    const confirm = useConfirm();
    const { startJob, lastTailorResult, setLastTailorResult } = useJobs();
    const [jobUrl, setJobUrl] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [cvFile, setCvFile] = useState(null);
    const [useProfileCv, setUseProfileCv] = useState(true);
    const [tailorFocus, setTailorFocus] = useState('full');
    const [pipelineMode, setPipelineMode] = useState(initialPipelineMode);
    const [output, setOutput] = useState('');
    const [report, setReport] = useState(null);
    const [scores, setScores] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const fileInputRef = useRef(null);

    // Sync if initial mode changes (e.g., settings loaded)
    useEffect(() => {
        setPipelineMode(initialPipelineMode);
    }, [initialPipelineMode]);

    // Restore state if a job completes while on this page or navigated here via toast
    useEffect(() => {
        if (lastTailorResult) {
            setOutput(lastTailorResult.tailored_cv || 'CV Tailored Successfully.');
            setReport(lastTailorResult.tailoring_report);
            setScores({
                overall: lastTailorResult.overall_score,
                projected: lastTailorResult.projected_score
            });
            setIsProcessing(false);
            setLastTailorResult(null); // Clear it so it doesn't re-trigger
        }
    }, [lastTailorResult, setLastTailorResult]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCvFile(file);
            setUseProfileCv(false);
        }
    };

    const runAITailor = async () => {
        if (!groqReady) return;
        if (!jobDescription.trim() && !jobUrl.trim()) {
            addToast('Please paste a job description or enter a job URL first.', 'warn');
            return;
        }

        setIsProcessing(true);
        setErrorMsg(null);
        setOutput(`Starting the CV tailoring pipeline (${activeProvider}, ${pipelineMode} mode)...\nThis may take some time...`);
        setReport(null);
        setScores(null);

        try {
            const result = await runTailor(jobDescription, tailorFocus, cvFile, useProfileCv, pipelineMode);
            
            if (result.jobId) {
                setOutput(`Job queued. Waiting for AI Service (${activeProvider}) to process (this won't timeout)...`);
                
                startJob(result.jobId, (finalJobData) => {
                    setIsProcessing(false);
                    if (finalJobData.status === 'completed') {
                        // The global toast and useEffect(lastTailorResult) will handle success
                    } else {
                        const errText = finalJobData.error_message || 'Unknown error';
                        const suggestion = finalJobData.result_data?.suggested_model ? ` Suggestion: Try switching your AI model to ${finalJobData.result_data.suggested_model} in Settings.` : '';
                        setErrorMsg('Failed to tailor CV: ' + errText + suggestion);
                        setOutput(''); // Clear the queued message
                    }
                }, `CV Tailoring (${activeProvider})`);
            } else {
                setIsProcessing(false);
                setErrorMsg('Error: Backend did not return a job ID.');
                setOutput('');
            }
        } catch (err) {
            setIsProcessing(false);
            setErrorMsg('Error connecting to the backend: ' + err.message);
            setOutput('');
        }
    };

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
        addToast('Tailored CV copied to clipboard!', 'success');
    };

    return {
        state: { jobUrl, jobDescription, cvFile, useProfileCv, tailorFocus, pipelineMode, output, report, scores, isProcessing, errorMsg },
        actions: {
            setJobUrl,
            setJobDescription,
            setUseProfileCv,
            setTailorFocus,
            setPipelineMode,
            handleFileUpload,
            runAITailor,
            handleDownload,
            handleCopy
        },
        refs: { fileInputRef }
    };
};