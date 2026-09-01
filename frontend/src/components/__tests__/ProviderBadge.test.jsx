import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProviderBadge from '../ProviderBadge';
import { useSettings } from '../../hooks/useSettings';

// Mock the useSettings hook
vi.mock('../../hooks/useSettings', () => ({
    useSettings: vi.fn()
}));

describe('ProviderBadge Component', () => {
    const mockSaveAiRouting = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders null if loading is true', () => {
        useSettings.mockReturnValue({ loading: true, settings: null });
        const { container } = render(<ProviderBadge feature="cv_tailor" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the default provider if not set in settings', () => {
        useSettings.mockReturnValue({
            loading: false,
            settings: {
                ai_routing: {},
                groq_token_set: true
            },
            saveAiRouting: mockSaveAiRouting
        });

        render(<ProviderBadge feature="cv_tailor" />);
        expect(screen.getByText('Groq')).toBeInTheDocument();
    });

    it('opens dropdown when clicked and has multiple providers', () => {
        useSettings.mockReturnValue({
            loading: false,
            settings: {
                ai_routing: { cv_tailor: { provider: 'groq' } },
                groq_token_set: true,
                openai_token_set: true
            },
            saveAiRouting: mockSaveAiRouting
        });

        render(<ProviderBadge feature="cv_tailor" />);
        
        // Open dropdown
        const badge = screen.getByText('Groq');
        fireEvent.click(badge);
        
        // Dropdown options should be visible
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });

    it('calls saveAiRouting when a new provider is selected', async () => {
        useSettings.mockReturnValue({
            loading: false,
            settings: {
                ai_routing: { cv_tailor: { provider: 'groq' } },
                groq_token_set: true,
                openai_token_set: true
            },
            saveAiRouting: mockSaveAiRouting
        });

        render(<ProviderBadge feature="cv_tailor" />);
        
        // Open dropdown
        fireEvent.click(screen.getByText('Groq'));
        
        // Click new provider
        fireEvent.click(screen.getByText('OpenAI'));
        
        expect(mockSaveAiRouting).toHaveBeenCalledWith(
            expect.objectContaining({
                cv_tailor: { provider: 'openai', model: '' }
            })
        );
    });

    it('displays "Missing Key" if the selected provider token is not set', () => {
        useSettings.mockReturnValue({
            loading: false,
            settings: {
                ai_routing: { cv_tailor: { provider: 'openai' } },
                openai_token_set: false
            },
            saveAiRouting: mockSaveAiRouting
        });

        render(<ProviderBadge feature="cv_tailor" />);
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
        expect(screen.getByText('Missing Key')).toBeInTheDocument();
    });
});
