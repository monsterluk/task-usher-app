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

export interface Worker {
  id: number;
  name: string;
  email: string;
  position: Position;
  hourly_rate: number;
  role: 'manager' | 'worker';
  active: boolean;
}

export interface Order {
  id: number;
  order_number: string;
  client_order_number?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
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
}

export interface Stage {
  id: number;
  name: string;
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

export interface User {
  id: number;
  name: string;
  role: 'manager' | 'worker';
  email: string;
}
