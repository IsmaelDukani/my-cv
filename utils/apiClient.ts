import { useAuth } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const { getToken } = useAuth();
    const token = await getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

export const apiClient = {
    get: (endpoint: string) => fetchWithAuth(endpoint, { method: 'GET' }),
    post: (endpoint: string, data: any) =>
        fetchWithAuth(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    put: (endpoint: string, data: any) =>
        fetchWithAuth(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    delete: (endpoint: string) => fetchWithAuth(endpoint, { method: 'DELETE' }),
};
