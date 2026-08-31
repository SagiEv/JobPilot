import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data fresh for 5 mins
      refetchOnWindowFocus: true,
      retry: 1
    },
  },
})

import { JobProvider } from './components/JobProvider';
import { ToastProvider } from './components/ToastProvider';
import { ConfirmProvider } from './components/ConfirmProvider';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <JobProvider>
              <App />
            </JobProvider>
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
