#!/bin/bash

# Start Donation Service locally with MongoDB and RabbitMQ

echo "🚀 Starting Donation Service locally..."
echo ""

# Check if MongoDB is running
if ! nc -z localhost 27017 2>/dev/null; then
  echo "⚠️  MongoDB is not running on localhost:27017"
  echo "   Please start MongoDB first:"
  echo "   mongod --replSet rs0 --dbpath=/path/to/data"
  echo ""
  exit 1
fi

# Check if RabbitMQ is running
if ! nc -z localhost 5672 2>/dev/null; then
  echo "⚠️  RabbitMQ is not running on localhost:5672"
  echo "   Please start RabbitMQ first:"
  echo "   rabbitmq-server"
  echo ""
  exit 1
fi

echo "✅ MongoDB is running"
echo "✅ RabbitMQ is running"
echo ""

# Set environment variables
export NODE_ENV=development
export DATABASE_URL=mongodb://localhost:27017/donation-service
export RABBITMQ_URL=amqp://localhost:5672
export RABBITMQ_EXCHANGE=care-for-all
export PORT=3003
export JWT_SECRET=your-secret-key-change-in-production
export CAMPAIGN_SERVICE_URL=http://localhost:3002
export LOG_LEVEL=info

echo "📋 Configuration:"
echo "   Database: $DATABASE_URL"
echo "   RabbitMQ: $RABBITMQ_URL"
echo "   Port: $PORT"
echo "   Campaign Service: $CAMPAIGN_SERVICE_URL"
echo ""

echo "📚 API Documentation will be available at:"
echo "   http://localhost:$PORT/docs"
echo ""

echo "🔧 Starting service..."
echo ""

# Start the service
bun run dev

