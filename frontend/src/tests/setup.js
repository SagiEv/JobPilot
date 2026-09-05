import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import '@testing-library/jest-dom';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

export const restHandlers = [
  http.get(`${API_URL}/api/applications`, () => {
    return HttpResponse.json([
        { id: 1, company: 'Google', role_id: 'Frontend', status: 'Applied', date: '2023-01-01' }
    ])
  }),
  http.post(`${API_URL}/api/applications`, async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json({ id: 2, ...data })
  })
]

export const server = setupServer(...restHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())
