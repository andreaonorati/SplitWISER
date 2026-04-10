const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('splitwiser_token', token);
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('splitwiser_token');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('splitwiser_token');
    }
    return this.token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Only set Content-Type for non-FormData bodies
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  // ── Auth ────────────────────────────────────────────────────────
  async register(data: { email: string; name: string; password: string }) {
    return this.request<{ user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<any>('/api/auth/me');
  }

  // ── Groups ──────────────────────────────────────────────────────
  async getGroups() {
    return this.request<any[]>('/api/groups');
  }

  async getGroup(id: string) {
    return this.request<any>(`/api/groups/${id}`);
  }

  async createGroup(data: { name: string; description?: string; currency?: string }) {
    return this.request<any>('/api/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGroup(id: string, data: { name: string; description?: string; currency?: string }) {
    return this.request<any>(`/api/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGroup(id: string) {
    return this.request<void>(`/api/groups/${id}`, { method: 'DELETE' });
  }

  async inviteToGroup(groupId: string, email: string) {
    return this.request<any>(`/api/groups/${groupId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async removeMemberFromGroup(groupId: string, memberUserId: string) {
    return this.request<any>(`/api/groups/${groupId}/members/${memberUserId}`, {
      method: 'DELETE',
    });
  }

  async acceptInvite(token: string) {
    return this.request<any>(`/api/groups/invite/${token}/accept`, {
      method: 'POST',
    });
  }

  // ── Expenses ────────────────────────────────────────────────────
  async getGroupExpenses(groupId: string) {
    return this.request<any[]>(`/api/expenses/group/${groupId}`);
  }

  async getExpense(id: string) {
    return this.request<any>(`/api/expenses/${id}`);
  }

  async createExpense(data: any) {
    return this.request<any>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpense(id: string, data: any) {
    return this.request<any>(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: string) {
    return this.request<void>(`/api/expenses/${id}`, { method: 'DELETE' });
  }

  // ── Settlements ─────────────────────────────────────────────────
  async getGroupBalances(groupId: string) {
    return this.request<any>(`/api/settlements/group/${groupId}/balances`);
  }

  async createSettlement(data: { groupId: string; toUserId: string; amount: number; note?: string }) {
    return this.request<any>('/api/settlements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmSettlement(id: string) {
    return this.request<any>(`/api/settlements/${id}/confirm`, {
      method: 'PUT',
    });
  }

  // ── Import / AI ─────────────────────────────────────────────────
  async uploadReceipt(file: File, groupId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', groupId);

    return this.request<any>('/api/import/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async parseText(text: string, groupId: string) {
    return this.request<any>('/api/import/text', {
      method: 'POST',
      body: JSON.stringify({ text, groupId }),
    });
  }

  // ── Profile ─────────────────────────────────────────────────────
  async updateProfile(data: { name?: string; avatarUrl?: string | null }) {
    return this.request<any>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.request<any>('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ── Export ──────────────────────────────────────────────────────
  async exportExpensesCsv(groupId: string): Promise<Blob> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/api/export/group/${groupId}/csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  }

  async exportSummaryCsv(groupId: string): Promise<Blob> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/api/export/group/${groupId}/summary`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  }

  // ── Activity ───────────────────────────────────────────────────
  async getActivity(groupId: string, limit = 50, offset = 0): Promise<any> {
    return this.request(`/api/activity/group/${groupId}?limit=${limit}&offset=${offset}`);
  }
}

export const api = new ApiClient();

// ── Download helper ─────────────────────────────────────────────────
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
