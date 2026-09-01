import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPage from '../SettingsPage';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmProvider';
import { authService } from '../../services/authService';

vi.mock('../../hooks/useSettings', () => ({ useSettings: vi.fn() }));
vi.mock('../../components/ToastProvider', () => ({ useToast: vi.fn() }));
vi.mock('../../components/ConfirmProvider', () => ({ useConfirm: vi.fn() }));
vi.mock('../../services/authService', () => ({
    authService: { changePassword: vi.fn(), logout: vi.fn() }
}));

describe('SettingsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useToast.mockReturnValue({ addToast: vi.fn() });
        useConfirm.mockReturnValue(vi.fn());
        useSettings.mockReturnValue({
            settings: {
                timezone: 'UTC',
                groq_token_set: true,
                ai_routing: { cvTailoring: { provider: 'groq' } }
            },
            loading: false,
            saving: false,
            saveAiToken: vi.fn(),
            saveAiRouting: vi.fn(),
            saveTimezone: vi.fn(),
            saveSmtpSettings: vi.fn()
        });
    });

    it('renders general settings by default', () => {
        render(<SettingsPage />);
        expect(screen.getByText('Account & Security')).toBeInTheDocument();
        expect(screen.getByText('Localization')).toBeInTheDocument();
    });

    it('can switch to AI integration tab', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText('AI Integration'));
        expect(screen.getByText('AI Providers')).toBeInTheDocument();
        expect(screen.getByText('AI Feature Routing')).toBeInTheDocument();
    });

    it('shows password change form when expanded', () => {
        render(<SettingsPage />);
        
        fireEvent.click(screen.getByText('Change'));
        
        expect(screen.getByPlaceholderText('Enter new password')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument();
    });

    it('can switch to Mail SMTP tab', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText('Mail SMTP Integration'));
        
        expect(screen.getByText('Email Auto-Sync')).toBeInTheDocument();
        expect(screen.getByText('Configure')).toBeInTheDocument();
    });
});
