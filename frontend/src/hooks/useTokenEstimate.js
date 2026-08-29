import { useState, useEffect } from 'react';
import { calculateTokenEstimate } from '../utils/tokenCalculator';
import { extractTextFromPdf } from '../utils/pdfParser';

export const useTokenEstimate = (jobDescription, jobUrl, cvFile, useProfileCv, profile) => {
    const [estimatedTokens, setEstimatedTokens] = useState(0);

    useEffect(() => {
        let isMounted = true;
        
        const estimate = async () => {
            let cvText = '';
            
            if (useProfileCv && profile?.cvData) {
                // If using profile CV, serialize it roughly
                cvText = JSON.stringify(profile.cvData);
            } else if (!useProfileCv && cvFile) {
                // Parse PDF client-side
                cvText = await extractTextFromPdf(cvFile);
            }

            const tokens = calculateTokenEstimate({
                jobDescription,
                jobUrl,
                cvText
            });

            if (isMounted) {
                setEstimatedTokens(tokens);
            }
        };

        const timeoutId = setTimeout(() => {
            estimate();
        }, 500); // 500ms debounce

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [jobDescription, jobUrl, cvFile, useProfileCv, profile]);

    return estimatedTokens;
};
