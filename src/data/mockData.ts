import { Worker, Order, Stage } from '@/types';

export const workers: Worker[] = [
  { id: 1, name: "Katarzyna Treder", email: "katarzyna@plexisystem.pl", position: "GRAFIK", hourly_rate: 43.27, role: "worker", active: true },
  { id: 2, name: "Nikola Treder", email: "nikola@plexisystem.pl", position: "GRAFIK", hourly_rate: 43.27, role: "worker", active: true },
  { id: 3, name: "Monika Pyzdrowska", email: "monika@plexisystem.pl", position: "OKLEJANIE", hourly_rate: 43.27, role: "worker", active: true },
  { id: 4, name: "Millena Milewska", email: "millena@plexisystem.pl", position: "PAKOWANIE", hourly_rate: 43.27, role: "worker", active: true },
  { id: 5, name: "Małgorzata Czepczyńska", email: "malgorzata@plexisystem.pl", position: "KLEJENIE", hourly_rate: 43.27, role: "worker", active: true },
  { id: 6, name: "Łukasz Baranowski", email: "lukasz@plexisystem.pl", position: "FREZOWANIE", hourly_rate: 52.88, role: "worker", active: true },
  { id: 7, name: "Sławomir Sikorra", email: "slawomir@plexisystem.pl", position: "WYSYŁKA", hourly_rate: 52.88, role: "worker", active: true },
  { id: 8, name: "Daniel Treder", email: "daniel@plexisystem.pl", position: "FREZOWANIE", hourly_rate: 62.50, role: "manager", active: true }
];

export const positions = [
  'GRAFIK',
  'FREZOWANIE',
  'LASER',
  'POLEROWANIE',
  'WYGINANIE',
  'KLEJENIE',
  'DRUKOWANIE',
  'OKLEJANIE',
  'PAKOWANIE',
  'WYSYŁKA',
  'HANDLOWIEC',
  'INNE'
] as const;

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
    client_order_number: "ZAM-2025-001",
    client_name: "TEAM POINT Sp. z o.o.",
    client_email: "kontakt@teampoint.pl",
    client_phone: "+48 12 345 67 89",
    product_name: "Kieszonka A4 spacewall V2",
    quantity: 1000,
    price_total: 5000.00,
    price_per_unit: 5.00,
    status: "NOWE",
    planned_completion_date: "2026-01-15",
    notes: "Specjalne opakowanie, szybka wysyłka",
    folder_path: "/PROJEKTY/TEAM_POINT/1415/",
    created_by: "Łukasz Sikorra",
    created_at: "2025-12-27T10:00:00Z",
    archived: false,
    stages: []
  },
  {
    id: 2,
    order_number: "1414/2025",
    client_order_number: "ZAM-2025-002",
    client_name: "TEAM POINT Sp. z o.o.",
    client_email: "kontakt@teampoint.pl",
    client_phone: "+48 12 345 67 89",
    product_name: "Kieszonka na ulotki V2",
    quantity: 2,
    price_total: 150.00,
    price_per_unit: 75.00,
    status: "GOTOWE",
    planned_completion_date: "2025-12-22",
    invoice_number: "FV/2025/001",
    invoice_date: "2025-12-22",
    shipment_number: "APK-123456789",
    shipment_status: "DOSTARCZONO",
    shipment_tracking_url: "https://apaczka.pl/track/APK-123456789",
    created_by: "Łukasz Sikorra",
    created_at: "2025-12-18T08:00:00Z",
    archived: false,
    stages: [
      { stageId: 1, stageName: "HANDLOWIEC", assignedWorkers: [1, 2], status: 'completed' },
      { stageId: 2, stageName: "GRAFIK", assignedWorkers: [3], status: 'completed' },
    ]
  },
  {
    id: 3,
    order_number: "1413/2025",
    client_order_number: "ZAM-2025-003",
    client_name: "TEAM POINT Sp. z o.o.",
    client_email: "kontakt@teampoint.pl",
    client_phone: "+48 12 345 67 89",
    product_name: "Kieszonka A4 spacewall V2",
    quantity: 4,
    price_total: 300.00,
    price_per_unit: 75.00,
    status: "GOTOWE",
    planned_completion_date: "2025-12-22",
    invoice_number: "FV/2025/002",
    invoice_date: "2025-12-22",
    created_by: "Łukasz Sikorra",
    created_at: "2025-12-15T08:00:00Z",
    archived: true,
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

export const getStageStatusColor = (status: string, plannedDate?: string): string => {
  const isDelayed = plannedDate && new Date(plannedDate) < new Date() && status !== 'completed';
  
  if (isDelayed) return 'hsl(var(--stage-delayed))';
  
  switch (status) {
    case 'pending':
      return 'hsl(var(--stage-pending))';
    case 'in_progress':
      return 'hsl(var(--stage-in-progress))';
    case 'completed':
      return 'hsl(var(--stage-completed))';
    default:
      return 'hsl(var(--stage-pending))';
  }
};
