#!/bin/bash

# Webhook deploy script
# Duoc goi boi webhook service khi co push moi

set -e

LOG_FILE="/var/log/marketing-agent-deploy.log"

echo "=====================================" | tee -a $LOG_FILE
echo "Deploy triggered at $(date)" | tee -a $LOG_FILE
echo "=====================================" | tee -a $LOG_FILE

cd /opt/MarketingAgent

# Pull latest code
echo "Pulling latest code..." | tee -a $LOG_FILE
git pull origin main 2>&1 | tee -a $LOG_FILE

# Run deploy script
echo "Running deploy script..." | tee -a $LOG_FILE
./infra/prod/compute/deploy/deploy.sh latest 2>&1 | tee -a $LOG_FILE

echo "Deploy completed at $(date)" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE
