# SYSTEM FUNCTIONALITY MAP
## PlexiSystem MES/ERP - Audyt Funkcjonalności

**Data audytu:** 2025-12-30
**System:** PlexiSystem (Task-Usher-App)
**Wersja:** 1.0.0
**Technologia:** Node.js + Express + TypeScript + PostgreSQL + React + Vite

---

## PODSUMOWANIE WYKONAWCZE

PlexiSystem to system klasy **MES-lite** (Manufacturing Execution System) z elementami ERP, zaprojektowany dla produkcji plexi/akrylu. System obsługuje pełny cykl życia zlecenia produkcyjnego od przyjęcia zamówienia do wysyłki, z wbudowanym śledzeniem czasu pracy, kontrolą jakości i zarządzaniem utrzymaniem ruchu.

### Statystyki systemu:
- **Endpointy API:** 100+
- **Tabele bazy danych:** 26
- **Role użytkowników:** 6
- **Etapy produkcyjne:** 12 (konfigurowalne)
- **Ekrany UI:** 25+

---

## 1. MODUŁ: UŻYTKOWNICY I ROLE

### 1.1 Role systemowe

| Rola | Opis | Uprawnienia |
|------|------|-------------|
| **ADMIN** | Administrator | Pełny dostęp, bypass wszystkich kontroli uprawnień |
| **KIEROWNIK** | Manager/Kierownik produkcji | Planowanie, raporty, zarządzanie zleceniami, audit |
| **MANAGER** | Manager (alias) | Tworzenie/edycja zleceń, przydzielanie pracowników |
| **HANDLOWIEC** | Sprzedawca | Tworzenie zleceń, klienci, wysyłki, komentarze |
| **GRAFIK** | Projektant | Przygotowanie graficzne, oznaczanie etapów jako gotowe |
| **PRACOWNIK** | Operator | Wykonywanie zadań, rejestracja czasu, raportowanie ilości |

### 1.2 Ekrany UI

| Ekran | Route | Opis |
|-------|-------|------|
| Login PIN | `/login` | Logowanie kodem PIN (4-6 cyfr) |
| Dashboard Admin | `/admin` | Panel administracyjny |
| Zarządzanie pracownikami | `/admin/workers` | CRUD pracowników |
| Zarządzanie maszynami | `/admin/machines` | CRUD maszyn |
| Ustawienia systemowe | `/admin/settings` | Konfiguracja firmy, etapy |
| Ceny materiałów | `/admin/prices` | Katalog cen materiałów |

### 1.3 Endpointy API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/auth/login` | Logowanie email/hasło |
| POST | `/api/auth/pin` | Logowanie PIN |
| GET | `/api/auth/me` | Profil zalogowanego użytkownika |
| POST | `/api/auth/register` | Rejestracja pracownika (ADMIN/KIEROWNIK) |
| PUT | `/api/auth/change-password` | Zmiana hasła |
| GET | `/api/workers` | Lista pracowników |
| POST | `/api/workers` | Tworzenie pracownika |
| PUT | `/api/workers/:id` | Edycja pracownika |
| DELETE | `/api/workers/:id` | Usunięcie pracownika (soft/hard) |

### 1.4 Model danych

```
workers
├─ id, name, email, pin, password_hash
├─ position (stanowisko)
├─ role (rola systemowa)
├─ hourly_rate (stawka godzinowa)
├─ skills[] (umiejętności/etapy)
├─ active (aktywny)
└─ created_at, updated_at
```

### 1.5 Powiązania

- Workers → Assignments (przydzielenia do etapów)
- Workers → Work Sessions (sesje pracy)
- Workers → Quality Checks (kontrole jakości)
- Workers → Audit Logs (ślad audytowy)

---

## 2. MODUŁ: ZLECENIA PRODUKCYJNE

### 2.1 Ekrany UI

| Ekran | Route | Opis |
|-------|-------|------|
| Lista zleceń | `/manager/orders` | Przegląd wszystkich zleceń z filtrami |
| Szczegóły zlecenia | `/manager/orders/:id` | Pełne informacje o zleceniu |
| Formularz zlecenia | `/manager/orders/new` | Tworzenie nowego zlecenia |
| Edycja zlecenia | `/manager/orders/:id/edit` | Modyfikacja zlecenia |

### 2.2 Statusy zleceń

```
NOWE → W_TRAKCIE → GOTOWE → (archiwizacja)
```

| Status | Znaczenie |
|--------|-----------|
| NOWE | Nowe zlecenie, oczekuje na start |
| W_TRAKCIE | W produkcji |
| GOTOWE | Zakończone |

### 2.3 Priorytety

| Priorytet | Kolor | Znaczenie |
|-----------|-------|-----------|
| URGENT | Czerwony | Pilne |
| HIGH | Pomarańczowy | Wysoki |
| NORMAL | Niebieski | Normalny |
| LOW | Szary | Niski |

### 2.4 Endpointy API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/orders` | Lista zleceń (filtry: status, archived, search) |
| GET | `/api/orders/:id` | Szczegóły zlecenia z etapami i wysyłkami |
| POST | `/api/orders` | Tworzenie zlecenia (MANAGER) |
| PUT | `/api/orders/:id` | Aktualizacja zlecenia |
| DELETE | `/api/orders/:id` | Usunięcie zlecenia |
| POST | `/api/orders/:id/archive` | Archiwizacja |
| POST | `/api/orders/:id/unarchive` | Przywrócenie z archiwum |

### 2.5 Model danych

```
orders
├─ id, order_number (unikatowy), client_order_number
├─ client_name, client_email, client_phone, client_address
├─ product_name, quantity
├─ price_total, price_per_unit
├─ status, priority
├─ planned_completion_date, closed_at
├─ material_cost, notes, folder_path
├─ invoice_number, invoice_date
├─ current_stage, archived, created_by
└─ created_at, updated_at
```

### 2.6 Powiązania

- Orders → Stages (etapy produkcyjne)
- Orders → Quality Checks (kontrole jakości)
- Orders → Defects (wady)
- Orders → Documents (dokumenty)
- Orders → Shipments (wysyłki)

---

## 3. MODUŁ: ETAPY PRODUKCYJNE

### 3.1 Domyślne etapy

| # | Etap | Wymagany | Opis |
|---|------|----------|------|
| 1 | HANDLOWIEC | Tak | Obsługa handlowa |
| 2 | GRAFIK | Tak | Przygotowanie projektu |
| 3 | FREZOWANIE/LASER | Tak | Cięcie CNC/Laser |
| 4 | POLEROWANIE | Nie | Polerowanie krawędzi |
| 5 | WYGINANIE | Nie | Gięcie termiczne |
| 6 | KLEJENIE | Nie | Klejenie elementów |
| 7 | DRUKOWANIE | Nie | Druk UV/solventowy |
| 8 | OKLEJANIE | Nie | Oklejanie folią |
| 9 | PAKOWANIE | Tak | Pakowanie |
| 10 | WYSYŁKA | Tak | Wysyłka do klienta |
| 11 | FAKTURA | Tak | Fakturowanie |
| 12 | ZAMKNIĘCIE | Tak | Zamknięcie zlecenia |

### 3.2 Statusy etapów

```
NOWY → W_TRAKCIE → GOTOWY
```

### 3.3 Endpointy API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/orders/:orderId/stages` | Etapy zlecenia |
| POST | `/api/orders/:orderId/stages` | Dodanie etapu |
| GET | `/api/stages/:id` | Szczegóły etapu |
| PUT | `/api/stages/:id` | Aktualizacja etapu |
| DELETE | `/api/stages/:id` | Usunięcie etapu |

### 3.4 Model danych

```
stages
├─ id, order_id (FK)
├─ stage_number, stage_name
├─ is_required, status
├─ sequence_order
└─ created_at, updated_at
```

---

## 4. MODUŁ: PRZYDZIELENIA I ŚLEDZENIE CZASU

### 4.1 Ekrany UI

| Ekran | Route | Opis |
|-------|-------|------|
| Moje zadania | `/worker/stages` | Lista przydzielonych etapów |
| Timer pracy | w MyStages | Stoper z rejestracją czasu |
| Historia pracy | `/worker/history` | Historia sesji (mobile) |

### 4.2 Funkcjonalność timera

- Start/Stop sesji pracy
- Śledzenie przerw
- Wprowadzanie ilości: wykonane / wadliwe
- Automatyczne obliczanie kosztu (godziny × stawka)
- Kaskadowa aktualizacja statusów (etap → zlecenie)

### 4.3 Endpointy API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/stages/:stageId/assignments` | Przydzielenie pracownika |
| GET | `/api/assignments/:id` | Szczegóły przydzielenia |
| PUT | `/api/assignments/:id` | Aktualizacja |
| DELETE | `/api/assignments/:id` | Usunięcie |
| POST | `/api/assignments/:id/start` | Start timera |
| POST | `/api/assignments/:id/stop` | Stop timera |
| GET | `/api/assignments/:id/sessions` | Sesje pracy |
| GET | `/api/work-sessions/worker/:id/active` | Aktywna sesja |

### 4.4 Model danych

```
assignments
├─ id, stage_id (FK), worker_id (FK)
├─ status (NOWY, W_TRAKCIE, GOTOWY)
├─ assigned_at, completed_at
└─ created_at, updated_at

work_sessions
├─ id, assignment_id (FK)
├─ start_time, end_time
├─ duration_minutes, cost
└─ created_at
```

---

## 5. MODUŁ: MASZYNY

### 5.1 Ekrany UI

| Ekran | Route | Opis |
|-------|-------|------|
| Lista maszyn | `/admin/machines` | Zarządzanie maszynami |
| Park maszynowy | `/manager/machines` | Przegląd dla kierownika |

### 5.2 Statusy maszyn

| Status | Znaczenie |
|--------|-----------|
| available | Dostępna |
| in_use | W użyciu |
| maintenance | Konserwacja |
| offline | Wyłączona |

### 5.3 Endpointy API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/machines` | Lista maszyn |
| GET | `/api/machines/:id` | Szczegóły maszyny |
| POST | `/api/machines` | Tworzenie maszyny |
| PUT | `/api/machines/:id` | Edycja maszyny |
| DELETE | `/api/machines/:id` | Usunięcie maszyny |
| PUT | `/api/machines/:id/status` | Zmiana statusu |

### 5.4 Model danych

```
machines
├─ id, name
├─ cost_per_hour (koszt/godz)
├─ description, department
├─ status, active
├─ specifications (JSON)
└─ created_at, updated_at
```

---

## 6. MODUŁ: PLANOWANIE PRODUKCJI

### 6.1 Ekrany UI

| Ekran | Route | Opis |
|-------|-------|------|
| Wykres Gantta | `/manager/gantt` | Wizualizacja harmonogramu |
| Zdolności produkcyjne | `/manager/capacity` | Analiza obciążenia |
| Kalendarz produkcji | `/manager/calendar` | Widok kalendarza |

### 6.2 Widoki Gantta

- **Dzień** - szczegółowy widok
- **Tydzień** - widok tygodniowy
- **Miesiąc** - przegląd miesięczny

### 6.3 Endpointy API - Capacity

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/capacity/overview` | Przegląd zdolności |
| GET | `/api/capacity/forecast` | Prognoza obciążenia (21 dni) |
| GET | `/api/capacity/bottlenecks` | Analiza wąskich gardeł |
| GET | `/api/capacity/workers` | Dostępność pracowników |

### 6.4 Endpointy API - Kalendarz

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/calendar/events` | Lista wydarzeń |
| POST | `/api/calendar/events` | Tworzenie wydarzenia |
| PUT | `/api/calendar/events/:id` | Edycja |
| DELETE | `/api/calendar/events/:id` | Usunięcie |
| GET | `/api/calendar/production-schedule` | Harmonogram produkcji |
| POST | `/api/calendar/google/sync` | Synchronizacja z Google |

---

## 7. MODUŁ: KONTROLA JAKOŚCI

### 7.1 Ekrany UI

| Ekran | Route | Opis |
|-------|-------|------|
| Dashboard jakości | `/manager/quality` | Statystyki jakościowe |
| Kontrole dla zlecenia | w OrderDetails | Lista kontroli |
| Defekty | w QualityDashboard | Zarządzanie wadami |

### 7.2 Typy kontroli

| Typ | Znaczenie |
|-----|-----------|
| incoming | Kontrola wejściowa |
| in_process | Kontrola w trakcie produkcji |
| final | Kontrola końcowa |
| random | Kontrola wyrywkowa |

### 7.3 Statusy kontroli

| Status | Znaczenie |
|--------|-----------|
| pending | Oczekuje |
| passed | Zaliczony |
| failed | Niezaliczony |
| conditional | Warunkowo zaliczony |

### 7.4 Severity defektów

| Severity | Znaczenie |
|----------|-----------|
| cosmetic | Kosmetyczny |
| minor | Drobny |
| major | Poważny |
| critical | Krytyczny |

### 7.5 Endpointy API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/quality/checkpoints` | Szablony kontroli |
| POST | `/api/quality/checkpoints` | Tworzenie szablonu |
| GET | `/api/quality/checks` | Lista kontroli |
| PUT | `/api/quality/checks/:id` | Aktualizacja kontroli |
| GET | `/api/quality/defects` | Lista defektów |
| PUT | `/api/quality/defects/:id` | Aktualizacja defektu |
| GET | `/api/quality/stats` | Statystyki jakości |
| POST | `/api/orders/:id/quality-checks` | Kontrola dla zlecenia |
| POST | `/api/orders/:id/defects` | Raportowanie defektu |

### 7.6 Model danych

```
qc_checkpoints
├─ id, name, description, category
├─ measurement_type (boolean/numeric/text/select)
├─ min_value, max_value, unit, options
├─ is_critical, sequence_order, active

quality_checks
├─ id, order_id, stage_id, checkpoint_id
├─ inspector_id, check_type, status
├─ measured_value, is_within_tolerance, notes

defects
├─ id, order_id, quality_check_id, stage_id
├─ reported_by, defect_type, severity, status
├─ description, root_cause, corrective_action
├─ quantity_affected, cost_impact, photos
├─ resolved_by, resolved_at
```

---

## 8. MODUŁ: UTRZYMANIE RUCHU (TPM)

### 8.1 Ekrany UI

| Ekran | Route | Opis |
|-------|-------|------|
| Dashboard TPM | `/manager/maintenance` | Harmonogramy konserwacji |
| Szczegóły harmonogramu | w MaintenanceDashboard | Szczegóły zadania |

### 8.2 Typy konserwacji

| Typ | Znaczenie |
|-----|-----------|
| preventive | Prewencyjna |
| corrective | Korekcyjna |
| predictive | Predykcyjna |
| inspection | Przegląd |

### 8.3 Statusy harmonogramów

| Status | Znaczenie |
|--------|-----------|
| scheduled | Zaplanowana |
| in_progress | W trakcie |
| completed | Zakończona |
| overdue | Przeterminowana |
| cancelled | Anulowana |

### 8.4 Endpointy API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/maintenance/schedules` | Lista harmonogramów |
| GET | `/api/maintenance/schedules/:id` | Szczegóły z logami |
| POST | `/api/maintenance/schedules` | Tworzenie harmonogramu |
| PUT | `/api/maintenance/schedules/:id` | Edycja |
| DELETE | `/api/maintenance/schedules/:id` | Usunięcie |
| POST | `/api/maintenance/schedules/:id/start` | Start prac |
| POST | `/api/maintenance/schedules/:id/complete` | Zakończenie prac |
| GET | `/api/maintenance/logs` | Logi konserwacji |
| GET | `/api/maintenance/stats` | Statystyki |

### 8.5 Model danych

```
maintenance_schedules
├─ id, machine_id, maintenance_type
├─ title, description, frequency_days
├─ last_performed_at, next_due_at
├─ estimated_duration_hours, assigned_to
├─ priority, status, checklist, notes

maintenance_logs
├─ id, schedule_id, machine_id, performed_by
├─ maintenance_type, title, description
├─ started_at, completed_at, duration_hours
├─ parts_used, cost, findings, actions_taken
```

---

## 9. MODUŁ: RAPORTY I ANALITYKA

### 9.1 Ekrany UI

| Ekran | Route | Opis |
|-------|-------|------|
| Dashboard KPI | `/manager/kpi` | Wskaźniki efektywności |
| OEE Dashboard | `/manager/oee` | Overall Equipment Effectiveness |
| Raport produkcji | `/manager/production-report` | Szczegółowy raport |
| Raport czasu pracy | `/manager/reports` | Czas pracy pracowników |
| Kalkulator kosztów | `/manager/costs` | Kalkulator wyceny |
| Eksport danych | `/manager/export` | Export Excel/PDF/CSV |

### 9.2 Metryki OEE

- **Availability** = Czas pracy / Planowany czas
- **Performance** = Rzeczywista wydajność / Teoretyczna wydajność
- **Quality** = Dobre sztuki / Wszystkie sztuki
- **OEE** = Availability × Performance × Quality

### 9.3 Endpointy API - Raporty

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/reports/order/:id` | Raport zlecenia |
| GET | `/api/reports/export/:id` | Eksport zlecenia |
| GET | `/api/reports/worker/:id` | Raport pracownika |
| GET | `/api/reports/summary` | Podsumowanie produkcji |

### 9.4 Endpointy API - Produkcja

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/production-reports` | Kompleksowe metryki |
| GET | `/api/production-reports/comparison` | Porównanie okresów |
| GET | `/api/production-reports/export` | Eksport do Excel |

### 9.5 Metryki raportów

- Liczba zleceń (total, completed, in_progress)
- Ilości (total_quantity, completed_quantity)
- Przychody (total_revenue, completed_revenue)
- Sesje pracy (total_sessions, active_workers)
- Godziny pracy (total_hours, avg_session)
- Podział na działy

---

## 10. MODUŁ: KOSZTY I WYCENY

### 10.1 Ekrany UI

| Ekran | Route | Opis |
|-------|-------|------|
| Kalkulator kosztów | `/manager/costs` | Wycena zlecenia |
| Ceny materiałów | `/admin/prices` | Katalog materiałów |

### 10.2 Składniki kosztów

1. **Koszt materiałów** - ilość × cena jednostkowa
2. **Koszt pracy** - sesje × stawka godzinowa
3. **Koszt maszyn** - czas × koszt/godzinę
4. **Marże** - materiał, praca, narzut, zysk

### 10.3 Endpointy API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/costs/orders/:id` | Koszty zlecenia |
| PUT | `/api/costs/orders/:id/material` | Aktualizacja kosztu materiału |
| GET | `/api/costs/summary` | Podsumowanie kosztów |
| POST | `/api/costs/quote` | Kalkulacja wyceny |

### 10.4 Ustawienia produkcji

| Klucz | Wartość | Opis |
|-------|---------|------|
| material_margin | 15% | Marża na materiałach |
| labor_margin | 25% | Marża na pracy |
| overhead_rate | 10% | Narzut ogólny |
| profit_margin | 20% | Marża zysku |
| waste_factor | 5% | Współczynnik odpadów |
| hourly_rate | 80 PLN | Bazowa stawka |
| machine_rate | 50 PLN/h | Koszt maszyn |

---

## 11. MODUŁ: WYSYŁKI I LOGISTYKA

### 11.1 Integracja Apaczka

System zintegrowany z API Apaczka do:
- Generowania etykiet wysyłkowych
- Śledzenia przesyłek
- Aktualizacji statusów

### 11.2 Statusy wysyłek

| Status | Znaczenie |
|--------|-----------|
| OCZEKUJE | Oczekuje na nadanie |
| ZAMÓWIONA | Zamówiona u kuriera |
| W_DRODZE | W transporcie |
| DOSTARCZONA | Dostarczona |

### 11.3 Endpointy API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/shipments/services` | Dostępne usługi |
| GET | `/api/shipments/:id` | Szczegóły wysyłki |
| PUT | `/api/shipments/:id` | Edycja |
| DELETE | `/api/shipments/:id` | Usunięcie |
| POST | `/api/shipments/:id/refresh-status` | Odświeżenie statusu |
| GET | `/api/orders/:id/shipments` | Wysyłki zlecenia |
| POST | `/api/orders/:id/shipments` | Tworzenie wysyłki |

---

## 12. MODUŁ: DOKUMENTY

### 12.1 Kategorie dokumentów

| Kategoria | Znaczenie |
|-----------|-----------|
| drawing | Rysunki techniczne |
| specification | Specyfikacje |
| photo | Zdjęcia |
| contract | Umowy |
| invoice | Faktury |
| other | Inne |

### 12.2 Funkcjonalności

- Upload plików
- Wersjonowanie dokumentów
- Kategorizacja
- Śledzenie kto uploadował
- Pobieranie

### 12.3 Endpointy API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/documents/orders/:id` | Dokumenty zlecenia |
| GET | `/api/documents/:id` | Szczegóły dokumentu |
| POST | `/api/documents` | Upload |
| PUT | `/api/documents/:id` | Aktualizacja metadanych |
| DELETE | `/api/documents/:id` | Usunięcie |
| GET | `/api/documents/:id/versions` | Historia wersji |
| POST | `/api/documents/:id/versions` | Nowa wersja |

---

## 13. MODUŁ: POWIADOMIENIA I KOMUNIKACJA

### 13.1 Kategorie powiadomień

| Kategoria | Znaczenie |
|-----------|-----------|
| order | Zdarzenia zleceń |
| quality | Problemy jakościowe |
| machine | Status maszyn |
| maintenance | Konserwacja |
| system | Komunikaty systemowe |
| alert | Alerty krytyczne |

### 13.2 Funkcjonalności

- Powiadomienia in-app
- Email (SMTP)
- Preferencje użytkownika
- Automatyczne powiadomienia (deadline, jakość, konserwacja)
- Ogłoszenia firmowe (pinned, expiring)

### 13.3 Endpointy API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/notifications` | Lista powiadomień |
| POST | `/api/notifications/mark-read` | Oznacz jako przeczytane |
| GET | `/api/notifications/settings` | Preferencje |
| PUT | `/api/notifications/settings` | Zmiana preferencji |
| POST | `/api/notifications/broadcast` | Broadcast |
| GET | `/api/announcements` | Ogłoszenia |
| POST | `/api/announcements` | Tworzenie ogłoszenia |

---

## 14. MODUŁ: AUDIT TRAIL

### 14.1 Ekrany UI

| Ekran | Route | Opis |
|-------|-------|------|
| Audit Trail | `/manager/audit` | Historia zmian |

### 14.2 Śledzone operacje

| Akcja | Znaczenie |
|-------|-----------|
| CREATE | Utworzenie rekordu |
| UPDATE | Modyfikacja |
| DELETE | Usunięcie |
| ARCHIVE | Archiwizacja |
| RESTORE | Przywrócenie |

### 14.3 Dane audytowe

- Nazwa tabeli, ID rekordu
- Stare wartości (JSON)
- Nowe wartości (JSON)
- Lista zmienionych pól
- User ID, Email, Rola
- Adres IP, User-Agent
- Timestamp

### 14.4 Endpointy API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/audit` | Logi audytowe (z filtrami) |
| GET | `/api/audit/:table/:recordId` | Historia rekordu |

---

## 15. MODUŁ: USTAWIENIA SYSTEMOWE

### 15.1 Ustawienia firmy

- Nazwa firmy
- NIP
- Adres
- Email kontaktowy
- Telefon

### 15.2 Ustawienia produkcji

- Domyślna stawka pracownika
- Domyślna stawka maszyny
- Marże (materiał, praca, narzut, zysk)
- Współczynnik odpadów
- Konfigurowalne etapy produkcyjne

### 15.3 Endpointy API

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/settings` | Pobierz ustawienia |
| PUT | `/api/settings` | Zapisz ustawienia |
| GET | `/api/admin/settings` | Ustawienia produkcji |
| PUT | `/api/admin/settings` | Aktualizacja ustawień |
| GET | `/api/admin/materials` | Lista materiałów |
| POST | `/api/admin/materials` | Dodaj materiał |
| PUT | `/api/admin/materials/:id` | Edytuj materiał |
| DELETE | `/api/admin/materials/:id` | Usuń materiał |

---

## BRAKUJĄCE MODUŁY (PLACEHOLDER)

### MODUŁ: MAGAZYN I STANY MAGAZYNOWE
**Status:** BRAK MODUŁU

Nie istnieje dedykowany moduł zarządzania stanem magazynowym. Brak:
- Rejestr materiałów z ilościami
- Rezerwacje pod zlecenia
- Przyjęcia/wydania magazynowe
- Miejsca składowania
- Inwentaryzacja

### MODUŁ: BOM (BILL OF MATERIALS)
**Status:** BRAK MODUŁU

Brak formalnej struktury BOM. Każde zlecenie to "produkt" bez:
- Listy materiałowej
- Wersjonowania BOM
- Kalkulacji zużycia
- Receptur

### MODUŁ: TRACEABILITY (PEŁNA IDENTYFIKOWALNOŚĆ)
**Status:** CZĘŚCIOWO

- Jest: Audit log, historia zmian
- Brak: Numery partii, traceability materiałów, genealogia produktu

### MODUŁ: INTEGRACJE ZEWNĘTRZNE
**Status:** CZĘŚCIOWO

- Jest: Apaczka (wysyłki), Google Calendar
- Brak: ERP, księgowość, CRM, IoT/maszyny

---

## PODSUMOWANIE ARCHITEKTURY

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                  │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│    Admin    │   Manager   │   Grafik    │    Worker         │
│  Dashboard  │  Dashboard  │  Dashboard  │   Dashboard       │
└─────────────┴─────────────┴─────────────┴───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API (Express + TypeScript)                │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│    Auth     │   Orders    │   Quality   │   Maintenance     │
│   Workers   │   Stages    │   Reports   │   Notifications   │
│  Machines   │ Assignments │   Costs     │   Documents       │
│  Shipments  │   Audit     │  Calendar   │   Settings        │
└─────────────┴─────────────┴─────────────┴───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│  26 tabel: workers, orders, stages, assignments,             │
│  work_sessions, machines, quality_checks, defects,           │
│  maintenance_*, documents, notifications, audit_logs, ...    │
└─────────────────────────────────────────────────────────────┘
```

---

**Dokument wygenerowany automatycznie przez audyt MES/ERP**
**Data:** 2025-12-30
