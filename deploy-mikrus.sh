#!/bin/bash

# PlexiSystem - Skrypt wdrożenia na Mikrus
# Użycie: ./deploy-mikrus.sh

set -e

# Konfiguracja
MIKRUS_HOST="beata254.mikrus.xyz"
MIKRUS_PORT="10254"
MIKRUS_USER="root"
APP_DIR="/var/www/plexisystem"

echo "=========================================="
echo "PlexiSystem - Wdrożenie na Mikrus"
echo "=========================================="

# 1. Build frontendu
echo ""
echo "1. Budowanie frontendu..."
npm run build

# 2. Przygotuj pliki do przesłania
echo ""
echo "2. Przygotowywanie plików..."
rm -rf deploy-package
mkdir -p deploy-package

# Skopiuj zbudowany frontend
cp -r dist deploy-package/frontend

# Skopiuj backend API
cp -r api deploy-package/api
rm -rf deploy-package/api/node_modules

# Skopiuj pliki konfiguracyjne
cat > deploy-package/.env.example << 'EOF'
# PlexiSystem Configuration
NODE_ENV=production
PORT=4000

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=plexisystem
DB_USER=plexisystem
DB_PASSWORD=your_secure_password_here

# JWT
JWT_SECRET=your_jwt_secret_here_min_32_chars
JWT_EXPIRY=7d

# Frontend URL (for CORS)
FRONTEND_URL=https://beata254.mikrus.xyz
EOF

# 3. Twórz archiwum
echo ""
echo "3. Tworzenie archiwum..."
tar -czf plexisystem-deploy.tar.gz -C deploy-package .

# 4. Sprawdź połączenie SSH
echo ""
echo "4. Sprawdzanie połączenia z Mikrusem..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes -p $MIKRUS_PORT $MIKRUS_USER@$MIKRUS_HOST "echo 'OK'" 2>/dev/null; then
    echo "BŁĄD: Nie można połączyć się z Mikrusem"
    echo "Upewnij się, że:"
    echo "  - Klucz SSH jest skonfigurowany"
    echo "  - Serwer jest dostępny"
    echo ""
    echo "Można ręcznie przesłać archiwum:"
    echo "  scp -P $MIKRUS_PORT plexisystem-deploy.tar.gz $MIKRUS_USER@$MIKRUS_HOST:~/"
    exit 1
fi

# 5. Prześlij na serwer
echo ""
echo "5. Przesyłanie na serwer..."
scp -P $MIKRUS_PORT plexisystem-deploy.tar.gz $MIKRUS_USER@$MIKRUS_HOST:~/

# 6. Wdróż na serwerze
echo ""
echo "6. Wdrażanie na serwerze..."
ssh -p $MIKRUS_PORT $MIKRUS_USER@$MIKRUS_HOST << 'ENDSSH'
set -e

APP_DIR="/var/www/plexisystem"

# Utwórz katalog jeśli nie istnieje
mkdir -p $APP_DIR
mkdir -p $APP_DIR/backup

# Backup poprzedniej wersji
if [ -d "$APP_DIR/frontend" ]; then
    echo "Tworzenie backupu..."
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    mv $APP_DIR/frontend $APP_DIR/backup/$BACKUP_NAME-frontend 2>/dev/null || true
    mv $APP_DIR/api $APP_DIR/backup/$BACKUP_NAME-api 2>/dev/null || true
fi

# Rozpakuj nową wersję
cd ~
tar -xzf plexisystem-deploy.tar.gz

# Przenieś pliki
mv frontend $APP_DIR/
mv api $APP_DIR/

# Zachowaj .env jeśli istnieje, inaczej użyj przykładowego
if [ ! -f "$APP_DIR/api/.env" ]; then
    cp $APP_DIR/.env.example $APP_DIR/api/.env
    echo "UWAGA: Stworzono .env z przykładowymi wartościami - ZMIEŃ HASŁA!"
fi

# Zainstaluj zależności backendu
cd $APP_DIR/api
npm install --production

# Uruchom migrację bazy (jeśli istnieje baza)
# npm run migrate  # odkomentuj gdy baza będzie gotowa

# Restartuj PM2 jeśli używasz
if command -v pm2 &> /dev/null; then
    pm2 restart plexisystem-api 2>/dev/null || pm2 start dist/server.js --name plexisystem-api
fi

# Skonfiguruj Nginx jeśli nie jest skonfigurowany
if [ ! -f "/etc/nginx/sites-enabled/plexisystem" ]; then
    echo "UWAGA: Skonfiguruj Nginx ręcznie. Przykładowa konfiguracja:"
    echo ""
    cat << 'NGINX'
server {
    listen 80;
    server_name beata254.mikrus.xyz;

    # Frontend (statyczne pliki)
    location / {
        root /var/www/plexisystem/frontend;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX
fi

echo ""
echo "Wdrożenie zakończone!"
ENDSSH

# Sprzątanie
rm -rf deploy-package plexisystem-deploy.tar.gz

echo ""
echo "=========================================="
echo "GOTOWE!"
echo "=========================================="
echo ""
echo "Następne kroki na serwerze Mikrus:"
echo "1. Zainstaluj PostgreSQL: apt install postgresql"
echo "2. Utwórz bazę danych:"
echo "   sudo -u postgres createuser plexisystem"
echo "   sudo -u postgres createdb plexisystem -O plexisystem"
echo "3. Edytuj /var/www/plexisystem/api/.env i ustaw hasła"
echo "4. Uruchom migrację: cd /var/www/plexisystem/api && npm run migrate"
echo "5. Uruchom seed: npm run seed"
echo "6. Skonfiguruj Nginx"
echo "7. Skonfiguruj SSL z Let's Encrypt"
echo ""
