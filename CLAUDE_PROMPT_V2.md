# PLEXISYSTEM PRODUCTION MANAGER - PROMPT V2.0
## Data: 28 grudnia 2025
## Bazowany na: Analizie kodu, testach i porównaniu z profesjonalnymi systemami MES/ERP

---

# SEKCJA 1: ANALIZA AKTUALNEGO STANU SYSTEMU

## 1.1. STRUKTURA APLIKACJI

### Pliki główne:
```
src/
├── App.tsx                           # Router główny
├── main.tsx                          # Entry point
├── pages/
│   ├── Index.tsx                     # Strona logowania
│   ├── ManagerDashboard.tsx          # Panel menadżera (routes)
│   ├── WorkerDashboard.tsx           # Panel pracownika (routes)
│   └── NotFound.tsx                  # 404
├── components/
│   ├── Manager/
│   │   ├── OrdersList.tsx            # ✅ Lista zleceń (naprawiony)
│   │   ├── OrderForm.tsx             # ✅ Formularz zlecenia
│   │   ├── OrderDetails.tsx          # ⚠️ Szczegóły (używa mock API!)
│   │   ├── WorkersList.tsx           # ✅ Lista pracowników
│   │   ├── TimeReport.tsx            # ✅ Raport czasu
│   │   ├── ApaczkaIntegration.tsx    # ❌ NIE PODŁĄCZONY DO ROUTINGU!
│   │   ├── WorkOrderPDF.tsx          # ❌ NIE PODŁĄCZONY DO ROUTINGU!
│   │   └── Machines/
│   │       └── MachinesList.tsx      # ❌ NIE PODŁĄCZONY DO ROUTINGU!
│   ├── Worker/
│   │   ├── MyStages.tsx              # ✅ Etapy pracownika
│   │   ├── Timer.tsx                 # ✅ Timer pracy
│   │   └── WorkerLogin.tsx           # ✅ Login pracownika
│   └── Navigation.tsx                # ✅ Nawigacja (tylko 3 linki!)
├── context/
│   └── AppContext.tsx                # ✅ Stan aplikacji
├── utils/
│   ├── api.ts                        # ✅ API endpoints
│   ├── apaczka.ts                    # ✅ API Apaczka (naprawiony)
│   └── stageColors.ts                # ✅ Kolory etapów (naprawiony)
├── types/
│   └── index.ts                      # ✅ Typy TypeScript
└── data/
    └── mockData.ts                   # ✅ Dane testowe
```

## 1.2. KRYTYCZNE PROBLEMY DO NAPRAWY

### PROBLEM #1: Komponenty istnieją ale NIE SĄ UŻYWANE!

**MachinesList.tsx** - Jest gotowy komponent ale:
- NIE jest importowany w ManagerDashboard.tsx
- NIE ma routu `/manager/machines`
- NIE ma linku w Navigation.tsx

**ApaczkaIntegration.tsx** - Jest przebudowany komponent ale:
- NIE jest używany w OrderDetails.tsx (tam jest mock handleOrderCourier!)
- NIE jest dostępny jako osobna strona

**WorkOrderPDF.tsx** - Jest komponent ale:
- NIE jest używany nigdzie
- NIE można wygenerować PDF zlecenia

### PROBLEM #2: OrderDetails.tsx używa MOCK zamiast prawdziwego API

```typescript
// LINIA 134-152 w OrderDetails.tsx - TO JEST MOCK!
const handleOrderCourier = () => {
  // Mock API call - in production this would call Apaczka API
  const mockShipmentNumber = `APK-${Date.now().toString().slice(-9)}`;
  // ... mock dane
};
```

**WYMAGANE:** Użyć komponentu ApaczkaIntegration.tsx zamiast mock!

### PROBLEM #3: Nawigacja ma tylko 3 linki!

```typescript
// Navigation.tsx - BRAK linków do:
// - Maszyny (/manager/machines)
// - Dashboard (/manager/dashboard)
// - Wysyłki (/manager/shipments)
// - Jakość (/manager/quality)
```

## 1.3. BRAKI W PORÓWNANIU Z PROFESJONALNYMI SYSTEMAMI MES/ERP

### Bazując na analizie: Oracle NetSuite, SAP, Epicor, Odoo, Prodio

| Funkcja | Status | Priorytet |
|---------|--------|-----------|
| Dashboard z KPI | ❌ BRAK | 🔴 WYSOKI |
| Lista zleceń | ✅ JEST | - |
| Formularz zlecenia | ✅ JEST | - |
| Szczegóły zlecenia | ⚠️ Mock API | 🔴 WYSOKI |
| Zarządzanie etapami | ✅ JEST | - |
| Zarządzanie pracownikami | ✅ JEST | - |
| Zarządzanie maszynami | ⚠️ Komponent jest, brak routingu | 🔴 WYSOKI |
| Gantt Chart / Harmonogram | ❌ BRAK | 🟡 ŚREDNI |
| Integracja Apaczka | ⚠️ Komponent jest, nie używany | 🔴 WYSOKI |
| Generowanie PDF | ⚠️ Komponent jest, nie używany | 🟡 ŚREDNI |
| Raport czasu pracy | ✅ JEST | - |
| Moduł jakości (QC) | ❌ BRAK | 🟡 ŚREDNI |
| Moduł magazynowy | ❌ BRAK | 🟢 NISKI |
| Integracja wfirma.pl | ❌ BRAK | 🟢 NISKI |
| Integracja mBank | ❌ BRAK | 🟢 NISKI |
| OEE maszyn | ❌ BRAK | 🟡 ŚREDNI |
| Paginacja zleceń | ❌ BRAK | 🟡 ŚREDNI |
| Wyszukiwarka | ❌ BRAK | 🟡 ŚREDNI |
| Sortowanie kolumn | ❌ BRAK | 🟡 ŚREDNI |
| Powiadomienia/Alerty | ❌ BRAK | 🟢 NISKI |
| Kalendarz/Timeline | ❌ BRAK | 🟢 NISKI |
| Panel admina | ❌ BRAK | 🟢 NISKI |

---

# SEKCJA 2: PLAN NAPRAW I ROZWOJU

## 🔴 PRIORYTET 1: NAPRAWY KRYTYCZNE (NATYCHMIASTOWE)

### 2.1. Podłączyć MachinesList do aplikacji

**Plik: `src/pages/ManagerDashboard.tsx`**
```typescript
// DODAĆ import:
import MachinesList from '@/components/Manager/Machines/MachinesList';

// DODAĆ route:
<Route path="machines" element={<MachinesList />} />
```

**Plik: `src/components/Navigation.tsx`**
```typescript
// DODAĆ import:
import { Cog } from 'lucide-react';

// DODAĆ przycisk w nawigacji menadżera:
<NavButton path="/manager/machines" icon={Cog} label="Maszyny" />
```

### 2.2. Użyć ApaczkaIntegration w OrderDetails

**Plik: `src/components/Manager/OrderDetails.tsx`**
```typescript
// DODAĆ import:
import ApaczkaIntegration from './ApaczkaIntegration';

// ZAMIENIĆ mock handleOrderCourier na:
{showShipmentForm && (
  <ApaczkaIntegration
    orderId={order.id}
    orderNumber={order.order_number}
    clientName={order.client_name}
    clientAddress="" // Dodać pole w Order
    clientPostal=""  // Dodać pole w Order
    clientCity=""    // Dodać pole w Order
    clientPhone={order.client_phone}
    clientEmail={order.client_email}
    onShipmentCreated={(shipment) => {
      setOrders(prev => prev.map(o =>
        o.id === order.id
          ? {
              ...o,
              shipment_number: shipment.trackingNumber,
              shipment_status: 'ZAMÓWIONA',
              shipment_tracking_url: shipment.labelUrl
            }
          : o
      ));
      setShowShipmentForm(false);
    }}
  />
)}
```

### 2.3. Dodać Dashboard z KPI

**Nowy plik: `src/components/Manager/Dashboard.tsx`**
```typescript
import { useApp } from '@/context/AppContext';
import { ClipboardList, Users, Clock, AlertTriangle, TrendingUp, Package } from 'lucide-react';

const Dashboard = () => {
  const { orders, workers, timeEntries } = useApp();

  // KPI Calculations
  const activeOrders = orders.filter(o => !o.archived && o.status !== 'GOTOWE');
  const overdueOrders = activeOrders.filter(o => new Date(o.planned_completion_date) < new Date());
  const totalValue = activeOrders.reduce((sum, o) => sum + (o.price_total || 0), 0);
  const ordersInProgress = orders.filter(o => o.status === 'W_TRAKCIE').length;
  const ordersNew = orders.filter(o => o.status === 'NOWE').length;
  const ordersCompleted = orders.filter(o => o.status === 'GOTOWE').length;
  const activeWorkers = workers.filter(w => w.active).length;

  const KPICard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="card-industrial">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-')}/10`}>
          <Icon size={24} className={color} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">📊 Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Aktywne zlecenia"
          value={activeOrders.length}
          icon={ClipboardList}
          color="text-primary"
          subtitle={`${ordersNew} nowych, ${ordersInProgress} w trakcie`}
        />
        <KPICard
          title="Wartość w toku"
          value={`${totalValue.toLocaleString('pl-PL')} zł`}
          icon={TrendingUp}
          color="text-green-600"
        />
        <KPICard
          title="Przeterminowane"
          value={overdueOrders.length}
          icon={AlertTriangle}
          color={overdueOrders.length > 0 ? "text-red-500" : "text-green-600"}
        />
        <KPICard
          title="Aktywni pracownicy"
          value={activeWorkers}
          icon={Users}
          color="text-blue-600"
        />
      </div>

      {/* Orders by Status Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-industrial">
          <h2 className="text-lg font-bold mb-4">Zlecenia wg statusu</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Nowe</span>
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-400 rounded" style={{ width: `${ordersNew * 20}px` }}></div>
                <span className="font-bold">{ordersNew}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">W trakcie</span>
              <div className="flex items-center gap-2">
                <div className="h-4 bg-blue-500 rounded" style={{ width: `${ordersInProgress * 20}px` }}></div>
                <span className="font-bold">{ordersInProgress}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Gotowe</span>
              <div className="flex items-center gap-2">
                <div className="h-4 bg-green-500 rounded" style={{ width: `${ordersCompleted * 20}px` }}></div>
                <span className="font-bold">{ordersCompleted}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-industrial">
          <h2 className="text-lg font-bold mb-4">Przeterminowane zlecenia</h2>
          {overdueOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Brak przeterminowanych zleceń 🎉</p>
          ) : (
            <div className="space-y-2">
              {overdueOrders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <span className="font-mono text-sm">{order.order_number}</span>
                  <span className="text-sm text-red-600">
                    {Math.abs(Math.ceil((new Date(order.planned_completion_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} dni temu
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
```

### 2.4. Dodać Dashboard do routingu

**Plik: `src/pages/ManagerDashboard.tsx`**
```typescript
// DODAĆ import:
import Dashboard from '@/components/Manager/Dashboard';
import MachinesList from '@/components/Manager/Machines/MachinesList';

// ZMIENIĆ routes:
<Routes>
  <Route path="dashboard" element={<Dashboard />} />
  <Route path="orders" element={<OrdersList />} />
  <Route path="orders/new" element={<OrderForm />} />
  <Route path="orders/:id" element={<OrderDetails />} />
  <Route path="orders/:id/edit" element={<OrderForm />} />
  <Route path="workers" element={<WorkersList />} />
  <Route path="machines" element={<MachinesList />} />
  <Route path="reports" element={<TimeReport />} />
  <Route path="*" element={<Navigate to="dashboard" replace />} /> {/* Zmienić z orders na dashboard */}
</Routes>
```

### 2.5. Zaktualizować Navigation

**Plik: `src/components/Navigation.tsx`**
```typescript
// DODAĆ importy:
import { LayoutDashboard, Cog } from 'lucide-react';

// ZMIENIĆ sekcję nawigacji menadżera:
{isManager ? (
  <>
    <NavButton path="/manager/dashboard" icon={LayoutDashboard} label="Dashboard" />
    <NavButton path="/manager/orders" icon={ClipboardList} label="Zlecenia" />
    <NavButton path="/manager/machines" icon={Cog} label="Maszyny" />
    <NavButton path="/manager/workers" icon={Users} label="Pracownicy" />
    <NavButton path="/manager/reports" icon={FileText} label="Raporty" />
  </>
) : (
  // ...
)}
```

---

## 🟡 PRIORYTET 2: ULEPSZENIA FUNKCJONALNE

### 2.6. Dodać paginację do OrdersList

```typescript
// W OrdersList.tsx dodać:
const [page, setPage] = useState(1);
const [perPage, setPerPage] = useState(20);

const paginatedOrders = filteredOrders.slice((page - 1) * perPage, page * perPage);
const totalPages = Math.ceil(filteredOrders.length / perPage);

// Dodać UI paginacji:
<div className="flex items-center justify-between mt-4">
  <span className="text-sm text-muted-foreground">
    Pokazuję {(page - 1) * perPage + 1}-{Math.min(page * perPage, filteredOrders.length)} z {filteredOrders.length}
  </span>
  <div className="flex gap-2">
    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary">
      Poprzednia
    </button>
    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary">
      Następna
    </button>
  </div>
</div>
```

### 2.7. Dodać wyszukiwarkę do OrdersList

```typescript
// Dodać stan:
const [searchTerm, setSearchTerm] = useState('');

// Dodać filtrowanie:
const filteredOrders = orders
  .filter(order => {
    if (filter === 'AKTYWNE') return !order.archived && order.status !== 'GOTOWE';
    if (filter === 'ARCHIWUM') return order.archived || order.status === 'GOTOWE';
    return true;
  })
  .filter(order => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(term) ||
      order.client_name.toLowerCase().includes(term) ||
      order.product_name.toLowerCase().includes(term)
    );
  });

// Dodać UI:
<input
  type="text"
  placeholder="Szukaj zleceń..."
  value={searchTerm}
  onChange={e => setSearchTerm(e.target.value)}
  className="input-industrial w-full sm:w-64"
/>
```

### 2.8. Dodać sortowanie kolumn

```typescript
// Dodać stan:
const [sortBy, setSortBy] = useState<string>('created_at');
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

// Funkcja sortowania:
const sortedOrders = [...filteredOrders].sort((a, b) => {
  let aVal = a[sortBy];
  let bVal = b[sortBy];
  if (sortBy === 'planned_completion_date' || sortBy === 'created_at') {
    aVal = new Date(aVal).getTime();
    bVal = new Date(bVal).getTime();
  }
  if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
  return aVal < bVal ? 1 : -1;
});

// Nagłówki z sortowaniem:
<th onClick={() => handleSort('order_number')} className="cursor-pointer hover:bg-muted">
  Nr {sortBy === 'order_number' && (sortOrder === 'asc' ? '↑' : '↓')}
</th>
```

### 2.9. Rozszerzyć typy Order o adres klienta

**Plik: `src/types/index.ts`**
```typescript
export interface Order {
  // ... istniejące pola
  client_address?: string;
  client_postal?: string;
  client_city?: string;
  client_country?: string;
}
```

---

## 🟢 PRIORYTET 3: NOWE FUNKCJONALNOŚCI

### 2.10. Moduł Gantt Chart (harmonogram)

**Nowy plik: `src/components/Manager/Scheduling/GanttChart.tsx`**
- Wizualizacja zleceń na osi czasu
- Drag & drop do zmiany terminów
- Kolorowanie wg statusu
- Wyświetlanie kamieni milowych

### 2.11. Moduł jakości (QC)

**Nowy plik: `src/components/Manager/Quality/QualityCheck.tsx`**
- Checklisty jakościowe dla etapów
- Dokumentacja zdjęciowa defektów
- Raporty jakości
- Historia kontroli

### 2.12. OEE Maszyn

**Rozszerzenie MachinesList.tsx:**
- Rejestrowanie czasu pracy
- Obliczanie OEE (Availability × Performance × Quality)
- Śledzenie przestojów
- Wykresy efektywności

### 2.13. Powiadomienia

**Nowy plik: `src/components/Shared/Notifications.tsx`**
- Alerty o przeterminowanych zleceniach
- Powiadomienia o nowych przypisaniach
- Przypomnienia o terminach
- Toast notifications

---

# SEKCJA 3: STANDARDY KODOWANIA

## 3.1. Struktura komponentu

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { SomeIcon } from 'lucide-react';

interface ComponentNameProps {
  prop1: string;
  prop2?: number;
  onAction?: (data: SomeType) => void;
}

const ComponentName: React.FC<ComponentNameProps> = ({
  prop1,
  prop2 = 10,
  onAction,
}) => {
  // 1. Hooks z kontekstu
  const { orders, setOrders } = useApp();

  // 2. Stan lokalny
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SomeType[]>([]);

  // 3. Effects
  useEffect(() => {
    loadData();
  }, []);

  // 4. Callbacks
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // API call
    } catch (error) {
      console.error('Failed to load:', error);
      toast.error('Nie udało się załadować danych');
    } finally {
      setLoading(false);
    }
  }, []);

  // 5. Handlers
  const handleSubmit = () => {
    // ...
  };

  // 6. Render helpers
  const renderItem = (item: SomeType) => (
    <div key={item.id}>{item.name}</div>
  );

  // 7. Loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  // 8. Main render
  return (
    <div className="p-4 md:p-6">
      {/* Content */}
    </div>
  );
};

export default ComponentName;
```

## 3.2. Konwencje nazewnictwa

- Komponenty: PascalCase (`OrdersList.tsx`)
- Hooki: camelCase z `use` (`useOrders.ts`)
- Funkcje: camelCase (`handleSubmit`)
- Stałe: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- Typy/Interfejsy: PascalCase (`Order`, `OrderStage`)
- Pliki CSS/utility: kebab-case (`stage-colors.ts`)

## 3.3. Obsługa błędów

```typescript
try {
  const response = await api.call();
  if (response.success) {
    // Success handling
    toast.success('Operacja zakończona pomyślnie');
  } else {
    toast.error(response.error || 'Wystąpił błąd');
  }
} catch (error) {
  console.error('Context - operation failed:', error);
  toast.error('Nie udało się wykonać operacji');
}
```

## 3.4. Responsywność

```typescript
// Mobile-first breakpoints
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* Cards */}
</div>

// Hide/show
<div className="hidden md:block">Desktop only</div>
<div className="md:hidden">Mobile only</div>

// Flex direction
<div className="flex flex-col sm:flex-row gap-4">
  {/* Items */}
</div>
```

---

# SEKCJA 4: CHECKLISTA PRZED WDROŻENIEM

## Przed każdą zmianą:
- [ ] Przeczytać istniejący kod
- [ ] Sprawdzić typy w `src/types/index.ts`
- [ ] Zweryfikować API w `src/utils/api.ts`

## Podczas kodowania:
- [ ] TypeScript z typami
- [ ] Error handling z try/catch
- [ ] Loading states
- [ ] Responsywność (mobile-first)
- [ ] Accessibility (aria-labels)

## Przed commitem:
- [ ] `npm run build` przechodzi
- [ ] `npm run lint` bez błędów
- [ ] Testowanie w przeglądarce
- [ ] Sprawdzenie na mobile

## Po zakończeniu:
- [ ] Commit z opisem zmian
- [ ] Push do GitHub
- [ ] Weryfikacja na produkcji

---

# SEKCJA 5: PODSUMOWANIE PRIORYTETÓW

## 🔴 NATYCHMIASTOWE (Priorytet 1):
1. ✅ Podłączyć MachinesList do routingu
2. ✅ Użyć ApaczkaIntegration w OrderDetails
3. ✅ Stworzyć Dashboard z KPI
4. ✅ Zaktualizować Navigation (5 linków)
5. ✅ Zmienić domyślną stronę na Dashboard

## 🟡 W CIĄGU TYGODNIA (Priorytet 2):
1. Paginacja listy zleceń
2. Wyszukiwarka zleceń
3. Sortowanie kolumn
4. Rozszerzyć Order o adres klienta
5. Podłączyć WorkOrderPDF

## 🟢 W PRZYSZŁOŚCI (Priorytet 3):
1. Gantt Chart / Harmonogram
2. Moduł jakości (QC)
3. OEE maszyn
4. Integracja wfirma.pl
5. Integracja mBank
6. Powiadomienia
7. Panel admina

---

*Wygenerowano przez Claude Code*
*Data: 28 grudnia 2025*
*Wersja: 2.0*
