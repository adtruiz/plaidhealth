/**
 * PlaidHealth API Client
 * Handles all communication with the backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('plaidhealth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('plaidhealth_token', token);
      } else {
        localStorage.removeItem('plaidhealth_token');
      }
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || 'Request failed',
          code: data.code || 'UNKNOWN_ERROR',
        };
      }

      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR',
      };
    }
  }

  // ============== AUTH ==============

  async register(email: string, password: string, name: string, company?: string) {
    return this.request<{
      user: { id: string; email: string; name: string; company?: string };
      token: string;
      expiresIn: number;
    }>('/api/v1/developer/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, company }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{
      user: { id: string; email: string; name: string; company?: string };
      token: string;
      expiresIn: number;
    }>('/api/v1/developer/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    const result = await this.request('/api/v1/developer/logout', {
      method: 'POST',
    });
    this.setToken(null);
    return result;
  }

  async getProfile() {
    return this.request<{
      id: string;
      email: string;
      name: string;
      company?: string;
      createdAt: string;
      lastLogin: string;
    }>('/api/v1/developer/me');
  }

  // ============== API KEYS ==============

  async listKeys() {
    return this.request<{
      keys: Array<{
        id: string;
        name: string;
        keyPrefix: string;
        scopes: string[];
        createdAt: string;
        lastUsedAt: string | null;
        expiresAt: string | null;
        revokedAt: string | null;
        requestCount: number;
        status: 'active' | 'revoked';
      }>;
    }>('/api/v1/developer/keys');
  }

  async createKey(name: string, scopes: string[] = ['read'], environment: 'sandbox' | 'production' = 'sandbox') {
    return this.request<{
      id: string;
      name: string;
      key: string;
      keyPrefix: string;
      scopes: string[];
      environment: string;
      createdAt: string;
      message: string;
    }>('/api/v1/developer/keys', {
      method: 'POST',
      body: JSON.stringify({ name, scopes, environment }),
    });
  }

  async revokeKey(keyId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/api/v1/developer/keys/${keyId}/revoke`,
      { method: 'POST' }
    );
  }

  async deleteKey(keyId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/api/v1/developer/keys/${keyId}`,
      { method: 'DELETE' }
    );
  }

  // ============== USAGE ==============

  async getUsage(period: '7d' | '30d' | '90d' = '30d') {
    return this.request<{
      summary: {
        totalRequests: number;
        activeKeys: number;
        totalKeys: number;
        period: string;
      };
      dailyUsage: Array<{
        date: string;
        requests: number;
        errors: number;
      }>;
      byKey: Array<{
        id: string;
        name: string;
        requestCount: number;
        lastUsedAt: string | null;
      }>;
    }>(`/api/v1/developer/usage?period=${period}`);
  }
}

export const api = new ApiClient();
export default api;
