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

export type UserRole = 'admin' | 'manager' | 'worker';

export interface Worker {
  id: number;
  name: string;
  email: string;
  position: Position;
  hourly_rate: number;
  role: UserRole;
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
  role: UserRole;
  email: string;
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
  date: string;
  startTime: string;
  endTime: string | null;
  breaks: { start: string; end: string | null }[];
  quantityDone: number;
  status: 'active' | 'paused' | 'completed';
  notes?: string;
}
