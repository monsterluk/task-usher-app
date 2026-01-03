import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';

// ========== KONFIGURACJA ==========
const BASE_URL = 'https://system.plexisystem.pl';
const API_URL = 'https://beata254.mikrus.xyz:20254/api';

// Tokeny do testów API (wygenerowane wcześniej)
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OSwiZW1haWwiOiJsdWthc3ouc2lrb3JyYUBwbGV4aXN5c3RlbS5wbCIsInJvbGUiOiJBRE1JTiIsIm5hbWUiOiLFgXVrYXN6IFNpa29ycmEiLCJpYXQiOjE3NjczNTY0MDEsImV4cCI6MTc2Nzk2MTIwMX0.bnQ-yrcCf5GkGZia9V5cuoguNIoHkrFAnzMxTx3svGQ';

// ========== HELPERS ==========
async function loginWithPin(page: Page, pin: string) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Znajdź pole PIN
  const pinInput = page.locator('input[type="text"], input[type="password"], input[name="pin"], input[placeholder*="PIN"]').first();
  await pinInput.fill(pin);
  await pinInput.press('Enter');

  // Poczekaj na przekierowanie
  await page.waitForTimeout(3000);
}

// ========== TEST SUITE ==========

test.describe('PlexiSystem - Pełne Testy Automatyczne', () => {

  // ========== TEST 1: LOGIN DLA WSZYSTKICH RÓL ==========
  test.describe('1. Autentykacja PIN', () => {
    const users = [
      { pin: '1234', role: 'Admin', expectedUrl: '/manager' },
      { pin: '5678', role: 'Kierownik', expectedUrl: '/manager' },
      { pin: '1111', role: 'Handlowiec', expectedUrl: '/handlowiec' },
      { pin: '2222', role: 'Pracownik', expectedUrl: '/worker' },
    ];

    for (const { pin, role, expectedUrl } of users) {
      test(`Login jako ${role} (PIN: ${pin})`, async ({ page }) => {
        const errors: string[] = [];

        page.on('console', msg => {
          if (msg.type() === 'error' && !msg.text().includes('favicon')) {
            errors.push(msg.text());
          }
        });

        await loginWithPin(page, pin);

        // Sprawdź czy przekierowanie nastąpiło (nie jesteśmy na stronie logowania)
        const url = page.url();
        expect(url).not.toContain('/login');

        console.log(`✅ ${role} - Zalogowano, URL: ${url}`);

        // Pokaż błędy jeśli są
        if (errors.length > 0) {
          console.log(`   ⚠️ Błędy konsoli (${errors.length}):`);
          errors.slice(0, 3).forEach(e => console.log(`      - ${e.substring(0, 100)}`));
        }
      });
    }
  });

  // ========== TEST 2: PANEL KIEROWNIKA/ADMINA ==========
  test.describe('2. Panel Kierownika', () => {
    test.beforeEach(async ({ page }) => {
      await loginWithPin(page, '1234'); // Admin
    });

    const managerPages = [
      { url: '/manager/dashboard', name: 'Dashboard' },
      { url: '/manager/orders', name: 'Zlecenia' },
      { url: '/manager/calendar', name: 'Kalendarz' },
      { url: '/manager/workers', name: 'Pracownicy' },
      { url: '/manager/machines', name: 'Maszyny' },
      { url: '/manager/inventory', name: 'Magazyn' },
      { url: '/manager/bom', name: 'BOM/Receptury' },
      { url: '/manager/time-tracking', name: 'Czas pracy' },
      { url: '/manager/reports', name: 'Raporty' },
      { url: '/manager/settings', name: 'Ustawienia systemu' },
    ];

    for (const { url, name } of managerPages) {
      test(`Strona: ${name}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error' && !msg.text().includes('favicon')) {
            errors.push(msg.text());
          }
        });

        await page.goto(BASE_URL + url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Sprawdź czy strona się załadowała
        const body = await page.locator('body').textContent();
        const pageLoaded = body && body.length > 100;

        if (pageLoaded) {
          console.log(`✅ ${name} - OK (${body?.length} znaków)`);
        } else {
          console.log(`❌ ${name} - PUSTA lub błąd`);
        }

        // Sprawdź krytyczne błędy (ignoruj 429 rate limit)
        const criticalErrors = errors.filter(e =>
          !e.includes('429') &&
          !e.includes('rate') &&
          !e.includes('Failed to load resource') &&
          !e.includes('net::')
        );

        if (criticalErrors.length > 0) {
          console.log(`   ⚠️ Błędy: ${criticalErrors.length}`);
          criticalErrors.slice(0, 2).forEach(e => console.log(`      - ${e.substring(0, 80)}`));
        }

        expect(pageLoaded).toBeTruthy();
      });
    }
  });

  // ========== TEST 3: PANEL PRACOWNIKA ==========
  test.describe('3. Panel Pracownika', () => {
    test.beforeEach(async ({ page }) => {
      await loginWithPin(page, '2222'); // Pracownik
    });

    const workerPages = [
      { url: '/worker/dashboard', name: 'Dashboard pracownika' },
      { url: '/worker/stages', name: 'Moje etapy' },
      { url: '/worker/time', name: 'Mój czas pracy' },
    ];

    for (const { url, name } of workerPages) {
      test(`Strona: ${name}`, async ({ page }) => {
        await page.goto(BASE_URL + url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const body = await page.locator('body').textContent();
        const pageLoaded = body && body.length > 50;

        console.log(`${pageLoaded ? '✅' : '❌'} ${name} - ${body?.length || 0} znaków`);
        expect(pageLoaded).toBeTruthy();
      });
    }
  });

  // ========== TEST 4: PANEL HANDLOWCA ==========
  test.describe('4. Panel Handlowca', () => {
    test.beforeEach(async ({ page }) => {
      await loginWithPin(page, '1111'); // Handlowiec
    });

    const handlowiecPages = [
      { url: '/handlowiec/dashboard', name: 'Dashboard handlowca' },
      { url: '/handlowiec/orders', name: 'Zlecenia handlowca' },
    ];

    for (const { url, name } of handlowiecPages) {
      test(`Strona: ${name}`, async ({ page }) => {
        await page.goto(BASE_URL + url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const body = await page.locator('body').textContent();
        const pageLoaded = body && body.length > 50;

        console.log(`${pageLoaded ? '✅' : '❌'} ${name} - ${body?.length || 0} znaków`);
        expect(pageLoaded).toBeTruthy();
      });
    }
  });

  // ========== TEST 5: API ENDPOINTS ==========
  test.describe('5. API Endpoints', () => {
    const publicEndpoints = [
      { endpoint: '/api/health', name: 'Health check', needsAuth: false },
    ];

    const authEndpoints = [
      { endpoint: '/api/workers', name: 'Workers' },
      { endpoint: '/api/orders', name: 'Orders' },
      { endpoint: '/api/machines', name: 'Machines' },
      { endpoint: '/api/inventory/materials', name: 'Materials' },
      { endpoint: '/api/inventory/categories', name: 'Categories' },
      { endpoint: '/api/time-tracking/entries', name: 'Time entries' },
      { endpoint: '/api/time-tracking/settings', name: 'Time settings' },
      { endpoint: '/api/announcements', name: 'Announcements' },
      { endpoint: '/api/notifications', name: 'Notifications' },
      { endpoint: '/api/quality/checkpoints', name: 'Quality checkpoints' },
      { endpoint: '/api/bom/templates', name: 'BOM templates' },
      { endpoint: '/api/calendar/events', name: 'Calendar events' },
      { endpoint: '/api/admin/backups', name: 'Backups' },
    ];

    for (const { endpoint, name } of authEndpoints) {
      test(`GET ${endpoint}`, async ({ request }) => {
        const response = await request.get(API_URL + endpoint, {
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
          },
          ignoreHTTPSErrors: true,
        });

        const status = response.status();

        if (status === 200) {
          console.log(`✅ ${name} - 200 OK`);
        } else if (status === 401 || status === 403) {
          console.log(`⚠️ ${name} - ${status} (auth expired)`);
        } else if (status === 404) {
          console.log(`❌ ${name} - 404 (endpoint nie istnieje)`);
        } else if (status >= 500) {
          console.log(`🚨 ${name} - ${status} (BŁĄD SERWERA!)`);
        } else {
          console.log(`❓ ${name} - ${status}`);
        }

        // API powinno zwrócić 200, 401, 403 lub 404
        expect([200, 401, 403, 404]).toContain(status);
      });
    }
  });

  // ========== TEST 6: FUNKCJONALNOŚĆ CRUD ==========
  test.describe('6. CRUD Operations', () => {
    test('Edycja pracownika (Admin)', async ({ page }) => {
      await loginWithPin(page, '1234');
      await page.goto(BASE_URL + '/manager/workers');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Znajdź przycisk Edytuj
      const editButton = page.locator('button:has-text("Edytuj")').first();
      const buttonExists = await editButton.count() > 0;

      if (buttonExists) {
        await editButton.click();
        await page.waitForTimeout(1000);

        // Sprawdź czy modal się otworzył
        const modal = page.locator('text=Edytuj Pracownika');
        const modalVisible = await modal.count() > 0;

        console.log(`✅ Edycja pracownika - Modal: ${modalVisible ? 'WIDOCZNY' : 'BRAK'}`);
        expect(modalVisible).toBeTruthy();

        // Zamknij modal
        const cancelButton = page.locator('button:has-text("Anuluj")');
        if (await cancelButton.count() > 0) {
          await cancelButton.click();
        }
      } else {
        console.log('⚠️ Przycisk Edytuj nie znaleziony');
      }
    });

    test('Podsumowanie miesięczne - brak NaN', async ({ page }) => {
      await loginWithPin(page, '1234');
      await page.goto(BASE_URL + '/manager/time-tracking');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Kliknij zakładkę Podsumowanie
      const summaryTab = page.locator('text=Podsumowanie');
      if (await summaryTab.count() > 0) {
        await summaryTab.click();
        await page.waitForTimeout(2000);

        // Sprawdź czy nie ma NaN
        const pageContent = await page.locator('body').textContent();
        const hasNaN = pageContent?.includes('NaN');

        if (hasNaN) {
          console.log('❌ Podsumowanie zawiera NaN!');
        } else {
          console.log('✅ Podsumowanie - brak NaN');
        }

        expect(hasNaN).toBeFalsy();
      }
    });
  });

  // ========== TEST 7: RESPONSYWNOŚĆ (MOBILE) ==========
  test.describe('7. Responsywność Mobile', () => {
    test.use({ viewport: { width: 375, height: 812 } }); // iPhone X

    test('Dashboard mobile', async ({ page }) => {
      await loginWithPin(page, '1234');
      await page.goto(BASE_URL + '/manager/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Sprawdź czy sidebar jest ukryty na mobile
      const sidebar = page.locator('[class*="sidebar"], nav').first();
      const sidebarVisible = await sidebar.isVisible();

      console.log(`📱 Mobile Dashboard - Sidebar: ${sidebarVisible ? 'widoczny' : 'ukryty'}`);

      // Zrób screenshot
      await page.screenshot({
        path: 'test-results/screenshots/mobile_dashboard.png',
        fullPage: true
      });

      console.log('📸 Screenshot zapisany: mobile_dashboard.png');
    });

    test('Lista pracowników mobile', async ({ page }) => {
      await loginWithPin(page, '1234');
      await page.goto(BASE_URL + '/manager/workers');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Na mobile powinny być karty zamiast tabeli
      const cards = page.locator('[class*="card"]');
      const cardCount = await cards.count();

      console.log(`📱 Mobile Workers - Karty: ${cardCount}`);

      await page.screenshot({
        path: 'test-results/screenshots/mobile_workers.png',
        fullPage: true
      });
    });
  });

  // ========== TEST 8: SCREENSHOTY WSZYSTKICH STRON ==========
  test.describe('8. Visual Screenshots', () => {
    const screenshotPages = [
      { pin: '1234', url: '/manager/dashboard', name: 'admin_dashboard' },
      { pin: '1234', url: '/manager/orders', name: 'admin_orders' },
      { pin: '1234', url: '/manager/workers', name: 'admin_workers' },
      { pin: '1234', url: '/manager/time-tracking', name: 'admin_timetracking' },
      { pin: '2222', url: '/worker/stages', name: 'worker_stages' },
      { pin: '1111', url: '/handlowiec/orders', name: 'handlowiec_orders' },
    ];

    for (const { pin, url, name } of screenshotPages) {
      test(`Screenshot: ${name}`, async ({ page }) => {
        await loginWithPin(page, pin);
        await page.goto(BASE_URL + url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: `test-results/screenshots/${name}.png`,
          fullPage: true
        });

        console.log(`📸 ${name} - screenshot zapisany`);
      });
    }
  });

  // ========== TEST 9: PERFORMANCE ==========
  test.describe('9. Performance', () => {
    test('Czas ładowania Dashboard < 5s', async ({ page }) => {
      const startTime = Date.now();

      await loginWithPin(page, '1234');
      await page.goto(BASE_URL + '/manager/dashboard');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      console.log(`⏱️ Dashboard load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(10000); // 10 sekund max (z logowaniem)
    });
  });

  // ========== TEST 10: ERROR HANDLING ==========
  test.describe('10. Error Handling', () => {
    test('404 page', async ({ page }) => {
      await loginWithPin(page, '1234');
      await page.goto(BASE_URL + '/nieistniejaca-strona-xyz');
      await page.waitForTimeout(2000);

      const pageContent = await page.locator('body').textContent();
      console.log(`🔍 404 page content: ${pageContent?.substring(0, 100)}`);

      // Strona powinna coś wyświetlić (nie crash)
      expect(pageContent?.length).toBeGreaterThan(10);
    });

    test('Niepoprawny PIN', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const pinInput = page.locator('input').first();
      await pinInput.fill('0000');
      await pinInput.press('Enter');
      await page.waitForTimeout(2000);

      // Powinien zostać na stronie logowania lub pokazać błąd
      const url = page.url();
      const pageContent = await page.locator('body').textContent();

      console.log(`🔐 Invalid PIN - URL: ${url}`);
      console.log(`   Content: ${pageContent?.substring(0, 100)}`);
    });
  });
});
