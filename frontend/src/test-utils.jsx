import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/ToastProvider';
import { ConfirmProvider } from './components/ConfirmProvider';
import { JobProvider } from './components/JobProvider';

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

export const renderWithProviders = (ui, options = {}) => {
    const testQueryClient = createTestQueryClient();

    const Wrapper = ({ children }) => {
        return (
            <QueryClientProvider client={testQueryClient}>
                <BrowserRouter>
                    <ToastProvider>
                        <ConfirmProvider>
                            <JobProvider>
                                {children}
                            </JobProvider>
                        </ConfirmProvider>
                    </ToastProvider>
                </BrowserRouter>
            </QueryClientProvider>
        );
    };

    return render(ui, { wrapper: Wrapper, ...options });
};

export * from '@testing-library/react';
