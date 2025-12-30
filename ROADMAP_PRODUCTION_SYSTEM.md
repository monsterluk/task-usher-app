# PlexiSystem - Roadmapa Rozwoju

## Od Systemu Zleceń do Profesjonalnego MES

**Data utworzenia:** 2025-12-30
**Horyzont:** 12 miesięcy

---

## Wizja Produktu

```
        TERAZ                    CEL
    ┌─────────────┐        ┌─────────────┐
    │   System    │   →    │ MES-lite    │
    │  Zleceń +   │   →    │ dla SMB     │
    │  Timesheet  │   →    │ produkcji   │
    └─────────────┘        └─────────────┘

    Pokrycie MES: 24%      Pokrycie MES: 70%+
```

---

## Faza 1: Stabilizacja (4 tygodnie)

### Cel: Naprawić błędy, zabezpieczyć system, przygotować fundament

### Sprint 1.1: Security & Validation (Tydzień 1-2)

| Zadanie | Opis | Wpływ |
|---------|------|-------|
| Walidacja Zod | Dodać schema validation do wszystkich endpointów | Eliminacja błędnych danych |
| Rate Limiting | Express-rate-limit na /api/* | Ochrona przed DDoS/brute-force |
| XSS Protection | Sanityzacja inputów tekstowych | Bezpieczeństwo |
| Input validation | Walidacja ujemnych wartości, formatów dat | Spójność danych |

**Deliverables:**
- [ ] Zod schemas dla wszystkich DTO
- [ ] Rate limiter middleware
- [ ] XSS sanitizer middleware
- [ ] Testy jednostkowe walidacji

### Sprint 1.2: Data Integrity & Audit (Tydzień 3-4)

| Zadanie | Opis | Wpływ |
|---------|------|-------|
| Audit Trail | Tabela audit_logs + trigger/middleware | Compliance, debugging |
| Indeksy DB | Dodać indeksy na FK i pola statusu | Wydajność |
| Backup Script | pg_dump cron + S3 upload | Disaster recovery |
| Health Monitoring | Prometheus metrics + healthcheck endpoint | Observability |

**Deliverables:**
- [ ] Tabela audit_logs z pełnym logowaniem
- [ ] Skrypt backup.sh z retencją 30 dni
- [ ] Dashboard Grafana (opcjonalnie)
- [ ] Dokumentacja DR

### Metryki Sukcesu Fazy 1:

| Metryka | Cel |
|---------|-----|
| Błędy walidacji w logach | -90% |
| Czas odpowiedzi API | <200ms p95 |
| Pokrycie audit logiem | 100% tabel krytycznych |
| Backup success rate | 100% |

---

## Faza 2: MES-lite Core (8 tygodni)

### Cel: Dodać kluczowe moduły MES-owe

### Sprint 2.1: Magazyn Podstawowy (Tydzień 5-6)

```
┌─────────────────────────────────────────────┐
│              MODUŁ MAGAZYN                  │
├─────────────────────────────────────────────┤
│ • Lista materiałów (CRUD)                   │
│ • Stany magazynowe                          │
│ • Przyjęcia (PZ)                            │
│ • Wydania (WZ)                              │
│ • Historia transakcji                       │
│ • Alerty o niskich stanach                  │
└─────────────────────────────────────────────┘
```

**Tabele:**
```sql
CREATE TABLE materials (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  unit VARCHAR(20) DEFAULT 'szt.',
  current_stock DECIMAL(10,2) DEFAULT 0,
  min_stock DECIMAL(10,2) DEFAULT 0,
  price_per_unit DECIMAL(10,2),
  category VARCHAR(100),
  location VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE material_transactions (
  id SERIAL PRIMARY KEY,
  material_id INTEGER REFERENCES materials(id),
  type VARCHAR(10) CHECK (type IN ('IN', 'OUT', 'ADJ')),
  quantity DECIMAL(10,2) NOT NULL,
  document_number VARCHAR(50),
  order_id INTEGER REFERENCES orders(id),
  notes TEXT,
  created_by INTEGER REFERENCES workers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Endpointy:**
- `GET/POST /api/materials`
- `GET/PUT/DELETE /api/materials/:id`
- `POST /api/materials/:id/receive` (PZ)
- `POST /api/materials/:id/issue` (WZ)
- `GET /api/materials/:id/transactions`

**UI:**
- Lista materiałów z search/filter
- Modal dodawania/edycji
- Widok karty materiału z historią
- Widget alertów na dashboardzie

### Sprint 2.2: BOM i Kalkulacje (Tydzień 7-8)

```
┌─────────────────────────────────────────────┐
│                MODUŁ BOM                    │
├─────────────────────────────────────────────┤
│ • Produkty/wyroby                           │
│ • Lista materiałowa (BOM)                   │
│ • Kalkulacja zapotrzebowania                │
│ • Koszt materiałowy zlecenia                │
│ • Rezerwacje materiałów                     │
└─────────────────────────────────────────────┘
```

**Logika biznesowa:**
```
Tworzenie zlecenia:
1. User wybiera produkt lub wpisuje ręcznie
2. System pobiera BOM produktu
3. Kalkuluje: zapotrzebowanie = ilość × BOM
4. Sprawdza dostępność materiałów
5. Tworzy rezerwacje lub pokazuje braki
6. Oblicza koszt materiałowy
```

**UI w OrderForm:**
- Dropdown wyboru produktu z BOM
- Sekcja "Zapotrzebowanie materiałowe"
- Status: DOSTĘPNE / BRAKUJE X szt.
- Koszt materiałowy w podsumowaniu

### Sprint 2.3: Maszyny i Planowanie (Tydzień 9-10)

```
┌─────────────────────────────────────────────┐
│           MODUŁ MASZYNY                     │
├─────────────────────────────────────────────┤
│ • Lista maszyn (przenieść z localStorage)   │
│ • Status maszyny (aktywna/naprawa/off)      │
│ • Harmonogram maszyny (simple)              │
│ • Widok kolejki zleceń na maszynie          │
│ • Przypisanie zlecenia do maszyny           │
└─────────────────────────────────────────────┘
```

**Tabele:**
```sql
CREATE TABLE machines (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE,
  department VARCHAR(50),
  hourly_rate DECIMAL(10,2) DEFAULT 100,
  status VARCHAR(20) DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','MAINTENANCE','INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE machine_schedules (
  id SERIAL PRIMARY KEY,
  machine_id INTEGER REFERENCES machines(id),
  order_id INTEGER REFERENCES orders(id),
  stage_id INTEGER REFERENCES stages(id),
  planned_start TIMESTAMPTZ NOT NULL,
  planned_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'PLANNED'
);
```

### Sprint 2.4: Widok Gantt (Tydzień 11-12)

```
┌─────────────────────────────────────────────┐
│            WYKRES GANTTA                    │
├─────────────────────────────────────────────┤
│ • Timeline maszyn                           │
│ • Bloki = zlecenia na maszynach             │
│ • Drag-and-drop przeplanowanie              │
│ • Kolory statusów                           │
│ • Zoom: dzień/tydzień/miesiąc               │
└─────────────────────────────────────────────┘
```

**Biblioteka:** `@dhtmlx/gantt` lub `react-gantt-timeline`

**Dane do Gantta:**
```typescript
interface GanttTask {
  id: string;
  text: string;          // "ZAM/2025/00001 - Plexi 5mm"
  start_date: Date;
  end_date: Date;
  progress: number;      // 0-1
  parent: string;        // machine_id
  color: string;         // status color
}
```

### Metryki Sukcesu Fazy 2:

| Metryka | Cel |
|---------|-----|
| Materiały w systemie | 100% (migracja) |
| Zlecenia z kalkulacją kosztów | 100% nowych |
| Wykorzystanie planowania maszyn | >50% zleceń |
| Czas planowania zlecenia | -30% |

---

## Faza 3: Jakość i Analityka (8 tygodni)

### Cel: Profesjonalna kontrola jakości, KPI produkcji

### Sprint 3.1: Kontrola Jakości (Tydzień 13-14)

```
┌─────────────────────────────────────────────┐
│         MODUŁ JAKOŚCI                       │
├─────────────────────────────────────────────┤
│ • Punkty kontrolne w procesie               │
│ • Rejestracja wad (kod, opis, zdjęcie)      │
│ • Słownik kodów wad                         │
│ • Status jakościowy zlecenia                │
│ • Raporty jakościowe                        │
└─────────────────────────────────────────────┘
```

**UI w OrderDetails:**
- Sekcja "Kontrola Jakości"
- Przycisk "Dodaj kontrolę" przy każdym etapie
- Modal: wynik (OK/NOK), kod wady, notatka, zdjęcie
- Badge jakościowy na liście zleceń

### Sprint 3.2: Traceability (Tydzień 15-16)

```
┌─────────────────────────────────────────────┐
│        MODUŁ TRACEABILITY                   │
├─────────────────────────────────────────────┤
│ • Partie materiałów (batch tracking)        │
│ • Powiązanie: partia → zlecenie → wyrób     │
│ • Widok genealogii produktu                 │
│ • Wyszukiwanie po partii/numerze            │
│ • Export raportu traceability               │
└─────────────────────────────────────────────┘
```

**Use case:**
```
Klient: "Mam problem z produktem nr X"
System:
  → Zlecenie ZAM/2025/00123
  → Materiały z partii: MAT-001-2025/03, MAT-002-2025/03
  → Maszyna: LASER-01, operator: Jan Kowalski
  → Kontrola jakości: OK (2025-03-15)
  → Inne zlecenia z tej partii: 5 zleceń
```

### Sprint 3.3: OEE Dashboard (Tydzień 17-18)

```
┌─────────────────────────────────────────────┐
│            DASHBOARD OEE                    │
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐       │
│   │ 85% │  │ 92% │  │ 98% │  │ 77% │       │
│   │ OEE │  │Avail│  │Perf │  │Qual │       │
│   └─────┘  └─────┘  └─────┘  └─────┘       │
│                                             │
│   [Trend OEE - wykres liniowy 30 dni]      │
│                                             │
│   [Pareto przyczyn przestojów]             │
│                                             │
└─────────────────────────────────────────────┘
```

**Kalkulacje:**
```typescript
function calculateOEE(machineId: number, period: DateRange): OEEResult {
  const availability = calculateAvailability(machineId, period);
  const performance = calculatePerformance(machineId, period);
  const quality = calculateQuality(machineId, period);

  return {
    oee: availability * performance * quality,
    availability,
    performance,
    quality,
    lostTime: calculateLostTime(machineId, period),
    topDowntimeReasons: getTopDowntimeReasons(machineId, period, 5),
  };
}
```

### Sprint 3.4: Reklamacje (Tydzień 19-20)

```
┌─────────────────────────────────────────────┐
│         MODUŁ REKLAMACJI                    │
├─────────────────────────────────────────────┤
│ • Rejestracja reklamacji klienta            │
│ • Powiązanie z zleceniem                    │
│ • Status: NOWA → W_ANALIZIE → ROZWIĄZANA    │
│ • Koszty reklamacji                         │
│ • Raport reklamacji (trend, przyczyny)      │
└─────────────────────────────────────────────┘
```

### Metryki Sukcesu Fazy 3:

| Metryka | Cel |
|---------|-----|
| Kontrole jakości zarejestrowane | >80% etapów |
| Czas odpowiedzi na reklamację | <24h |
| Pokrycie traceability | 100% zleceń |
| OEE mierzony dla maszyn | 100% |

---

## Faza 4: System PRO (8 tygodni)

### Cel: Integracje, automatyzacja, zaawansowane funkcje

### Sprint 4.1: Integracja ERP/Księgowość (Tydzień 21-24)

```
┌─────────────────────────────────────────────┐
│        INTEGRACJA ZEWNĘTRZNA                │
├─────────────────────────────────────────────┤
│ • API adapter (wFirma / Optima / inny)      │
│ • Sync kontrahentów                         │
│ • Export faktur z kosztami                  │
│ • Import zamówień jako zlecenia             │
│ • Konfiguracja w ustawieniach               │
└─────────────────────────────────────────────┘
```

**Architektura:**
```
PlexiSystem ←→ Integration Layer ←→ External ERP
                    │
                    ├─ wFirma Adapter
                    ├─ Optima Adapter
                    └─ Generic REST Adapter
```

### Sprint 4.2: Powiadomienia (Tydzień 25-26)

```
┌─────────────────────────────────────────────┐
│           POWIADOMIENIA                     │
├─────────────────────────────────────────────┤
│ • Email: nowe przypisanie, deadline         │
│ • In-app: bell icon z licznikiem            │
│ • Push (PWA): opcjonalnie                   │
│ • Preferencje użytkownika                   │
└─────────────────────────────────────────────┘
```

**Typy powiadomień:**
- `ASSIGNMENT_NEW` - nowe zadanie
- `DEADLINE_WARNING` - termin za 24h
- `DEADLINE_OVERDUE` - przekroczony termin
- `QUALITY_ISSUE` - problem jakościowy
- `LOW_STOCK` - niski stan materiału

### Sprint 4.3: Mobile & Offline (Tydzień 27-28)

```
┌─────────────────────────────────────────────┐
│           PWA + OFFLINE                     │
├─────────────────────────────────────────────┤
│ • Service Worker dla cache                  │
│ • IndexedDB dla danych offline              │
│ • Sync queue przy połączeniu                │
│ • "Add to Home Screen"                      │
│ • Panel pracownika offline-first            │
└─────────────────────────────────────────────┘
```

**Offline scope:**
- Pracownik może: start/stop timer, dodać notatkę
- Kierownik: tylko odczyt
- Sync: background sync API

### Metryki Sukcesu Fazy 4:

| Metryka | Cel |
|---------|-----|
| Integracja ERP aktywna | Tak |
| Powiadomienia otwierane | >60% |
| Użycie PWA | >30% pracowników |
| Operacje offline/dzień | measurable |

---

## Podsumowanie Roadmapy

### Timeline

```
2025-01  ──┬── Faza 1: Stabilizacja
           │
2025-02  ──┤
           │
2025-03  ──┼── Faza 2: MES-lite Core
           │
2025-04  ──┤
           │
2025-05  ──┼── Faza 3: Jakość & Analityka
           │
2025-06  ──┤
           │
2025-07  ──┼── Faza 4: System PRO
           │
2025-08  ──┤
           │
2025-09  ──┴── [PRODUKCJA: MES-lite v1.0]
```

### Kamienie Milowe

| Milestone | Data | Kryteria |
|-----------|------|----------|
| M1: Stabilny system | Koniec Fazy 1 | 0 krytycznych błędów, audit działa |
| M2: Magazyn + Planowanie | Koniec Fazy 2 | Materiały, BOM, Gantt działają |
| M3: Jakość | Koniec Fazy 3 | QC, traceability, OEE |
| M4: System PRO | Koniec Fazy 4 | Integracje, powiadomienia |

### Zasoby

| Faza | Dev Days | Zespół min. |
|------|:--------:|:-----------:|
| Faza 1 | 20 | 1 dev |
| Faza 2 | 40 | 2 dev |
| Faza 3 | 40 | 2 dev |
| Faza 4 | 40 | 2 dev |
| **Suma** | **140** | - |

### Ryzyka

| Ryzyko | Prawdopodobieństwo | Wpływ | Mitygacja |
|--------|:------------------:|:-----:|-----------|
| Brak zasobów dev | Średnie | Wysoki | Priorytetyzacja, outsourcing |
| Scope creep | Wysokie | Średni | Strict MVP per fazę |
| Integracja ERP trudna | Średnie | Średni | Wcześniejsze POC |
| Migracja danych magazyn | Niskie | Wysoki | Skrypt + walidacja |

---

## Następne Kroki

### Do podjęcia natychmiast:

1. **Decyzja budżetowa** - ile devów, jaki timeline realny?
2. **Priorytetyzacja Fazy 2** - Magazyn czy Gantt pierwsze?
3. **Wybór biblioteki Gantt** - POC z dhtmlx vs react-gantt
4. **Setup CI/CD** - automatyczne testy i deploy
5. **Kick-off Sprint 1.1** - zacząć od security/validation

### Pytania do Właściciela Produktu:

- Jaki ERP/księgowość używacie? (dla integracji)
- Ile maszyn do wprowadzenia?
- Ile materiałów w magazynie (szacunkowo)?
- Czy są wymagania certyfikacyjne (ISO)?
- Priorytety: Magazyn vs Jakość vs Planowanie?

---

*Roadmapa wygenerowana: 2025-12-30*
*Autor: Audyt MES/ERP PlexiSystem*
*Wersja: 1.0*
