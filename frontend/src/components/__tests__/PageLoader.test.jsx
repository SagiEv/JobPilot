import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PageLoader from '../PageLoader';

describe('PageLoader Component', () => {
    it('renders with default label', () => {
        render(<PageLoader />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
        expect(screen.getByLabelText('Loading…')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
        const customLabel = 'Fetching data...';
        render(<PageLoader label={customLabel} />);
        expect(screen.getByText(customLabel)).toBeInTheDocument();
        expect(screen.getByLabelText(customLabel)).toBeInTheDocument();
    });
});
