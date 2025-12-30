# GAP ANALYSIS AND RECOMMENDATIONS
## PlexiSystem MES/ERP - Analiza Luk i Rekomendacje

**Data audytu:** 2025-12-30
**Cel:** Identyfikacja braków względem profesjonalnego systemu MES/ERP

---

## EXECUTIVE SUMMARY

PlexiSystem jest solidną bazą systemu produkcyjnego z dobrze zaimplementowanymi podstawowymi funkcjami (zlecenia, etapy, śledzenie czasu, jakość, OEE). Jednak **brakuje kluczowych modułów** wymaganych do uznania systemu za profesjonalne rozwiązanie klasy MES/ERP:

1. **Brak modułu magazynowego** - największa luka
2. **Brak BOM (Bill of Materials)** - brak struktury produktu
3. **Brak pełnej identyfikowalności** - wymaganie ISO
4. **Brak integracji zewnętrznych** - izolowany system

**Ocena ogólna:** System wymaga rozwoju o ~40% do poziomu profesjonalnego MES.

---

## 1. BRAKI KRYTYCZNE
*Bez tych funkcji system nie może być nazywany profesjonalnym MES/ERP*

### 1.1 MODUŁ MAGAZYNOWY

**Co brakuje:**
- Rejestr materiałów z ilościami (stany magazynowe)
- Dokumenty magazynowe (PZ - przyjęcie zewnętrzne, WZ - wydanie zewnętrzne, MM - przesunięcie)
- Rezerwacje materiałów pod zlecenia
- Miejsca składowania (lokacje magazynowe)
- Inwentaryzacja z różnicami
- Alerty o niskim stanie

**Problem biznesowy:**
- Brak wiedzy ile materiału jest w magazynie
- Ryzyko przyjęcia zlecenia bez materiałów
- Ręczne śledzenie stanów (Excel, papier)
- Brak kontroli wydań

**Jak działa w profesjonalnych systemach:**
```
1. Przyjęcie materiału → PZ z automatycznym zwiększeniem stanu
2. Tworzenie zlecenia → Automatyczna rezerwacja materiałów z BOM
3. Wydanie na produkcję → WZ z automatycznym zmniejszeniem stanu
4. Alert gdy stan < minimum → Automatyczne zamówienie lub powiadomienie
5. Inwentaryzacja → Arkusz z różnicami, korekty stanów
```

**Rekomendowana implementacja:**

```sql
-- Nowe tabele
CREATE TABLE inventory_items (
  id SERIAL PRIMARY KEY,
  material_id INT REFERENCES material_prices(id),
  quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  location_id INT REFERENCES storage_locations(id),
  batch_number VARCHAR(50),
  expiry_date DATE,
  last_count_date TIMESTAMP,
  min_stock_level DECIMAL(10,3),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory_transactions (
  id SERIAL PRIMARY KEY,
  item_id INT REFERENCES inventory_items(id),
  transaction_type VARCHAR(20), -- 'PZ', 'WZ', 'MM', 'KOREKTA', 'REZERWACJA'
  quantity DECIMAL(10,3),
  reference_type VARCHAR(50), -- 'order', 'purchase', 'inventory'
  reference_id INT,
  performed_by INT REFERENCES workers(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE storage_locations (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE,
  name VARCHAR(100),
  warehouse VARCHAR(50),
  zone VARCHAR(20),
  aisle VARCHAR(10),
  rack VARCHAR(10),
  shelf VARCHAR(10),
  active BOOLEAN DEFAULT true
);
```

**Szacowany nakład:** 3-4 tygodnie development

---

### 1.2 BOM (BILL OF MATERIALS)

**Co brakuje:**
- Struktura produktu (lista materiałów)
- Wersjonowanie BOM
- Kalkulacja zużycia materiałów
- Receptury produkcyjne
- Zamienniki materiałów

**Problem biznesowy:**
- Każde zlecenie traktowane jako unikat
- Brak automatycznej kalkulacji kosztów materiałowych
- Ręczne obliczanie potrzeb materiałowych
- Brak powtarzalności produkcji

**Jak działa w profesjonalnych systemach:**
```
1. Produkt ma BOM z listą materiałów i ilości
2. Tworzenie zlecenia → System oblicza zużycie: ilość_zlecenia × BOM
3. Automatyczna rezerwacja materiałów z magazynu
4. Weryfikacja dostępności przed startem
5. Rzeczywiste zużycie vs planowane → analiza odchyleń
```

**Rekomendowana implementacja:**

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  product_code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(20),
  default_price DECIMAL(10,2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bom_headers (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id),
  version INT NOT NULL,
  effective_from DATE,
  effective_to DATE,
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, obsolete
  notes TEXT,
  created_by INT REFERENCES workers(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bom_lines (
  id SERIAL PRIMARY KEY,
  bom_id INT REFERENCES bom_headers(id),
  material_id INT REFERENCES material_prices(id),
  quantity_per_unit DECIMAL(10,4) NOT NULL,
  unit VARCHAR(20),
  waste_factor DECIMAL(5,2) DEFAULT 0,
  is_optional BOOLEAN DEFAULT false,
  substitute_material_id INT REFERENCES material_prices(id),
  sequence_order INT,
  notes TEXT
);

-- Routing / marszruta technologiczna
CREATE TABLE routings (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id),
  operation_sequence INT,
  operation_name VARCHAR(100),
  work_center_id INT REFERENCES machines(id),
  setup_time_minutes DECIMAL(10,2), -- TPZ
  unit_time_minutes DECIMAL(10,2), -- TJ
  description TEXT
);
```

**Szacowany nakład:** 2-3 tygodnie development

---

### 1.3 PEŁNE TRACEABILITY

**Co brakuje:**
- Numery partii materiałów
- Śledzenie partii przez produkcję
- Genealogia produktu (co weszło, co wyszło)
- Możliwość recall (wycofanie partii)

**Problem biznesowy:**
- Brak możliwości prześledzenia źródła problemu jakościowego
- Niemożliwe wycofanie wadliwej partii
- Niespełnienie wymagań ISO 9001 (7.5.3 Identyfikowalność)
- Ryzyko prawne w branżach regulowanych

**Jak działa w profesjonalnych systemach:**
```
1. Przyjęcie materiału z numerem partii dostawcy
2. Wydanie na zlecenie → Rejestracja użytych partii
3. Produkt gotowy → Przypisanie partii wyjściowej
4. Powiązanie: partia produktu ← partie materiałów
5. W razie reklamacji → Pełna genealogia "od dostawcy do klienta"
```

**Rekomendowana implementacja:**

```sql
CREATE TABLE lot_tracking (
  id SERIAL PRIMARY KEY,
  lot_number VARCHAR(50) UNIQUE NOT NULL,
  material_id INT REFERENCES material_prices(id),
  order_id INT REFERENCES orders(id), -- dla produktów gotowych
  supplier_lot VARCHAR(50),
  quantity DECIMAL(10,3),
  production_date DATE,
  expiry_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, consumed, recalled
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE lot_genealogy (
  id SERIAL PRIMARY KEY,
  parent_lot_id INT REFERENCES lot_tracking(id), -- partia produktu
  child_lot_id INT REFERENCES lot_tracking(id), -- partia materiału
  quantity_used DECIMAL(10,3),
  order_id INT REFERENCES orders(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recalls (
  id SERIAL PRIMARY KEY,
  lot_id INT REFERENCES lot_tracking(id),
  reason TEXT NOT NULL,
  initiated_by INT REFERENCES workers(id),
  status VARCHAR(20) DEFAULT 'initiated', -- initiated, in_progress, completed
  affected_orders JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Szacowany nakład:** 2 tygodnie development

---

### 1.4 INTEGRACJA ERP / KSIĘGOWOŚĆ

**Co brakuje:**
- Eksport faktur do systemu księgowego
- Import zamówień od klientów
- Synchronizacja kartotek (klienci, produkty)
- Automatyczne przeksięgowania

**Problem biznesowy:**
- Podwójne wprowadzanie danych
- Rozbieżności między systemami
- Opóźnienia w fakturowaniu
- Brak spójnej analityki finansowej

**Jak działa w profesjonalnych systemach:**
```
1. Zamówienie w CRM/ERP → Automatycznie w MES jako zlecenie
2. Zlecenie zakończone → Automatyczna faktura w ERP
3. Koszty produkcji → Przeksięgowanie na centra kosztów
4. Stany magazynowe → Wartość zapasów w księgach
```

**Rekomendowana implementacja:**

Wariant 1: **API Integration Layer**
```typescript
// src/integrations/erp/index.ts
interface ERPConnector {
  exportInvoice(order: Order): Promise<ERPInvoice>;
  importOrder(erpOrderId: string): Promise<Order>;
  syncCustomers(): Promise<void>;
  syncProducts(): Promise<void>;
}

// Implementacje dla popularnych systemów:
// - WFirma API
// - inFakt API
// - Comarch Optima API
// - SAP Business One API
```

Wariant 2: **Standardowy format wymiany (CSV/XML)**
```
Eksport zleceń gotowych → CSV z danymi do faktury
Import zamówień → CSV/Excel z zamówieniami
```

**Szacowany nakład:** 3-4 tygodnie (zależnie od systemu docelowego)

---

## 2. BRAKI WAŻNE
*Podnoszą system do poziomu profesjonalnego*

### 2.1 Drag & Drop w Gantt

**Problem:** Harmonogram jest tylko do odczytu, brak interaktywności.

**Rekomendacja:**
- Implementacja przeciągania zleceń na osi czasu
- Automatyczna walidacja konfliktów
- Podświetlanie wolnych slotów
- Undo/Redo operacji

**Biblioteka:** react-dnd lub własna implementacja z HTML5 Drag API

**Szacowany nakład:** 1-2 tygodnie

---

### 2.2 Czasy normatywne operacji

**Problem:** Brak TPZ (czas przygotowawczo-zakończeniowy) i TJ (czas jednostkowy).

**Rekomendacja:**
```sql
ALTER TABLE stages ADD COLUMN setup_time_minutes DECIMAL(10,2);
ALTER TABLE stages ADD COLUMN unit_time_minutes DECIMAL(10,2);
ALTER TABLE stages ADD COLUMN planned_duration_minutes DECIMAL(10,2);

-- Automatyczne obliczenie przy tworzeniu:
-- planned_duration = TPZ + (quantity × TJ)
```

**Korzyść:** Realistyczne planowanie, porównanie plan vs wykonanie.

**Szacowany nakład:** 1 tydzień

---

### 2.3 Automatyczne przeplanowanie

**Problem:** Statyczny harmonogram, brak reakcji na opóźnienia.

**Rekomendacja:**
- Wykrywanie opóźnień (actual > planned)
- Automatyczne przesuwanie kolejnych zleceń
- Powiadomienia o wpływie na deadline
- Symulacja "what-if"

**Szacowany nakład:** 2-3 tygodnie

---

### 2.4 Walidacja konfliktów zasobów

**Problem:** Można przydzielić tego samego pracownika/maszynę do wielu zadań.

**Rekomendacja:**
```typescript
async function validateResourceConflict(
  resourceType: 'worker' | 'machine',
  resourceId: number,
  startTime: Date,
  endTime: Date
): Promise<Conflict[]> {
  // Sprawdź czy zasób nie jest zajęty w podanym przedziale
  const conflicts = await query(`
    SELECT * FROM assignments a
    JOIN work_sessions ws ON a.id = ws.assignment_id
    WHERE a.worker_id = $1
    AND ws.start_time < $3
    AND (ws.end_time IS NULL OR ws.end_time > $2)
  `, [resourceId, startTime, endTime]);

  return conflicts;
}
```

**Szacowany nakład:** 1 tydzień

---

### 2.5 CAPA Workflow (Corrective and Preventive Actions)

**Problem:** Działania korygujące są tylko polem tekstowym.

**Rekomendacja:**
```sql
CREATE TABLE capa (
  id SERIAL PRIMARY KEY,
  defect_id INT REFERENCES defects(id),
  type VARCHAR(20), -- 'corrective', 'preventive'
  status VARCHAR(20), -- 'open', 'analysis', 'action', 'verification', 'closed'
  root_cause_analysis TEXT,
  immediate_action TEXT,
  long_term_action TEXT,
  verification_method TEXT,
  target_date DATE,
  responsible_id INT REFERENCES workers(id),
  verified_by INT REFERENCES workers(id),
  verified_at TIMESTAMP,
  effectiveness_review TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Korzyść:** Zgodność z ISO 9001 (10.2 Niezgodności i działania korygujące).

**Szacowany nakład:** 1-2 tygodnie

---

### 2.6 Automatyczne kopie zapasowe

**Problem:** Brak automatycznego backupu bazy danych.

**Rekomendacja:**
```bash
# Cron job (codziennie o 2:00)
0 2 * * * pg_dump -h localhost -U plexisystem -d plexisystem | gzip > /backups/plexisystem_$(date +\%Y\%m\%d).sql.gz

# Retencja 30 dni
find /backups -name "*.sql.gz" -mtime +30 -delete
```

Alternatywnie: Integracja z AWS S3, Google Cloud Storage, lub Backblaze B2.

**Szacowany nakład:** 1 dzień

---

### 2.7 API Documentation (Swagger/OpenAPI)

**Problem:** Brak dokumentacji API dla integracji.

**Rekomendacja:**
```typescript
// Instalacja swagger-jsdoc i swagger-ui-express
// Dokumentacja przy każdym endpoint:

/**
 * @openapi
 * /api/orders:
 *   get:
 *     summary: Lista zleceń
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NOWE, W_TRAKCIE, GOTOWE]
 *     responses:
 *       200:
 *         description: Lista zleceń
 */
```

**Szacowany nakład:** 2-3 dni

---

## 3. BRAKI DODATKOWE
*Nice-to-have, konkurencyjna przewaga*

### 3.1 Integracja IoT / Maszyny

**Problem:** Ręczne raportowanie czasu i ilości.

**Rozwiązanie długoterminowe:**
- Czujniki na maszynach (OPC-UA, MQTT)
- Automatyczne zliczanie sztuk
- Automatyczne rejestrowanie przestojów
- Real-time monitoring

**Szacowany nakład:** 4-8 tygodni + hardware

---

### 3.2 Multi-language (i18n)

**Problem:** Tylko polski interfejs.

**Rozwiązanie:**
- react-i18next dla frontend
- Pliki tłumaczeń (PL, EN, DE, UA)

**Szacowany nakład:** 2-3 tygodnie

---

### 3.3 Offline Mode (PWA)

**Problem:** Brak działania bez internetu.

**Rozwiązanie:**
- Service Worker dla cache'owania
- IndexedDB dla lokalnych danych
- Synchronizacja po powrocie online

**Szacowany nakład:** 2-3 tygodnie

---

### 3.4 Barcode/QR Scanner

**Problem:** Ręczne wpisywanie identyfikatorów.

**Rozwiązanie:**
- Integracja kamery (react-qr-reader)
- Etykiety z kodami dla zleceń, materiałów, lokacji
- Szybkie logowanie przez skan

**Szacowany nakład:** 1-2 tygodnie

---

### 3.5 Andon Boards (Ekrany halowe)

**Problem:** Brak wizualizacji na hali produkcyjnej.

**Rozwiązanie:**
- Dedykowany widok TV/monitor
- Wyświetlanie: aktywne zlecenia, OEE, alerty
- Auto-refresh co 30 sekund
- Kolorystyka statusów (czerwony = problem)

**Szacowany nakład:** 1-2 tygodnie

---

## PRIORYTYZACJA WDROŻENIA

### Faza 1: Fundament (4-6 tygodni)
1. ✅ Moduł magazynowy (stany, PZ/WZ) - 3-4 tyg
2. ✅ Automatyczne backupy - 1 dzień
3. ✅ Czasy normatywne operacji - 1 tyg
4. ✅ Walidacja konfliktów zasobów - 1 tyg

### Faza 2: Profesjonalizacja (6-8 tygodni)
5. BOM (Bill of Materials) - 2-3 tyg
6. Traceability materiałów - 2 tyg
7. Drag & Drop Gantt - 1-2 tyg
8. CAPA Workflow - 1-2 tyg

### Faza 3: Integracje (4-8 tygodni)
9. Integracja ERP/księgowość - 3-4 tyg
10. API Documentation - 3 dni
11. Automatyczne przeplanowanie - 2-3 tyg

### Faza 4: Rozszerzenia (ongoing)
12. Integracja IoT
13. Multi-language
14. Offline mode
15. Andon boards

---

## ROI SZACUNKOWY

| Funkcja | Koszt wdrożenia | Oszczędność miesięczna | ROI |
|---------|-----------------|------------------------|-----|
| Magazyn | 20 000 PLN | 5 000 PLN (mniej błędów) | 4 miesiące |
| BOM | 15 000 PLN | 3 000 PLN (automatyzacja) | 5 miesięcy |
| Traceability | 10 000 PLN | 2 000 PLN (compliance) | 5 miesięcy |
| Integracja ERP | 20 000 PLN | 4 000 PLN (czas) | 5 miesięcy |

**Łączny ROI dla Fazy 1-3:** ~6 miesięcy od wdrożenia

---

**Dokument wygenerowany:** 2025-12-30
**Następny przegląd:** Po implementacji Fazy 1
