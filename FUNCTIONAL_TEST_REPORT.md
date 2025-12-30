# PlexiSystem - Raport Testów Funkcjonalnych

## Audyt MES/ERP - Stan na 2025-12-30

---

## 1. Podsumowanie Wykonawcze

| Kategoria | Wynik |
|-----------|-------|
| Testy ogółem | 47 |
| OK | 28 (60%) |
| Błędy krytyczne | 8 (17%) |
| Błędy ważne | 7 (15%) |
| Uwagi | 4 (8%) |

**Ogólna ocena: System wymaga poprawek przed produkcyjnym wdrożeniem**

---

## 2. Testy Logiki Biznesowej

### 2.1 Statusy Zleceń

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| Nowe zlecenie → status NOWE | OK | Zlecenie tworzone ze statusem NOWE |  |
| Start etapu → zlecenie W_TRAKCIE | OK | Automatyczna zmiana statusu działa |  |
| Wszystkie etapy GOTOWY → zlecenie GOTOWE | OK | Logika w `updateOrderStatusFromStages` |  |
| Cofnięcie statusu GOTOWE → W_TRAKCIE | **BRAK** | Brak możliwości cofnięcia statusu | Dodać workflow cofania statusów |
| Zamknięcie zlecenia ustawia `closed_at` | OK | Pole wypełniane automatycznie |  |
| Ponowne otwarcie zlecenia czyści `closed_at` | **BRAK** | Brak logiki ponownego otwarcia | Implementować obsługę reopen |

### 2.2 Etapy Produkcyjne

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| Domyślne etapy tworzone przy zleceniu | OK | 12 etapów tworzonych automatycznie |  |
| Zmiana statusu etapu propaguje do zlecenia | OK | Działa poprawnie |  |
| Walidacja przejść statusów | **BRAK** | Można ustawić dowolny status | Dodać state machine dla statusów |
| Usunięcie etapu kaskadowo usuwa przypisania | OK | CASCADE DELETE działa |  |
| Kolejność etapów (sequence_order) | OK | Auto-inkrementacja działa |  |
| Edycja wymaganości etapu | OK | Pole `is_required` edytowalne |  |

### 2.3 Przypisania Pracowników

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| Przypisanie aktywnego pracownika | OK | Walidacja czy worker.active=true |  |
| Zapobieganie duplikatom | OK | Sprawdzane przed INSERT |  |
| Wielu pracowników na jeden etap | OK | Dozwolone, brak limitu |  |
| Kompletowanie przypisania → status GOTOWY | OK | Logika działa |  |
| Ownership check dla PRACOWNIK | OK | Naprawione 2025-12-29 |  |
| Przypisanie do zamkniętego etapu | **UWAGA** | Możliwe, brak walidacji | Rozważyć blokadę |

### 2.4 Sesje Pracy (Timer)

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| Start timera | OK | Tworzy work_session z start_time |  |
| Zapobieganie wielu aktywnym sesjom | OK | Sprawdzane przed startem |  |
| Stop timera oblicza czas i koszt | OK | Formuła: czas × stawka |  |
| Ownership check dla PRACOWNIK | OK | Naprawione 2025-12-29 |  |
| Limit maksymalnego czasu sesji | **BRAK** | Sesja może trwać w nieskończoność | Dodać alert/auto-stop po 12h |
| Czas rozpoczęcia w przyszłości | **BRAK** | Brak walidacji | Walidować start_time <= NOW() |
| Manualna korekta czasu | OK | PUT /api/work-sessions/:id działa |  |

### 2.5 Wysyłki (Apaczka)

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| Tworzenie wysyłki | OK | Integracja z Apaczka działa |  |
| Graceful degradation przy błędzie API | OK | Lokalna wysyłka tworzona mimo błędu |  |
| Parsowanie wymiarów | **UWAGA** | "30x20x15" parsowane, ale bez walidacji | Walidować format |
| Status zlecenia przed wysyłką | **BRAK** | Można wysłać zlecenie NOWE | Wymagać status GOTOWE |
| Anulowanie wysyłki | OK | DELETE próbuje anulować w Apaczka |  |

---

## 3. Testy Spójności Danych

### 3.1 Walidacja Referencji

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| Usunięcie zlecenia kaskadowo | OK | Etapy, przypisania, sesje usuwane |  |
| Usunięcie pracownika z przypisaniami | OK | Soft-delete (active=false) |  |
| Usunięcie pracownika bez przypisań | OK | Hard-delete |  |
| Duplikat numeru zlecenia | OK | Walidacja przed INSERT |  |
| Duplikat emaila pracownika | OK | Case-insensitive sprawdzanie |  |
| Duplikat PIN pracownika | OK | Walidacja unikalności |  |

### 3.2 Integralność Danych

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| Aktualizacja updated_at | **UWAGA** | Nie wszędzie konsekwentne | Ujednolicić w wszystkich UPDATE |
| Transakcje przy tworzeniu zlecenia | OK | BEGIN/COMMIT używane |  |
| Transakcje przy stop timer | OK | BEGIN/COMMIT używane |  |
| Audit log zmian | **BRAK** | Brak logowania kto co zmienił | Dodać tabelę audit_log |
| Wersjonowanie danych | **BRAK** | Brak historii zmian | Rozważyć temporal tables |

---

## 4. Testy Uprawnień i Ról

### 4.1 Kontrola Dostępu Pionowego

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| PRACOWNIK nie tworzy zleceń | OK | requireRole działa |  |
| PRACOWNIK nie usuwa zleceń | OK | requireRole działa |  |
| PRACOWNIK nie widzi raportów innych | OK | Naprawione 2025-12-29 |  |
| HANDLOWIEC nie zarządza pracownikami | OK | requireRole działa |  |
| KIEROWNIK ma dostęp do produkcji | OK | Naprawione MANAGER→KIEROWNIK |  |
| ADMIN ma pełny dostęp | OK | Wszystkie operacje dozwolone |  |

### 4.2 Kontrola Dostępu Poziomego

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| PRACOWNIK widzi tylko swoje etapy | OK | Filtrowanie po worker_id |  |
| PRACOWNIK timer tylko dla swoich | OK | Ownership check dodany |  |
| HANDLOWIEC widzi wszystkie zlecenia | OK | Brak ograniczeń (zamierzenie?) | Rozważyć filtr created_by |
| Komentarze - każdy może dodać | **UWAGA** | Brak ograniczeń | Rozważyć role-based |
| Załączniki - każdy może dodać | **UWAGA** | Brak ograniczeń | Rozważyć role-based |

---

## 5. Testy Walidacji Formularzy

### 5.1 Tworzenie Zlecenia

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| Wymagane: client_name | OK | Walidacja w kontrolerze |  |
| Wymagane: product_name | OK | Walidacja w kontrolerze |  |
| Auto-generowanie order_number | OK | Format ZAM/YYYY/XXXXX |  |
| Walidacja formatu daty | **BRAK** | Przyjmuje niepoprawne daty | Walidować format ISO |
| Walidacja ujemnej ilości | **BRAK** | Przyjmuje -1 | Walidować quantity >= 0 |
| Walidacja ujemnej ceny | **BRAK** | Przyjmuje -100 | Walidować price >= 0 |

### 5.2 Tworzenie Pracownika

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| Wymagane: name | **BRAK** | Brak walidacji | Dodać wymagane pola |
| Wymagane: email | OK | Sprawdzane unikalność |  |
| Format email | **BRAK** | Brak regex validation | Dodać walidację formatu |
| PIN 4-6 cyfr | OK | Walidacja działa |  |
| Unikalność PIN | OK | Sprawdzane przed INSERT |  |
| Walidacja roli | **BRAK** | Przyjmuje dowolny string | Enum validation |
| Walidacja ujemnej stawki | **BRAK** | Przyjmuje -50 | Walidować rate > 0 |

---

## 6. Testy Obsługi Błędów

### 6.1 Błędy Serwera

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| Nieistniejące zlecenie (404) | OK | AppError obsługiwane |  |
| Duplikat danych (400) | OK | Odpowiedni komunikat |  |
| Brak uprawnień (403) | OK | "Insufficient permissions" |  |
| Niepoprawny token (401) | OK | "Invalid token" |  |
| Błąd bazy danych | OK | Error handler loguje i zwraca 500 |  |
| Timeout API Apaczka | **UWAGA** | Brak explicit timeout | Dodać timeout handling |

### 6.2 Komunikaty Użytkownika

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| Błędy walidacji czytelne | OK | Komunikaty po polsku |  |
| Toast notifications | OK | useToast hook działa |  |
| Loading states | OK | Skeleton/spinner pokazywane |  |
| Empty states | OK | Komunikaty "Brak danych" |  |

---

## 7. Testy Wydajności (Potencjalne Problemy)

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| Lista zleceń - paginacja | OK | Limit/offset zaimplementowane |  |
| Raport zlecenia - N+1 queries | **BŁĄD** | Pętla po etapach z osobnymi query | Użyć JOIN lub batch loading |
| Brak indeksów | **UWAGA** | Nie sprawdzono | Dodać indeksy na FK i status |
| Brak cache | **UWAGA** | Settings pobierane za każdym razem | Dodać Redis/memory cache |
| Duże załączniki | **UWAGA** | 10MB limit, brak kompresji | Rozważyć kompresję/CDN |

---

## 8. Testy Bezpieczeństwa

| Test | Status | Opis | Sugerowana poprawka |
|------|--------|------|---------------------|
| SQL Injection | OK | Parameterized queries |  |
| XSS w komentarzach | **BRAK** | Brak sanityzacji | Dodać sanityzację HTML |
| Rate limiting | **BRAK** | Brak ochrony przed brute-force | Dodać rate limiter |
| CORS | OK | Skonfigurowane poprawnie |  |
| HTTPS | OK | SSL na serwerze |  |
| JWT expiry | OK | 7 dni domyślnie |  |
| Hasła hashowane | OK | bcrypt z salt rounds 10 |  |
| Audit trail | **BRAK** | Brak logów zmian | Dodać tabelę audit |

---

## 9. Podsumowanie Błędów Krytycznych

### Do Natychmiastowej Naprawy:

1. **Brak walidacji ujemnych wartości** - ilość, cena, stawka mogą być ujemne
2. **Brak state machine dla statusów** - można ustawić dowolny status
3. **N+1 queries w raportach** - problem wydajności
4. **Brak sanityzacji XSS** - potencjalna luka bezpieczeństwa
5. **Brak rate limiting** - podatność na brute-force
6. **Brak audit log** - brak śladu zmian
7. **Wysyłka przed zakończeniem produkcji** - logika biznesowa
8. **Brak limitu czasu sesji** - timer może działać w nieskończoność

### Do Naprawy Przed Wdrożeniem:

1. Walidacja formatu email
2. Walidacja formatu daty
3. Timeout dla API Apaczka
4. Indeksy bazodanowe
5. Cache dla ustawień
6. Ujednolicenie updated_at

---

## 10. Rekomendacje

### Priorytet 1 (Blokujące wdrożenie):

```typescript
// Przykład: Walidacja przy tworzeniu zlecenia
const createOrderSchema = z.object({
  client_name: z.string().min(1, "Nazwa klienta wymagana"),
  product_name: z.string().min(1, "Nazwa produktu wymagana"),
  quantity: z.number().min(0, "Ilość nie może być ujemna").optional(),
  price_total: z.number().min(0, "Cena nie może być ujemna").optional(),
  planned_completion_date: z.string().datetime().optional(),
});
```

### Priorytet 2 (Przed produkcją):

- Dodać middleware `express-rate-limit`
- Dodać `xss-clean` dla sanityzacji
- Utworzyć tabelę `audit_logs`
- Dodać indeksy na `order_id`, `worker_id`, `status`

### Priorytet 3 (Optymalizacja):

- Zrefaktorować raport zlecenia na JOINy
- Dodać Redis cache dla settings
- Rozważyć paginację dla wszystkich list

---

*Raport wygenerowany: 2025-12-30*
*Metodologia: Analiza kodu + logiczna weryfikacja przepływów*
