#!/bin/bash
# Reptrainer API Proxy Deployment Script
set -e

if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: Google Cloud SDK (gcloud) is not installed."
  echo "Please install it from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

REGION="us-central1"
SERVICE_NAME="reptrainer-api"

# Try to get the Live Agent URL if it exists
LIVE_AGENT_URL=$(gcloud run services describe reptrainer-live-agent --region $REGION --format='value(status.url)' 2>/dev/null | sed 's/https/wss/' || echo "")

echo "🚀 Deploying API Proxy (Node) to Cloud Run..."

if [ -z "$LIVE_AGENT_URL" ]; then
  echo "⚠️  Warning: reptrainer-live-agent not found. You may need to set LIVE_AGENT_URL manually."
fi

gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  ${LIVE_AGENT_URL:+--set-env-vars="LIVE_AGENT_URL=$LIVE_AGENT_URL"}

URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')

echo ""
echo "✨ API Proxy Deployed! ✨"
echo "🔗 Service URL: $URL"
