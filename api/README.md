# PlexiSystem Production Manager - Backend API

Backend API dla systemu zarządzania produkcją PlexiSystem.

## Technologie

- **Node.js** + **Express** - Serwer HTTP
- **TypeScript** - Typowanie
- **PostgreSQL** - Baza danych
- **JWT** - Autentykacja
- **Apaczka API** - Integracja kurierska

## Struktura projektu

```
api/
├── src/
│   ├── server.ts           # Główny plik serwera
│   ├── config/
│   │   └── database.ts     # Konfiguracja PostgreSQL
│   ├── routes/             # Definicje routów API
│   │   ├── auth.ts
│   │   ├── workers.ts
│   │   ├── orders.ts
│   │   ├── stages.ts
│   │   ├── assignments.ts
│   │   ├── work-sessions.ts
│   │   ├── shipments.ts
│   │   └── reports.ts
│   ├── controllers/        # Logika biznesowa
│   ├── middleware/         # Auth, CORS, Error handling
│   ├── utils/              # Logger, Apaczka client
│   └── types/              # TypeScript types
├── scripts/
│   ├── migrate.ts          # Tworzenie tabel
│   └── seed.ts             # Dane początkowe
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Instalacja

### 1. Wymagania
- Node.js 18+
- PostgreSQL 14+

### 2. Instalacja zależności
```bash
cd api
npm install
```

### 3. Konfiguracja
```bash
cp .env.example .env
# Edytuj .env z właściwymi danymi
```

### 4. Migracja bazy danych
```bash
npm run migrate
```

### 5. Załaduj dane początkowe
```bash
npm run seed
```

### 6. Uruchom serwer
```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Authentication
| Method | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/auth/login` | Logowanie |
| POST | `/api/auth/logout` | Wylogowanie |
| GET | `/api/auth/me` | Dane zalogowanego użytkownika |
| POST | `/api/auth/register` | Rejestracja (Manager only) |

### Workers (Pracownicy)
| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/workers` | Lista pracowników |
| GET | `/api/workers/:id` | Szczegóły pracownika |
| POST | `/api/workers` | Dodaj pracownika (Manager) |
| PUT | `/api/workers/:id` | Edytuj pracownika (Manager) |
| DELETE | `/api/workers/:id` | Usuń pracownika (Manager) |

### Orders (Zlecenia)
| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/orders` | Lista zleceń |
| GET | `/api/orders/:id` | Szczegóły zlecenia |
| POST | `/api/orders` | Nowe zlecenie (Manager) |
| PUT | `/api/orders/:id` | Edytuj zlecenie (Manager) |
| DELETE | `/api/orders/:id` | Usuń zlecenie (Manager) |
| POST | `/api/orders/:id/archive` | Archiwizuj (Manager) |

### Stages (Etapy)
| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/orders/:orderId/stages` | Etapy zlecenia |
| GET | `/api/stages/:id` | Szczegóły etapu |
| PUT | `/api/stages/:id` | Aktualizuj etap (Manager) |

### Assignments (Przydzielenia)
| Method | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/stages/:stageId/assignments` | Przydziel pracownika (Manager) |
| GET | `/api/assignments/:id` | Szczegóły przydzielenia |
| PUT | `/api/assignments/:id` | Aktualizuj status |
| DELETE | `/api/assignments/:id` | Usuń przydzielenie (Manager) |

### Time Tracking (START/STOP)
| Method | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/assignments/:id/start` | **START** timer |
| POST | `/api/assignments/:id/stop` | **STOP** timer |
| GET | `/api/assignments/:id/sessions` | Lista sesji |
| GET | `/api/work-sessions/worker/:workerId/active` | Aktywna sesja pracownika |

### Shipments (Apaczka)
| Method | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/orders/:orderId/shipments` | Zamów kuriera |
| GET | `/api/orders/:orderId/shipments` | Przesyłki zlecenia |
| GET | `/api/shipments/:id` | Szczegóły przesyłki |
| POST | `/api/shipments/:id/refresh-status` | Odśwież status |

### Reports (Raporty)
| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/reports/order/:orderId` | Raport zlecenia |
| GET | `/api/reports/export/:orderId` | Eksport CSV zlecenia |
| GET | `/api/reports/worker/:workerId` | Raport pracownika |
| GET | `/api/reports/export/worker/:workerId` | Eksport CSV pracownika |
| GET | `/api/reports/summary` | Raport zbiorczy (Manager) |

## Logika biznesowa

### Time Tracking (START/STOP)

**START Timer:**
1. Tworzy nową sesję pracy (`work_sessions`)
2. Ustawia status przydzielenia na `W_TRAKCIE`
3. Ustawia status etapu na `W_TRAKCIE`
4. Ustawia status zlecenia na `W_TRAKCIE` (jeśli było `NOWE`)

**STOP Timer:**
1. Kończy sesję pracy, oblicza czas i koszt
2. `duration_minutes = (end_time - start_time) / 60`
3. `cost = duration_minutes / 60 * hourly_rate`
4. Opcjonalnie: oznacza przydzielenie jako `GOTOWY`
5. Sprawdza czy wszystkie przydzielenia w etapie są gotowe → oznacza etap jako `GOTOWY`
6. Sprawdza czy wszystkie wymagane etapy są gotowe → oznacza zlecenie jako `GOTOWE`

### Apaczka API (Bezpieczna integracja)

API keys są przechowywane **TYLKO** na serwerze (w `.env`).
Frontend NIGDY nie ma dostępu do kluczy API.

Przepływ:
1. Frontend wysyła żądanie do `/api/orders/:id/shipments`
2. Backend pobiera API keys z `.env`
3. Backend wysyła żądanie do Apaczka API
4. Backend zwraca wynik do frontend

## Dane logowania (po seedzie)

| Rola | Email | Hasło |
|------|-------|-------|
| Manager | daniel@plexisystem.pl | plexisystem123 |
| Manager | lukasz.sikorra@plexisystem.pl | plexisystem123 |
| Worker | katarzyna@plexisystem.pl | plexisystem123 |

## Deployment na Mikrusie

```bash
# SSH do serwera
ssh root@beata254.mikrus.xyz -p 10254

# Instalacja PostgreSQL
apt-get update
apt-get install -y postgresql postgresql-contrib nodejs npm

# Klonuj repo
cd /opt
git clone https://github.com/monsterluk/task-usher-app.git
cd task-usher-app/api

# Instalacja i konfiguracja
npm install
cp .env.example .env
# Edytuj .env

# Migracja i seed
npm run migrate
npm run seed

# Uruchom
npm run build
npm start
```

## Licencja

MIT
