import { useState, useRef } from 'react';
import { runTailor } from '../services/dataService';
import { useJobs } from '../components/JobProvider';

export const useTailor = (groqReady) => {
    const { startJob, addToast } = useJobs();
    const [jobUrl, setJobUrl] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [cvFile, setCvFile] = useState(null);
    const [useProfileCv, setUseProfileCv] = useState(true);
    const [tailorFocus, setTailorFocus] = useState('full');
    const [output, setOutput] = useState('');
    const [report, setReport] = useState(null);
    const [scores, setScores] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);

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
            alert('Please paste a job description or enter a job URL first.');
            return;
        }

        setIsProcessing(true);
        setOutput('Starting the 8-agent CV tailoring pipeline...\nThis may take 1-2 minutes...');
        setReport(null);
        setScores(null);

        try {
            const result = await runTailor(jobDescription, tailorFocus, cvFile, useProfileCv);
            
            if (result.jobId) {
                setOutput('Job queued. Waiting for AI Service to process (this won\'t timeout)...');
                startJob(result.jobId, (finalJobData) => {
                    setIsProcessing(false);
                    if (finalJobData.status === 'completed') {
                        const finalResult = finalJobData.result_data;
                        setOutput(finalResult.tailored_cv || 'CV Tailored Successfully.');
                        setReport(finalResult.tailoring_report);
                        setScores({
                            overall: finalResult.overall_score,
                            projected: finalResult.projected_score
                        });
                    } else {
                        const errorMsg = finalJobData.error_message || 'Unknown error';
                        const suggestion = finalJobData.result_data?.suggested_model ? `\n\nSuggestion: Try switching your AI model to ${finalJobData.result_data.suggested_model} in Settings.` : '';
                        setOutput('Failed to tailor CV: ' + errorMsg + suggestion);
                    }
                });
            } else {
                // Fallback if backend doesn't return jobId for some reason
                setIsProcessing(false);
                setOutput('Error: Backend did not return a job ID.');
            }
        } catch (err) {
            setIsProcessing(false);
            setOutput('Error connecting to the backend: ' + err.message);
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
        alert('Tailored CV copied to clipboard!');
    };

    return {
        state: { jobUrl, jobDescription, cvFile, useProfileCv, tailorFocus, output, report, scores, isProcessing },
        actions: {
            setJobUrl,
            setJobDescription,
            setUseProfileCv,
            setTailorFocus,
            handleFileUpload,
            runAITailor,
            handleDownload,
            handleCopy
        },
        refs: { fileInputRef }
    };
};