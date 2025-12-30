# ROADMAP PRODUCTION SYSTEM
## PlexiSystem MES/ERP - Plan Rozwoju

**Data utworzenia:** 2025-12-30
**Horyzont:** 12 miesięcy
**Cel:** Profesjonalny system MES klasy enterprise

---

## WIZJA PRODUKTU

**Obecnie:** MES-lite Level 1 (podstawowy system produkcyjny)
**Cel:** MES Level 3+ (pełna integracja z magazynem, traceability, ERP)

```
         Obecny stan              Cel końcowy
         ───────────              ───────────
┌─────────────────────┐    ┌─────────────────────────────┐
│   Zlecenia          │    │   Pełny cykl produkcyjny    │
│   Etapy             │    │   Zamówienie → Produkcja →  │
│   Śledzenie czasu   │───>│   Magazyn → Wysyłka →       │
│   Jakość (podstawa) │    │   Faktura → Analityka       │
│   OEE               │    │                             │
│                     │    │   + Traceability            │
│   Brak: Magazyn     │    │   + Integracja ERP          │
│   Brak: BOM         │    │   + IoT/Maszyny             │
│   Brak: Traceability│    │   + APS (Planowanie)        │
└─────────────────────┘    └─────────────────────────────┘
```

---

## FAZA 1: STABILIZACJA
**Czas trwania:** 4-6 tygodni
**Cel:** Naprawa błędów, dopięcie istniejących funkcji

### 1.1 Naprawy krytyczne

| # | Zadanie | Priorytet | Czas | Status |
|---|---------|-----------|------|--------|
| 1.1.1 | Walidacja jednej aktywnej sesji pracownika | 🔴 KRYTYCZNY | 2h | ⏳ |
| 1.1.2 | Walidacja ownership sesji pracy | 🔴 KRYTYCZNY | 2h | ⏳ |
| 1.1.3 | Blokada produkcji przy defekcie krytycznym | 🔴 KRYTYCZNY | 4h | ⏳ |
| 1.1.4 | Walidacja zakończenia zlecenia (wszystkie etapy) | 🟡 WYSOKI | 3h | ⏳ |
| 1.1.5 | Automatyczne closed_at przy GOTOWE | 🟡 WYSOKI | 1h | ⏳ |
| 1.1.6 | Filtrowanie danych dla roli PRACOWNIK | 🟡 WYSOKI | 4h | ⏳ |

### 1.2 Podstawowe usprawnienia

| # | Zadanie | Priorytet | Czas | Status |
|---|---------|-----------|------|--------|
| 1.2.1 | Czasy normatywne operacji (TPZ, TJ) | 🟡 WYSOKI | 1 tyg | ⏳ |
| 1.2.2 | Walidacja konfliktów zasobów | 🟡 WYSOKI | 1 tyg | ⏳ |
| 1.2.3 | Automatyczne kopie zapasowe (cron) | 🔴 KRYTYCZNY | 1 dzień | ⏳ |
| 1.2.4 | Audyt logów work_sessions | 🟢 ŚREDNI | 2h | ⏳ |

### 1.3 Dokumentacja

| # | Zadanie | Priorytet | Czas | Status |
|---|---------|-----------|------|--------|
| 1.3.1 | API Documentation (Swagger) | 🟡 WYSOKI | 3 dni | ⏳ |
| 1.3.2 | README z instrukcją instalacji | 🟢 ŚREDNI | 1 dzień | ⏳ |
| 1.3.3 | Dokumentacja użytkownika | 🟢 ŚREDNI | 3 dni | ⏳ |

### Wpływ Fazy 1:
- ✅ Eliminacja błędów bezpieczeństwa
- ✅ Stabilna podstawa do dalszego rozwoju
- ✅ Możliwość wdrożenia produkcyjnego

### Deliverables:
- [ ] Wszystkie testy przechodzą (100%)
- [ ] Dokumentacja API dostępna pod `/api-docs`
- [ ] Backup bazy codziennie o 2:00
- [ ] Zero krytycznych bugów

---

## FAZA 2: PROFESJONALNY MES-LITE
**Czas trwania:** 8-10 tygodni
**Cel:** Dodanie kluczowych brakujących modułów

### 2.1 Moduł magazynowy (Sprint 1-2)

| # | Zadanie | Czas | Status |
|---|---------|------|--------|
| 2.1.1 | Model danych (inventory_items, transactions, locations) | 2 dni | ⏳ |
| 2.1.2 | API CRUD dla stanów magazynowych | 3 dni | ⏳ |
| 2.1.3 | UI: Lista stanów magazynowych | 2 dni | ⏳ |
| 2.1.4 | UI: Przyjęcie zewnętrzne (PZ) | 2 dni | ⏳ |
| 2.1.5 | UI: Wydanie zewnętrzne (WZ) | 2 dni | ⏳ |
| 2.1.6 | Rezerwacje pod zlecenia | 3 dni | ⏳ |
| 2.1.7 | Alerty niskiego stanu | 1 dzień | ⏳ |
| 2.1.8 | Testy i dokumentacja | 2 dni | ⏳ |

**Schemat bazy:**
```sql
inventory_items, inventory_transactions, storage_locations
```

### 2.2 BOM - Bill of Materials (Sprint 3-4)

| # | Zadanie | Czas | Status |
|---|---------|------|--------|
| 2.2.1 | Model danych (products, bom_headers, bom_lines) | 2 dni | ⏳ |
| 2.2.2 | API CRUD dla produktów i BOM | 3 dni | ⏳ |
| 2.2.3 | UI: Katalog produktów | 2 dni | ⏳ |
| 2.2.4 | UI: Edytor BOM | 3 dni | ⏳ |
| 2.2.5 | Wersjonowanie BOM | 2 dni | ⏳ |
| 2.2.6 | Automatyczna kalkulacja zużycia | 2 dni | ⏳ |
| 2.2.7 | Integracja z magazynem (rezerwacje) | 2 dni | ⏳ |

**Schemat bazy:**
```sql
products, bom_headers, bom_lines, routings
```

### 2.3 Traceability (Sprint 5)

| # | Zadanie | Czas | Status |
|---|---------|------|--------|
| 2.3.1 | Model danych (lot_tracking, genealogy) | 1 dzień | ⏳ |
| 2.3.2 | Przypisywanie partii przy przyjęciu | 2 dni | ⏳ |
| 2.3.3 | Śledzenie partii przez produkcję | 2 dni | ⏳ |
| 2.3.4 | Genealogia produktu (widok) | 2 dni | ⏳ |
| 2.3.5 | Funkcja recall (wycofanie partii) | 2 dni | ⏳ |

**Schemat bazy:**
```sql
lot_tracking, lot_genealogy, recalls
```

### 2.4 Planowanie zaawansowane (Sprint 6)

| # | Zadanie | Czas | Status |
|---|---------|------|--------|
| 2.4.1 | Drag & Drop w Gantt | 5 dni | ⏳ |
| 2.4.2 | Wykrywanie konfliktów wizualne | 2 dni | ⏳ |
| 2.4.3 | Automatyczne przeplanowanie | 3 dni | ⏳ |
| 2.4.4 | Symulacja "what-if" | 3 dni | ⏳ |

### 2.5 Jakość rozszerzona (Sprint 7)

| # | Zadanie | Czas | Status |
|---|---------|------|--------|
| 2.5.1 | CAPA workflow | 3 dni | ⏳ |
| 2.5.2 | Reklamacje klientów | 3 dni | ⏳ |
| 2.5.3 | Raporty jakościowe rozszerzone | 2 dni | ⏳ |
| 2.5.4 | SPC (Statistical Process Control) - podstawy | 2 dni | ⏳ |

### Wpływ Fazy 2:
- ✅ Pełna kontrola stanów magazynowych
- ✅ Automatyczna kalkulacja zużycia materiałów
- ✅ Zgodność z ISO 9001 (traceability)
- ✅ Interaktywne planowanie produkcji
- ✅ Profesjonalne zarządzanie jakością

### Deliverables:
- [ ] Moduł magazynowy w pełni funkcjonalny
- [ ] BOM z wersjonowaniem
- [ ] Pełna identyfikowalność partii
- [ ] Drag & drop Gantt
- [ ] CAPA workflow

---

## FAZA 3: SYSTEM KLASY PRO
**Czas trwania:** 10-12 tygodni
**Cel:** Integracje, automatyzacja, enterprise features

### 3.1 Integracja ERP/Księgowość (Sprint 8-9)

| # | Zadanie | Czas | Status |
|---|---------|------|--------|
| 3.1.1 | Analiza dostępnych API (WFirma, inFakt, Optima) | 2 dni | ⏳ |
| 3.1.2 | Warstwa abstrakcji integracji | 3 dni | ⏳ |
| 3.1.3 | Eksport faktur do ERP | 5 dni | ⏳ |
| 3.1.4 | Import zamówień z ERP | 5 dni | ⏳ |
| 3.1.5 | Synchronizacja kartotek | 3 dni | ⏳ |
| 3.1.6 | UI: Panel integracji | 2 dni | ⏳ |

### 3.2 Real-time monitoring (Sprint 10)

| # | Zadanie | Czas | Status |
|---|---------|------|--------|
| 3.2.1 | WebSocket server (Socket.io) | 2 dni | ⏳ |
| 3.2.2 | Live updates na dashboardach | 3 dni | ⏳ |
| 3.2.3 | Andon board (ekran halowy) | 3 dni | ⏳ |
| 3.2.4 | Push notifications (Web Push) | 2 dni | ⏳ |

### 3.3 Automatyzacja (Sprint 11)

| # | Zadanie | Czas | Status |
|---|---------|------|--------|
| 3.3.1 | Reguły automatyzacji (event-driven) | 5 dni | ⏳ |
| 3.3.2 | Automatyczne zamówienia materiałów | 3 dni | ⏳ |
| 3.3.3 | Scheduled reports (email dzienny/tygodniowy) | 2 dni | ⏳ |
| 3.3.4 | Workflow engine (podstawy) | 5 dni | ⏳ |

### 3.4 Advanced Analytics (Sprint 12)

| # | Zadanie | Czas | Status |
|---|---------|------|--------|
| 3.4.1 | Custom reports builder | 5 dni | ⏳ |
| 3.4.2 | Drill-down dashboards | 3 dni | ⏳ |
| 3.4.3 | Trend analysis | 2 dni | ⏳ |
| 3.4.4 | Predictive maintenance (ML basics) | 5 dni | ⏳ |

### 3.5 Enterprise features (Sprint 13)

| # | Zadanie | Czas | Status |
|---|---------|------|--------|
| 3.5.1 | Multi-language (i18n) | 5 dni | ⏳ |
| 3.5.2 | Multi-tenant (opcjonalnie) | 10 dni | ⏳ |
| 3.5.3 | SSO (SAML/OAuth) | 3 dni | ⏳ |
| 3.5.4 | Audit compliance reporting | 3 dni | ⏳ |

### Wpływ Fazy 3:
- ✅ Eliminacja podwójnego wprowadzania danych
- ✅ Real-time visibility na hali
- ✅ Automatyzacja rutynowych zadań
- ✅ Zaawansowana analityka
- ✅ Gotowość na skalowanie

### Deliverables:
- [ ] Integracja z minimum 1 systemem ERP
- [ ] WebSocket live updates
- [ ] Andon board ready
- [ ] Custom reports builder
- [ ] Multi-language (PL + EN)

---

## FAZA 4: ROZSZERZENIA (ONGOING)
**Czas:** Ciągły rozwój
**Cel:** Integracja IoT, AI, przewaga konkurencyjna

### 4.1 Integracja IoT / Maszyny

| # | Zadanie | Czas | Status |
|---|---------|------|--------|
| 4.1.1 | OPC-UA connector | 2 tyg | ⏳ |
| 4.1.2 | MQTT broker integration | 1 tyg | ⏳ |
| 4.1.3 | Automatyczne zliczanie sztuk | 2 tyg | ⏳ |
| 4.1.4 | Automatyczne przestoje | 1 tyg | ⏳ |
| 4.1.5 | Integracja z konkretnymi maszynami CNC | ongoing | ⏳ |

### 4.2 AI/ML Features

| # | Zadanie | Czas | Status |
|---|---------|------|--------|
| 4.2.1 | Predictive maintenance | 4 tyg | ⏳ |
| 4.2.2 | Demand forecasting | 4 tyg | ⏳ |
| 4.2.3 | Quality prediction | 4 tyg | ⏳ |
| 4.2.4 | Schedule optimization (AI) | 6 tyg | ⏳ |

### 4.3 Mobile/Offline

| # | Zadanie | Czas | Status |
|---|---------|------|--------|
| 4.3.1 | PWA offline mode | 2 tyg | ⏳ |
| 4.3.2 | Barcode/QR scanner | 1 tyg | ⏳ |
| 4.3.3 | Native mobile app (React Native) | 6 tyg | ⏳ |
| 4.3.4 | Voice commands | 2 tyg | ⏳ |

---

## TIMELINE WIZUALNA

```
2025
────────────────────────────────────────────────────────────────
Q1                    Q2                    Q3                Q4
────────────────────────────────────────────────────────────────

FAZA 1: STABILIZACJA
[████████] 4-6 tyg
     │
     └─── Naprawy krytyczne, dokumentacja, backup

FAZA 2: MES-LITE PRO
         [████████████████████] 8-10 tyg
                │
                ├─── Magazyn (Sprint 1-2)
                ├─── BOM (Sprint 3-4)
                ├─── Traceability (Sprint 5)
                ├─── Planowanie (Sprint 6)
                └─── Jakość+ (Sprint 7)

FAZA 3: SYSTEM KLASY PRO
                              [████████████████████████] 10-12 tyg
                                       │
                                       ├─── Integracja ERP
                                       ├─── Real-time
                                       ├─── Automatyzacja
                                       └─── Enterprise

FAZA 4: ROZSZERZENIA
                                                        [████████...
                                                             │
                                                             └─── IoT, AI, Mobile
```

---

## METRYKI SUKCESU

### Faza 1 (Stabilizacja)
| Metryka | Cel | Metoda pomiaru |
|---------|-----|----------------|
| Krytyczne bugi | 0 | JIRA/GitHub Issues |
| Test coverage | >70% | Jest coverage |
| Uptime | 99.5% | Monitoring |

### Faza 2 (MES-lite PRO)
| Metryka | Cel | Metoda pomiaru |
|---------|-----|----------------|
| Dokładność stanów magazynowych | >98% | Inwentaryzacja |
| Czas tworzenia zlecenia | -50% | Pomiar UX |
| Identyfikowalność partii | 100% | Audit |

### Faza 3 (System klasy PRO)
| Metryka | Cel | Metoda pomiaru |
|---------|-----|----------------|
| Czas fakturowania | -80% | Integracja ERP |
| Real-time data latency | <5s | Monitoring |
| Użytkownicy jednoczesnych | >50 | Load testing |

### Faza 4 (Rozszerzenia)
| Metryka | Cel | Metoda pomiaru |
|---------|-----|----------------|
| Automatyczne raportowanie maszyn | >80% | IoT coverage |
| Trafność predykcji | >85% | ML metrics |
| Offline usage | Możliwe | PWA tests |

---

## ZASOBY WYMAGANE

### Zespół rozwojowy
| Rola | Faza 1 | Faza 2 | Faza 3 | Faza 4 |
|------|--------|--------|--------|--------|
| Backend Developer | 1 | 2 | 2 | 2 |
| Frontend Developer | 1 | 1 | 1 | 2 |
| QA Engineer | 0.5 | 1 | 1 | 1 |
| DevOps | 0.25 | 0.5 | 0.5 | 1 |
| Product Owner | 0.5 | 0.5 | 1 | 1 |

### Budżet szacunkowy (w PLN)
| Faza | Development | Infrastruktura | Razem |
|------|-------------|----------------|-------|
| Faza 1 | 30 000 | 2 000 | 32 000 |
| Faza 2 | 80 000 | 5 000 | 85 000 |
| Faza 3 | 100 000 | 10 000 | 110 000 |
| Faza 4 | 150 000+ | 20 000+ | 170 000+ |
| **RAZEM** | **360 000** | **37 000** | **397 000** |

---

## RYZYKA I MITYGACJA

| Ryzyko | Prawdopodobieństwo | Wpływ | Mitygacja |
|--------|-------------------|-------|-----------|
| Opóźnienia w Fazie 2 (magazyn) | Średnie | Wysoki | Buffer 2 tygodnie |
| Integracja ERP trudniejsza niż zakładano | Wysokie | Średni | Rozpocząć POC wcześniej |
| Brak zasobów deweloperskich | Średnie | Wysoki | Outsourcing jako backup |
| Zmiana priorytetów biznesowych | Średnie | Wysoki | Regularne review z PO |
| Technical debt z Fazy 1 | Niskie | Średni | Refactoring sprint |

---

## KAMIENIE MILOWE

| # | Milestone | Data docelowa | Kryteria akceptacji |
|---|-----------|---------------|---------------------|
| M1 | Stabilny system produkcyjny | +6 tyg | Zero krytycznych bugów, backup działa |
| M2 | Moduł magazynowy live | +12 tyg | PZ/WZ działają, stany aktualne |
| M3 | BOM + Traceability | +18 tyg | Pełna genealogia produktu |
| M4 | Drag & drop Gantt | +22 tyg | Interaktywne planowanie |
| M5 | Integracja ERP | +30 tyg | Faktury exportowane automatycznie |
| M6 | Real-time monitoring | +34 tyg | WebSocket live, Andon board |
| M7 | Enterprise ready | +40 tyg | Multi-lang, SSO, compliance |

---

## NASTĘPNE KROKI (IMMEDIATE ACTIONS)

1. **Tydzień 1:**
   - [ ] Naprawić walidację aktywnej sesji (Problem #3)
   - [ ] Naprawić walidację ownership (Problem #8)
   - [ ] Skonfigurować automatyczny backup

2. **Tydzień 2:**
   - [ ] Implementacja blokady przy defekcie krytycznym
   - [ ] Walidacja zakończenia zlecenia
   - [ ] Dokumentacja Swagger

3. **Tydzień 3-4:**
   - [ ] Czasy normatywne (TPZ, TJ)
   - [ ] Walidacja konfliktów zasobów
   - [ ] Testy integracyjne

4. **Tydzień 5-6:**
   - [ ] Przegląd Fazy 1
   - [ ] Planowanie szczegółowe Fazy 2
   - [ ] Setup środowiska staging

---

**Dokument utworzony:** 2025-12-30
**Właściciel:** Product Owner
**Review:** Kwartalnie

---

*"A journey of a thousand miles begins with a single step."*
*Profesjonalny system MES zaczyna się od naprawy krytycznych błędów.*
