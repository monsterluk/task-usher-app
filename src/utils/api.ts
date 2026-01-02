import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

// Sprawdź czy jesteśmy w trybie demo (bez backendu)
// UWAGA: Domyślnie próbujemy połączyć z API, demo tylko gdy jawnie włączony
export const isDemoMode = () => {
  // Wymuś tryb API (production)
  if (import.meta.env.VITE_FORCE_API === 'true') {
    return false;
  }

  // Wymuś tryb demo
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    return true;
  }

  // Lovable preview i webcontainer - zawsze demo
  const hostname = window.location.hostname;
  if (hostname.includes('lovable') ||
      hostname.includes('lovableproject') ||
      hostname.includes('webcontainer')) {
    return true;
  }

  // Localhost i 127.0.0.1 - próbuj API (nie blokuj!)
  // API samo wykryje czy jest dostępne
  return false;
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
      // Tylko wyloguj jeśli był token (czyli użytkownik był zalogowany przez API)
      // Nie wylogowuj w trybie demo/fallback gdzie nie ma tokena
      const token = localStorage.getItem('plexisystem_token');
      if (token) {
        // Token wygasł - wyloguj użytkownika
        localStorage.removeItem('plexisystem_token');
        localStorage.removeItem('plexisystem_user');
        window.location.href = '/';
      }
      // Bez tokena - to normalne w trybie demo, nie przekierowuj
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
    folder_path: string;
    priority: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    product_name: string;
    quantity: number;
    price_total: number;
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

// Order Items API (pozycje zlecenia)
export const orderItemsApi = {
  getOrderItems: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/orders/${orderId}/items`);
    return response.data;
  },
  create: async (orderId: number, data: {
    product_name: string;
    description?: string;
    quantity?: number;
    unit?: string;
    price_per_unit?: number;
    notes?: string;
  }) => {
    checkDemoMode();
    const response = await api.post(`/api/orders/${orderId}/items`, data);
    return response.data;
  },
  update: async (id: number, data: Partial<{
    product_name: string;
    description: string;
    quantity: number;
    unit: string;
    price_per_unit: number;
    status: string;
    notes: string;
  }>) => {
    checkDemoMode();
    const response = await api.put(`/api/order-items/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/order-items/${id}`);
    return response.data;
  },
  getStages: async (itemId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/order-items/${itemId}/stages`);
    return response.data;
  },
  addStages: async (itemId: number, stages: string[]) => {
    checkDemoMode();
    const response = await api.post(`/api/order-items/${itemId}/stages`, { stages });
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
  stop: async (id: number, completeAssignment = false) => {
    checkDemoMode();
    const response = await api.post(`/api/assignments/${id}/stop`, { complete_assignment: completeAssignment });
    return response.data;
  },
  getSessions: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/assignments/${id}/sessions`);
    return response.data;
  },
};

// Work Sessions API
export const workSessionsApi = {
  getWorkerActiveSession: async (workerId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/workers/${workerId}/active-session`);
    return response.data;
  },
  update: async (id: number, data: { start_time?: string; end_time?: string; duration_minutes?: number }) => {
    checkDemoMode();
    const response = await api.put(`/api/work-sessions/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/work-sessions/${id}`);
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
    dimensions?: string;
    package_type?: string;
    service?: string;
    recipient_name: string;
    recipient_street: string;
    recipient_building_number?: string;
    recipient_apartment_number?: string;
    recipient_postal_code: string;
    recipient_city: string;
    recipient_phone: string;
    recipient_email?: string;
    recipient_address?: string; // Legacy - combined address
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

// Attachments API
export const attachmentsApi = {
  getOrderAttachments: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/orders/${orderId}/attachments`);
    return response.data;
  },
  upload: async (orderId: number, file: File) => {
    checkDemoMode();
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/api/orders/${orderId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  delete: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/attachments/${id}`);
    return response.data;
  },
  download: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/attachments/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Comments API
export const commentsApi = {
  getOrderComments: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/orders/${orderId}/comments`);
    return response.data;
  },
  create: async (orderId: number, content: string) => {
    checkDemoMode();
    const response = await api.post(`/api/orders/${orderId}/comments`, { content });
    return response.data;
  },
  getRecent: async (limit: number = 10) => {
    checkDemoMode();
    const response = await api.get('/api/comments/recent', { params: { limit } });
    return response.data;
  },
};

// Announcements API (tablica ogłoszeń)
export const announcementsApi = {
  getAll: async (limit: number = 20) => {
    checkDemoMode();
    const response = await api.get('/api/announcements', { params: { limit } });
    return response.data;
  },
  create: async (data: { title: string; content: string; priority?: string; is_pinned?: boolean }) => {
    checkDemoMode();
    const response = await api.post('/api/announcements', data);
    return response.data;
  },
  delete: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/announcements/${id}`);
    return response.data;
  },
};

// Stage Templates API
export const stageTemplatesApi = {
  getAll: async () => {
    checkDemoMode();
    const response = await api.get('/api/stage-templates');
    return response.data;
  },
  create: async (data: { name: string; color: string; sequence_order: number }) => {
    checkDemoMode();
    const response = await api.post('/api/stage-templates', data);
    return response.data;
  },
  update: async (id: number, data: { name?: string; color?: string; sequence_order?: number }) => {
    checkDemoMode();
    const response = await api.put(`/api/stage-templates/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/stage-templates/${id}`);
    return response.data;
  },
};

// Settings API
export const settingsApi = {
  get: async () => {
    checkDemoMode();
    const response = await api.get('/api/settings');
    return response.data;
  },
  update: async (data: {
    company_name?: string;
    company_nip?: string;
    default_worker_rate?: number;
    default_machine_rate?: number;
    company_address?: string;
    company_email?: string;
    company_phone?: string;
  }) => {
    checkDemoMode();
    const response = await api.put('/api/settings', data);
    return response.data;
  },
  init: async () => {
    checkDemoMode();
    const response = await api.post('/api/settings/init');
    return response.data;
  },
};

// Machines API
export const machinesApi = {
  getAll: async (filters?: { active?: boolean; status?: string; department?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.active !== undefined) params.append('active', String(filters.active));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.department) params.append('department', filters.department);
    const response = await api.get(`/api/machines?${params.toString()}`);
    return response.data;
  },
  getById: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/machines/${id}`);
    return response.data;
  },
  create: async (data: {
    name: string;
    cost_per_hour?: number;
    description?: string;
    department?: string;
    status?: string;
    active?: boolean;
    specifications?: Record<string, any>;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/machines', data);
    return response.data;
  },
  update: async (id: number, data: Partial<{
    name: string;
    cost_per_hour: number;
    description: string;
    department: string;
    status: string;
    active: boolean;
    specifications: Record<string, any>;
  }>) => {
    checkDemoMode();
    const response = await api.put(`/api/machines/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/machines/${id}`);
    return response.data;
  },
  updateStatus: async (id: number, status: 'available' | 'in_use' | 'maintenance' | 'offline') => {
    checkDemoMode();
    const response = await api.put(`/api/machines/${id}/status`, { status });
    return response.data;
  },
};

// Quality Control API
export const qualityApi = {
  // Checkpoints (templates)
  getCheckpoints: async (filters?: { active?: boolean; category?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.active !== undefined) params.append('active', String(filters.active));
    if (filters?.category) params.append('category', filters.category);
    const response = await api.get(`/api/quality/checkpoints?${params.toString()}`);
    return response.data;
  },
  createCheckpoint: async (data: {
    name: string;
    description?: string;
    category?: string;
    measurement_type?: 'boolean' | 'numeric' | 'text' | 'select';
    min_value?: number;
    max_value?: number;
    unit?: string;
    options?: string[];
    is_critical?: boolean;
    sequence_order?: number;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/quality/checkpoints', data);
    return response.data;
  },
  updateCheckpoint: async (id: number, data: Partial<{
    name: string;
    description: string;
    category: string;
    measurement_type: string;
    min_value: number;
    max_value: number;
    unit: string;
    options: string[];
    is_critical: boolean;
    sequence_order: number;
    active: boolean;
  }>) => {
    checkDemoMode();
    const response = await api.put(`/api/quality/checkpoints/${id}`, data);
    return response.data;
  },
  deleteCheckpoint: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/quality/checkpoints/${id}`);
    return response.data;
  },

  // Quality checks
  getChecks: async (filters?: { order_id?: number; status?: string; check_type?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.order_id) params.append('order_id', String(filters.order_id));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.check_type) params.append('check_type', filters.check_type);
    const response = await api.get(`/api/quality/checks?${params.toString()}`);
    return response.data;
  },
  getOrderChecks: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/orders/${orderId}/quality-checks`);
    return response.data;
  },
  createCheck: async (orderId: number, data: {
    stage_id?: number;
    checkpoint_id?: number;
    check_type?: 'incoming' | 'in_process' | 'final' | 'random';
    status?: 'pending' | 'passed' | 'failed' | 'conditional';
    measured_value?: string;
    is_within_tolerance?: boolean;
    notes?: string;
  }) => {
    checkDemoMode();
    const response = await api.post(`/api/orders/${orderId}/quality-checks`, data);
    return response.data;
  },
  updateCheck: async (id: number, data: Partial<{
    status: string;
    measured_value: string;
    is_within_tolerance: boolean;
    notes: string;
  }>) => {
    checkDemoMode();
    const response = await api.put(`/api/quality/checks/${id}`, data);
    return response.data;
  },

  // Defects
  getDefects: async (filters?: { order_id?: number; status?: string; severity?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.order_id) params.append('order_id', String(filters.order_id));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    const response = await api.get(`/api/quality/defects?${params.toString()}`);
    return response.data;
  },
  getOrderDefects: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/orders/${orderId}/defects`);
    return response.data;
  },
  createDefect: async (orderId: number, data: {
    quality_check_id?: number;
    stage_id?: number;
    defect_type: string;
    severity?: 'cosmetic' | 'minor' | 'major' | 'critical';
    description: string;
    quantity_affected?: number;
    cost_impact?: number;
    photos?: string[];
  }) => {
    checkDemoMode();
    const response = await api.post(`/api/orders/${orderId}/defects`, data);
    return response.data;
  },
  updateDefect: async (id: number, data: Partial<{
    status: string;
    root_cause: string;
    corrective_action: string;
    quantity_affected: number;
    cost_impact: number;
  }>) => {
    checkDemoMode();
    const response = await api.put(`/api/quality/defects/${id}`, data);
    return response.data;
  },

  // Stats
  getStats: async (filters?: { from_date?: string; to_date?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    const response = await api.get(`/api/quality/stats?${params.toString()}`);
    return response.data;
  },
};

// Notifications API
export const notificationsApi = {
  getAll: async (filters?: { unread_only?: boolean; category?: string; limit?: number }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.unread_only) params.append('unread_only', 'true');
    if (filters?.category) params.append('category', filters.category);
    if (filters?.limit) params.append('limit', String(filters.limit));
    const response = await api.get(`/api/notifications?${params.toString()}`);
    return response.data;
  },
  markAsRead: async (notificationIds?: number[], markAll?: boolean) => {
    checkDemoMode();
    const response = await api.post('/api/notifications/mark-read', {
      notification_ids: notificationIds,
      mark_all: markAll,
    });
    return response.data;
  },
  delete: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/notifications/${id}`);
    return response.data;
  },
  create: async (data: {
    user_id: number;
    type: string;
    title: string;
    message?: string;
    category?: string;
    priority?: string;
    link?: string;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/notifications', data);
    return response.data;
  },
  broadcast: async (data: {
    user_ids?: number[];
    role?: string;
    type: string;
    title: string;
    message?: string;
    category?: string;
    priority?: string;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/notifications/broadcast', data);
    return response.data;
  },
};

// Maintenance API
export const maintenanceApi = {
  // Schedules
  getSchedules: async (filters?: { machine_id?: number; status?: string; maintenance_type?: string; upcoming_days?: number }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.machine_id) params.append('machine_id', String(filters.machine_id));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.maintenance_type) params.append('maintenance_type', filters.maintenance_type);
    if (filters?.upcoming_days) params.append('upcoming_days', String(filters.upcoming_days));
    const response = await api.get(`/api/maintenance/schedules?${params.toString()}`);
    return response.data;
  },
  getScheduleById: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/maintenance/schedules/${id}`);
    return response.data;
  },
  createSchedule: async (data: {
    machine_id: number;
    title: string;
    maintenance_type?: 'preventive' | 'corrective' | 'predictive' | 'inspection';
    description?: string;
    frequency_days?: number;
    next_due_at?: string;
    estimated_duration_hours?: number;
    assigned_to?: number;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    checklist?: string[];
    notes?: string;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/maintenance/schedules', data);
    return response.data;
  },
  updateSchedule: async (id: number, data: Partial<{
    maintenance_type: string;
    title: string;
    description: string;
    frequency_days: number;
    next_due_at: string;
    estimated_duration_hours: number;
    assigned_to: number;
    priority: string;
    status: string;
    checklist: string[];
    notes: string;
  }>) => {
    checkDemoMode();
    const response = await api.put(`/api/maintenance/schedules/${id}`, data);
    return response.data;
  },
  deleteSchedule: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/maintenance/schedules/${id}`);
    return response.data;
  },
  startMaintenance: async (id: number) => {
    checkDemoMode();
    const response = await api.post(`/api/maintenance/schedules/${id}/start`);
    return response.data;
  },
  completeMaintenance: async (id: number, data: {
    duration_hours?: number;
    findings?: string;
    actions_taken?: string;
    parts_used?: string[];
    cost?: number;
  }) => {
    checkDemoMode();
    const response = await api.post(`/api/maintenance/schedules/${id}/complete`, data);
    return response.data;
  },
  // Logs
  getLogs: async (filters?: { machine_id?: number; limit?: number }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.machine_id) params.append('machine_id', String(filters.machine_id));
    if (filters?.limit) params.append('limit', String(filters.limit));
    const response = await api.get(`/api/maintenance/logs?${params.toString()}`);
    return response.data;
  },
  // Stats
  getStats: async (filters?: { from_date?: string; to_date?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    const response = await api.get(`/api/maintenance/stats?${params.toString()}`);
    return response.data;
  },
};

// Documents API
export const documentsApi = {
  // Get documents for an order
  getOrderDocuments: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/documents/orders/${orderId}`);
    return response.data;
  },
  // Get document by ID
  getById: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/documents/${id}`);
    return response.data;
  },
  // Upload document
  upload: async (data: {
    order_id: number;
    filename: string;
    original_name: string;
    mime_type?: string;
    file_size?: number;
    file_path: string;
    category: string;
    description?: string;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/documents', data);
    return response.data;
  },
  // Update document metadata
  update: async (id: number, data: { category?: string; description?: string }) => {
    checkDemoMode();
    const response = await api.put(`/api/documents/${id}`, data);
    return response.data;
  },
  // Delete document
  delete: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/documents/${id}`);
    return response.data;
  },
  // Get document versions
  getVersions: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/documents/${id}/versions`);
    return response.data;
  },
  // Upload new version
  uploadVersion: async (id: number, data: { filename: string; file_path: string; file_size?: number; change_notes?: string }) => {
    checkDemoMode();
    const response = await api.post(`/api/documents/${id}/versions`, data);
    return response.data;
  },
  // Get by category
  getByCategory: async (category: string) => {
    checkDemoMode();
    const response = await api.get(`/api/documents/category/${category}`);
    return response.data;
  },
  // Get statistics
  getStats: async () => {
    checkDemoMode();
    const response = await api.get('/api/documents/stats/overview');
    return response.data;
  },
};

// Cost Calculator API
export const costsApi = {
  // Get cost for specific order
  getOrderCost: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/costs/orders/${orderId}`);
    return response.data;
  },
  // Update material cost
  updateMaterialCost: async (orderId: number, materialCost: number) => {
    checkDemoMode();
    const response = await api.put(`/api/costs/orders/${orderId}/material`, { material_cost: materialCost });
    return response.data;
  },
  // Get cost summary report
  getSummary: async (filters?: { from_date?: string; to_date?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    const response = await api.get(`/api/costs/summary?${params.toString()}`);
    return response.data;
  },
  // Calculate quote
  calculateQuote: async (data: {
    product_type?: string;
    quantity: number;
    material_type: string;
    material_quantity: number;
    stages?: { type: string; estimated_hours: number }[];
  }) => {
    checkDemoMode();
    const response = await api.post('/api/costs/quote', data);
    return response.data;
  },
};

// Production Reports API
export const productionReportsApi = {
  // Get comprehensive report
  getReport: async (filters?: { from_date?: string; to_date?: string; department?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.department) params.append('department', filters.department);
    const response = await api.get(`/api/production-reports?${params.toString()}`);
    return response.data;
  },
  // Get comparison report
  getComparison: async (filters?: { from_date?: string; to_date?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    const response = await api.get(`/api/production-reports/comparison?${params.toString()}`);
    return response.data;
  },
  // Get export data
  getExportData: async (type: 'orders' | 'work_sessions' | 'quality', filters?: { from_date?: string; to_date?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    params.append('type', type);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    const response = await api.get(`/api/production-reports/export?${params.toString()}`);
    return response.data;
  },
};

// Capacity Planning API
export const capacityApi = {
  // Overview - zdolności produkcyjne per dział
  getOverview: async (filters?: { start_date?: string; end_date?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    const response = await api.get(`/api/capacity/overview?${params.toString()}`);
    return response.data;
  },
  // Forecast - prognoza obciążenia
  getForecast: async (days?: number) => {
    checkDemoMode();
    const params = days ? `?days=${days}` : '';
    const response = await api.get(`/api/capacity/forecast${params}`);
    return response.data;
  },
  // Bottlenecks - analiza wąskich gardeł
  getBottlenecks: async () => {
    checkDemoMode();
    const response = await api.get('/api/capacity/bottlenecks');
    return response.data;
  },
  // Worker availability - dostępność pracowników
  getWorkerAvailability: async (date?: string) => {
    checkDemoMode();
    const params = date ? `?date=${date}` : '';
    const response = await api.get(`/api/capacity/workers${params}`);
    return response.data;
  },
};

// Calendar API
export const calendarApi = {
  // Get calendar events
  getEvents: async (filters?: { start?: string; end?: string; types?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.start) params.append('start', filters.start);
    if (filters?.end) params.append('end', filters.end);
    if (filters?.types) params.append('types', filters.types);
    const response = await api.get(`/api/calendar/events?${params.toString()}`);
    return response.data;
  },
  // Create calendar event
  createEvent: async (data: {
    title: string;
    description?: string;
    start: string;
    end?: string;
    type?: string;
    orderId?: number;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/calendar/events', data);
    return response.data;
  },
  // Update calendar event
  updateEvent: async (id: number, data: { title?: string; description?: string; start?: string; end?: string }) => {
    checkDemoMode();
    const response = await api.put(`/api/calendar/events/${id}`, data);
    return response.data;
  },
  // Delete calendar event
  deleteEvent: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/calendar/events/${id}`);
    return response.data;
  },
  // Get production schedule
  getProductionSchedule: async (filters?: { start?: string; end?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.start) params.append('start', filters.start);
    if (filters?.end) params.append('end', filters.end);
    const response = await api.get(`/api/calendar/production-schedule?${params.toString()}`);
    return response.data;
  },
  // Get worker schedule
  getWorkerSchedule: async (workerId: number, filters?: { start?: string; end?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.start) params.append('start', filters.start);
    if (filters?.end) params.append('end', filters.end);
    const response = await api.get(`/api/calendar/workers/${workerId}/schedule?${params.toString()}`);
    return response.data;
  },
  // Sync with Google Calendar
  syncGoogle: async () => {
    checkDemoMode();
    const response = await api.post('/api/calendar/google/sync');
    return response.data;
  },
};

// Audit API
export const auditApi = {
  // Get recent audit logs
  getLogs: async (filters?: {
    table_name?: string;
    action?: string;
    user_id?: number;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.table_name) params.append('table_name', filters.table_name);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.user_id) params.append('user_id', String(filters.user_id));
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.limit) params.append('limit', String(filters.limit));
    const response = await api.get(`/api/audit?${params.toString()}`);
    return response.data;
  },
  // Get audit history for specific record
  getRecordHistory: async (tableName: string, recordId: number, limit?: number) => {
    checkDemoMode();
    const params = limit ? `?limit=${limit}` : '';
    const response = await api.get(`/api/audit/${tableName}/${recordId}${params}`);
    return response.data;
  },
};

// BOM (Bill of Materials) API
export const bomApi = {
  // Get BOM for order
  getOrderBom: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/orders/${orderId}/bom`);
    return response.data;
  },
  // Create BOM item
  createBomItem: async (orderId: number, data: {
    material_name: string;
    material_type?: string;
    quantity: number;
    unit: string;
    unit_price?: number;
    supplier?: string;
    notes?: string;
    material_id?: number | null; // Link to inventory material
  }) => {
    checkDemoMode();
    const response = await api.post(`/api/orders/${orderId}/bom`, data);
    return response.data;
  },
  // Update BOM item
  updateBomItem: async (id: number, data: Partial<{
    material_name: string;
    material_type: string;
    quantity: number;
    unit: string;
    unit_price: number;
    supplier: string;
    notes: string;
    is_consumed: boolean;
  }>) => {
    checkDemoMode();
    const response = await api.put(`/api/bom/${id}`, data);
    return response.data;
  },
  // Delete BOM item
  deleteBomItem: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/bom/${id}`);
    return response.data;
  },
  // Mark as consumed (simple - no inventory deduction)
  markConsumed: async (id: number) => {
    checkDemoMode();
    const response = await api.post(`/api/bom/${id}/consume`);
    return response.data;
  },
  // Issue from inventory (marks consumed + creates WZ transaction)
  issueBomItem: async (id: number, data?: {
    location_id?: number;
    notes?: string;
    quantity?: number;
  }) => {
    checkDemoMode();
    const response = await api.post(`/api/bom/order-bom-items/${id}/issue`, data || {});
    return response.data;
  },
  // Reserve inventory for BOM item
  reserveBomItem: async (id: number, data: {
    location_id: number;
    quantity?: number;
  }) => {
    checkDemoMode();
    const response = await api.post(`/api/bom/order-bom-items/${id}/reserve`, data);
    return response.data;
  },
};

// Traceability API
export const traceabilityApi = {
  // Get events for order
  getOrderEvents: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/orders/${orderId}/events`);
    return response.data;
  },
  // Get event details
  getEventById: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/traceability/events/${id}`);
    return response.data;
  },
  // Create event
  createEvent: async (orderId: number, data: {
    event_type: string;
    description?: string;
    metadata?: Record<string, any>;
  }) => {
    checkDemoMode();
    const response = await api.post(`/api/traceability/orders/${orderId}/events`, data);
    return response.data;
  },
  // Get timeline
  getTimeline: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/traceability/orders/${orderId}/timeline`);
    return response.data;
  },
};

// Integrations API
export const integrationsApi = {
  // Get all integrations
  getAll: async () => {
    checkDemoMode();
    const response = await api.get('/api/integrations');
    return response.data;
  },
  // Get single integration
  getByName: async (name: string) => {
    checkDemoMode();
    const response = await api.get(`/api/integrations/${name}`);
    return response.data;
  },
  // Update integration
  update: async (name: string, data: {
    is_enabled?: boolean;
    config?: Record<string, any>;
    credentials?: Record<string, any>;
  }) => {
    checkDemoMode();
    const response = await api.put(`/api/integrations/${name}`, data);
    return response.data;
  },
  // Test connection
  testConnection: async (name: string) => {
    checkDemoMode();
    const response = await api.post(`/api/integrations/${name}/test`);
    return response.data;
  },
  // Get logs
  getLogs: async (name: string, limit?: number) => {
    checkDemoMode();
    const params = limit ? `?limit=${limit}` : '';
    const response = await api.get(`/api/integrations/${name}/logs${params}`);
    return response.data;
  },
  // wFirma: Create invoice
  createWfirmaInvoice: async (orderId: number) => {
    checkDemoMode();
    const response = await api.post('/api/integrations/wfirma/create-invoice', { order_id: orderId });
    return response.data;
  },
  // wFirma: Get invoices
  getWfirmaInvoices: async (orderId?: number) => {
    checkDemoMode();
    const params = orderId ? `?order_id=${orderId}` : '';
    const response = await api.get(`/api/integrations/wfirma/invoices${params}`);
    return response.data;
  },
  // Apaczka: Create shipment
  createApaczkaShipment: async (shipmentId: number) => {
    checkDemoMode();
    const response = await api.post('/api/integrations/apaczka/create-shipment', { shipment_id: shipmentId });
    return response.data;
  },
  // Apaczka: Get services
  getApaczkaServices: async () => {
    checkDemoMode();
    const response = await api.get('/api/integrations/apaczka/services');
    return response.data;
  },
  // Get order invoices
  getOrderInvoices: async (orderId: number) => {
    checkDemoMode();
    const response = await api.get(`/api/orders/${orderId}/invoices`);
    return response.data;
  },
};

// Backups API
export const backupsApi = {
  // Get backup status
  getStatus: async () => {
    checkDemoMode();
    const response = await api.get('/api/admin/backup/status');
    return response.data;
  },
  // List backups
  list: async () => {
    checkDemoMode();
    const response = await api.get('/api/admin/backups');
    return response.data;
  },
  // Create backup
  create: async (description?: string) => {
    checkDemoMode();
    const response = await api.post('/api/admin/backup', { description });
    return response.data;
  },
  // Delete backup
  delete: async (filename: string) => {
    checkDemoMode();
    const response = await api.delete(`/api/admin/backups/${filename}`);
    return response.data;
  },
  // Restore backup
  restore: async (filename: string) => {
    checkDemoMode();
    const response = await api.post('/api/admin/restore', { filename });
    return response.data;
  },
};

// Inventory API
export const inventoryApi = {
  // Categories
  getCategories: async (active?: boolean) => {
    checkDemoMode();
    const params = active !== undefined ? `?active=${active}` : '';
    const response = await api.get(`/api/inventory/categories${params}`);
    return response.data;
  },
  createCategory: async (data: { name: string; description?: string; parent_id?: number }) => {
    checkDemoMode();
    const response = await api.post('/api/inventory/categories', data);
    return response.data;
  },

  // Materials
  getMaterials: async (filters?: { category_id?: number; active?: boolean; search?: string; low_stock?: boolean }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.category_id) params.append('category_id', String(filters.category_id));
    if (filters?.active !== undefined) params.append('active', String(filters.active));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.low_stock) params.append('low_stock', 'true');
    const response = await api.get(`/api/inventory/materials?${params.toString()}`);
    return response.data;
  },
  getMaterialById: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/inventory/materials/${id}`);
    return response.data;
  },
  createMaterial: async (data: {
    code: string;
    name: string;
    description?: string;
    unit: string;
    category_id?: number;
    thickness_mm?: number;
    width_mm?: number;
    height_mm?: number;
    color?: string;
    supplier?: string;
    supplier_code?: string;
    min_stock?: number;
    max_stock?: number;
    reorder_point?: number;
    unit_cost?: number;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/inventory/materials', data);
    return response.data;
  },
  updateMaterial: async (id: number, data: Partial<{
    name: string;
    description: string;
    unit: string;
    category_id: number;
    thickness_mm: number;
    width_mm: number;
    height_mm: number;
    color: string;
    supplier: string;
    supplier_code: string;
    min_stock: number;
    max_stock: number;
    reorder_point: number;
    unit_cost: number;
    is_active: boolean;
  }>) => {
    checkDemoMode();
    const response = await api.put(`/api/inventory/materials/${id}`, data);
    return response.data;
  },

  // Locations
  getLocations: async (filters?: { warehouse?: string; zone?: string; active?: boolean }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.warehouse) params.append('warehouse', filters.warehouse);
    if (filters?.zone) params.append('zone', filters.zone);
    if (filters?.active !== undefined) params.append('active', String(filters.active));
    const response = await api.get(`/api/inventory/locations?${params.toString()}`);
    return response.data;
  },
  createLocation: async (data: {
    code: string;
    name: string;
    warehouse?: string;
    zone?: string;
    aisle?: string;
    rack?: string;
    shelf?: string;
    bin?: string;
    capacity_max?: number;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/inventory/locations', data);
    return response.data;
  },

  // Stock
  getStock: async (filters?: { material_id?: number; location_id?: number; low_stock?: boolean }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.material_id) params.append('material_id', String(filters.material_id));
    if (filters?.location_id) params.append('location_id', String(filters.location_id));
    if (filters?.low_stock) params.append('low_stock', 'true');
    const response = await api.get(`/api/inventory/stock?${params.toString()}`);
    return response.data;
  },
  getStockSummary: async () => {
    checkDemoMode();
    const response = await api.get('/api/inventory/stock/summary');
    return response.data;
  },

  // Transactions
  getTransactions: async (filters?: {
    material_id?: number;
    type?: string;
    from_date?: string;
    to_date?: string;
    reference_id?: number;
    limit?: number;
    offset?: number;
  }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.material_id) params.append('material_id', String(filters.material_id));
    if (filters?.type) params.append('type', filters.type);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.reference_id) params.append('reference_id', String(filters.reference_id));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    const response = await api.get(`/api/inventory/transactions?${params.toString()}`);
    return response.data;
  },
  createReceiptPZ: async (data: {
    material_id: number;
    location_id?: number;
    quantity: number;
    unit_cost?: number;
    batch_number?: string;
    supplier?: string;
    supplier_document?: string;
    notes?: string;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/inventory/transactions/pz', data);
    return response.data;
  },
  createIssueWZ: async (data: {
    inventory_item_id: number;
    quantity: number;
    reference_type?: string;
    reference_id?: number;
    reference_number?: string;
    notes?: string;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/inventory/transactions/wz', data);
    return response.data;
  },

  // Reservations
  getReservations: async (filters?: { order_id?: number; status?: string }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.order_id) params.append('order_id', String(filters.order_id));
    if (filters?.status) params.append('status', filters.status);
    const response = await api.get(`/api/inventory/reservations?${params.toString()}`);
    return response.data;
  },
  createReservation: async (data: {
    order_id: number;
    inventory_item_id: number;
    quantity_reserved: number;
    order_bom_item_id?: number;
    notes?: string;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/inventory/reservations', data);
    return response.data;
  },
  issueReservation: async (id: number, data?: { quantity_to_issue?: number; notes?: string }) => {
    checkDemoMode();
    const response = await api.post(`/api/inventory/reservations/${id}/issue`, data || {});
    return response.data;
  },
  cancelReservation: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/inventory/reservations/${id}`);
    return response.data;
  },
};

// Time Tracking API (Rejestracja czasu pracy)
export const timeTrackingApi = {
  // Work Time Entries
  getEntries: async (filters?: {
    worker_id?: number;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.worker_id) params.append('worker_id', String(filters.worker_id));
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    const response = await api.get(`/api/time-tracking/entries?${params.toString()}`);
    return response.data;
  },
  getEntry: async (id: number) => {
    checkDemoMode();
    const response = await api.get(`/api/time-tracking/entries/${id}`);
    return response.data;
  },
  createEntry: async (data: {
    worker_id: number;
    entry_time: string;
    exit_time?: string;
    shift?: string;
    notes?: string;
    source?: string;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/time-tracking/entries', data);
    return response.data;
  },
  updateEntry: async (id: number, data: Partial<{
    entry_time: string;
    exit_time: string;
    shift: string;
    notes: string;
    break_minutes: number;
  }>) => {
    checkDemoMode();
    const response = await api.put(`/api/time-tracking/entries/${id}`, data);
    return response.data;
  },
  deleteEntry: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/time-tracking/entries/${id}`);
    return response.data;
  },
  // Quick clock in/out for current user
  clockIn: async () => {
    checkDemoMode();
    const response = await api.post('/api/time-tracking/clock-in');
    return response.data;
  },
  clockOut: async () => {
    checkDemoMode();
    const response = await api.post('/api/time-tracking/clock-out');
    return response.data;
  },

  // Days Off
  getDaysOff: async (filters?: {
    worker_id?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
    type?: string;
  }) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (filters?.worker_id) params.append('worker_id', String(filters.worker_id));
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    const response = await api.get(`/api/time-tracking/days-off?${params.toString()}`);
    return response.data;
  },
  createDayOff: async (data: {
    worker_id: number;
    start_date: string;
    end_date: string;
    type: string;
    notes?: string;
  }) => {
    checkDemoMode();
    const response = await api.post('/api/time-tracking/days-off', data);
    return response.data;
  },
  updateDayOff: async (id: number, data: Partial<{
    start_date: string;
    end_date: string;
    type: string;
    notes: string;
    status: string;
  }>) => {
    checkDemoMode();
    const response = await api.put(`/api/time-tracking/days-off/${id}`, data);
    return response.data;
  },
  approveDayOff: async (id: number, status: 'approved' | 'rejected') => {
    checkDemoMode();
    const response = await api.post(`/api/time-tracking/days-off/${id}/approve`, { status });
    return response.data;
  },
  deleteDayOff: async (id: number) => {
    checkDemoMode();
    const response = await api.delete(`/api/time-tracking/days-off/${id}`);
    return response.data;
  },

  // Reports
  getWorkerWorkCard: async (workerId: number, year?: number, month?: number) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    if (month) params.append('month', String(month));
    const response = await api.get(`/api/time-tracking/work-card/${workerId}?${params.toString()}`);
    return response.data;
  },
  getMonthlySummary: async (year?: number, month?: number) => {
    checkDemoMode();
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    if (month) params.append('month', String(month));
    const response = await api.get(`/api/time-tracking/monthly-summary?${params.toString()}`);
    return response.data;
  },

  // Settings
  getSettings: async () => {
    checkDemoMode();
    const response = await api.get('/api/time-tracking/settings');
    return response.data;
  },
  updateSetting: async (setting_key: string, setting_value: number) => {
    checkDemoMode();
    const response = await api.put('/api/time-tracking/settings', { setting_key, setting_value });
    return response.data;
  },
};

export default api;
