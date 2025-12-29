import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://beata254.mikrus.xyz:20254';

// Sprawdź czy jesteśmy w trybie demo (bez backendu)
export const isDemoMode = () => {
  // Lovable preview, localhost lub gdy wymuszono tryb demo
  const hostname = window.location.hostname;
  return hostname.includes('lovable') ||
         hostname.includes('lovableproject') ||
         hostname.includes('webcontainer') ||
         hostname === 'localhost' ||
         hostname === '127.0.0.1' ||
         import.meta.env.VITE_DEMO_MODE === 'true';
};

// Błąd dla trybu demo - funkcje API zwrócą ten błąd
class DemoModeError extends Error {
  constructor() {
    super('Demo mode - no API calls');
    this.name = 'DemoModeError';
  }
}

// Helper: sprawdź tryb demo przed wywołaniem API
const checkDemoMode = () => {
  if (isDemoMode()) {
    throw new DemoModeError();
  }
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 sekund timeout - szybko przełącz na demo jeśli brak API
});

// Dodaj token do każdego żądania
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('plexisystem_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Obsługa błędów
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token wygasł - wyloguj użytkownika
      localStorage.removeItem('plexisystem_token');
      localStorage.removeItem('plexisystem_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    checkDemoMode();
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },
  // Logowanie PIN-em - główna metoda logowania
  loginWithPin: async (pin: string) => {
    checkDemoMode();
    const response = await api.post('/api/auth/pin', { pin });
    return response.data;
  },
  logout: async () => {
    checkDemoMode();
    const response = await api.post('/api/auth/logout');
    return response.data;
  },
  me: async () => {
    checkDemoMode();
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// Workers API
export const workersApi = {
  getAll: async () => {
    checkDemoMode();
    const response = await api.get('/api/workers');
    return response.data;
  },
  getById: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/workers/${id}`);
    return response.data;
  },
  create: async (data: {
    name: string;
    email: string;
    pin?: string;
    password?: string;
    hourly_rate?: number;
    position: string;
    role?: string;
    skills?: string[];
  }) => {
    checkDemoMode();
    const response = await api.post('/api/workers', data);
    return response.data;
  },
  update: async (id: number, data: Partial<{
    name: string;
    email: string;
    pin: string | null;
    password: string;
    hourly_rate: number;
    position: string;
    role: string;
    skills: string[];
    active: boolean;
  }>) => {
    checkDemoMode();
    const response = await api.put(`/api/workers/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/workers/${id}`);
    return response.data;
  },
  getAssignments: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/workers/${id}/assignments`);
    return response.data;
  },
};

// Orders API
export const ordersApi = {
  getAll: async (params?: { status?: string; archived?: boolean; limit?: number; offset?: number }) => {
    checkDemoMode();
    const response = await api.get('/api/orders', { params });
    return response.data;
  },
  getById: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/orders/${id}`);
    return response.data;
  },
  create: async (data: {
    order_number: string;
    client_order_number?: string;
    client_name: string;
    client_email?: string;
    client_phone?: string;
    product_name: string;
    quantity: number;
    price_total: number;
    price_per_unit?: number;
    planned_completion_date?: string;
    notes?: string;
    folder_path?: string;
    invoice_number?: string;
    invoice_date?: string;
    created_by?: string;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/orders', data);
    return response.data;
  },
  update: async (id: number, data: Partial<{
    status: string;
    notes: string;
    archived: boolean;
    planned_completion_date: string;
  }>) => {
    checkDemoMode();
    const response = await api.put(`/api/orders/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/orders/${id}`);
    return response.data;
  },
  archive: async (id: number) => {
    checkDemoMode();
    const response = await api.post(`/api/orders/${id}/archive`);
    return response.data;
  },
  unarchive: async (id: number) => {
    checkDemoMode();
    const response = await api.post(`/api/orders/${id}/unarchive`);
    return response.data;
  },
};

// Stages API
export const stagesApi = {
  getOrderStages: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/orders/${orderId}/stages`);
    return response.data;
  },
  create: async (orderId: number, data: {
    stage_number: number;
    stage_name: string;
    is_required?: boolean;
    sequence_order: number;
  }) => {
    checkDemoMode();
    const response = await api.post(`/api/orders/${orderId}/stages`, data);
    return response.data;
  },
  update: async (id: number, data: Partial<{ status: string; is_required: boolean }>) => {
    checkDemoMode();
    const response = await api.put(`/api/stages/${id}`, data);
    return response.data;
  },
};

// Assignments API
export const assignmentsApi = {
  getById: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/assignments/${id}`);
    return response.data;
  },
  create: async (stageId: number, workerId: number) => {
    checkDemoMode();
    const response = await api.post(`/api/stages/${stageId}/assignments`, { worker_id: workerId });
    return response.data;
  },
  start: async (id: number) => {
    checkDemoMode();
    const response = await api.post(`/api/assignments/${id}/start`);
    return response.data;
  },
  stop: async (id: number) => {
    checkDemoMode();
    const response = await api.post(`/api/assignments/${id}/stop`);
    return response.data;
  },
};

// Shipments API
export const shipmentsApi = {
  getOrderShipments: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/orders/${orderId}/shipments`);
    return response.data;
  },
  create: async (orderId: number, data: {
    weight: number;
    dimensions: string;
    package_type: string;
    service: string;
    recipient_address: string;
    recipient_email?: string;
    recipient_phone?: string;
  }) => {
    checkDemoMode();
    const response = await api.post(`/api/orders/${orderId}/shipments`, data);
    return response.data;
  },
  getById: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/shipments/${id}`);
    return response.data;
  },
  refreshStatus: async (id: number) => {
    checkDemoMode();
    const response = await api.post(`/api/shipments/${id}/refresh-status`);
    return response.data;
  },
};

// Reports API
export const reportsApi = {
  getOrderReport: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/reports/order/${orderId}`);
    return response.data;
  },
  exportOrderReport: async (orderId: number, format: 'csv' | 'pdf' = 'csv') => {
    checkDemoMode();
    const response = await api.get(`/api/reports/export/${orderId}`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
  getWorkerReport: async (workerId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/reports/worker/${workerId}`);
    return response.data;
  },
  getSummaryReport: async () => {
    checkDemoMode();
    const response = await api.get('/api/reports/summary');
    return response.data;
  },
};

export default api;
