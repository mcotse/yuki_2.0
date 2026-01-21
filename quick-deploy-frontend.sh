#!/bin/bash
# Quick deployment script for frontend-only updates
# Use this when only frontend code has changed

set -e

# Configuration
VM_IP="${OCI_VM_IP:-}"
SSH_KEY="${OCI_SSH_KEY:-~/.ssh/oci_yuki_key}"

if [ -z "$VM_IP" ]; then
  echo "Error: OCI_VM_IP environment variable not set"
  echo "Usage: OCI_VM_IP=<vm-ip> ./quick-deploy-frontend.sh"
  exit 1
fi

echo "=== Quick Deploy: Frontend to $VM_IP ==="

# Build frontend
echo "Building frontend..."
npm run build

# Upload frontend
echo "Uploading frontend..."
rsync -avz --delete -e "ssh -i $SSH_KEY" dist/ opc@$VM_IP:/var/www/yuki/dist/

echo ""
echo "=== Frontend deployed! ==="
echo "Visit: http://$VM_IP/"
