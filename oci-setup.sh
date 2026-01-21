#!/bin/bash
# OCI Setup Reference Script for Yuki Deployment
# This script contains all commands for setting up OCI infrastructure
# Run commands manually or source relevant sections
#
# Prerequisites:
# - Oracle Cloud account (Always Free tier)
# - Autonomous DB already provisioned in us-sanjose-1
# - OCI CLI installed (brew install oci-cli)
# - OCI CLI configured (oci setup config)

set -e

# ============================================================
# PHASE 1: OCI CLI Setup (run locally)
# ============================================================

setup_oci_cli() {
  echo "=== Installing OCI CLI ==="
  brew install oci-cli

  echo "=== Running OCI CLI setup ==="
  echo "You'll need:"
  echo "  - User OCID (OCI Console > Profile > User Settings)"
  echo "  - Tenancy OCID (OCI Console > Profile > Tenancy)"
  echo "  - Region (e.g., us-sanjose-1)"
  oci setup config

  echo "=== Upload this public key to OCI Console > Profile > API Keys ==="
  cat ~/.oci/oci_api_key_public.pem

  echo "=== Verify setup ==="
  oci iam region list --output table
}

# ============================================================
# PHASE 2: Create Network Infrastructure
# ============================================================

create_network() {
  if [ -z "$COMPARTMENT_ID" ]; then
    echo "Error: Set COMPARTMENT_ID first"
    echo "export COMPARTMENT_ID=\"ocid1.compartment.oc1..xxx\""
    return 1
  fi

  echo "=== Creating VCN ==="
  oci network vcn create --compartment-id $COMPARTMENT_ID \
    --display-name yuki-vcn --cidr-blocks '["10.0.0.0/16"]' \
    --dns-label yukivcn --wait-for-state AVAILABLE

  export VCN_ID=$(oci network vcn list --compartment-id $COMPARTMENT_ID \
    --display-name yuki-vcn --query "data[0].id" --raw-output)
  echo "VCN_ID=$VCN_ID"

  echo "=== Creating Internet Gateway ==="
  oci network internet-gateway create --compartment-id $COMPARTMENT_ID \
    --vcn-id $VCN_ID --display-name yuki-igw --is-enabled true

  export IGW_ID=$(oci network internet-gateway list --compartment-id $COMPARTMENT_ID \
    --vcn-id $VCN_ID --query "data[0].id" --raw-output)
  export RT_ID=$(oci network route-table list --compartment-id $COMPARTMENT_ID \
    --vcn-id $VCN_ID --query "data[0].id" --raw-output)
  echo "IGW_ID=$IGW_ID"
  echo "RT_ID=$RT_ID"

  echo "=== Updating Route Table ==="
  oci network route-table update --rt-id $RT_ID \
    --route-rules '[{"cidrBlock":"0.0.0.0/0","networkEntityId":"'$IGW_ID'"}]' --force

  echo "=== Creating Security List (ports 22, 80, 3000) ==="
  oci network security-list create --compartment-id $COMPARTMENT_ID \
    --vcn-id $VCN_ID --display-name yuki-security-list \
    --ingress-security-rules '[
      {"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":22,"max":22}}},
      {"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":80,"max":80}}},
      {"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":3000,"max":3000}}}
    ]' \
    --egress-security-rules '[{"destination":"0.0.0.0/0","protocol":"all"}]'

  export SL_ID=$(oci network security-list list --compartment-id $COMPARTMENT_ID \
    --vcn-id $VCN_ID --display-name yuki-security-list --query "data[0].id" --raw-output)
  echo "SL_ID=$SL_ID"

  echo "=== Creating Subnet ==="
  oci network subnet create --compartment-id $COMPARTMENT_ID \
    --vcn-id $VCN_ID --display-name yuki-public-subnet \
    --cidr-block "10.0.1.0/24" --dns-label yukipublic \
    --route-table-id $RT_ID --security-list-ids '["'$SL_ID'"]'

  echo "=== Network setup complete ==="
}

# ============================================================
# PHASE 3: Create Compute VM
# ============================================================

create_vm() {
  if [ -z "$COMPARTMENT_ID" ] || [ -z "$VCN_ID" ]; then
    echo "Error: Set COMPARTMENT_ID and VCN_ID first"
    return 1
  fi

  echo "=== Generating SSH key ==="
  ssh-keygen -t rsa -b 4096 -f ~/.ssh/oci_yuki_key -N ""

  echo "=== Getting required IDs ==="
  export AD_NAME=$(oci iam availability-domain list \
    --compartment-id $COMPARTMENT_ID --query "data[0].name" --raw-output)
  export IMAGE_ID=$(oci compute image list --compartment-id $COMPARTMENT_ID \
    --operating-system "Oracle Linux" --operating-system-version "9" \
    --shape "VM.Standard.A1.Flex" --sort-by TIMECREATED --sort-order DESC \
    --query "data[0].id" --raw-output)
  export SUBNET_ID=$(oci network subnet list --compartment-id $COMPARTMENT_ID \
    --vcn-id $VCN_ID --display-name yuki-public-subnet --query "data[0].id" --raw-output)

  echo "AD_NAME=$AD_NAME"
  echo "IMAGE_ID=$IMAGE_ID"
  echo "SUBNET_ID=$SUBNET_ID"

  echo "=== Launching ARM Ampere A1 instance (2 OCPUs, 12GB RAM) ==="
  oci compute instance launch --compartment-id $COMPARTMENT_ID \
    --availability-domain $AD_NAME --display-name yuki-server \
    --shape VM.Standard.A1.Flex \
    --shape-config '{"ocpus":2,"memoryInGBs":12}' \
    --image-id $IMAGE_ID --subnet-id $SUBNET_ID \
    --assign-public-ip true \
    --metadata '{"ssh_authorized_keys":"'"$(cat ~/.ssh/oci_yuki_key.pub)"'"}' \
    --wait-for-state RUNNING

  echo "=== Getting public IP ==="
  export INSTANCE_ID=$(oci compute instance list --compartment-id $COMPARTMENT_ID \
    --display-name yuki-server --lifecycle-state RUNNING --query "data[0].id" --raw-output)
  export VNIC_ID=$(oci compute vnic-attachment list --compartment-id $COMPARTMENT_ID \
    --instance-id $INSTANCE_ID --query "data[0].\"vnic-id\"" --raw-output)
  export PUBLIC_IP=$(oci network vnic get --vnic-id $VNIC_ID \
    --query "data.\"public-ip\"" --raw-output)

  echo "=== VM Created ==="
  echo "PUBLIC_IP=$PUBLIC_IP"
  echo ""
  echo "SSH Command: ssh -i ~/.ssh/oci_yuki_key opc@$PUBLIC_IP"
}

# ============================================================
# PHASE 4: Configure VM (run this ON the VM via SSH)
# ============================================================

configure_vm_commands() {
  cat << 'VMEOF'
# Run these commands on the VM after SSH'ing in
# ssh -i ~/.ssh/oci_yuki_key opc@<PUBLIC_IP>

# Install Docker
sudo dnf update -y
sudo dnf install -y dnf-utils
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker opc

# Install Nginx
sudo dnf install -y nginx
sudo systemctl enable nginx

# Configure firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# Create directories
sudo mkdir -p /var/www/yuki/dist /opt/yuki-api/wallet /etc/yuki
sudo chown -R opc:opc /var/www/yuki /opt/yuki-api

# IMPORTANT: Logout and login again for docker group to take effect
exit
VMEOF
}

# ============================================================
# PHASE 5: Setup Nginx and Environment (run locally)
# ============================================================

setup_nginx_and_env() {
  if [ -z "$PUBLIC_IP" ]; then
    echo "Error: Set PUBLIC_IP first"
    return 1
  fi

  SSH_KEY="${OCI_SSH_KEY:-~/.ssh/oci_yuki_key}"

  echo "=== Uploading nginx config ==="
  scp -i $SSH_KEY server/nginx.conf opc@$PUBLIC_IP:/tmp/yuki.conf
  ssh -i $SSH_KEY opc@$PUBLIC_IP "sudo mv /tmp/yuki.conf /etc/nginx/conf.d/yuki.conf && sudo nginx -t && sudo systemctl restart nginx"

  echo "=== Creating environment file ==="
  echo "You need to create /etc/yuki/.env on the VM with:"
  echo ""
  echo "ORACLE_USER=ADMIN"
  echo "ORACLE_PASSWORD=<your-db-password>"
  echo "CORS_ORIGIN=http://$PUBLIC_IP"
  echo "NODE_ENV=production"
  echo ""
  echo "Run: ssh -i $SSH_KEY opc@$PUBLIC_IP"
  echo "Then: sudo tee /etc/yuki/.env << EOF"
  echo "ORACLE_USER=ADMIN"
  echo "ORACLE_PASSWORD=<your-db-password>"
  echo "CORS_ORIGIN=http://$PUBLIC_IP"
  echo "NODE_ENV=production"
  echo "EOF"
  echo "Then: sudo chmod 600 /etc/yuki/.env"

  echo ""
  echo "=== Don't forget to copy the Oracle wallet files ==="
  echo "scp -i $SSH_KEY -r server/wallet/* opc@$PUBLIC_IP:/opt/yuki-api/wallet/"
}

# ============================================================
# PHASE 6: Verification
# ============================================================

verify_deployment() {
  if [ -z "$PUBLIC_IP" ]; then
    echo "Error: Set PUBLIC_IP first"
    return 1
  fi

  echo "=== Health Check ==="
  curl -s http://$PUBLIC_IP/health && echo ""

  echo "=== Frontend ==="
  curl -sI http://$PUBLIC_IP/ | head -5

  echo "=== API ==="
  curl -s http://$PUBLIC_IP/api/pets && echo ""
}

# ============================================================
# Quick Reference
# ============================================================

show_help() {
  cat << 'HELPEOF'
OCI Yuki Deployment Quick Reference
====================================

Environment Variables:
  export COMPARTMENT_ID="ocid1.compartment.oc1..xxx"
  export VCN_ID="ocid1.vcn.oc1..xxx"
  export PUBLIC_IP="xxx.xxx.xxx.xxx"
  export OCI_VM_IP="xxx.xxx.xxx.xxx"  # For deploy scripts
  export OCI_SSH_KEY="~/.ssh/oci_yuki_key"

Deployment Commands:
  ./deploy-to-oci.sh          # Full deployment (frontend + backend)
  ./quick-deploy-frontend.sh  # Frontend only
  ./quick-deploy-api.sh       # Backend only

SSH to VM:
  ssh -i ~/.ssh/oci_yuki_key opc@$PUBLIC_IP

View Logs:
  ssh -i ~/.ssh/oci_yuki_key opc@$PUBLIC_IP "docker logs -f yuki-api"

Free Tier Limits:
  - ARM Compute: 4 OCPUs, 24GB RAM total (using 2 OCPUs, 12GB)
  - Autonomous DB: 2 instances (using 1)
  - Block Storage: 200GB total (50GB boot disk)
HELPEOF
}

# Run with: source oci-setup.sh && show_help
echo "OCI Setup Script loaded. Run 'show_help' for usage."
