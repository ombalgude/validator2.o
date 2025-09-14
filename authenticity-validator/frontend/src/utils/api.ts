const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Certificate endpoints
  async uploadCertificate(formData: FormData) {
    const token = this.token;
    const response = await fetch(`${this.baseURL}/certificates/verify`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getCertificates(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/certificates${queryString}`);
  }

  async getCertificate(id: string) {
    return this.request(`/certificates/${id}`);
  }

  async updateCertificateStatus(id: string, status: string, verificationResults?: any) {
    return this.request(`/certificates/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ status, verificationResults }),
    });
  }

  async bulkUploadCertificates(formData: FormData) {
    const token = this.token;
    const response = await fetch(`${this.baseURL}/certificates/bulk`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Institution endpoints
  async getInstitutions(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/institutions${queryString}`);
  }

  async getInstitution(id: string) {
    return this.request(`/institutions/${id}`);
  }

  async createInstitution(institutionData: any) {
    return this.request('/institutions', {
      method: 'POST',
      body: JSON.stringify(institutionData),
    });
  }

  async updateInstitution(id: string, institutionData: any) {
    return this.request(`/institutions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(institutionData),
    });
  }

  async deleteInstitution(id: string) {
    return this.request(`/institutions/${id}`, {
      method: 'DELETE',
    });
  }

  async verifyInstitution(id: string, isVerified: boolean) {
    return this.request(`/institutions/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ isVerified }),
    });
  }

  // Dashboard endpoints
  async getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  async getDashboardTrends(period?: string) {
    const queryString = period ? `?period=${period}` : '';
    return this.request(`/dashboard/trends${queryString}`);
  }

  async getDashboardAlerts() {
    return this.request('/dashboard/alerts');
  }

  // AI Service endpoints
  async extractText(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${AI_API_URL}/ai/ocr/extract`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async detectTampering(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${AI_API_URL}/ai/verify/tampering`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async matchTemplate(file: File, templateId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (templateId) {
      formData.append('template_id', templateId);
    }

    const response = await fetch(`${AI_API_URL}/ai/verify/template`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async detectAnomalies(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${AI_API_URL}/ai/analyze/anomaly`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async completeVerification(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${AI_API_URL}/ai/verify/complete`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

// Create API client instances
export const apiClient = new ApiClient(API_BASE_URL);
export const aiClient = new ApiClient(AI_API_URL);

// Export individual methods for convenience
export const authApi = {
  login: (email: string, password: string) => apiClient.login(email, password),
  register: (userData: any) => apiClient.register(userData),
  getCurrentUser: () => apiClient.getCurrentUser(),
};

export const certificateApi = {
  upload: (formData: FormData) => apiClient.uploadCertificate(formData),
  getAll: (params?: any) => apiClient.getCertificates(params),
  getById: (id: string) => apiClient.getCertificate(id),
  updateStatus: (id: string, status: string, verificationResults?: any) => 
    apiClient.updateCertificateStatus(id, status, verificationResults),
  bulkUpload: (formData: FormData) => apiClient.bulkUploadCertificates(formData),
};

export const institutionApi = {
  getAll: (params?: any) => apiClient.getInstitutions(params),
  getById: (id: string) => apiClient.getInstitution(id),
  create: (institutionData: any) => apiClient.createInstitution(institutionData),
  update: (id: string, institutionData: any) => apiClient.updateInstitution(id, institutionData),
  delete: (id: string) => apiClient.deleteInstitution(id),
  verify: (id: string, isVerified: boolean) => apiClient.verifyInstitution(id, isVerified),
};

export const dashboardApi = {
  getStats: () => apiClient.getDashboardStats(),
  getTrends: (period?: string) => apiClient.getDashboardTrends(period),
  getAlerts: () => apiClient.getDashboardAlerts(),
};

export const aiApi = {
  extractText: (file: File) => apiClient.extractText(file),
  detectTampering: (file: File) => apiClient.detectTampering(file),
  matchTemplate: (file: File, templateId?: string) => apiClient.matchTemplate(file, templateId),
  detectAnomalies: (file: File) => apiClient.detectAnomalies(file),
  completeVerification: (file: File) => apiClient.completeVerification(file),
};
