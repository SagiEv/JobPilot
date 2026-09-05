import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TailorPage from '../TailorPage';
import { useSettings } from '../../hooks/useSettings';
import { useTailor } from '../../hooks/useTailor';
import { useProfile } from '../../hooks/useProfile';
import { useTokenEstimate } from '../../hooks/useTokenEstimate';

vi.mock('../../hooks/useSettings', () => ({ useSettings: vi.fn() }));
vi.mock('../../hooks/useTailor', () => ({ useTailor: vi.fn() }));
vi.mock('../../hooks/useProfile', () => ({ useProfile: vi.fn() }));
vi.mock('../../hooks/useTokenEstimate', () => ({ useTokenEstimate: vi.fn() }));

describe('TailorPage', () => {
    const mockRunAITailor = vi.fn();
    const mockSetJobUrl = vi.fn();
    const mockSetPipelineMode = vi.fn();
    const mockSaveAiRouting = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        
        useSettings.mockReturnValue({
            settings: { ai_routing: { cvTailoring: { provider: 'groq' } }, groq_token_set: true },
            saveAiRouting: mockSaveAiRouting,
            loading: false
        });

        useTailor.mockReturnValue({
            state: {
                jobUrl: '',
                jobDescription: '',
                cvFile: null,
                useProfileCv: true,
                tailorFocus: 'full',
                pipelineMode: 'standard',
                output: 'Tailored Output Preview',
                isProcessing: false
            },
            actions: {
                runAITailor: mockRunAITailor,
                setJobUrl: mockSetJobUrl,
                setPipelineMode: mockSetPipelineMode
            },
            refs: { fileInputRef: { current: null } }
        });

        useProfile.mockReturnValue({ profile: {} });
        useTokenEstimate.mockReturnValue(5000);
    });

    it('renders the tailor page and elements', () => {
        render(<TailorPage />);
        expect(screen.getByText('Tailor Your CV')).toBeInTheDocument();
        expect(screen.getByText('Job Source')).toBeInTheDocument();
        expect(screen.getByText('Tailored Output')).toBeInTheDocument();
        expect(screen.getByText('Tailored Output Preview')).toBeInTheDocument();
    });

    it('handles job URL input', () => {
        render(<TailorPage />);
        const urlInput = screen.getByPlaceholderText('https://jobs...');
        fireEvent.change(urlInput, { target: { value: 'https://example.com/job' } });
        expect(mockSetJobUrl).toHaveBeenCalledWith('https://example.com/job');
    });

    it('handles run AI tailor click', () => {
        render(<TailorPage />);
        const runButton = screen.getByText('✦ Run AI Tailor');
        fireEvent.click(runButton);
        expect(mockRunAITailor).toHaveBeenCalled();
    });

    it('shows API key missing message if no key is set', () => {
        useSettings.mockReturnValue({
            settings: { ai_routing: { cvTailoring: { provider: 'groq' } }, groq_token_set: false },
            saveAiRouting: mockSaveAiRouting,
            loading: false
        });

        render(<TailorPage />);
        expect(screen.getByText(/API key not configured/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /run ai tailor/i })).toBeDisabled();
    });
});
