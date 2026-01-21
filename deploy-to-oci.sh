#!/bin/bash
# Full deployment script for Yuki on Oracle Cloud
# Deploys both frontend and backend

set -e

# Configuration
VM_IP="${OCI_VM_IP:-}"
SSH_KEY="${OCI_SSH_KEY:-~/.ssh/oci_yuki_key}"

if [ -z "$VM_IP" ]; then
  echo "Error: OCI_VM_IP environment variable not set"
  echo "Usage: OCI_VM_IP=<vm-ip> ./deploy-to-oci.sh"
  exit 1
fi

echo "=== Deploying to $VM_IP ==="

# Build frontend
echo "Building frontend..."
npm run build

# Build backend Docker image for ARM64
echo "Building backend Docker image for ARM64..."
cd server
docker buildx build --platform linux/arm64 -t yuki-api:latest --load .
docker save yuki-api:latest | gzip > yuki-api.tar.gz
cd ..

# Upload frontend
echo "Uploading frontend..."
rsync -avz --delete -e "ssh -i $SSH_KEY" dist/ opc@$VM_IP:/var/www/yuki/dist/

# Upload and deploy backend
echo "Uploading backend image..."
scp -i $SSH_KEY server/yuki-api.tar.gz opc@$VM_IP:/tmp/

echo "Deploying backend..."
ssh -i $SSH_KEY opc@$VM_IP << 'EOF'
echo "Loading Docker image..."
docker load < /tmp/yuki-api.tar.gz
rm /tmp/yuki-api.tar.gz

echo "Restarting container..."
docker stop yuki-api 2>/dev/null || true
docker rm yuki-api 2>/dev/null || true
docker run -d --name yuki-api --restart unless-stopped \
  -p 3000:3000 \
  -v /opt/yuki-api/wallet:/app/wallet:ro \
  --env-file /etc/yuki/.env \
  yuki-api:latest

echo "Container status:"
docker ps | grep yuki-api
EOF

# Cleanup local artifact
rm server/yuki-api.tar.gz

echo ""
echo "=== Deployment complete! ==="
echo "Frontend: http://$VM_IP/"
echo "API:      http://$VM_IP/api/"
echo "Health:   http://$VM_IP/health"
