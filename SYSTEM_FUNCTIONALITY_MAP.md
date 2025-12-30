# PlexiSystem - Mapa Funkcjonalności Systemu

## Audyt MES/ERP - Stan na 2025-12-30

---

## 1. Przegląd Systemu

**PlexiSystem** to system zarządzania produkcją dla firmy zajmującej się obróbką pleksi (plexi/akryl).

### Technologie:
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Baza danych:** PostgreSQL
- **Hosting:** Mikrus (VPS) - beata254.mikrus.xyz

### Architektura:
```
[React SPA] <--REST API--> [Express Server] <---> [PostgreSQL]
                                 |
                                 +--> [Apaczka API] (kurier)
```

---

## 2. Moduł: Użytkownicy i Role

### 2.1 Zdefiniowane Role

| Rola | Kod | Uprawnienia |
|------|-----|-------------|
| Administrator | `ADMIN` | Pełny dostęp, konfiguracja, finanse |
| Kierownik | `KIEROWNIK` | Zarządzanie produkcją, zleceniami, pracownikami |
| Handlowiec | `HANDLOWIEC` | Tworzenie zleceń, kontakt z klientami |
| Grafik | `GRAFIK` | Przygotowanie plików produkcyjnych |
| Pracownik | `PRACOWNIK` | Wykonywanie etapów, śledzenie czasu |

### 2.2 Ekrany UI

| Rola | Dashboard | Ścieżka URL |
|------|-----------|-------------|
| ADMIN | Panel Admina | `/admin`, `/admin/workers`, `/admin/machines`, `/admin/settings` |
| KIEROWNIK | Panel Kierownika | `/manager/*` |
| HANDLOWIEC | Panel Handlowca | `/handlowiec/*` |
| GRAFIK | Panel Grafika | `/grafik` |
| PRACOWNIK | Panel Pracownika | `/worker/stages` |

### 2.3 Endpointy API

```
POST   /api/auth/login          - Logowanie email/hasło
POST   /api/auth/pin            - Logowanie PIN-em (główna metoda)
POST   /api/auth/logout         - Wylogowanie
GET    /api/auth/me             - Dane zalogowanego użytkownika
```

### 2.4 Model Danych: Worker

| Pole | Typ | Opis |
|------|-----|------|
| id | SERIAL | Identyfikator |
| name | VARCHAR | Imię i nazwisko |
| email | VARCHAR | Email (unikalny) |
| pin | VARCHAR(6) | PIN do logowania |
| password_hash | VARCHAR | Hash hasła (opcjonalny) |
| hourly_rate | DECIMAL | Stawka godzinowa |
| position | ENUM | Stanowisko pracy |
| role | ENUM | Rola systemowa |
| skills | VARCHAR[] | Umiejętności (etapy które może wykonywać) |
| active | BOOLEAN | Czy aktywny |

---

## 3. Moduł: Zlecenia Produkcyjne (Orders)

### 3.1 Statusy Zleceń

```
NOWE → W_TRAKCIE → GOTOWE → [ARCHIWUM]
```

### 3.2 Ekrany UI

| Ekran | Ścieżka | Opis |
|-------|---------|------|
| Lista zleceń | `/manager/orders` | Tabela z filtrowaniem, sortowaniem, paginacją |
| Szczegóły zlecenia | `/manager/orders/:id` | Pełny widok z etapami, wysyłką, załącznikami |
| Nowe zlecenie | `/manager/orders/new` | Formularz tworzenia |
| Edycja zlecenia | `/manager/orders/:id/edit` | Formularz edycji |

### 3.3 Akcje CRUD

| Akcja | Endpoint | Uprawnienia |
|-------|----------|-------------|
| Lista zleceń | `GET /api/orders` | Wszyscy zalogowani |
| Szczegóły | `GET /api/orders/:id` | Wszyscy zalogowani |
| Tworzenie | `POST /api/orders` | ADMIN, KIEROWNIK, HANDLOWIEC |
| Aktualizacja | `PUT /api/orders/:id` | ADMIN, KIEROWNIK |
| Usunięcie | `DELETE /api/orders/:id` | ADMIN, KIEROWNIK |
| Archiwizacja | `POST /api/orders/:id/archive` | ADMIN, KIEROWNIK |
| Przywrócenie | `POST /api/orders/:id/unarchive` | ADMIN, KIEROWNIK |

### 3.4 Model Danych: Order

| Pole | Typ | Opis |
|------|-----|------|
| id | SERIAL | Identyfikator |
| order_number | VARCHAR | Numer zlecenia (ZAM/YYYY/XXXXX) |
| client_order_number | VARCHAR | Numer klienta (opcjonalny) |
| client_name | VARCHAR | Nazwa klienta |
| client_email | VARCHAR | Email klienta |
| client_phone | VARCHAR | Telefon klienta |
| product_name | VARCHAR | Nazwa produktu |
| quantity | INTEGER | Ilość |
| price_total | DECIMAL | Cena całkowita |
| price_per_unit | DECIMAL | Cena jednostkowa |
| status | ENUM | Status (NOWE/W_TRAKCIE/GOTOWE) |
| planned_completion_date | DATE | Planowana data realizacji |
| notes | TEXT | Notatki |
| folder_path | VARCHAR | Link do Google Drive |
| invoice_number | VARCHAR | Numer faktury |
| invoice_date | DATE | Data faktury |
| created_by | VARCHAR | Kto utworzył |
| archived | BOOLEAN | Czy zarchiwizowane |
| closed_at | TIMESTAMP | Data zamknięcia |

### 3.5 Pozycje Zlecenia (Order Items)

System wspiera wiele pozycji w jednym zleceniu.

| Akcja | Endpoint |
|-------|----------|
| Lista pozycji | `GET /api/orders/:orderId/items` |
| Dodaj pozycję | `POST /api/orders/:orderId/items` |
| Aktualizuj | `PUT /api/order-items/:id` |
| Usuń | `DELETE /api/order-items/:id` |

---

## 4. Moduł: Etapy Produkcyjne (Stages)

### 4.1 Domyślne Etapy

| Nr | Nazwa | Wymagany |
|----|-------|----------|
| 1 | HANDLOWIEC | Tak |
| 2 | GRAFIK | Tak |
| 3 | FREZOWANIE/LASER | Tak |
| 4 | POLEROWANIE | Nie |
| 5 | WYGINANIE | Nie |
| 6 | KLEJENIE | Nie |
| 7 | DRUKOWANIE | Nie |
| 8 | OKLEJANIE | Nie |
| 9 | PAKOWANIE | Tak |
| 10 | WYSYŁKA | Tak |
| 11 | FAKTURA | Tak |
| 12 | ZAMKNIĘCIE | Tak |

### 4.2 Statusy Etapów

```
NOWY → W_TRAKCIE → GOTOWY
```

### 4.3 Endpointy API

```
GET    /api/orders/:orderId/stages    - Lista etapów zlecenia
POST   /api/orders/:orderId/stages    - Dodaj etap
GET    /api/stages/:id                - Szczegóły etapu
PUT    /api/stages/:id                - Aktualizuj etap
DELETE /api/stages/:id                - Usuń etap
```

### 4.4 Logika Biznesowa

- Zmiana statusu etapu automatycznie aktualizuje status zlecenia
- Gdy wszystkie wymagane etapy = GOTOWY → Zlecenie = GOTOWE
- Gdy jakikolwiek etap = W_TRAKCIE → Zlecenie = W_TRAKCIE

---

## 5. Moduł: Przypisania i Sesje Pracy

### 5.1 Przypisania (Assignments)

Przypisanie pracownika do etapu.

```
POST   /api/stages/:stageId/assignments    - Przypisz pracownika
GET    /api/assignments/:id                - Szczegóły przypisania
PUT    /api/assignments/:id                - Aktualizuj status
DELETE /api/assignments/:id                - Usuń przypisanie
```

### 5.2 Sesje Pracy (Work Sessions)

Śledzenie czasu pracy z dokładnością do sekund.

```
POST   /api/assignments/:id/start          - Start timera
POST   /api/assignments/:id/stop           - Stop timera
GET    /api/assignments/:id/sessions       - Historia sesji
GET    /api/workers/:id/active-session     - Aktywna sesja pracownika
```

### 5.3 Model Danych: WorkSession

| Pole | Typ | Opis |
|------|-----|------|
| id | SERIAL | Identyfikator |
| assignment_id | INTEGER | FK do przypisania |
| start_time | TIMESTAMP | Początek sesji |
| end_time | TIMESTAMP | Koniec sesji |
| duration_minutes | DECIMAL | Czas w minutach |
| cost | DECIMAL | Koszt (czas × stawka) |

### 5.4 Ekran Pracownika: MyStages

Funkcje:
- Widok przypisanych etapów
- Timer pracy (start/stop)
- Przerwy
- Ilość wykonana
- Historia sesji dnia

---

## 6. Moduł: Maszyny

### 6.1 Stan Aktualny

**UWAGA: Moduł maszyn jest niekompletny!**

- Istnieje ekran UI (`MachinesList.tsx`)
- Brak połączenia z API (tylko localStorage)
- Brak planowania obciążenia maszyn

### 6.2 Model Danych (Frontend)

| Pole | Typ | Opis |
|------|-----|------|
| id | number | Identyfikator |
| name | string | Nazwa maszyny |
| costPerHour | number | Koszt na godzinę |
| description | string | Opis |
| isActive | boolean | Czy aktywna |

### 6.3 BRAK MODUŁU BACKENDOWEGO

Nie istnieją:
- Tabela `machines` w bazie
- Endpointy API dla maszyn
- Logika planowania maszyn

---

## 7. Moduł: Wysyłki (Shipments)

### 7.1 Integracja z Apaczka

System zintegrowany z API Apaczka do zamawiania kurierów.

### 7.2 Statusy Wysyłek

```
OCZEKUJE → ZAMÓWIONA → W_DRODZE → DOSTARCZONA
```

### 7.3 Endpointy API

```
POST   /api/orders/:orderId/shipments      - Utwórz wysyłkę
GET    /api/orders/:orderId/shipments      - Lista wysyłek zlecenia
GET    /api/shipments/:id                  - Szczegóły wysyłki
PUT    /api/shipments/:id                  - Aktualizuj
DELETE /api/shipments/:id                  - Usuń/Anuluj
POST   /api/shipments/:id/refresh-status   - Odśwież status z Apaczka
GET    /api/shipments/services             - Dostępne usługi kurierskie
```

### 7.4 Model Danych: Shipment

| Pole | Typ | Opis |
|------|-----|------|
| id | SERIAL | Identyfikator |
| order_id | INTEGER | FK do zlecenia |
| shipment_number | VARCHAR | Numer listu przewozowego |
| status | ENUM | Status wysyłki |
| tracking_url | VARCHAR | Link do śledzenia |
| weight | DECIMAL | Waga (kg) |
| dimensions | VARCHAR | Wymiary (szer x wys x głęb) |
| package_type | VARCHAR | Typ opakowania |
| service | VARCHAR | Usługa kurierska |
| recipient_* | VARCHAR | Dane odbiorcy |

---

## 8. Moduł: Załączniki (Attachments)

### 8.1 Funkcjonalność

- Upload plików (PDF, JPEG, PNG, GIF, WebP)
- Limit: 10 MB na plik
- Przechowywanie: lokalny filesystem serwera

### 8.2 Endpointy API

```
GET    /api/orders/:orderId/attachments    - Lista załączników
POST   /api/orders/:orderId/attachments    - Upload pliku
GET    /api/attachments/:id/download       - Pobierz plik
DELETE /api/attachments/:id                - Usuń załącznik
```

---

## 9. Moduł: Komentarze (Comments)

### 9.1 Endpointy API

```
GET    /api/orders/:orderId/comments       - Komentarze zlecenia
POST   /api/orders/:orderId/comments       - Dodaj komentarz
GET    /api/comments/recent                - Ostatnie komentarze
DELETE /api/comments/:id                   - Usuń komentarz
```

---

## 10. Moduł: Ogłoszenia (Announcements)

### 10.1 Funkcjonalność

Tablica ogłoszeń widoczna na wszystkich dashboardach.

### 10.2 Priorytety

- `low` - Niski
- `normal` - Normalny
- `high` - Wysoki
- `urgent` - Pilne

### 10.3 Endpointy API

```
GET    /api/announcements                  - Lista ogłoszeń
POST   /api/announcements                  - Dodaj ogłoszenie (ADMIN, KIEROWNIK, HANDLOWIEC)
DELETE /api/announcements/:id              - Usuń ogłoszenie (ADMIN, KIEROWNIK)
```

---

## 11. Moduł: Raporty (Reports)

### 11.1 Dostępne Raporty

| Raport | Endpoint | Opis |
|--------|----------|------|
| Raport zlecenia | `GET /api/reports/order/:id` | Koszty robocizny per etap |
| Export zlecenia | `GET /api/reports/export/:id` | CSV z sesjami pracy |
| Raport pracownika | `GET /api/reports/worker/:id` | Czas pracy w okresie |
| Export pracownika | `GET /api/reports/export/worker/:id` | CSV |
| Raport zbiorczy | `GET /api/reports/summary` | Statystyki ogólne |

### 11.2 Dashboard Kierownika

Wykresy:
- Linia: Zlecenia i przychody (6 miesięcy)
- Kołowy: Zlecenia wg statusu
- Słupkowy: Zlecenia wg etapu produkcji
- Progress bary: Statusy zleceń

KPI:
- Aktywne zlecenia
- Wartość w realizacji
- Przeterminowane
- Aktywni pracownicy

---

## 12. Moduł: Ustawienia (Settings)

### 12.1 Dane Konfiguracyjne

| Parametr | Domyślna wartość |
|----------|------------------|
| company_name | PLEXI SYSTEM |
| company_nip | - |
| default_worker_rate | 43.27 PLN/h |
| default_machine_rate | 100.00 PLN/h |
| company_address | - |
| company_email | - |
| company_phone | - |

### 12.2 Endpointy API

```
GET    /api/settings                       - Pobierz ustawienia
PUT    /api/settings                       - Aktualizuj (ADMIN)
POST   /api/settings/init                  - Inicjalizuj tabelę (ADMIN)
```

---

## 13. BRAK MODUŁÓW (Zidentyfikowane Luki)

### 13.1 Brak: Magazyn i Materiały

- Brak tabeli `materials`
- Brak stanów magazynowych
- Brak rezerwacji pod zlecenia
- Brak inwentaryzacji
- Brak BOM (Bill of Materials)

### 13.2 Brak: Jakość i Reklamacje

- Brak modułu kontroli jakości
- Brak rejestracji wad
- Brak traceability (śledzenia partii)
- Brak raportów jakościowych

### 13.3 Brak: Planowanie Zaawansowane

- Brak Gantta dla maszyn
- Brak kalendarza produkcji
- Brak symulacji what-if
- Brak automatycznego schedulingu

### 13.4 Brak: Integracje

- Brak integracji z ERP/księgowością
- Brak integracji z maszynami CNC
- Brak API dla zewnętrznych systemów
- Brak webhooków

### 13.5 Brak: Audit i Bezpieczeństwo

- Brak logów zmian (audit trail)
- Brak wersjonowania danych
- Brak backup/restore w UI
- Brak 2FA

---

## 14. Powiązania Między Modułami

```
┌─────────────┐
│   Orders    │
└──────┬──────┘
       │
       ├──────────────────────────────────┐
       │                                  │
       ▼                                  ▼
┌──────────────┐                   ┌──────────────┐
│    Stages    │                   │  Shipments   │
└──────┬───────┘                   └──────────────┘
       │
       ▼
┌──────────────┐
│ Assignments  │
└──────┬───────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│ WorkSessions │   │   Workers    │
└──────────────┘   └──────────────┘

Dodatkowe relacje:
- Orders → Attachments (1:N)
- Orders → Comments (1:N)
- Orders → OrderItems (1:N)
- Settings → Globalne (Singleton)
- Announcements → Niezależne
```

---

## 15. Metryki Systemu

### Tabele w Bazie

| Tabela | Opis | Relacje |
|--------|------|---------|
| workers | Pracownicy | - |
| orders | Zlecenia | FK: created_by |
| order_items | Pozycje zleceń | FK: order_id |
| order_item_stages | Etapy pozycji | FK: item_id |
| stages | Etapy produkcyjne | FK: order_id |
| assignments | Przypisania | FK: stage_id, worker_id |
| work_sessions | Sesje pracy | FK: assignment_id |
| shipments | Wysyłki | FK: order_id |
| attachments | Załączniki | FK: order_id |
| comments | Komentarze | FK: order_id, user_id |
| announcements | Ogłoszenia | - |
| stage_templates | Szablony etapów | - |
| settings | Ustawienia | Singleton (id=1) |

### Endpointy API

| Grupa | Liczba endpointów |
|-------|-------------------|
| Auth | 4 |
| Workers | 6 |
| Orders | 7 |
| Order Items | 6 |
| Stages | 5 |
| Assignments | 5 |
| Work Sessions | 6 |
| Shipments | 7 |
| Reports | 5 |
| Attachments | 4 |
| Comments | 4 |
| Announcements | 3 |
| Settings | 3 |
| Stage Templates | 4 |
| **RAZEM** | **69** |

---

*Dokument wygenerowany: 2025-12-30*
*Audyt MES/ERP: PlexiSystem v1.0*
