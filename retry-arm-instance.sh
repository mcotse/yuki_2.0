#!/bin/bash
# Retry script for ARM instance creation
# Run with: ./retry-arm-instance.sh
# Stop with: Ctrl+C

set -e

COMPARTMENT_ID="ocid1.tenancy.oc1..aaaaaaaaydtejlluhifbnvelaol7gufsifnutyahteekyzt456pdkvma6w3a"
AD_NAME="JjoO:US-SANJOSE-1-AD-1"
IMAGE_ID="ocid1.image.oc1.us-sanjose-1.aaaaaaaaabxp36vqiywugybxfal5m7v4cfjy4aduvren6qbmizdnwe2khria"
SUBNET_ID="ocid1.subnet.oc1.us-sanjose-1.aaaaaaaa6czetlamap6gfny7coyahbsxkmdopg27ytkv4zlnrvv2sd3quzfq"
SSH_KEY=$(cat ~/.ssh/oci_yuki_key.pub)

MAX_ATTEMPTS=100
RETRY_INTERVAL=60  # seconds

echo "=========================================="
echo "ARM Instance Retry Script"
echo "=========================================="
echo "Will retry every ${RETRY_INTERVAL}s up to ${MAX_ATTEMPTS} times"
echo "Press Ctrl+C to stop"
echo ""

for i in $(seq 1 $MAX_ATTEMPTS); do
  echo "[$i/$MAX_ATTEMPTS] $(date '+%Y-%m-%d %H:%M:%S') - Attempting launch..."

  RESULT=$(oci compute instance launch --compartment-id "$COMPARTMENT_ID" \
    --availability-domain "$AD_NAME" --display-name yuki-server \
    --shape VM.Standard.A1.Flex \
    --shape-config '{"ocpus":1,"memoryInGBs":6}' \
    --image-id "$IMAGE_ID" --subnet-id "$SUBNET_ID" \
    --assign-public-ip true \
    --metadata "{\"ssh_authorized_keys\":\"$SSH_KEY\"}" 2>&1)

  if echo "$RESULT" | grep -q "Out of host capacity"; then
    echo "    No capacity available, waiting ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
  elif echo "$RESULT" | grep -q '"lifecycle-state"'; then
    echo ""
    echo "=========================================="
    echo "SUCCESS! Instance created!"
    echo "=========================================="
    echo "$RESULT" | grep -E '"id"|"lifecycle-state"|"display-name"'

    # Get the public IP
    INSTANCE_ID=$(echo "$RESULT" | grep '"id"' | head -1 | cut -d'"' -f4)
    echo ""
    echo "Instance ID: $INSTANCE_ID"
    echo ""
    echo "Waiting for instance to get public IP..."
    sleep 30

    VNIC_ID=$(oci compute vnic-attachment list --compartment-id "$COMPARTMENT_ID" \
      --instance-id "$INSTANCE_ID" --query "data[0].\"vnic-id\"" --raw-output 2>/dev/null)
    PUBLIC_IP=$(oci network vnic get --vnic-id "$VNIC_ID" \
      --query "data.\"public-ip\"" --raw-output 2>/dev/null)

    echo "=========================================="
    echo "PUBLIC IP: $PUBLIC_IP"
    echo "=========================================="
    echo ""
    echo "SSH command: ssh -i ~/.ssh/oci_yuki_key opc@$PUBLIC_IP"
    echo ""
    echo "Next steps:"
    echo "1. Wait ~2 min for SSH to be ready"
    echo "2. Run: export OCI_VM_IP=$PUBLIC_IP"
    echo "3. Run: ./deploy-to-oci.sh"
    exit 0
  else
    echo "    Unexpected response:"
    echo "$RESULT" | head -10
    echo "    Retrying in ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
  fi
done

echo "Max attempts reached. Try again later or check a different region."
exit 1
