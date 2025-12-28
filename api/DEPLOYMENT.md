# 🚀 PLEXISYSTEM PRODUCTION MANAGER - DOKUMENTACJA WDROŻENIOWA
## Wersja: 1.0 | Data: 28 grudnia 2025 | Status: W TRAKCIE CI

---

## 📋 SPIS TREŚCI

1. [概述 (Overview)](#概述-overview)
2. [Wymagania systemowe](#wymagania-systemowe)
3. [Instalacja i konfiguracja](#instalacja-i-konfiguracja)
4. [Architektura systemu](#architektura-systemu)
5. [API Reference](#api-reference)
6. [Funkcjonalności](#funkcjonalności)
7. [Testowanie](#testowanie)
8. [Deployment](#deployment)
9. [Rozwiązywanie problemów](#rozwiązywanie-problemów)
10. [Znane ograniczenia](#znane-ograniczenia)

---

## 📊 OVERVIEW (概述)

PlexiSystem to kompleksowy system do zarządzania produkcją dla firmy PlexiSystem, specjalizującej się w produkcji plexi i tworzyw sztucznych.

### Główne cechy:
- ✅ Zarządzanie zleceniami produkcyjnymi
- ✅ Śledzenie czasu pracy (timer)
- ✅ Zarządzanie pracownikami i maszynami
- ✅ Generowanie PDF do druku (Work Order)
- ✅ Integracja z kurierami (Apaczka)
- ✅ Kolorowe etapy produkcji (12 kolorów)
- ✅ Responsywny interfejs (mobile-friendly)

### Porównanie z Prodio:

| Funkcja | PlexiSystem | Prodio |
|---------|-------------|--------|
| Work Order PDF | ✅ | ✅ |
| Time Tracking | ✅ | ✅ |
| Workers Management | ✅ | ✅ |
| Machines Management | ✅ | ✅ |
| Apaczka Integration | ✅ | ❌ |
| Multi-color Stages | ✅ | ❌ |
| Polish Language | ✅ | ✅ |

---

## 💻 WYMAGANIA SYSTEMOWE

### Frontend (Lovable):
- Node.js 18+
- npm 10+
- Przeglądarka z obsługą ES2020+

### Backend (Mikrus):
- Node.js 18+
- PostgreSQL 16+
- PM2 (process manager)
- nginx (reverse proxy)
- Certyfikat SSL

### Minimalne wymagania serwera:
- CPU: 1 vCPU
- RAM: 1 GB
- Storage: 10 GB SSD
- Sieć: 10 Mbps

---

## 🛠️ INSTALACJA I KONFIGURACJA

### 1. Klonowanie repozytorium

```bash
git clone https://github.com/monsterluk/task-usher-app.git
cd task-usher-app
```

### 2. Instalacja frontend dependencies

```bash
npm install
```

### 3. Konfiguracja zmiennych środowiskowych

Utwórz plik `.env` w katalogu głównym:

```env
VITE_API_URL=https://beata254.mikrus.xyz:20254
```

### 4. Uruchomienie development

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem: `http://localhost:5173`

### 5. Build produkcyjny

```bash
npm run build
```

---

## 🏗️ ARCHITEKTURA SYSTEMU

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Lovable)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Manager   │  │   Worker   │  │   Shared    │        │
│  │   Pages     │  │   Pages    │  │  Components │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                 │               │
│         └────────────────┼─────────────────┘               │
│                          ▼                                │
│                  ┌─────────────────┐                     │
│                  │   AppContext    │                     │
│                  │   (State)       │                     │
│                  └─────────────────┘                     │
│                          │                                │
│                          ▼                                │
│                  ┌─────────────────┐                     │
│                  │  api.ts         │                     │
│                  │  (API Client)   │                     │
│                  └─────────────────┘                     │
└──────────────────────────┼────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Express Server                    │   │
│  ├──────────┬──────────┬──────────┬──────────┬──────────┤   │
│  │  Auth    │  Orders  │ Workers  │ Stages   │ Reports  │   │
│  │ Routes   │ Routes   │ Routes   │ Routes   │ Routes   │   │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘   │
│                          │                                │
│                          ▼                                │
│                  ┌─────────────────┐                     │
│                  │   PostgreSQL    │                     │
│                  │   Database      │                     │
│                  └─────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 API REFERENCE

### Base URL
```
https://beata254.mikrus.xyz:20254
```

### Authentication
Wszystkie żądania wymagają nagłówka:
```
Authorization: Bearer <token>
```

### Endpoints

#### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login użytkownika |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Pobierz dane zalogowanego użytkownika |

#### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Lista zleceń |
| GET | `/api/orders/:id` | Szczegóły zlecenia |
| POST | `/api/orders` | Utwórz zlecenie |
| PUT | `/api/orders/:id` | Aktualizuj zlecenie |
| DELETE | `/api/orders/:id` | Usuń zlecenie |

#### Workers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workers` | Lista pracowników |
| POST | `/api/workers` | Dodaj pracownika |
| PUT | `/api/workers/:id` | Aktualizuj pracownika |
| DELETE | `/api/workers/:id` | Usuń pracownika |

#### Stages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stages` | Lista etapów |
| POST | `/api/stages` | Utwórz etap |
| PUT | `/api/stages/:id` | Aktualizuj etap |

#### Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assignments` | Lista przypisań |
| GET | `/api/assignments/my` | Moje przypisania |
| POST | `/api/assignments` | Utwórz przypisanie |
| POST | `/api/assignments/:id/start` | Start timera |
| POST | `/api/assignments/:id/stop` | Stop timera |

#### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/work-sessions` | Raport sesji pracy |
| GET | `/api/reports/export/csv` | Export do CSV |

---

## ⚙️ FUNKCJONALNOŚCI

### 1. Zarządzanie Zleceniami

#### Tworzenie nowego zlecenia
```javascript
POST /api/orders
{
  "order_number": "1450/2025",
  "client_name": "TEAM POINT Sp. z o.o.",
  "client_email": "kontakt@teampoint.pl",
  "client_phone": "+48 12 345 67 89",
  "product_name": "Kieszonka A4",
  "quantity": 100,
  "price_per_unit": 5.00,
  "planned_completion_date": "2025-12-30",
  "folder_path": "https://drive.google.com/...",
  "notes": "Specjalne wykończenie"
}
```

#### Statusy zleceń
- `NOWE` - Oczekuje na rozpoczęcie
- `W TRAKCIE` - Aktywnie pracujemy
- `GOTOWE` - Etap ukończony
- `ZAMKNIĘTE` - Zlecenie zakończone

### 2. Time Tracking

#### Start timera
```javascript
POST /api/assignments/:id/start
Response: {
  "success": true,
  "data": {
    "session": {
      "id": 1,
      "assignment_id": 1,
      "start_time": "2025-12-28T10:00:00Z",
      "status": "IN_PROGRESS"
    }
  }
}
```

#### Stop timera
```javascript
POST /api/assignments/:id/stop
Response: {
  "success": true,
  "data": {
    "session": {
      "id": 1,
      "assignment_id": 1,
      "start_time": "2025-12-28T10:00:00Z",
      "end_time": "2025-12-28T12:30:00Z",
      "duration_minutes": 150,
      "cost": 97.50,
      "status": "COMPLETED"
    }
  }
}
```

### 3. Etapy produkcji (12 kolorów)

| Etap | Kolor | Ikona |
|------|-------|-------|
| HANDLOWIEC | Niebieski | 📋 |
| GRAFIK | Fioletowy | 🎨 |
| FREZOWANIE/LASER | Czerwony | ⚙️ |
| POLEROWANIE | Brązowy | ✨ |
| WYGINANIE | Różowy | 📐 |
| KLEJENIE | Fioletowy jasny | 🩹 |
| DRUKOWANIE | Pomarańczowy | 🖨️ |
| OKLEJANIE | Żółty | 🟣 |
| PAKOWANIE | Zielony | 📦 |
| WYSYŁKA | Błękitny | 🚚 |
| FAKTURA | Złoty | 📄 |
| ZAMKNIĘCIE | Czarny | ✅ |

### 4. Work Order PDF

Generowanie karty produkcyjnej do druku:
- Nagłówek z logo firmy
- Kod QR z numerem zlecenia
- Dane klienta i produktu
- Tabela etapów z kolorami
- Lista kontrolna jakości
- Miejsca na podpisy

---

## 🧪 TESTOWANIE

### Testy jednostkowe

```bash
# Uruchom testy
npm test

# Uruchom testy z coverage
npm run test:coverage
```

### Testy API

```bash
# Health check
curl --insecure https://beata254.mikrus.xyz:20254/api/health

# Login
curl --insecure -X POST https://beata254.mikrus.xyz:20254/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel@plexisystem.pl","password":"plexisystem123"}'

# Pobierz zlecenia
curl --insecure -X GET https://beata254.mikrus.xyz:20254/api/orders \
  -H "Authorization: Bearer <token>"
```

### Testy edge cases

```bash
# Pusty login
curl --insecure -X POST https://beata254.mikrus.xyz:20254/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"","password":""}'

# Nieprawidłowe dane
curl --insecure -X POST https://beata254.mikrus.xyz:20254/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fake@test.com","password":"wrong"}'
```

---

## 🚀 DEPLOYMENT

### Frontend (Lovable)
1. Zbuduj projekt: `npm run build`
2. Wdróż na Lovable lub Vercel
3. Ustaw VITE_API_URL na `https://beata254.mikrus.xyz:20254`

### Backend (Mikrus)
1. Połącz się przez SSH: `ssh root@beata254.mikrus.xyz -p 10254`
2. Przejdź do katalogu: `/opt/task-usher-app/api`
3. Zrestartuj PM2: `pm2 restart plexisystem-api`
4. Sprawdź logi: `pm2 logs plexisystem-api`

### SSL Certificate
Certyfikat jest już skonfigurowany (self-signed).
Przy pierwszym wejściu przeglądarka pokaże ostrzeżenie - kliknij "Zaawansowane" → "Idź do strony".

---

## 🔧 ROZWIĄZYWANIE PROBLEMÓW

### Problem: Frontend nie łączy się z API
**Rozwiązanie:** Sprawdź VITE_API_URL w ustawieniach Lovable:
```
VITE_API_URL=https://beata254.mikrus.xyz:20254
```

### Problem: API zwraca błąd 401
**Rozwiązanie:** Sprawdź czy token jest ważny i nie wygasł.
Zaloguj się ponownie jeśli potrzeba.

### Problem: Timer się nie zatrzymuje
**Rozwiązanie:** Upewnij się żeajesz przycisk STOP.
Jeśli problem się powtarza, sprawdź logi: `pm2 logs plexisystem-api`

### Problem: PDF się nie generuje
**Rozwiązanie:** Sprawdź czy przeglądarka zezwala na wyskakujące okna.
Użyj przycisku "Drukuj" zamiast eksportu do PDF.

---

## ⚠️ ZNANE OGRANICZENIA

1. **Brak paginacji** - przy >100 zleceń interfejs może być wolny
2. **Brak BOM** - lista materiałów nie jest automatycznie generowana
3. **Brak planowania Gantt** - brak graficznego harmonogramu
4. **Self-signed SSL** - wymaga akceptacji w przeglądarce
5. **Brak integracji CAD/CAM** - brak importu z Fusion 360, AutoCAD
6. **Brak multi-lokalizacji** - tylko jedna lokalizacja magazynu

---

## 📈 PLAN ROZWOJU

### Wersja 1.1 (Q1 2026)
- [ ] Paginacja zleceń
- [ ] BOM (Bill of Materials)
- [ ] Eksport do Excel

### Wersja 1.2 (Q2 2026)
- [ ] Planowanie Gantt
- [ ] Integracja z CAD/CAM
- [ ] Multi-magazyn

### Wersja 2.0 (Q3 2026)
- [ ] Moduł QC (Quality Control)
- [ ] Predykcja terminów (AI)
- [ ] API dla zewnętrznych systemów

---

## 📞 WSPARCIE

**Autor:** Kortix AI  
**Data utworzenia:** 28 grudnia 2025  
**Wersja:** 1.0

---

*Ta dokumentacja jest częścią trybu Continuous Improvement. Regularnie aktualizowana w miarę rozwoju systemu.*
