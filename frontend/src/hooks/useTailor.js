import { useState, useRef } from 'react';
import { runTailor } from '../services/dataService';

export const useTailor = (groqReady) => {
    const [jobUrl, setJobUrl] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [cvFile, setCvFile] = useState(null);
    const [useProfileCv, setUseProfileCv] = useState(true);
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
            const result = await runTailor(jobDescription, 'full', cvFile, useProfileCv);
            if (result.success) {
                setOutput(result.tailored_cv || 'CV Tailored Successfully.');
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
        state: { jobUrl, jobDescription, cvFile, useProfileCv, output, report, scores, isProcessing },
        actions: {
            setJobUrl,
            setJobDescription,
            setUseProfileCv,
            handleFileUpload,
            runAITailor,
            handleDownload,
            handleCopy
        },
        refs: { fileInputRef }
    };
};