import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import ApplicationsPage from '../ApplicationsPage';
import { renderWithProviders } from '../../test-utils';
import { setAccessToken } from '../../services/apiClient';
import { server } from '../../tests/setup';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

vi.mock('../../hooks/useSettings', () => ({
    useSettings: () => ({ settings: { timezone: 'UTC' } })
}));

describe('ApplicationsPage Integration Test', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setAccessToken('fake-token');
    });

    it('renders loader initially, then displays applications from API', async () => {
        renderWithProviders(<ApplicationsPage />);
        expect(screen.getByText('Loading applications…')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByText('Google')).toBeInTheDocument();
        });
        expect(screen.getByText('Frontend')).toBeInTheDocument();
    });

    it('can open New Application modal, submit, and display error if invalid hook is present', async () => {
        renderWithProviders(<ApplicationsPage />);
        
        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('Google')).toBeInTheDocument();
        });

        // Open modal
        const newAppButton = screen.getByText('+ New Application');
        fireEvent.click(newAppButton);

        expect(screen.getByText('New Application')).toBeInTheDocument();

        // Fill form
        const companyInput = screen.getByPlaceholderText('e.g. Google');
        const roleInput = screen.getByPlaceholderText('e.g. Frontend Engineer');

        fireEvent.change(companyInput, { target: { value: 'TestCorp' } });
        fireEvent.change(roleInput, { target: { value: 'TestRole' } });

        // Submit form
        const submitButton = screen.getByText('Save Application');
        fireEvent.click(submitButton);

        // Since we are running the actual addApplicationMutation, if toDb contains a hook error, this will crash.
        // If it succeeds, the modal should close. We will just check that it doesn't crash here.
        await waitFor(() => {
            expect(screen.queryByText('New Application')).not.toBeInTheDocument();
        });
    });

    it('excludes Withdrawn applications from Active and displays them in Archived', async () => {
        server.use(
            http.get(`${API_URL}/api/applications`, () => {
                return HttpResponse.json([
                    { id: 1, company: 'Google', role_id: 'Frontend', status: 'Applied', date: '2026-01-01' },
                    { id: 2, company: 'Meta', role_id: 'Backend', status: 'Withdrawn', date: '2026-01-02' },
                    { id: 3, company: 'Netflix', role_id: 'Fullstack', status: 'Rejected', date: '2026-01-03' }
                ]);
            })
        );

        renderWithProviders(<ApplicationsPage />);

        // Active filter is default: Google shown, Meta (Withdrawn) & Netflix (Rejected) hidden
        await waitFor(() => {
            expect(screen.getByText('Google')).toBeInTheDocument();
        });
        expect(screen.queryByText('Meta')).not.toBeInTheDocument();
        expect(screen.queryByText('Netflix')).not.toBeInTheDocument();

        // Click Archived stat card
        fireEvent.click(screen.getByText('Archived'));

        await waitFor(() => {
            expect(screen.getByText('Meta')).toBeInTheDocument();
            expect(screen.getByText('Netflix')).toBeInTheDocument();
        });
        expect(screen.queryByText('Google')).not.toBeInTheDocument();
    });

    it('shows toast indication when changing application status', async () => {
        server.use(
            http.put(`${API_URL}/api/applications/:id`, async ({ request, params }) => {
                const body = await request.json();
                return HttpResponse.json({
                    id: Number(params.id),
                    company: 'Google',
                    role_id: 'Frontend',
                    status: body.status,
                    stage: body.stage || '',
                    date: '2026-01-01'
                });
            })
        );

        renderWithProviders(<ApplicationsPage />);

        await waitFor(() => {
            expect(screen.getByText('Google')).toBeInTheDocument();
        });

        const statusSelect = screen.getByDisplayValue('Applied');
        fireEvent.change(statusSelect, { target: { value: 'Screening' } });

        await waitFor(() => {
            expect(screen.getByText('Updated Google status to Screening')).toBeInTheDocument();
        });
    });

    it('sorts applications by fit score highest/lowest with unscored apps last', async () => {
        server.use(
            http.get(`${API_URL}/api/applications`, () => {
                return HttpResponse.json([
                    { id: 1, company: 'UnscoredCo', role_id: 'Dev', status: 'Applied', date: '2026-01-05' },
                    { id: 2, company: 'LowFitCo', role_id: 'Dev', status: 'Applied', date: '2026-01-02', fit_score_deterministic: 45 },
                    { id: 3, company: 'HighAiCo', role_id: 'Dev', status: 'Applied', date: '2026-01-01', fit_score_deterministic: 50, fit_analysis_ai: { ai_score: 92 } },
                    { id: 4, company: 'MidFitCo', role_id: 'Dev', status: 'Applied', date: '2026-01-03', fit_score_deterministic: 75 }
                ]);
            })
        );

        renderWithProviders(<ApplicationsPage />);

        await waitFor(() => {
            expect(screen.getByText('UnscoredCo')).toBeInTheDocument();
        });

        const sortSelect = screen.getByDisplayValue('Sort by Date');
        fireEvent.change(sortSelect, { target: { value: 'fit' } });

        const getRowCompanies = () =>
            Array.from(document.querySelectorAll('tbody tr')).map(row => row.querySelector('td')?.textContent);

        // Desc (Highest first): 92, 75, 45, null
        expect(getRowCompanies()).toEqual(['HighAiCo', 'MidFitCo', 'LowFitCo', 'UnscoredCo']);
        expect(screen.getByText('↓ Highest')).toBeInTheDocument();

        // Toggle to Asc (Lowest first): 45, 75, 92, null (unscored still last)
        fireEvent.click(screen.getByText('↓ Highest'));
        expect(screen.getByText('↑ Lowest')).toBeInTheDocument();
        expect(getRowCompanies()).toEqual(['LowFitCo', 'MidFitCo', 'HighAiCo', 'UnscoredCo']);
    });
});
