const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
// In production, we should avoid localhost default if possible, or ensure env var is set.
// For now, keeping fallback is safe for local dev, but ensuring VITE_API_BASE_URL is used.

interface RequestOptions extends RequestInit {
    token?: string;
}

class ApiClient {
    private getHeaders(token?: string, isFormData?: boolean): HeadersInit {
        const headers: HeadersInit = {};

        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        const authToken = token || localStorage.getItem('token');
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        return headers;
    }

    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<{ data: T | null; error: Error | null }> {
        try {
            const isFormData = options.body instanceof FormData;
            const headers = {
                ...this.getHeaders(options.token, isFormData),
                ...options.headers,
            };

            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers,
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
        const isFormData = body instanceof FormData;
        return this.request<T>(endpoint, {
            method: 'POST',
            body: isFormData ? body : JSON.stringify(body),
        });
    }

    async put<T>(endpoint: string, body: any) {
        const isFormData = body instanceof FormData;
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: isFormData ? body : JSON.stringify(body),
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
