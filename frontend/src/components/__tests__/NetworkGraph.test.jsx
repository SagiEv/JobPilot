import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import NetworkGraph from '../NetworkGraph';

describe('NetworkGraph', () => {
    beforeEach(() => {
        // Mock clientWidth/Height for D3 rendering in JSDOM
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 500 });
        Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 500 });
    });

    it('renders without crashing with empty contacts', () => {
        const { container } = render(<NetworkGraph contacts={[]} />);
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders with contacts and toggles view modes', () => {
        const contacts = [
            { id: '1', name: 'Alice', relation: 'Friend', company: 'Google', connected_by: 'Bob' },
            { id: '2', name: 'Bob', relation: 'Colleague', company: 'Meta', connected_by: null }
        ];

        render(<NetworkGraph contacts={contacts} />);
        
        // Initial mode should be contacts
        const contactsBtn = screen.getByText('Contacts');
        const companiesBtn = screen.getByText('Companies');
        
        expect(contactsBtn).toHaveClass('btn-primary');
        expect(companiesBtn).not.toHaveClass('btn-primary');
        
        // Switch to companies
        fireEvent.click(companiesBtn);
        
        expect(companiesBtn).toHaveClass('btn-primary');
        expect(contactsBtn).not.toHaveClass('btn-primary');
    });
});
