# PlexiSystem - Analiza Luk i Rekomendacje

## Audyt MES/ERP - Stan na 2025-12-30

---

## 1. Executive Summary

PlexiSystem jest obecnie **systemem do zarządzania zleceniami z podstawowym śledzeniem czasu pracy**. Aby stać się **profesjonalnym systemem klasy MES**, wymaga implementacji 16 krytycznych modułów i funkcji.

**Szacowany nakład pracy**: 6-12 miesięcy development przy zespole 2-3 programistów.

---

## 2. Braki Krytyczne (Blokerzy MES)

### 2.1 BRAK: Planowanie i Harmonogramowanie Maszyn

**Problem produkcyjny:**
Kierownik nie może wizualnie zaplanować produkcji na maszynach. Nie wie, która maszyna jest wolna, kiedy zlecenie może być wykonane.

**Jak to działa w profesjonalnych MES:**
- Wykres Gantta z drag-and-drop dla zleceń na maszynach
- Automatyczny scheduling z uwzględnieniem czasów przezbrojeń
- Real-time widok obciążenia maszyn (capacity planning)
- Alerty o konfliktach terminów
- Symulacje "what-if" przy zmianie priorytetów

**Co dodać:**

```
1. Tabela: machines
   - id, name, department, capacity_hours_per_day
   - status (AKTYWNA/W_NAPRAWIE/WYŁĄCZONA)
   - current_order_id (FK - aktualne zlecenie)

2. Tabela: machine_schedules
   - id, machine_id, order_id, stage_id
   - planned_start, planned_end
   - actual_start, actual_end
   - setup_time_minutes

3. Endpointy:
   - GET /api/machines/schedule?from=&to= (dane do Gantta)
   - POST /api/machines/:id/schedule (planuj zlecenie)
   - PUT /api/machines/:id/schedule/:scheduleId (przeplanuj)

4. Frontend:
   - Komponent Gantt (biblioteka: react-gantt-chart lub dhtmlx-gantt)
   - Drag-and-drop przenoszenie zleceń
   - Widok dzienny/tygodniowy/miesięczny
```

**Priorytet:** KRYTYCZNY - bez tego nie ma MES

---

### 2.2 BRAK: Magazyn i Materiały

**Problem produkcyjny:**
Nie wiadomo ile materiału jest na stanie. Nie można zarezerwować materiału pod zlecenie. Nie ma kontroli wydań.

**Jak to działa w profesjonalnych MES:**
- Stany magazynowe real-time
- Rezerwacja materiałów przy tworzeniu zlecenia
- Automatyczne ostrzeżenia o niskich stanach
- Dokumenty PZ (przyjęcie)/WZ (wydanie)
- Inwentaryzacja z rozliczeniem różnic

**Co dodać:**

```
1. Tabela: materials
   - id, code, name, unit, min_stock, current_stock
   - category, supplier, price_per_unit
   - location (lokacja magazynowa)

2. Tabela: material_transactions
   - id, material_id, transaction_type (IN/OUT/ADJUSTMENT)
   - quantity, order_id (opcjonalnie)
   - document_number, created_by, created_at

3. Tabela: material_reservations
   - id, material_id, order_id, quantity_reserved
   - status (RESERVED/RELEASED/CONSUMED)

4. Endpointy:
   - GET /api/materials (lista materiałów)
   - GET /api/materials/:id/stock (stan aktualny)
   - POST /api/materials/:id/receive (przyjęcie PZ)
   - POST /api/materials/:id/issue (wydanie WZ)
   - POST /api/orders/:id/reserve-materials (rezerwacja)

5. Frontend:
   - Lista materiałów z stanami
   - Alerty o niskich stanach
   - Historia transakcji
   - Formularz przyjęcia/wydania
```

**Priorytet:** KRYTYCZNY - bez kontroli stanów nie ma rzetelnych kosztów

---

### 2.3 BRAK: BOM (Bill of Materials)

**Problem produkcyjny:**
Nie można policzyć kosztu materiałowego zlecenia. Nie wiadomo ile materiału potrzeba na produkt.

**Jak to działa w profesjonalnych MES:**
- Każdy produkt ma przypisaną listę materiałową
- Wersjonowanie BOM (zmiany receptur)
- Automatyczna kalkulacja zapotrzebowania
- Multi-level BOM (półprodukty)
- Alternatywne materiały

**Co dodać:**

```
1. Tabela: products
   - id, code, name, unit
   - default_price, category

2. Tabela: product_bom
   - id, product_id, material_id
   - quantity_per_unit, unit
   - version, is_active

3. Tabela: product_operations (routing)
   - id, product_id, stage_name
   - machine_type, time_minutes
   - sequence_order

4. Logika:
   - Przy tworzeniu zlecenia: kalkuluj zapotrzebowanie
   - quantity_needed = order.quantity × bom.quantity_per_unit
   - Sprawdź dostępność materiałów
   - Auto-rezerwacja jeśli dostępne

5. Endpointy:
   - GET /api/products/:id/bom
   - POST /api/products/:id/bom
   - GET /api/orders/:id/material-requirements
```

**Priorytet:** KRYTYCZNY - bez tego nie ma kalkulacji kosztów produkcji

---

### 2.4 BRAK: Kontrola Jakości i Traceability

**Problem produkcyjny:**
Nie ma rejestracji wad. Nie można prześledzić z jakiej partii materiału powstał wyrób. Brak historii reklamacji.

**Jak to działa w profesjonalnych MES:**
- Punkty kontroli jakości w procesie
- Rejestracja wad z kodami, zdjęciami
- Traceability: partia materiału → zlecenie → wyrób → klient
- Raporty jakościowe (% braków per maszyna/pracownik)
- Obsługa reklamacji z root cause analysis

**Co dodać:**

```
1. Tabela: quality_checks
   - id, order_id, stage_id, check_type
   - result (PASS/FAIL), defect_code
   - checked_by, checked_at
   - notes, photo_url

2. Tabela: defect_codes
   - id, code, name, category
   - severity (CRITICAL/MAJOR/MINOR)

3. Tabela: material_batches
   - id, material_id, batch_number
   - received_date, supplier_batch
   - quantity, remaining_quantity

4. Tabela: order_material_batches (traceability)
   - id, order_id, batch_id, quantity_used

5. Tabela: complaints
   - id, order_id, client_name
   - description, defect_code
   - status, resolution, cost

6. Endpointy:
   - POST /api/orders/:id/quality-check
   - GET /api/quality/reports/by-machine
   - GET /api/quality/reports/by-worker
   - GET /api/orders/:id/traceability
```

**Priorytet:** KRYTYCZNY - wymagane przez wiele branż i certyfikacje ISO

---

### 2.5 BRAK: OEE i Analityka Maszyn

**Problem produkcyjny:**
Nie wiadomo jaka jest rzeczywista wydajność maszyn. Nie ma danych o przestojach, przyczynach awarii.

**Jak to działa w profesjonalnych MES:**
- OEE = Availability × Performance × Quality
- Rejestracja przestojów z kodami przyczyn
- Dashboard wydajności per maszyna
- Trend analysis
- Predictive maintenance alerts

**Co dodać:**

```
1. Tabela: machine_events
   - id, machine_id, event_type (START/STOP/BREAKDOWN/SETUP)
   - start_time, end_time
   - reason_code, notes

2. Tabela: downtime_reasons
   - id, code, name, category
   - is_planned (planowany/nieplanowany)

3. Kalkulacja OEE:
   - Availability = (Available Time - Downtime) / Available Time
   - Performance = (Ideal Cycle Time × Total Count) / Run Time
   - Quality = Good Count / Total Count
   - OEE = A × P × Q

4. Endpointy:
   - GET /api/machines/:id/oee?period=
   - GET /api/machines/:id/downtime-analysis
   - POST /api/machines/:id/log-downtime
   - GET /api/reports/oee-summary

5. Frontend:
   - Dashboard OEE z gauges
   - Pareto diagram przyczyn przestojów
   - Trend OEE w czasie
```

**Priorytet:** KRYTYCZNY - kluczowy KPI produkcji

---

### 2.6 BRAK: Audit Trail

**Problem produkcyjny:**
Nie wiadomo kto zmienił dane, kiedy i z jakiej wartości na jaką. Problemy z compliance, rozliczalnością, debugowaniem.

**Jak to działa w profesjonalnych MES:**
- Każda zmiana logowana z timestampem i user ID
- Pola: tabela, rekord, pole, stara wartość, nowa wartość
- Niemożność usunięcia/modyfikacji logów
- Raporty audit na żądanie

**Co dodać:**

```
1. Tabela: audit_logs
   - id, timestamp, user_id, user_email
   - action (CREATE/UPDATE/DELETE)
   - table_name, record_id
   - field_name, old_value, new_value
   - ip_address, user_agent

2. Trigger/middleware:
   - Hook do każdego INSERT/UPDATE/DELETE
   - Automatyczne logowanie przed zmianą

3. Endpointy:
   - GET /api/audit?table=&record_id=&from=&to=
   - GET /api/audit/user/:userId

4. Frontend:
   - Historia zmian w szczegółach zlecenia
   - Raport audit (tylko admin)
```

**Priorytet:** KRYTYCZNY - wymagane przez ISO, audytorów, compliance

---

## 3. Braki Ważne (Podnoszące Profesjonalizm)

### 3.1 Priorytety Zleceń

**Problem:** Wszystkie zlecenia traktowane jednakowo. Brak expresów, pilnych.

**Rozwiązanie:**
```sql
ALTER TABLE orders ADD COLUMN priority
  VARCHAR(10) DEFAULT 'NORMAL'
  CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'));
```

### 3.2 Powiadomienia Email/Push

**Problem:** Użytkownicy nie są informowani o nowych przypisaniach, przekroczonych terminach.

**Rozwiązanie:**
- Integracja z SendGrid/Mailgun
- Kolejka powiadomień (tabela `notifications`)
- Cron job do wysyłki
- Opcjonalnie: PWA push notifications

### 3.3 Integracja z ERP/Księgowością

**Problem:** Brak automatycznego transferu faktur, kosztów.

**Rozwiązanie:**
- API adapter do popularnych systemów (Optima, wFirma, Fakturownia)
- Export danych w formacie JPK
- Synchronizacja kontrahentów

### 3.4 Offline Mode

**Problem:** Pracownik bez sieci nie może pracować.

**Rozwiązanie:**
- Service Worker + IndexedDB
- Synchronizacja przy połączeniu
- PWA manifest dla "Add to Home Screen"

### 3.5 Backup i Restore w UI

**Problem:** Admin nie może sam zrobić/przywrócić backup.

**Rozwiązanie:**
- pg_dump triggered z UI
- Przechowywanie na S3/GCS
- Lista backupów z opcją restore

---

## 4. Braki Dodatkowe (Nice-to-Have)

### 4.1 Mobile App Natywna

Dla pracowników produkcji - szybszy dostęp, lepszy UX.

### 4.2 Integracja z Maszynami CNC

OPC-UA / MTConnect do pobierania danych z maszyn automatycznie.

### 4.3 Dashboard Zarządu

Executive dashboard z KPI: revenue, costs, efficiency, quality trends.

### 4.4 AI/ML Predictions

- Predykcja czasu realizacji na podstawie historii
- Anomaly detection w jakości
- Demand forecasting

### 4.5 Multi-tenant / Multi-company

Możliwość obsługi wielu firm w jednej instalacji.

---

## 5. Macierz Wpływu Biznesowego

| Funkcja | Wpływ na Wydajność | Wpływ na Jakość | Wpływ na Koszty | Wpływ na Compliance | Suma |
|---------|:-----------------:|:---------------:|:---------------:|:------------------:|:----:|
| Planowanie Gantt | +5 | +2 | +4 | +1 | **12** |
| Magazyn | +3 | +2 | +5 | +3 | **13** |
| BOM | +2 | +1 | +5 | +2 | **10** |
| Jakość/Trace | +2 | +5 | +3 | +5 | **15** |
| OEE | +4 | +3 | +4 | +2 | **13** |
| Audit Trail | +1 | +1 | +1 | +5 | **8** |
| Priorytety | +3 | +1 | +2 | +0 | **6** |
| Powiadomienia | +2 | +1 | +1 | +0 | **4** |
| Integracja ERP | +2 | +0 | +4 | +3 | **9** |
| Offline Mode | +3 | +1 | +1 | +0 | **5** |

**Skala: 0-5 (0=brak wpływu, 5=krytyczny wpływ)**

### Rekomendowana Kolejność Wdrażania:

1. **Jakość/Traceability** (15 pkt) - najwyższy łączny wpływ
2. **Magazyn** (13 pkt) - fundament kosztów
3. **OEE** (13 pkt) - kluczowe KPI
4. **Planowanie Gantt** (12 pkt) - widoczność produkcji
5. **BOM** (10 pkt) - dopełnienie kosztów
6. **Integracja ERP** (9 pkt) - przepływ danych
7. **Audit Trail** (8 pkt) - compliance
8. **Priorytety** (6 pkt) - quick win
9. **Offline Mode** (5 pkt) - stabilność
10. **Powiadomienia** (4 pkt) - UX

---

## 6. Szacunek Nakładu Pracy

| Moduł | Story Points | Dev Days | Złożoność |
|-------|:------------:|:--------:|:---------:|
| Planowanie/Gantt | 80 | 40 | Wysoka |
| Magazyn | 60 | 30 | Średnia |
| BOM | 40 | 20 | Średnia |
| Jakość/Trace | 50 | 25 | Średnia |
| OEE | 40 | 20 | Średnia |
| Audit Trail | 20 | 10 | Niska |
| Priorytety | 5 | 2 | Niska |
| Powiadomienia | 30 | 15 | Średnia |
| Integracja ERP | 60 | 30 | Wysoka |
| Offline Mode | 40 | 20 | Wysoka |
| **RAZEM** | **425** | **212** | - |

**Przy 1 developerze: ~10-12 miesięcy**
**Przy 2 developerach: ~5-6 miesięcy**
**Przy 3 developerach: ~3-4 miesięcy**

---

## 7. Quick Wins (Do Wdrożenia Natychmiast)

### 7.1 Priorytet Zleceń (2 dni)

```sql
-- Migration
ALTER TABLE orders ADD COLUMN priority VARCHAR(10)
  DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT'));

-- Index dla sortowania
CREATE INDEX idx_orders_priority ON orders(priority, planned_completion_date);
```

### 7.2 Walidacja Danych (3 dni)

Dodać Zod schemas do wszystkich endpointów:

```typescript
import { z } from 'zod';

const createOrderSchema = z.object({
  client_name: z.string().min(1).max(200),
  product_name: z.string().min(1).max(200),
  quantity: z.number().int().min(1).optional(),
  price_total: z.number().min(0).optional(),
  planned_completion_date: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});
```

### 7.3 Rate Limiting (1 dzień)

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 req per window
  message: 'Too many requests'
});

app.use('/api/', limiter);
```

### 7.4 Podstawowy Audit (3 dni)

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id INTEGER,
  action VARCHAR(10),
  table_name VARCHAR(50),
  record_id INTEGER,
  changes JSONB,
  ip_address VARCHAR(45)
);
```

---

## 8. Rekomendacje Architektoniczne

### 8.1 Rozdzielenie Concerns

Obecna architektura jest OK dla małej skali, ale przy rozbudowie:

- Wydzielić serwisy: `OrderService`, `MachineService`, `InventoryService`
- Wprowadzić Event Bus dla komunikacji między modułami
- Rozważyć CQRS dla raportów

### 8.2 Baza Danych

- Dodać indeksy na wszystkie FK
- Rozważyć partycjonowanie tabeli `work_sessions` (po dacie)
- Dodać materialized views dla dashboard KPIs

### 8.3 Cache

- Redis dla:
  - Settings (TTL: 5 min)
  - Dashboard stats (TTL: 1 min)
  - User sessions

### 8.4 Monitoring

- Prometheus + Grafana dla metryk
- Sentry dla error tracking
- Health checks dla alertów

---

## 9. Podsumowanie Rekomendacji

### Natychmiast (Tydzień 1-2):

1. [ ] Dodać pole `priority` do zleceń
2. [ ] Wdrożyć walidację Zod
3. [ ] Dodać rate limiting
4. [ ] Utworzyć podstawową tabelę audit

### Krótkoterminowo (Miesiąc 1-2):

5. [ ] Moduł magazyn (podstawowy)
6. [ ] Audit trail (pełny)
7. [ ] Dashboard OEE (podstawowy)

### Średnioterminowo (Miesiąc 3-4):

8. [ ] Planowanie Gantt
9. [ ] BOM i kalkulacja kosztów
10. [ ] Jakość i traceability (podstawowe)

### Długoterminowo (Miesiąc 5-6):

11. [ ] Integracja ERP
12. [ ] Powiadomienia
13. [ ] Offline mode
14. [ ] Advanced analytics

---

*Dokument wygenerowany: 2025-12-30*
*Autor: Audyt MES/ERP PlexiSystem*
