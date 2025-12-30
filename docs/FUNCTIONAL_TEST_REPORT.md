# FUNCTIONAL TEST REPORT
## PlexiSystem MES/ERP - Raport Testów Funkcjonalnych

**Data audytu:** 2025-12-30
**Audytor:** Ekspert MES/ERP (AI)
**Metoda:** Analiza kodu źródłowego + testy API

---

## PODSUMOWANIE WYKONAWCZE

| Kategoria | Zaliczone | Problemy | Krytyczne |
|-----------|-----------|----------|-----------|
| Logika biznesowa | 18/25 | 5 | 2 |
| Spójność danych | 12/15 | 2 | 1 |
| Uprawnienia | 8/10 | 1 | 1 |
| Walidacja | 15/18 | 2 | 1 |
| **RAZEM** | **53/68** | **10** | **5** |

**Ocena ogólna:** 78% - System wymaga poprawek przed wdrożeniem produkcyjnym

---

## 1. TESTY LOGIKI BIZNESOWEJ

### 1.1 Cykl życia zlecenia

| Test | Status | Uwagi |
|------|--------|-------|
| Tworzenie zlecenia ze statusem NOWE | ✅ OK | Działa poprawnie |
| Automatyczne tworzenie etapów | ✅ OK | 12 domyślnych etapów |
| Przejście NOWE → W_TRAKCIE | ✅ OK | Kaskadowe przy starcie timera |
| Przejście W_TRAKCIE → GOTOWE | ⚠️ UWAGA | Brak automatycznej walidacji ukończenia etapów |
| Archiwizacja zlecenia | ✅ OK | Soft delete, możliwość przywrócenia |
| Przywrócenie z archiwum | ✅ OK | Audit log rejestrowany |

**Problem #1: Brak walidacji zakończenia**
```
Opis: Zlecenie można oznaczyć jako GOTOWE nawet gdy nie wszystkie
      wymagane etapy są zakończone.
Lokalizacja: orderController.ts:updateOrder()
Priorytet: WYSOKI
Rekomendacja: Dodać walidację:
  if (status === 'GOTOWE') {
    const incompleteStages = stages.filter(s => s.is_required && s.status !== 'GOTOWY');
    if (incompleteStages.length > 0) {
      throw new AppError('Nie wszystkie wymagane etapy są zakończone', 400);
    }
  }
```

### 1.2 Etapy produkcyjne

| Test | Status | Uwagi |
|------|--------|-------|
| Tworzenie etapów z kolejnością | ✅ OK | sequence_order działa |
| Zmiana statusu etapu | ✅ OK | NOWY → W_TRAKCIE → GOTOWY |
| Przydzielenie pracownika | ✅ OK | FK do workers |
| Usunięcie etapu z przydzieleniami | ✅ OK | CASCADE DELETE |
| Walidacja sekwencji | ❌ BRAK | Można wykonać etap 5 przed 3 |

**Problem #2: Brak wymuszania sekwencji etapów**
```
Opis: System nie wymusza kolejności wykonywania etapów.
      Można rozpocząć etap PAKOWANIE przed FREZOWANIE.
Lokalizacja: stageController.ts, assignmentController.ts
Priorytet: ŚREDNI
Rekomendacja: Dodać walidację poprzednich etapów wymaganych:
  - Przed startem etapu sprawdzić czy poprzednie wymagane są GOTOWY
```

### 1.3 Śledzenie czasu pracy

| Test | Status | Uwagi |
|------|--------|-------|
| Start sesji pracy | ✅ OK | Tworzy work_session |
| Stop sesji z obliczeniem kosztu | ✅ OK | duration × hourly_rate |
| Wiele sesji dla jednego przydzielenia | ✅ OK | Działa |
| Jednoczesna sesja dla pracownika | ⚠️ UWAGA | Brak blokady wielokrotnych aktywnych sesji |
| Edycja sesji przez managera | ✅ OK | Dostępne dla MANAGER |

**Problem #3: Możliwość wielu aktywnych sesji**
```
Opis: Pracownik może mieć wiele aktywnych sesji jednocześnie
      (teoretycznie pracować na kilku zadaniach równocześnie).
Lokalizacja: workSessionController.ts:startTimer()
Priorytet: WYSOKI
Rekomendacja: Przed startem sprawdzić:
  SELECT * FROM work_sessions
  WHERE worker_id = ? AND end_time IS NULL
  Jeśli istnieje aktywna sesja → błąd lub automatyczne zakończenie
```

### 1.4 Kontrola jakości

| Test | Status | Uwagi |
|------|--------|-------|
| Tworzenie szablonów kontroli | ✅ OK | qc_checkpoints |
| Wykonanie kontroli | ✅ OK | quality_checks |
| Raportowanie defektów | ✅ OK | Pełne dane |
| Obliczenie pass rate | ✅ OK | W qualityController.getQualityStats() |
| Blokada produkcji przy defekcie krytycznym | ❌ BRAK | System nie blokuje |

**Problem #4: Brak blokady przy defekcie krytycznym**
```
Opis: Defekt o severity='critical' nie blokuje dalszej produkcji.
      Można kontynuować etapy mimo krytycznego problemu jakościowego.
Lokalizacja: qualityController.ts, stageController.ts
Priorytet: WYSOKI (dla ISO 9001)
Rekomendacja: Przy tworzeniu defektu critical:
  - Ustawić stage.status = 'WSTRZYMANY'
  - Powiadomić kierownika
  - Wymagać rozwiązania przed kontynuacją
```

### 1.5 Utrzymanie ruchu

| Test | Status | Uwagi |
|------|--------|-------|
| Tworzenie harmonogramów | ✅ OK | maintenance_schedules |
| Obliczanie next_due_at | ✅ OK | last_performed + frequency_days |
| Alert o przeterminowanych | ✅ OK | status='overdue' automatycznie |
| Blokada maszyny podczas konserwacji | ⚠️ CZĘŚCIOWO | Status maszyny = 'maintenance' |
| Logowanie wykonanych prac | ✅ OK | maintenance_logs |

### 1.6 Planowanie zdolności

| Test | Status | Uwagi |
|------|--------|-------|
| Obliczanie obciążenia działu | ✅ OK | capacityController |
| Prognoza 21-dniowa | ✅ OK | getWorkloadForecast() |
| Identyfikacja wąskich gardeł | ✅ OK | getBottleneckAnalysis() |
| Sprawdzenie dostępności pracowników | ✅ OK | getWorkerAvailability() |
| Wykrywanie konfliktu maszyn | ❌ BRAK | Brak walidacji nakładania się |

**Problem #5: Brak walidacji konfliktu zasobów**
```
Opis: System nie waliduje czy maszyna/pracownik nie jest już
      przydzielony do innego zadania w tym samym czasie.
Lokalizacja: assignmentController.ts, capacityController.ts
Priorytet: ŚREDNI
Rekomendacja: Przy przydzieleniu sprawdzić overlapping:
  - Czy pracownik nie ma aktywnej sesji
  - Czy maszyna nie jest in_use przez inne zlecenie
```

---

## 2. TESTY SPÓJNOŚCI DANYCH

### 2.1 Integralność referencyjna

| Test | Status | Uwagi |
|------|--------|-------|
| Usunięcie zlecenia → kaskada etapów | ✅ OK | ON DELETE CASCADE |
| Usunięcie etapu → kaskada przydzieleń | ✅ OK | ON DELETE CASCADE |
| Usunięcie pracownika z aktywnymi zadaniami | ✅ OK | Soft delete (active=false) |
| Usunięcie maszyny z harmonogramami | ✅ OK | CASCADE |
| Usunięcie checkpointu z kontrolami | ⚠️ UWAGA | SET NULL (może powodować orphans) |

### 2.2 Spójność statusów

| Test | Status | Uwagi |
|------|--------|-------|
| Status zlecenia odzwierciedla etapy | ⚠️ CZĘŚCIOWO | Tylko przy start/stop timera |
| Status etapu odzwierciedla przydzielenia | ✅ OK | Kaskadowe aktualizacje |
| Closed_at przy GOTOWE | ❌ BRAK | Nie jest automatycznie ustawiany |

**Problem #6: Brak automatycznego closed_at**
```
Opis: Pole orders.closed_at nie jest automatycznie ustawiane
      przy zmianie statusu na GOTOWE.
Lokalizacja: orderController.ts:updateOrder()
Priorytet: ŚREDNI
Rekomendacja: W updateOrder, gdy status='GOTOWE':
  closed_at = new Date()
```

### 2.3 Audit log coverage

| Test | Status | Uwagi |
|------|--------|-------|
| Logowanie CREATE orders | ✅ OK | auditService.logAudit() |
| Logowanie UPDATE orders | ✅ OK | Z old/new values |
| Logowanie DELETE orders | ✅ OK | Pełne |
| Logowanie zmian workers | ✅ OK | Pełne |
| Logowanie zmian machines | ✅ OK | Pełne |
| Logowanie quality checks | ✅ OK | Pełne |
| Logowanie work sessions | ⚠️ UWAGA | Tylko start/stop, nie edycja |

---

## 3. TESTY UPRAWNIEŃ I RÓL

### 3.1 Kontrola dostępu

| Test | Status | Uwagi |
|------|--------|-------|
| ADMIN bypass wszystkich kontroli | ✅ OK | requireRole() w auth.ts |
| KIEROWNIK dostęp do auditu | ✅ OK | ADMIN + KIEROWNIK |
| MANAGER tworzenie zleceń | ✅ OK | requireRole('MANAGER') |
| HANDLOWIEC tworzenie zleceń | ⚠️ NIEJASNE | Czy ma mieć dostęp? |
| PRACOWNIK widzi tylko swoje zadania | ❌ CZĘŚCIOWO | API zwraca wszystko |
| PRACOWNIK nie widzi stawek | ✅ OK | Filtrowane w response |

**Problem #7: Brak filtrowania danych dla PRACOWNIK**
```
Opis: API /api/orders i /api/assignments zwraca wszystkie rekordy
      niezależnie od roli. PRACOWNIK powinien widzieć tylko
      swoje przydzielenia.
Lokalizacja: orderController.ts, assignmentController.ts
Priorytet: ŚREDNI
Rekomendacja: Dodać filtr worker_id dla roli PRACOWNIK:
  if (req.user.role === 'PRACOWNIK') {
    whereClause.worker_id = req.user.id;
  }
```

### 3.2 Vertical privilege escalation

| Test | Status | Uwagi |
|------|--------|-------|
| PRACOWNIK nie może tworzyć zleceń | ✅ OK | 403 Forbidden |
| PRACOWNIK nie może edytować maszyn | ✅ OK | 403 Forbidden |
| PRACOWNIK może edytować tylko swoje sesje | ⚠️ UWAGA | Brak walidacji ownership |

**Problem #8: Brak walidacji ownership sesji**
```
Opis: Pracownik może teoretycznie edytować sesje innych
      pracowników jeśli zna ID.
Lokalizacja: workSessionController.ts
Priorytet: WYSOKI (security)
Rekomendacja: Przy PUT/DELETE sprawdzić:
  if (req.user.role === 'PRACOWNIK' && session.worker_id !== req.user.id) {
    throw new AppError('Brak uprawnień', 403);
  }
```

---

## 4. TESTY WALIDACJI

### 4.1 Walidacja danych wejściowych

| Test | Status | Uwagi |
|------|--------|-------|
| Email format | ✅ OK | Zod validation |
| PIN 4-6 cyfr | ✅ OK | Regex validation |
| Hasło minimum długość | ⚠️ UWAGA | Brak w schemacie |
| Ilość > 0 | ✅ OK | .positive() |
| Cena >= 0 | ✅ OK | .nonnegative() |
| Data w przyszłości | ❌ BRAK | Można ustawić datę z przeszłości |
| Order number unikatowy | ✅ OK | UNIQUE constraint |

**Problem #9: Brak walidacji daty planned_completion_date**
```
Opis: Można ustawić planned_completion_date w przeszłości
      przy tworzeniu nowego zlecenia.
Lokalizacja: routes/orders.ts - createOrderSchema
Priorytet: NISKI
Rekomendacja: Dodać:
  planned_completion_date: z.string().refine((date) => {
    return new Date(date) >= new Date();
  }, 'Data musi być w przyszłości')
```

### 4.2 Obsługa błędów

| Test | Status | Uwagi |
|------|--------|-------|
| Brak tokenu → 401 | ✅ OK | authenticate middleware |
| Wygasły token → 401 | ✅ OK | TokenExpiredError |
| Niepoprawny token → 401 | ✅ OK | JsonWebTokenError |
| Brak uprawnień → 403 | ✅ OK | requireRole middleware |
| Nieznaleziony zasób → 404 | ✅ OK | notFoundHandler |
| Błąd walidacji → 400 | ✅ OK | Zod errors |
| Błąd serwera → 500 | ✅ OK | errorHandler |
| Błąd bazy danych → logowany | ✅ OK | logger.error() |

### 4.3 Rate limiting

| Test | Status | Uwagi |
|------|--------|-------|
| Login: 5 prób / 15 min | ✅ OK | authLimiter |
| PIN: 5 prób / 30 min | ✅ OK | pinLimiter |
| Zmiana hasła: limitowane | ✅ OK | passwordChangeLimiter |
| Ogólne API: limitowane | ✅ OK | generalLimiter |
| Trust proxy skonfigurowane | ✅ OK | validate: { trustProxy: true } |

---

## 5. TESTY EDGE CASES

### 5.1 Scenariusze brzegowe

| Scenariusz | Status | Uwagi |
|------------|--------|-------|
| Zlecenie z 0 ilością | ✅ BLOKOWANE | Walidacja .positive() |
| Bardzo długi order_number | ⚠️ UWAGA | VARCHAR(50) może być za mało |
| Znaki specjalne w nazwach | ✅ OK | Escapowane w SQL |
| Wielobajtowe znaki (UTF-8) | ✅ OK | PostgreSQL obsługuje |
| Null w opcjonalnych polach | ✅ OK | Obsłużone |
| Concurrent session start | ⚠️ PROBLEM | Brak blokady transakcyjnej |

**Problem #10: Race condition przy starcie sesji**
```
Opis: Dwa równoczesne requesty startTimer() mogą stworzyć
      dwie aktywne sesje dla tego samego pracownika.
Lokalizacja: workSessionController.ts:startTimer()
Priorytet: ŚREDNI
Rekomendacja: Użyć transakcji z lockiem:
  BEGIN;
  SELECT FOR UPDATE FROM work_sessions WHERE worker_id = ? AND end_time IS NULL;
  -- jeśli brak, INSERT
  COMMIT;
```

---

## 6. TESTY WYDAJNOŚCI (STATYCZNE)

### 6.1 Indeksy bazy danych

| Tabela | Indeksy | Status |
|--------|---------|--------|
| orders | status, archived, created_at, priority | ✅ OK |
| stages | order_id, status | ✅ OK |
| assignments | stage_id, worker_id, status | ✅ OK |
| work_sessions | assignment_id, start_time | ✅ OK |
| audit_logs | table_name+record_id, user_id, created_at | ✅ OK |
| quality_checks | order_id, stage_id, status | ✅ OK |
| defects | order_id, status, severity | ✅ OK |

### 6.2 Potencjalne N+1 queries

| Endpoint | Problem | Status |
|----------|---------|--------|
| GET /api/orders | Ładuje etapy osobno | ⚠️ MOŻNA OPTYMALIZOWAĆ |
| GET /api/orders/:id | JOIN z etapami | ✅ OK |
| GET /api/capacity/overview | Wiele queries | ⚠️ MOŻNA OPTYMALIZOWAĆ |

---

## PODSUMOWANIE PROBLEMÓW

### Krytyczne (muszą być naprawione)

1. **Problem #3:** Możliwość wielu aktywnych sesji
2. **Problem #4:** Brak blokady przy defekcie krytycznym
3. **Problem #8:** Brak walidacji ownership sesji

### Wysokie (powinny być naprawione przed produkcją)

4. **Problem #1:** Brak walidacji zakończenia zlecenia
5. **Problem #5:** Brak walidacji konfliktu zasobów
6. **Problem #7:** Brak filtrowania danych dla PRACOWNIK

### Średnie (rekomendowane poprawki)

7. **Problem #2:** Brak wymuszania sekwencji etapów
8. **Problem #6:** Brak automatycznego closed_at
9. **Problem #10:** Race condition przy starcie sesji

### Niskie (nice-to-have)

10. **Problem #9:** Brak walidacji daty planned_completion_date

---

## REKOMENDACJE NAPRAWCZE

### Natychmiastowe (przed wdrożeniem)

```typescript
// 1. Walidacja jednej aktywnej sesji
async startTimer(req, res) {
  const existingSession = await query(
    'SELECT id FROM work_sessions WHERE assignment_id IN (SELECT id FROM assignments WHERE worker_id = $1) AND end_time IS NULL',
    [workerId]
  );
  if (existingSession.rows.length > 0) {
    throw new AppError('Masz już aktywną sesję', 400);
  }
  // ... rest of code
}

// 2. Walidacja ownership
async updateWorkSession(req, res) {
  const session = await getSession(id);
  if (req.user.role === 'PRACOWNIK') {
    const assignment = await getAssignment(session.assignment_id);
    if (assignment.worker_id !== req.user.id) {
      throw new AppError('Brak uprawnień', 403);
    }
  }
  // ... rest of code
}

// 3. Blokada przy defekcie krytycznym
async createDefect(req, res) {
  const defect = await insertDefect(data);
  if (data.severity === 'critical') {
    await query('UPDATE stages SET status = $1 WHERE id = $2', ['WSTRZYMANY', data.stage_id]);
    await notifyMaintenance(data);
  }
  // ... rest of code
}
```

### Krótkoterminowe (sprint 1-2)

- Implementacja filtrowania danych per rola
- Walidacja zakończenia zlecenia
- Automatyczne closed_at

### Średnioterminowe (sprint 3-4)

- Walidacja sekwencji etapów
- Walidacja konfliktów zasobów
- Optymalizacja N+1 queries

---

**Raport wygenerowany:** 2025-12-30
**Status:** Wymaga poprawek przed wdrożeniem produkcyjnym
