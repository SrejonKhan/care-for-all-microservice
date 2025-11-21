#!/bin/bash

# Start donation service locally on port 4003

export NODE_ENV=development
export PORT=4003
export DATABASE_URL=mongodb://localhost:27017/donation-service
export RABBITMQ_URL=amqp://localhost:5672
export JWT_SECRET=local_dev_secret_key_change_in_production
export AUTH_SERVICE_URL=http://localhost:4000
export CAMPAIGN_SERVICE_URL=http://localhost:4001
export LOG_LEVEL=info
export BANK_MOCK_ENABLED=true
export BANK_MOCK_SUCCESS_RATE=0.9

echo "Starting donation-service on port 4003..."
echo "Database: $DATABASE_URL"
echo "RabbitMQ: $RABBITMQ_URL"
echo "API docs: http://localhost:4003/docs"

bun run dev