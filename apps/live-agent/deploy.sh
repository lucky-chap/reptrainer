#!/bin/bash
# Reptrainer Live Agent Deployment Script
set -e

if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: Google Cloud SDK (gcloud) is not installed."
  echo "Please install it from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

REGION="us-central1"
SERVICE_NAME="reptrainer-live-agent"

echo "🚀 Deploying Live Agent (Python) to Cloud Run..."

# Deploy using source code
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated

URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)' | sed 's/https/wss/')

echo ""
echo "✨ Live Agent Deployed! ✨"
echo "🔗 WebSocket URL: $URL"
