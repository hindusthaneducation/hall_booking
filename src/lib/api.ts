const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
// In production, we should avoid localhost default if possible, or ensure env var is set.
// For now, keeping fallback is safe for local dev, but ensuring VITE_API_BASE_URL is used.

interface RequestOptions extends RequestInit {
    token?: string;
}

class ApiClient {
    private getHeaders(token?: string): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // Prefer passed token, fallback to localStorage
        const authToken = token || localStorage.getItem('token');
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        return headers;
    }

    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<{ data: T | null; error: Error | null }> {
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers: {
                    ...this.getHeaders(options.token),
                    ...options.headers,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return { data, error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    }

    async get<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    async post<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async put<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async patch<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    }

    async delete<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

export const api = new ApiClient();
