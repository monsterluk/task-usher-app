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
  status: 'NOWE' | 'DO_PRODUKCJI' | 'W_TRAKCIE' | 'CZESCIOWO_GOTOWE' | 'GOTOWE' | 'DO_WYSYLKI' | 'WYSLANE' | 'ZAFAKTUROWANE' | 'ZAMKNIETE';
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

// ==================== TIME TRACKING TYPES ====================

export type WorkTimeShift = 'DZIEŃ' | 'NOC' | 'SOBOTA' | 'NIEDZIELĘ';
export type WorkTimeSource = 'manual' | 'pin' | 'card' | 'auto';

export type DayOffType =
  | 'URLOP_WYPOCZYNKOWY'
  | 'URLOP_NA_ZADANIE'
  | 'ZWOLNIENIE_LEKARSKIE'
  | 'URLOP_OKOLICZNOSCIOWY'
  | 'URLOP_BEZPLATNY'
  | 'URLOP_MACIERZYNSKI'
  | 'URLOP_RODZICIELSKI'
  | 'DELEGACJA'
  | 'SZKOLENIE'
  | 'INNE';

export type DayOffStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export const DAY_OFF_TYPE_LABELS: Record<DayOffType, string> = {
  'URLOP_WYPOCZYNKOWY': 'Urlop wypoczynkowy',
  'URLOP_NA_ZADANIE': 'Urlop na żądanie',
  'ZWOLNIENIE_LEKARSKIE': 'Zwolnienie lekarskie',
  'URLOP_OKOLICZNOSCIOWY': 'Urlop okolicznościowy',
  'URLOP_BEZPLATNY': 'Urlop bezpłatny',
  'URLOP_MACIERZYNSKI': 'Urlop macierzyński',
  'URLOP_RODZICIELSKI': 'Urlop rodzicielski',
  'DELEGACJA': 'Delegacja',
  'SZKOLENIE': 'Szkolenie',
  'INNE': 'Inne',
};

export const DAY_OFF_TYPE_COLORS: Record<DayOffType, string> = {
  'URLOP_WYPOCZYNKOWY': 'bg-green-500',
  'URLOP_NA_ZADANIE': 'bg-green-400',
  'ZWOLNIENIE_LEKARSKIE': 'bg-red-500',
  'URLOP_OKOLICZNOSCIOWY': 'bg-orange-500',
  'URLOP_BEZPLATNY': 'bg-gray-500',
  'URLOP_MACIERZYNSKI': 'bg-pink-500',
  'URLOP_RODZICIELSKI': 'bg-pink-400',
  'DELEGACJA': 'bg-blue-500',
  'SZKOLENIE': 'bg-purple-500',
  'INNE': 'bg-gray-400',
};

export interface WorkTimeEntry {
  id: number;
  worker_id: number;
  worker_name?: string;
  worker_position?: string;
  entry_time: string;
  exit_time: string | null;
  shift: WorkTimeShift;
  entry_time_smoothed: string | null;
  exit_time_smoothed: string | null;
  work_minutes: number | null;
  work_minutes_smoothed: number | null;
  overtime_minutes: number;
  break_minutes: number;
  notes: string | null;
  source: WorkTimeSource;
  created_by: number | null;
  created_by_name?: string;
  approved_by: number | null;
  approved_by_name?: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DayOff {
  id: number;
  worker_id: number;
  worker_name?: string;
  start_date: string;
  end_date: string;
  type: DayOffType;
  status: DayOffStatus;
  notes: string | null;
  requested_by: number;
  requested_by_name?: string;
  approved_by: number | null;
  approved_by_name?: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkerMonthlySummary {
  worker_id: number;
  worker_name: string;
  position: string;
  work_days: number;
  absence_days: number;
  total_work_minutes: number;
  total_work_minutes_smoothed: number;
  base_minutes_smoothed: number;
  overtime_minutes_smoothed: number;
}

export interface WorkerWorkCard {
  worker: {
    id: number;
    name: string;
    position: string;
  };
  year: number;
  month: number;
  entries: WorkTimeEntry[];
  daysOff: DayOff[];
  summary: {
    workDays: number;
    absenceDays: number;
    totalWorkMinutes: number;
    totalWorkMinutesSmoothed: number;
    baseMinutesSmoothed: number;
    overtimeMinutesSmoothed: number;
  };
}

export interface TimeSmoothingSetting {
  id: number;
  setting_key: string;
  setting_value: number;
  description: string;
  updated_by: number | null;
  updated_at: string;
}
