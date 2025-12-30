export type Position = 
  | 'GRAFIK' 
  | 'FREZOWANIE' 
  | 'LASER' 
  | 'POLEROWANIE' 
  | 'WYGINANIE' 
  | 'KLEJENIE' 
  | 'DRUKOWANIE' 
  | 'OKLEJANIE' 
  | 'PAKOWANIE' 
  | 'WYSYŁKA' 
  | 'HANDLOWIEC' 
  | 'INNE';

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

// Nowy system ról:
// ADMIN - właściciel, pełne uprawnienia (może być też grafikiem)
// GRAFIK - przygotowuje pliki produkcyjne
// HANDLOWIEC - zakłada zlecenia, obserwuje etapy
// KIEROWNIK - zarządza zleceniami, przypisuje pracowników
// PRACOWNIK - wykonuje zadania produkcyjne (NIE widzi cen)
export type UserRole = 'ADMIN' | 'GRAFIK' | 'HANDLOWIEC' | 'KIEROWNIK' | 'PRACOWNIK';

export type OrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export const PRIORITY_LABELS: Record<OrderPriority, string> = {
  'LOW': 'Niski',
  'NORMAL': 'Normalny',
  'HIGH': 'Wysoki',
  'URGENT': 'Pilny',
};

export const PRIORITY_COLORS: Record<OrderPriority, string> = {
  'LOW': 'text-gray-500',
  'NORMAL': 'text-blue-600',
  'HIGH': 'text-orange-500',
  'URGENT': 'text-red-600',
};

// Mapowanie starych ról (dla kompatybilności)
export const ROLE_LABELS: Record<UserRole, string> = {
  'ADMIN': 'Administrator',
  'GRAFIK': 'Grafik',
  'HANDLOWIEC': 'Handlowiec',
  'KIEROWNIK': 'Kierownik',
  'PRACOWNIK': 'Pracownik',
};

// Role które mogą widzieć ceny
export const ROLES_WITH_PRICE_ACCESS: UserRole[] = ['ADMIN', 'KIEROWNIK', 'HANDLOWIEC'];

export interface Worker {
  id: number;
  name: string;
  email: string;
  pin?: string;  // 4-6 cyfrowy PIN do logowania
  position: Position;
  hourly_rate?: number;  // opcjonalne - PRACOWNIK nie widzi
  role: UserRole;
  skills: string[];  // umiejętności: etapy które pracownik może wykonywać
  active: boolean;
}

export interface Order {
  id: number;
  order_number: string;
  client_order_number?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_postal?: string;
  client_city?: string;
  product_name: string;
  quantity: number;
  price_total?: number;
  price_per_unit?: number;
  status: 'NOWE' | 'W_TRAKCIE' | 'GOTOWE';
  priority: OrderPriority;
  planned_completion_date: string;
  notes?: string;
  folder_path?: string;
  invoice_number?: string;
  invoice_date?: string;
  shipment_number?: string;
  shipment_status?: 'OCZEKUJE' | 'ZAMÓWIONA' | 'W_DRODZE' | 'DOSTARCZONO';
  shipment_tracking_url?: string;
  created_by?: string;
  created_at?: string;
  archived?: boolean;
  stages?: OrderStage[];
  currentStage?: string;
  comments?: OrderComment[];
  history?: OrderHistory[];
  attachments?: OrderAttachment[];
}

export type StageCategory = 'preparation' | 'production' | 'administrative';

export interface Stage {
  id: number;
  name: string;
  category: StageCategory;
  description?: string;
}

export interface OrderStage {
  stageId: number;
  stageName: string;
  assignedWorkers: number[];
  status: StageStatus;
}

export interface TimeEntry {
  id: string;
  orderId: number;
  stageId: number;
  stageName: string;
  workerId: number;
  workerName: string;
  hourlyRate: number;
  startTime: string | null;
  endTime: string | null;
  totalSeconds: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface OrderComment {
  id: string;
  orderId: number;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
  type: 'comment' | 'system'; // system for automatic notes like status changes
}

export interface OrderAttachment {
  id: string;
  orderId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface OrderHistory {
  id: string;
  orderId: number;
  userId: number;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  position?: Position;
  skills?: string[];
  hourly_rate?: number;  // tylko dla non-PRACOWNIK
}

export interface Machine {
  id: number;
  name: string;
  department: Position;
  hourly_rate: number;
  status: 'available' | 'in_use' | 'maintenance' | 'offline';
  description?: string;
}

export interface WorkSession {
  id: string;
  workerId: number;
  orderId: number;
  stageId: number;
  machineId?: number;  // Powiązanie z maszyną (dla OEE)
  date: string;
  startTime: string;
  endTime: string | null;
  breaks: { start: string; end: string | null }[];
  quantityDone: number;       // Ilość wyprodukowanych sztuk
  quantityDefective: number;  // Ilość wadliwych sztuk (dla OEE Quality)
  status: 'active' | 'paused' | 'completed';
  notes?: string;
}

// OEE (Overall Equipment Effectiveness) types
export interface OEEData {
  machineId: number;
  machineName: string;
  department: string;
  availability: number;    // % (Running Time / Planned Time)
  performance: number;     // % (Actual Output / Theoretical Output)
  quality: number;         // % (Good Units / Total Units)
  oee: number;             // % (Availability × Performance × Quality)
  runningMinutes: number;
  plannedMinutes: number;
  producedQuantity: number;
  defectiveQuantity: number;
}
