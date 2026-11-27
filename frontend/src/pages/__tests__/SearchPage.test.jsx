import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearchPage from '../SearchPage';
import { useSearch } from '../../hooks/useSearch';
import { useRss } from '../../hooks/useRss';
import { useScrapedJobs } from '../../hooks/useScrapedJobs';
import { useContacts } from '../../hooks/useContacts';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmProvider';

vi.mock('../../hooks/useSearch', () => ({ useSearch: vi.fn() }));
vi.mock('../../hooks/useRss', () => ({ useRss: vi.fn() }));
vi.mock('../../hooks/useScrapedJobs', () => ({ useScrapedJobs: vi.fn() }));
vi.mock('../../hooks/useContacts', () => ({ useContacts: vi.fn() }));
vi.mock('../../hooks/useSettings', () => ({ useSettings: vi.fn() }));
vi.mock('../../components/ToastProvider', () => ({ useToast: vi.fn() }));
vi.mock('../../components/ConfirmProvider', () => ({ useConfirm: vi.fn() }));

const mockJobs = [
    { id: 1, title: 'Junior Full-Stack Developer', company: 'JFrog', url: 'https://join.jfrog.com/positions/1', seen: false, bookmarked: false, created_at: '2026-06-10T10:00:00Z' },
    { id: 2, title: 'Backend Engineer', company: 'Stripe', url: 'https://stripe.com/jobs/2', seen: true, bookmarked: true, created_at: '2026-06-12T10:00:00Z' },
    { id: 3, title: 'AI Engineer', company: 'JFrog', url: 'https://join.jfrog.com/positions/3', seen: false, bookmarked: false, created_at: '2026-06-08T10:00:00Z' },
];

const mockSites = [
    { id: 1, name: 'JFrog', url: 'https://join.jfrog.com/positions/', enabled: true },
    { id: 2, name: 'Stripe', url: 'https://stripe.com/jobs', enabled: false },
];

const mockContacts = [
    { id: 10, name: 'Maya Levi', company: 'JFrog', link: 'https://join.jfrog.com/positions/' },
    { id: 11, name: 'Tom Cohen', company: 'Wiz', link: 'https://www.wiz.io/careers' },
    { id: 12, name: 'Noa Tal', company: 'Wiz', link: 'https://www.wiz.io/careers' },
];

describe('SearchPage (Auto Search Overhaul)', () => {
    const mockAddSite = vi.fn().mockResolvedValue({});
    const mockToggleSite = vi.fn();
    const mockBulkRemoveJobs = vi.fn().mockResolvedValue({});
    const mockConfirm = vi.fn().mockResolvedValue(true);

    beforeEach(() => {
        vi.clearAllMocks();
        useSearch.mockReturnValue({
            loading: false,
            searchSettings: {
                id: 1,
                keywords: ['Full Stack', 'Backend'],
                excludeKeywords: ['Senior'],
                targetSites: mockSites,
                scheduleFrequency: 'daily',
                lastResults: [],
            },
            addTag: vi.fn(),
            removeTag: vi.fn(),
            addSite: mockAddSite,
            removeSite: vi.fn(),
            updateSite: vi.fn(),
            toggleSite: mockToggleSite,
            updateSettings: vi.fn(),
            clearResults: vi.fn(),
            runSearch: vi.fn().mockResolvedValue({ totalFound: 2, sitesScraped: 1 }),
            isSearching: false,
        });
        useRss.mockReturnValue({
            feeds: [],
            feedsLoading: false,
            addFeed: vi.fn(),
            toggleFeed: vi.fn(),
            deleteFeed: vi.fn(),
            updateFeed: vi.fn(),
        });
        useScrapedJobs.mockReturnValue({
            scrapedJobs: mockJobs,
            loading: false,
            toggleBookmark: vi.fn(),
            markAsSeen: vi.fn(),
            removeJob: vi.fn(),
            bulkRemoveJobs: mockBulkRemoveJobs,
            bulkMarkSeen: vi.fn(),
            bulkBookmark: vi.fn(),
            isBulkRemoving: false,
        });
        useContacts.mockReturnValue({ contacts: mockContacts });
        useSettings.mockReturnValue({ settings: { timezone: 'UTC' } });
        useToast.mockReturnValue({ addToast: vi.fn() });
        useConfirm.mockReturnValue(mockConfirm);
    });

    it('filters scraped job matches by company, sorts, selects all, and bulk removes', async () => {
        render(<SearchPage />);

        // Default view is Job Matches Queue: sorted by Date desc -> Stripe (Jun 12), JFrog Full-Stack (Jun 10), JFrog AI (Jun 08)
        const getTitles = () =>
            Array.from(document.querySelectorAll('.sp-job-card__title')).map(el => el.textContent.trim());

        expect(getTitles()).toEqual([
            'Backend Engineer',
            'Junior Full-Stack Developer',
            'AI Engineer',
        ]);

        // Sort by Title A-Z
        fireEvent.change(screen.getByLabelText('Sort scraped jobs'), { target: { value: 'title' } });
        expect(getTitles()).toEqual([
            'AI Engineer',
            'Backend Engineer',
            'Junior Full-Stack Developer',
        ]);

        // Filter to JFrog only
        fireEvent.change(screen.getByLabelText('Filter by company'), { target: { value: 'JFrog' } });
        expect(getTitles()).toEqual(['AI Engineer', 'Junior Full-Stack Developer']);

        // Select All visible (2 JFrog jobs) and bulk remove
        fireEvent.click(screen.getByLabelText(/Select all \(2\)/i));
        fireEvent.click(screen.getByText(/Remove Selected \(2\)/i));

        await waitFor(() => {
            expect(mockConfirm).toHaveBeenCalled();
            expect(mockBulkRemoveJobs).toHaveBeenCalledWith([3, 1]);
        });
    });

    it('shows Network careers suggestions excluding already-added sites and adds on click', async () => {
        render(<SearchPage />);

        // Switch to Sources & Keywords tab
        fireEvent.click(screen.getByRole('tab', { name: /Sources & Keywords/i }));

        // JFrog is already in targetSites so only Wiz (1 available) should be suggested
        const toggleBtn = screen.getByRole('button', { name: /Suggested from Your Network/i });
        expect(toggleBtn).toHaveTextContent('1 available');

        fireEvent.click(toggleBtn);
        expect(screen.getByText('Wiz')).toBeInTheDocument();
        expect(screen.getByText('👤 Tom Cohen, Noa Tal')).toBeInTheDocument();

        // Click + Add for Wiz
        const suggestionItem = screen.getByText('Wiz').closest('.sp-network-suggestions__item');
        fireEvent.click(suggestionItem.querySelector('button'));

        await waitFor(() => {
            expect(mockAddSite).toHaveBeenCalledWith('Wiz', 'https://www.wiz.io/careers');
        });
    });

    it('preserves static Target Sites order when toggling a site', () => {
        render(<SearchPage />);
        fireEvent.click(screen.getByRole('tab', { name: /Sources & Keywords/i }));

        const siteNames = () =>
            Array.from(document.querySelectorAll('.sites-list .site-item strong')).map(el => el.textContent);

        expect(siteNames()).toEqual(['JFrog', 'Stripe']);
        fireEvent.click(screen.getByLabelText('Toggle JFrog'));
        expect(mockToggleSite).toHaveBeenCalledWith(1);
        expect(siteNames()).toEqual(['JFrog', 'Stripe']);
    });
});
