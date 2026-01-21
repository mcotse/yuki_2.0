#!/bin/bash
# Deployment script for yuki-api on Oracle Cloud

set -e

echo "=== Installing Node.js ==="
sudo dnf install -y nodejs npm

echo "=== Installing PM2 for process management ==="
sudo npm install -g pm2

echo "=== Setting up firewall ==="
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload

echo "=== Creating app directory ==="
mkdir -p ~/yuki-api
cd ~/yuki-api

echo "=== Installing dependencies ==="
npm install

echo "=== Building app ==="
npm run build

echo "=== Starting app with PM2 ==="
pm2 start dist/index.js --name yuki-api
pm2 save
pm2 startup | tail -1 | bash

echo "=== Deployment complete! ==="
echo "API should be running on port 3000"
