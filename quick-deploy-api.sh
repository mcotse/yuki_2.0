#!/bin/bash
# Quick deployment script for backend-only updates
# Use this when only server code has changed

set -e

# Configuration
VM_IP="${OCI_VM_IP:-}"
SSH_KEY="${OCI_SSH_KEY:-~/.ssh/oci_yuki_key}"

if [ -z "$VM_IP" ]; then
  echo "Error: OCI_VM_IP environment variable not set"
  echo "Usage: OCI_VM_IP=<vm-ip> ./quick-deploy-api.sh"
  exit 1
fi

echo "=== Quick Deploy: Backend to $VM_IP ==="

# Build backend Docker image for ARM64
echo "Building backend Docker image for ARM64..."
cd server
docker buildx build --platform linux/arm64 -t yuki-api:latest --load .
docker save yuki-api:latest | gzip > yuki-api.tar.gz

# Upload and deploy
echo "Uploading and deploying..."
scp -i $SSH_KEY yuki-api.tar.gz opc@$VM_IP:/tmp/

ssh -i $SSH_KEY opc@$VM_IP << 'EOF'
docker load < /tmp/yuki-api.tar.gz
rm /tmp/yuki-api.tar.gz
docker stop yuki-api 2>/dev/null || true
docker rm yuki-api 2>/dev/null || true
docker run -d --name yuki-api --restart unless-stopped \
  -p 3000:3000 \
  -v /opt/yuki-api/wallet:/app/wallet:ro \
  --env-file /etc/yuki/.env \
  yuki-api:latest
docker ps | grep yuki-api
EOF

rm yuki-api.tar.gz
cd ..

echo ""
echo "=== Backend deployed! ==="
echo "Health check: curl http://$VM_IP/health"
