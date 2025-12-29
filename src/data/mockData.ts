import { Worker, Order, Stage, Machine } from '@/types';

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

// Etapy podzielone na kategorie:
// - preparation: przygotowawcze (GRAFIK przygotowuje pliki)
// - production: produkcyjne (kierownik przypisuje pracowników)
// - administrative: administracyjne (wysyłka, faktura - obsługiwane osobno)
export const stages: Stage[] = [
  // Etapy przygotowawcze
  { id: 1, name: "GRAFIK", category: "preparation", description: "Przygotowanie plików produkcyjnych" },

  // Etapy PRODUKCYJNE - kierownik przypisuje pracowników
  { id: 2, name: "FREZOWANIE", category: "production", description: "Frezowanie CNC" },
  { id: 3, name: "LASER", category: "production", description: "Cięcie laserowe" },
  { id: 4, name: "POLEROWANIE", category: "production", description: "Polerowanie krawędzi" },
  { id: 5, name: "WYGINANIE", category: "production", description: "Gięcie termiczne" },
  { id: 6, name: "KLEJENIE", category: "production", description: "Klejenie elementów" },
  { id: 7, name: "DRUKOWANIE", category: "production", description: "Druk UV / solwentowy" },
  { id: 8, name: "OKLEJANIE", category: "production", description: "Oklejanie folią" },
  { id: 9, name: "PAKOWANIE", category: "production", description: "Pakowanie produktu" },

  // Etapy administracyjne - nie przypisuje się pracowników
  { id: 10, name: "WYSYŁKA", category: "administrative", description: "Wysyłka do klienta" },
  { id: 11, name: "FAKTURA", category: "administrative", description: "Wystawienie faktury" },
  { id: 12, name: "ZAMKNIĘCIE", category: "administrative", description: "Zamknięcie zlecenia" }
];

// Helper: tylko etapy produkcyjne (do przypisywania pracowników)
export const productionStages = stages.filter(s => s.category === 'production');

// Helper: generowanie numeru zlecenia
export const generateOrderNumber = (existingOrders: { order_number: string }[]): string => {
  const year = new Date().getFullYear();
  const yearSuffix = `/${year}`;

  // Znajdź najwyższy numer w tym roku
  const thisYearOrders = existingOrders
    .filter(o => o.order_number?.endsWith(yearSuffix))
    .map(o => parseInt(o.order_number.split('/')[0]) || 0);

  const maxNumber = thisYearOrders.length > 0 ? Math.max(...thisYearOrders) : 1000;
  return `${maxNumber + 1}/${year}`;
};

export const initialMachines: Machine[] = [
  { id: 1, name: "Frezarka CNC 1", department: "FREZOWANIE", hourly_rate: 120.00, status: "available", description: "Główna frezarka CNC" },
  { id: 2, name: "Frezarka CNC 2", department: "FREZOWANIE", hourly_rate: 100.00, status: "available", description: "Frezarka pomocnicza" },
  { id: 3, name: "Laser CO2", department: "LASER", hourly_rate: 150.00, status: "available", description: "Laser do cięcia plexi" },
  { id: 4, name: "Laser Fiber", department: "LASER", hourly_rate: 180.00, status: "maintenance", description: "Laser do metalu" },
  { id: 5, name: "Giętarka plexi", department: "WYGINANIE", hourly_rate: 80.00, status: "available", description: "Giętarka do plexi" },
  { id: 6, name: "Polerka automatyczna", department: "POLEROWANIE", hourly_rate: 60.00, status: "available", description: "Polerka do krawędzi" },
  { id: 7, name: "Drukarka UV", department: "DRUKOWANIE", hourly_rate: 200.00, status: "available", description: "Drukarka UV do plexi" },
  { id: 8, name: "Ploter tnący", department: "OKLEJANIE", hourly_rate: 50.00, status: "available", description: "Ploter do folii" },
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
    stages: [
      { stageId: 1, stageName: "GRAFIK", assignedWorkers: [], status: 'pending' },
    ]
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
      { stageId: 1, stageName: "GRAFIK", assignedWorkers: [1], status: 'completed' },
      { stageId: 2, stageName: "FREZOWANIE", assignedWorkers: [6], status: 'completed' },
      { stageId: 9, stageName: "PAKOWANIE", assignedWorkers: [4], status: 'completed' },
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
      { stageId: 1, stageName: "GRAFIK", assignedWorkers: [2], status: 'completed' },
      { stageId: 2, stageName: "FREZOWANIE", assignedWorkers: [6], status: 'completed' },
      { stageId: 4, stageName: "POLEROWANIE", assignedWorkers: [3], status: 'completed' },
      { stageId: 9, stageName: "PAKOWANIE", assignedWorkers: [4], status: 'completed' },
    ]
  }
];

export const initialTimeEntries = [
  {
    id: "te1",
    orderId: 2,
    stageId: 2,
    stageName: "FREZOWANIE",
    workerId: 6,
    workerName: "Łukasz Baranowski",
    hourlyRate: 52.88,
    startTime: "2025-12-20T08:00:00",
    endTime: "2025-12-20T10:30:00",
    totalSeconds: 9000,
    status: 'completed' as const
  },
  {
    id: "te2",
    orderId: 2,
    stageId: 9,
    stageName: "PAKOWANIE",
    workerId: 4,
    workerName: "Millena Milewska",
    hourlyRate: 43.27,
    startTime: "2025-12-20T11:00:00",
    endTime: "2025-12-20T11:45:00",
    totalSeconds: 2700,
    status: 'completed' as const
  },
  {
    id: "te3",
    orderId: 3,
    stageId: 2,
    stageName: "FREZOWANIE",
    workerId: 6,
    workerName: "Łukasz Baranowski",
    hourlyRate: 52.88,
    startTime: "2025-12-15T08:00:00",
    endTime: "2025-12-15T09:30:00",
    totalSeconds: 5400,
    status: 'completed' as const
  },
  {
    id: "te4",
    orderId: 3,
    stageId: 4,
    stageName: "POLEROWANIE",
    workerId: 3,
    workerName: "Monika Pyzdrowska",
    hourlyRate: 43.27,
    startTime: "2025-12-15T10:00:00",
    endTime: "2025-12-15T11:00:00",
    totalSeconds: 3600,
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
