import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },
  me: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// Workers API
export const workersApi = {
  getAll: async () => {
    const response = await api.get('/api/workers');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/workers/${id}`);
    return response.data;
  },
  create: async (data: {
    name: string;
    email: string;
    hourly_rate: number;
    position: string;
    role: string;
  }) => {
    const response = await api.post('/api/workers', data);
    return response.data;
  },
  update: async (id: number, data: Partial<{ name: string; email: string; hourly_rate: number; position: string; active: boolean }>) => {
    const response = await api.put(`/api/workers/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/workers/${id}`);
    return response.data;
  },
  getAssignments: async (id: number) => {
    const response = await api.get(`/api/workers/${id}/assignments`);
    return response.data;
  },
};

// Orders API
export const ordersApi = {
  getAll: async (params?: { status?: string; archived?: boolean; limit?: number; offset?: number }) => {
    const response = await api.get('/api/orders', { params });
    return response.data;
  },
  getById: async (id: number) => {
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
    const response = await api.post('/api/orders', data);
    return response.data;
  },
  update: async (id: number, data: Partial<{
    status: string;
    notes: string;
    archived: boolean;
    planned_completion_date: string;
  }>) => {
    const response = await api.put(`/api/orders/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/orders/${id}`);
    return response.data;
  },
  archive: async (id: number) => {
    const response = await api.post(`/api/orders/${id}/archive`);
    return response.data;
  },
  unarchive: async (id: number) => {
    const response = await api.post(`/api/orders/${id}/unarchive`);
    return response.data;
  },
};

// Stages API
export const stagesApi = {
  getOrderStages: async (orderId: number) => {
    const response = await api.get(`/api/orders/${orderId}/stages`);
    return response.data;
  },
  create: async (orderId: number, data: {
    stage_number: number;
    stage_name: string;
    is_required?: boolean;
    sequence_order: number;
  }) => {
    const response = await api.post(`/api/orders/${orderId}/stages`, data);
    return response.data;
  },
  update: async (id: number, data: Partial<{ status: string; is_required: boolean }>) => {
    const response = await api.put(`/api/stages/${id}`, data);
    return response.data;
  },
};

// Assignments API
export const assignmentsApi = {
  getById: async (id: number) => {
    const response = await api.get(`/api/assignments/${id}`);
    return response.data;
  },
  create: async (stageId: number, workerId: number) => {
    const response = await api.post(`/api/stages/${stageId}/assignments`, { worker_id: workerId });
    return response.data;
  },
  start: async (id: number) => {
    const response = await api.post(`/api/assignments/${id}/start`);
    return response.data;
  },
  stop: async (id: number) => {
    const response = await api.post(`/api/assignments/${id}/stop`);
    return response.data;
  },
};

// Shipments API
export const shipmentsApi = {
  getOrderShipments: async (orderId: number) => {
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
    const response = await api.post(`/api/orders/${orderId}/shipments`, data);
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/shipments/${id}`);
    return response.data;
  },
  refreshStatus: async (id: number) => {
    const response = await api.post(`/api/shipments/${id}/refresh-status`);
    return response.data;
  },
};

// Reports API
export const reportsApi = {
  getOrderReport: async (orderId: number) => {
    const response = await api.get(`/api/reports/order/${orderId}`);
    return response.data;
  },
  exportOrderReport: async (orderId: number, format: 'csv' | 'pdf' = 'csv') => {
    const response = await api.get(`/api/reports/export/${orderId}`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
  getWorkerReport: async (workerId: number) => {
    const response = await api.get(`/api/reports/worker/${workerId}`);
    return response.data;
  },
  getSummaryReport: async () => {
    const response = await api.get('/api/reports/summary');
    return response.data;
  },
};

export default api;
