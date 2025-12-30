# PlexiSystem - Mapa Uprawnień

## Zdefiniowane Role

| Rola | Kod | Opis |
|------|-----|------|
| Administrator | `ADMIN` | Pełny dostęp do wszystkich funkcji |
| Kierownik | `KIEROWNIK` | Zarządzanie produkcją, zleceniami, pracownikami |
| Handlowiec | `HANDLOWIEC` | Zakładanie zleceń, kontakt z klientami |
| Grafik | `GRAFIK` | Przygotowanie plików produkcyjnych |
| Pracownik | `PRACOWNIK` | Wykonywanie zadań produkcyjnych |

---

## ADMIN - Pełny Dostęp

### Dashboard
- `/admin` - Panel administracyjny
- `/admin/workers` - Zarządzanie pracownikami
- `/admin/machines` - Zarządzanie maszynami
- `/admin/settings` - Ustawienia systemu
- Dostęp do wszystkich innych paneli

### Dostępne Akcje
- CRUD wszystkich zasobów (pracownicy, zlecenia, maszyny, etapy)
- Zarządzanie użytkownikami i ich rolami
- Zmiana ustawień systemowych
- Tworzenie/usuwanie szablonów etapów
- Przeglądanie wszystkich raportów
- Dostęp do cen i stawek

### Endpointy API (wszystkie)
```
POST   /api/auth/register
GET    /api/settings
PUT    /api/settings
POST   /api/settings/init
POST   /api/stage-templates
PUT    /api/stage-templates/:id
DELETE /api/stage-templates/:id
... oraz wszystkie pozostałe endpointy
```

---

## KIEROWNIK - Zarządzanie Produkcją

### Dashboard
- `/manager/dashboard` - Dashboard kierownika
- `/manager/orders` - Lista zleceń
- `/manager/orders/new` - Nowe zlecenie
- `/manager/orders/:id` - Szczegóły zlecenia
- `/manager/workers` - Lista pracowników
- `/manager/machines` - Lista maszyn

### Dostępne Akcje
- Przeglądanie i edycja zleceń
- Przypisywanie pracowników do etapów
- Planowanie produkcji
- Generowanie raportów
- Zamawianie kurierów
- Dodawanie/usuwanie ogłoszeń
- Dostęp do cen

### Endpointy API
```
GET    /api/orders
POST   /api/orders
PUT    /api/orders/:id
DELETE /api/orders/:id
POST   /api/orders/:id/archive
POST   /api/orders/:orderId/stages
GET    /api/workers
POST   /api/workers (⚠️ ZABLOKOWANE - patrz BŁĘDY)
PUT    /api/workers/:id (⚠️ ZABLOKOWANE)
DELETE /api/workers/:id (⚠️ ZABLOKOWANE)
GET    /api/reports/summary
POST   /api/announcements
DELETE /api/announcements/:id
```

### ZABRONIONE
- Panel administracyjny (`/admin`)
- Zmiana ustawień systemu
- Zarządzanie szablonami etapów
- Rejestracja nowych użytkowników

---

## HANDLOWIEC - Obsługa Klientów

### Dashboard
- `/handlowiec` - Dashboard handlowca
- `/handlowiec/orders` - Moje zlecenia
- `/handlowiec/orders/:id` - Szczegóły zlecenia
- `/handlowiec/new` - Nowe zlecenie

### Dostępne Akcje
- Tworzenie nowych zleceń
- Przeglądanie zleceń (tylko swoje lub wszystkie?)
- Dodawanie pozycji do zleceń
- Edycja pozycji zleceń
- Dodawanie ogłoszeń
- Dostęp do cen zleceń

### Endpointy API
```
GET    /api/orders
GET    /api/orders/:id
POST   /api/orders/:orderId/items
PUT    /api/order-items/:id
POST   /api/announcements
GET    /api/announcements
```

### ZABRONIONE
- Panel administracyjny
- Panel kierownika
- Zarządzanie pracownikami
- Usuwanie zleceń
- Usuwanie ogłoszeń
- Dostęp do raportów produkcji
- Planowanie produkcji

---

## GRAFIK - Przygotowanie Plików

### Dashboard
- `/grafik` - Panel grafika

### Dostępne Akcje
- Przeglądanie zleceń oczekujących na przygotowanie
- Oznaczanie etapu GRAFIK jako ukończony
- Przeglądanie załączników zleceń
- NIE widzi cen

### Endpointy API
```
GET    /api/orders
GET    /api/orders/:id
GET    /api/orders/:orderId/attachments
GET    /api/announcements
```

### ZABRONIONE
- Tworzenie/edycja zleceń
- Panel administracyjny
- Panel kierownika
- Dostęp do cen i stawek
- Zarządzanie pracownikami
- Raportowanie

---

## PRACOWNIK - Wykonywanie Zadań

### Dashboard
- `/worker/stages` - Moje etapy produkcyjne

### Dostępne Akcje
- Przeglądanie przypisanych zadań
- Uruchamianie/zatrzymywanie timera pracy
- Oznaczanie etapów jako ukończone
- NIE widzi cen

### Endpointy API
```
GET    /api/workers/:id/assignments
POST   /api/assignments/:id/start
POST   /api/assignments/:id/stop
GET    /api/announcements
```

### ZABRONIONE
- Tworzenie/edycja zleceń
- Panel administracyjny
- Panel kierownika
- Dostęp do cen i stawek
- Zarządzanie pracownikami/maszynami
- Raportowanie
- Przeglądanie cudzych zadań

---

## NAPRAWIONE BŁĘDY BEZPIECZEŃSTWA ✅

### 1. ~~NIESPÓJNOŚĆ NAZW RÓL~~ - NAPRAWIONE ✅

**Było:** Backend używał `'MANAGER'` w middleware, ale baza przechowuje `'KIEROWNIK'`

**Naprawiono (2025-12-29):** Zamieniono wszystkie wystąpienia `'MANAGER'` na `'KIEROWNIK'` w:
- `routes/orders.ts` - 7 endpointów ✅
- `routes/workers.ts` - 3 endpointy ✅
- `routes/stages.ts` - 3 endpointy ✅
- `routes/shipments.ts` - 3 endpointy ✅
- `routes/attachments.ts` - 1 endpoint ✅
- `routes/comments.ts` - 1 endpoint ✅
- `routes/assignments.ts` - 1 endpoint ✅
- `routes/work-sessions.ts` - 2 endpointy ✅
- `routes/reports.ts` - 1 endpoint ✅
- `routes/orderItems.ts` - 4 endpointy ✅

### 2. ~~BRAK AUTORYZACJI~~ - NAPRAWIONE ✅

**Naprawiono endpointy z kontrolą ownership:**

| Endpoint | Status | Rozwiązanie |
|----------|--------|-------------|
| `POST /api/assignments/:id/start` | ✅ | PRACOWNIK może tylko swoje zadania |
| `POST /api/assignments/:id/stop` | ✅ | PRACOWNIK może tylko swoje zadania |
| `GET /api/reports/worker/:workerId` | ✅ | PRACOWNIK może tylko swój raport |
| `GET /api/reports/export/worker/:workerId` | ✅ | PRACOWNIK może tylko swój raport |

**Nadal do rozważenia (niski priorytet):**

| Endpoint | Status | Uwaga |
|----------|--------|-------|
| `POST /api/orders/:orderId/attachments` | ⚠️ | Załączniki - może dodać każdy zalogowany |
| `POST /api/orders/:orderId/comments` | ⚠️ | Komentarze - może dodać każdy zalogowany |
| `PUT /api/assignments/:id` | ⚠️ | Edycja przypisań - brak kontroli |

### 3. ~~BRAK KONTROLI OWNERSHIP~~ - NAPRAWIONE ✅

**Dodano sprawdzanie ownership:**
- Timer start/stop: PRACOWNIK może tylko dla swoich zadań
- Raporty pracownika: PRACOWNIK widzi tylko swój raport
- ADMIN/KIEROWNIK: mają dostęp do wszystkiego

---

## MACIERZ UPRAWNIEŃ

| Funkcja | ADMIN | KIEROWNIK | HANDLOWIEC | GRAFIK | PRACOWNIK |
|---------|:-----:|:---------:|:----------:|:------:|:---------:|
| Panel Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tworzenie zleceń | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edycja zleceń | ✅ | ✅ | ❌ | ❌ | ❌ |
| Usuwanie zleceń | ✅ | ✅ | ❌ | ❌ | ❌ |
| Zarządzanie pracownikami | ✅ | ✅ | ❌ | ❌ | ❌ |
| Planowanie produkcji | ✅ | ✅ | ❌ | ❌ | ❌ |
| Przygotowanie plików | ✅ | ❌ | ❌ | ✅ | ❌ |
| Wykonywanie zadań | ✅ | ❌ | ❌ | ❌ | ✅ |
| Raporty produkcji | ✅ | ✅ | ❌ | ❌ | ❌ |
| Raporty własne | ✅ | ✅ | ✅ | ✅ | ✅ |
| Widoczność cen | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ogłoszenia (dodawanie) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ogłoszenia (usuwanie) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ustawienia systemu | ✅ | ❌ | ❌ | ❌ | ❌ |
| Timer (własny) | ✅ | ✅ | ❌ | ✅ | ✅ |

---

## STATUS NAPRAWY

- [x] Zamienić 'MANAGER' na 'KIEROWNIK' we wszystkich routes ✅
- [x] Dodać HANDLOWIEC do tworzenia zleceń ✅
- [x] Dodać kontrolę ownership do timer start/stop ✅
- [x] Dodać kontrolę ownership do raportów pracowników ✅
- [ ] Rozważyć kontrolę attachments/comments (niski priorytet)

---

*Ostatnia aktualizacja: 2025-12-29*
