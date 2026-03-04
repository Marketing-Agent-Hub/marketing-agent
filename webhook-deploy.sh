#!/bin/bash

# Webhook deploy script
# Được gọi bởi webhook service khi có push mới

set -e

LOG_FILE="/var/log/ocnewsbot-deploy.log"

echo "=====================================" | tee -a $LOG_FILE
echo "Deploy triggered at $(date)" | tee -a $LOG_FILE
echo "=====================================" | tee -a $LOG_FILE

cd /opt/ocNewsBot

# Pull latest code
echo "→ Pulling latest code..." | tee -a $LOG_FILE
git pull origin main 2>&1 | tee -a $LOG_FILE

# Run deploy script
echo "→ Running deploy script..." | tee -a $LOG_FILE
./deploy.sh latest 2>&1 | tee -a $LOG_FILE

echo "✓ Deploy completed at $(date)" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE
