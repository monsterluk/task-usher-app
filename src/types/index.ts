export interface Worker {
  id: number;
  name: string;
  hourly_rate: number;
}

export interface Order {
  id: number;
  order_number: string;
  client_name: string;
  product_name: string;
  quantity: number;
  status: 'NOWE' | 'W_TRAKCIE' | 'GOTOWE';
  planned_completion_date: string;
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
  status: 'pending' | 'in_progress' | 'completed';
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
