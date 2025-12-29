import { Request } from 'express';

// Position types
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

// Nowy system ról:
// ADMIN - właściciel, pełne uprawnienia (może być też grafikiem)
// GRAFIK - przygotowuje pliki produkcyjne
// HANDLOWIEC - zakłada zlecenia, obserwuje etapy
// KIEROWNIK - zarządza zleceniami, przypisuje pracowników
// PRACOWNIK - wykonuje zadania produkcyjne (NIE widzi cen)
export type Role = 'ADMIN' | 'GRAFIK' | 'HANDLOWIEC' | 'KIEROWNIK' | 'PRACOWNIK';

// Mapowanie starych ról do nowych (dla kompatybilności)
export const ROLE_MAPPING: Record<string, Role> = {
  'WORKER': 'PRACOWNIK',
  'MANAGER': 'KIEROWNIK',
};

export type OrderStatus = 'NOWE' | 'W_TRAKCIE' | 'GOTOWE';

export type StageStatus = 'NOWY' | 'W_TRAKCIE' | 'GOTOWY';

export type AssignmentStatus = 'NOWY' | 'W_TRAKCIE' | 'GOTOWY';

export type ShipmentStatus = 'OCZEKUJE' | 'ZAMÓWIONA' | 'W_DRODZE' | 'DOSTARCZONA';

// Database models
export interface Worker {
  id: number;
  name: string;
  email: string;
  pin?: string;  // 4-6 cyfrowy PIN do logowania
  password_hash?: string;  // opcjonalne hasło dla adminów
  hourly_rate: number;
  position: Position;
  role: Role;
  skills: string[];  // umiejętności: etapy które pracownik może wykonywać
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: number;
  order_number: string;
  client_order_number?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  product_name: string;
  quantity?: number;
  price_total?: number;
  price_per_unit?: number;
  status: OrderStatus;
  planned_completion_date?: Date;
  notes?: string;
  folder_path?: string;
  invoice_number?: string;
  invoice_date?: Date;
  created_by?: string;
  archived: boolean;
  created_at: Date;
  closed_at?: Date;
  updated_at: Date;
}

export interface Stage {
  id: number;
  order_id: number;
  stage_number: number;
  stage_name: string;
  is_required: boolean;
  status: StageStatus;
  sequence_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Assignment {
  id: number;
  stage_id: number;
  worker_id: number;
  status: AssignmentStatus;
  assigned_at: Date;
  completed_at?: Date;
  updated_at: Date;
}

export interface WorkSession {
  id: number;
  assignment_id: number;
  start_time: Date;
  end_time?: Date;
  duration_minutes?: number;
  cost?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Shipment {
  id: number;
  order_id: number;
  shipment_number?: string;
  status: ShipmentStatus;
  tracking_url?: string;
  weight?: number;
  dimensions?: string;
  package_type?: string;
  service?: string;
  recipient_address?: string;
  recipient_email?: string;
  recipient_phone?: string;
  apaczka_response?: any;
  created_at: Date;
  updated_at: Date;
}

// JWT Payload
export interface JwtPayload {
  id: number;
  email: string;
  role: Role;
}

// Extended Request with user
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Stage definition (constant)
export interface StageDefinition {
  id: number;
  name: string;
}

// Report types
export interface WorkerSessionReport {
  worker_name: string;
  total_time_minutes: number;
  hourly_rate: number;
  total_cost: number;
}

export interface StageReport {
  stage_name: string;
  assignments: WorkerSessionReport[];
  stage_total_cost: number;
}

export interface OrderReport {
  order: Order;
  stages: StageReport[];
  total_labor_cost: number;
}
