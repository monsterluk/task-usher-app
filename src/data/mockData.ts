import { Worker, Order, Stage } from '@/types';

export const workers: Worker[] = [
  { id: 1, name: "Katarzyna Treder", hourly_rate: 43.27 },
  { id: 2, name: "Nikola Treder", hourly_rate: 43.27 },
  { id: 3, name: "Monika Pyzdrowska", hourly_rate: 43.27 },
  { id: 4, name: "Millena Milewska", hourly_rate: 43.27 },
  { id: 5, name: "Małgorzata Czepczyńska", hourly_rate: 43.27 },
  { id: 6, name: "Łukasz Baranowski", hourly_rate: 52.88 },
  { id: 7, name: "Sławomir Sikorra", hourly_rate: 52.88 },
  { id: 8, name: "Daniel Treder", hourly_rate: 62.50 }
];

export const stages: Stage[] = [
  { id: 1, name: "HANDLOWIEC" },
  { id: 2, name: "GRAFIK" },
  { id: 3, name: "FREZOWANIE/LASER" },
  { id: 4, name: "POLEROWANIE" },
  { id: 5, name: "WYGINANIE" },
  { id: 6, name: "KLEJENIE" },
  { id: 7, name: "DRUKOWANIE" },
  { id: 8, name: "OKLEJANIE" },
  { id: 9, name: "PAKOWANIE" },
  { id: 10, name: "WYSYŁKA" },
  { id: 11, name: "FAKTURA" },
  { id: 12, name: "ZAMKNIĘCIE" }
];

export const initialOrders: Order[] = [
  {
    id: 1,
    order_number: "1415/2025",
    client_name: "TEAM POINT Sp. z o.o.",
    product_name: "Kieszonka A4 spacewall V2",
    quantity: 1000,
    status: "NOWE",
    planned_completion_date: "2026-01-15",
    stages: []
  },
  {
    id: 2,
    order_number: "1414/2025",
    client_name: "TEAM POINT Sp. z o.o.",
    product_name: "Kieszonka na ulotki V2",
    quantity: 2,
    status: "GOTOWE",
    planned_completion_date: "2025-12-22",
    stages: [
      { stageId: 1, stageName: "HANDLOWIEC", assignedWorkers: [1, 2], status: 'completed' },
      { stageId: 2, stageName: "GRAFIK", assignedWorkers: [3], status: 'completed' },
    ]
  },
  {
    id: 3,
    order_number: "1413/2025",
    client_name: "TEAM POINT Sp. z o.o.",
    product_name: "Kieszonka A4 spacewall V2",
    quantity: 4,
    status: "GOTOWE",
    planned_completion_date: "2025-12-22",
    stages: [
      { stageId: 1, stageName: "HANDLOWIEC", assignedWorkers: [1], status: 'completed' },
      { stageId: 2, stageName: "GRAFIK", assignedWorkers: [2, 3], status: 'completed' },
      { stageId: 3, stageName: "FREZOWANIE/LASER", assignedWorkers: [6], status: 'completed' },
    ]
  }
];

export const initialTimeEntries = [
  {
    id: "te1",
    orderId: 2,
    stageId: 1,
    stageName: "HANDLOWIEC",
    workerId: 1,
    workerName: "Katarzyna Treder",
    hourlyRate: 43.27,
    startTime: "2025-12-20T08:00:00",
    endTime: "2025-12-20T08:30:00",
    totalSeconds: 1800,
    status: 'completed' as const
  },
  {
    id: "te2",
    orderId: 2,
    stageId: 1,
    stageName: "HANDLOWIEC",
    workerId: 2,
    workerName: "Nikola Treder",
    hourlyRate: 43.27,
    startTime: "2025-12-20T08:00:00",
    endTime: "2025-12-20T08:45:00",
    totalSeconds: 2700,
    status: 'completed' as const
  },
  {
    id: "te3",
    orderId: 2,
    stageId: 2,
    stageName: "GRAFIK",
    workerId: 3,
    workerName: "Monika Pyzdrowska",
    hourlyRate: 43.27,
    startTime: "2025-12-20T09:00:00",
    endTime: "2025-12-20T11:15:00",
    totalSeconds: 8100,
    status: 'completed' as const
  },
  {
    id: "te4",
    orderId: 3,
    stageId: 3,
    stageName: "FREZOWANIE/LASER",
    workerId: 6,
    workerName: "Łukasz Baranowski",
    hourlyRate: 52.88,
    startTime: "2025-12-21T08:00:00",
    endTime: "2025-12-21T09:30:00",
    totalSeconds: 5400,
    status: 'completed' as const
  }
];
